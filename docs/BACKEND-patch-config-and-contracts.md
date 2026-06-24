# Backend patch — paste into `text_agent_backend` (didn't sync via the mount)

Two additions. After pasting: `git add main.py services/signed_contract_dry_run.py`,
commit, deploy the backend. Both are read-only GETs; no DB writes, no migrations.

---

## 1. `services/signed_contract_dry_run.py` — append at the END of the file

```python
def get_contracts_for_business(business_name: str) -> dict:
    """Signed-contract file IDs + status per utility for one business, matched by name
    against the FILE_IDS 'Data from Airtable' tab. Read-only; reuses read_data_from_airtable_tab."""
    rows, meta = read_data_from_airtable_tab()
    target = normalize_business_name(business_name)
    matched = None
    for r in rows:
        if normalize_business_name(r.get("business_name", "")) == target:
            matched = r
            break
    contracts: dict[str, dict] = {}
    if matched:
        for status_key, file_key, label in STATUS_FILE_PAIRS:
            fid = (matched.get(file_key) or "").strip()
            status = (matched.get(status_key) or "").strip()
            if fid or status:
                contracts[label] = {
                    "file_id": fid or None,
                    "status": status or None,
                    "link": f"https://drive.google.com/file/d/{fid}/view" if fid else None,
                }
    return {
        "business_name": business_name,
        "matched": matched is not None,
        "record_id": (matched.get("record_id") if matched else None),
        "contracts": contracts,
        "sheet_id": meta.get("sheet_id"),
    }
```

This reuses what's already in the file: `read_data_from_airtable_tab()`, `normalize_business_name()`,
and `STATUS_FILE_PAIRS`. Nothing hard-coded — it reads the FILE_IDS sheet live each call.

---

## 2. `main.py` — add these two routes (anywhere among the routes; e.g. right above
`@app.get("/api/climate/entities/{entity_id}/activity-sources")`)

```python
@app.get("/api/climate/config")
def get_climate_config(
    period: str = Query("FY26"),
    user_info: dict = Depends(verify_roster_access),
):
    """Env/config block for the Prograde Disc Engine embed. Returns fast so the embed's
    getConfig() stops 404-storming this route (it calls it ~8x per render)."""
    from datetime import datetime, timezone
    return {
        "aces_data_env": os.environ.get("ACES_DATA_ENV", "prod"),
        "aces_api_host": "",
        "period": period,
        "today": datetime.now(timezone.utc).strftime("%Y-%m"),
    }


@app.get("/api/contracts/by-business")
def get_contracts_by_business(
    business_name: str = Query(..., description="Business name to match in the FILE_IDS 'Data from Airtable' tab"),
    user_info: dict = Depends(verify_google_token),
):
    """Signed-contract file IDs + status per utility for a business (from the FILE_IDS sheet).
    Read-only; reuses services.signed_contract_dry_run. Surfaces 'is there a signed contract'."""
    from services.signed_contract_dry_run import get_contracts_for_business
    try:
        return get_contracts_for_business(business_name)
    except Exception as e:
        logging.error("[contracts/by-business] %s", e)
        raise HTTPException(status_code=502, detail=f"Contract lookup failed: {e}")
```

All names used (`Query`, `Depends`, `verify_roster_access`, `verify_google_token`, `HTTPException`,
`os`, `logging`) are already imported in `main.py`.

---

## What each does
- **`/api/climate/config`** — kills the slowness + 404 spam on Marcus's page (its `getConfig` calls
  this ~8×/render; right now every call is a 404).
- **`/api/contracts/by-business?business_name=X`** — returns signed-contract file IDs + status per
  utility, matched by business name. The ACES Waste page already calls this to show
  "✓ Signed waste contract on file · status".

## After deploy — if contracts still don't show
Check the **dev** backend has `FILE_IDS_SHEET_ID` set and the service account has that sheet shared
(same plumbing your `recompute_signed_contracts` sync uses). The match is by normalised business name.

---

# PART 2 (2026-06-23) — feed contract status into the Disc Engine payloads

Goal: enrich the data Marcus's engine already pulls (`getManifest` / `getSite`) with signed-contract
status, so his "unsigned / no contract on file" badge can go green — without patching his render.
**These edits are already applied to the repo files; this section is the recoverable copy** in case the
backend mount tore the write (verify with `python -m py_compile` — see test plan).

## 3. `services/signed_contract_dry_run.py`

**(a)** add `import time` to the imports block (alongside `import logging`).

**(b)** insert these three helpers ABOVE `def get_contracts_for_business(...)`:

```python
# ── Cached contract index ────────────────────────────────────────────────────
_CONTRACT_INDEX_CACHE: dict[str, Any] = {"ts": 0.0, "index": None, "sheet_id": None}
_CONTRACT_INDEX_TTL = 300.0  # seconds


def _contract_block(row: dict[str, str]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for status_key, file_key, label in STATUS_FILE_PAIRS:
        fid = (row.get(file_key) or "").strip()
        status = (row.get(status_key) or "").strip()
        if fid or status:
            out[label] = {
                "file_id": fid or None,
                "status": status or None,
                "link": f"https://drive.google.com/file/d/{fid}/view" if fid else None,
            }
    return out


def load_contract_index(force: bool = False) -> dict:
    """Read the FILE_IDS sheet ONCE; return cached {index:{norm_name:{label:{...}}}, sheet_id, cached}."""
    now = time.time()
    cached = _CONTRACT_INDEX_CACHE["index"]
    if (not force) and cached is not None and (now - float(_CONTRACT_INDEX_CACHE["ts"])) < _CONTRACT_INDEX_TTL:
        return {"index": cached, "sheet_id": _CONTRACT_INDEX_CACHE["sheet_id"], "cached": True}
    rows, meta = read_data_from_airtable_tab()
    index: dict[str, dict] = {}
    for r in rows:
        key = normalize_business_name(r.get("business_name", ""))
        if not key:
            continue
        block = _contract_block(r)
        if block:
            index[key] = block
    _CONTRACT_INDEX_CACHE.update({"ts": now, "index": index, "sheet_id": meta.get("sheet_id")})
    logging.info("[contract-index] built: %d businesses with contracts (sheet=%s)", len(index), meta.get("sheet_id"))
    return {"index": index, "sheet_id": meta.get("sheet_id"), "cached": False}


def contracts_for(business_name: str, index: dict | None = None) -> dict:
    """One business's {label:{file_id,status,link}} from the index. {} on any failure (never breaks caller)."""
    try:
        idx = index if index is not None else load_contract_index()["index"]
        return idx.get(normalize_business_name(business_name), {}) or {}
    except Exception as e:
        logging.info("[contracts_for] lookup failed for %r: %s", business_name, e)
        return {}
```

## 4. `services/climate_entity_sources.py`

**(a)** add `import logging` to the imports block (top of file).

**(b)** in `build_entity_activity_manifest`, right AFTER the `sites` list is built and BEFORE
`return {`, insert:

```python
    # ACES enrichment: attach signed-contract status per site (one cached sheet read; never fatal).
    contracts_available = False
    contract_sheet_id = None
    try:
        from services.signed_contract_dry_run import load_contract_index, normalize_business_name
        _ci = load_contract_index()
        _cidx = _ci["index"]
        contract_sheet_id = _ci.get("sheet_id")
        for s in sites:
            _bn = s.get("member_business_name") or primary_client_name
            _cmap = _cidx.get(normalize_business_name(_bn), {}) if _bn else {}
            s["contract"] = _cmap.get(s["utility_type"])
        contracts_available = True
    except Exception as _ce:
        logging.info("[manifest] contract enrichment skipped: %s", _ce)
        for s in sites:
            s.setdefault("contract", None)
```

and add to the manifest's returned dict: `"contracts_available": contracts_available,` and
`"contract_sheet_id": contract_sheet_id,`.

**(c)** in `build_entity_site_detail`, resolve the business name BEFORE `db.close()`:

```python
    member_business_name: Optional[str] = None
    if member_aces_client_id:
        _client = db.query(Client).filter(Client.id == int(member_aces_client_id)).first()
        member_business_name = _client.business_name if _client else None
```

then AFTER `db.close()`:

```python
    contract = None
    if member_business_name:
        try:
            from services.signed_contract_dry_run import contracts_for
            contract = contracts_for(member_business_name).get(ut)
        except Exception as _ce:
            logging.info("[site-detail] contract enrichment skipped: %s", _ce)
```

and add to the site-detail returned dict: `"member_business_name": member_business_name,` and
`"contract": contract,`.

## 5. `services/waste_invoice_dump.py` — waste invoice PDF links into getSite (waste only)

The waste invoice Drive links live ONLY in the raw dump sheet, not the Airtable invoice table — so the
`**fields` passthrough does NOT carry them for waste. We attach them additively to the waste `getSite`.

**(a)** add `import time` to the imports block.

**(b)** append at the END of the file (after `read_waste_invoice_rows`):

```python
_DUMP_CACHE: dict[str, Any] = {"ts": 0.0, "index": None}
_DUMP_TTL = 300.0  # seconds
_DOC_FIELDS = {
    "invoice_number": "Invoice Number",
    "invoice_date": "Invoice Date",
    "invoice_total": "Invoice Total Amount",
    "provider": "Provider",
    "review_period": "Review Period",
    "webview_link": "Webview Link",
}


def _load_dump_index(force: bool = False) -> dict[str, list[dict]]:
    """Read the whole waste dump ONCE; index slim docs by normalized account. Cached (TTL)."""
    now = time.time()
    cached = _DUMP_CACHE["index"]
    if (not force) and cached is not None and (now - float(_DUMP_CACHE["ts"])) < _DUMP_TTL:
        return cached
    service = get_sheets_service()
    if not service:
        raise RuntimeError("Could not create Google Sheets service (check SERVICE_ACCOUNT_*)")
    resp = (
        service.spreadsheets().values()
        .get(spreadsheetId=WASTE_DUMP_SHEET_ID, range=f"'{WASTE_DUMP_TAB}'!A1:BZ20000",
             valueRenderOption="FORMATTED_VALUE")
        .execute()
    )
    values = resp.get("values", [])
    index: dict[str, list[dict]] = {}
    if values:
        headers = [str(h).strip() for h in values[0]]
        col = {key: next((i for i, h in enumerate(headers) if _norm(h) == _norm(name)), None)
               for key, name in _DOC_FIELDS.items()}
        acc_idx = next((i for i, h in enumerate(headers) if _norm(h) == _norm(ACCOUNT_HEADER)), None)
        if acc_idx is not None:
            for raw in values[1:]:
                if acc_idx >= len(raw):
                    continue
                acct = _norm(raw[acc_idx])
                if not acct:
                    continue
                doc: dict[str, Any] = {}
                for key, idx in col.items():
                    v = raw[idx] if (idx is not None and idx < len(raw)) else ""
                    if isinstance(v, str) and v.strip().lower() == "null":
                        v = ""
                    doc[key] = v
                doc["missing"] = not str(doc.get("webview_link", "")).strip()
                index.setdefault(acct, []).append(doc)
    _DUMP_CACHE.update({"ts": now, "index": index})
    logging.info("[waste-dump-index] built: %d accounts (sheet=%s)", len(index), WASTE_DUMP_SHEET_ID)
    return index


def waste_documents_for_account(account: str) -> dict:
    """Slim per-account waste invoice documents (PDF links + missing flag). {} on failure."""
    try:
        idx = _load_dump_index()
        docs = idx.get(_norm(account), [])
        with_pdf = sum(1 for d in docs if not d["missing"])
        return {"documents": docs, "total_count": len(docs), "with_pdf": with_pdf,
                "missing_count": len(docs) - with_pdf, "account": account, "sheet_id": WASTE_DUMP_SHEET_ID}
    except Exception as e:
        logging.info("[waste-documents] lookup failed for %r: %s", account, e)
        return {"documents": [], "total_count": 0, "with_pdf": 0, "missing_count": 0,
                "account": account, "sheet_id": WASTE_DUMP_SHEET_ID, "error": str(e)}
```

**(c)** in `services/climate_entity_sources.py` `build_entity_site_detail`, AFTER the contract block,
add:

```python
    waste_documents = None
    if ut.strip().lower() == "waste":
        try:
            from services.waste_invoice_dump import waste_documents_for_account
            waste_documents = waste_documents_for_account(ident)
        except Exception as _we:
            logging.info("[site-detail] waste-documents enrichment skipped: %s", _we)
```

and add to the site-detail returned dict: `"waste_invoice_documents": waste_documents,`.

## What PART 2 does
- `getManifest` `sites[]` and `getSite` now carry `contract: {file_id,status,link} | null` per
  (business × utility), plus manifest `contracts_available` / `contract_sheet_id`.
- One cached FILE_IDS read per manifest (TTL 5 min) — does **not** meaningfully add to the manifest's
  existing Airtable cost. Enrichment is wrapped so a sheet failure never breaks the manifest/site.
- **Non-waste invoices need no change**: `get_utility_invoice_rows_by_identifier` already spreads
  `**fields`, so the Drive/attachment link is already in the rows Marcus receives.
- **Waste invoices**: the Drive links live only in the raw dump, so the waste `getSite` now carries an
  additive `waste_invoice_documents` block (links + missing-invoice flag), cached once (TTL 5 min).
