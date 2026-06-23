# Test plan — contract enrichment in the Disc Engine payloads

Run these locally **before** pushing to dev / handing back to Marcus. ~10 min.
Everything here is read-only and additive; nothing writes to sheets or the DB.

What changed (recap):
- Backend: `getManifest` `sites[]` and `getSite` now carry `contract: {file_id,status,link} | null`
  per (business × utility), + manifest `contracts_available` / `contract_sheet_id`.
- No frontend change. **Marcus's badge will NOT turn green until *he* binds his render to the new
  field** — so we verify the *payload*, not his UI.

---

## 0. Backend syntax gate (do this first)

The sandbox couldn't run a full compile (its mount was stale), so confirm on your machine:

```bash
cd text_agent_backend
python -m py_compile services/signed_contract_dry_run.py services/climate_entity_sources.py services/waste_invoice_dump.py && echo OK
```

Expect `OK`. If either errors with a truncation/`SyntaxError`, the disk copy was torn —
re-paste from `text_agent_interface/docs/BACKEND-patch-config-and-contracts.md` PART 2, then re-run.

Start the backend (same env you already use): `FILE_IDS_SHEET_ID` must be set and the service account
must have read access to that sheet (the plumbing your contract endpoint already uses — it works, since
the ACES Waste page shows contracts).

---

## 1. Verify the manifest payload (the badge-level fix)

Easiest path — no token juggling: open the **Reporting Entity Assurance — Marcus Engine** page, pick
**Frankston**, then in Chrome DevTools → **Network** → click the `…/activity-sources/manifest…` request →
**Response**. In the JSON, check:

- top level: `"contracts_available": true` and a non-null `"contract_sheet_id"`.
- inside `sites[]`: at least the Waste site has
  `"contract": { "file_id": "...", "status": "...", "link": "https://drive.google.com/file/d/.../view" }`.
  Sites with no signed contract show `"contract": null` — that's correct, not a bug.

If you prefer curl (grab a staff `id_token` from DevTools → Application → your session, or the app):

```bash
TOKEN="<staff id_token>"
HOST="http://localhost:8000"   # or your local backend host
curl -s "$HOST/api/climate/entities/frankston-rsl/activity-sources/manifest?period=FY26" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool | grep -A4 '"contract"'
```

Expect to see `contract` blocks (and `null`s) per site.

## 2. Verify the site-detail payload

In the same Network tab, click a `…/activity-sources/site?utility_type=Waste&identifier=…` request →
Response. Confirm it has `"member_business_name": "..."` and `"contract": {…}|null`.

Or curl (identifier = the Waste account from the manifest, e.g. `09097571`):

```bash
curl -s "$HOST/api/climate/entities/frankston-rsl/activity-sources/site?utility_type=Waste&identifier=09097571&period=FY26" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool | grep -A4 '"contract"\|member_business_name'
```

## 2b. Verify waste invoice PDF links (waste getSite only)

In the same Waste `…/site?utility_type=Waste…` Response, confirm a `waste_invoice_documents` block:

- `total_count` > 0, `with_pdf` and `missing_count` populated.
- `documents[]` rows carry `webview_link` (the Drive PDF) and `missing: true` where the link is blank.

```bash
curl -s "$HOST/api/climate/entities/frankston-rsl/activity-sources/site?utility_type=Waste&identifier=09097571&period=FY26" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool | grep -A6 'waste_invoice_documents'
```

These should match what the **ACES Waste Discrepancy Review** page shows for the same account. On first
waste load you'll see `[waste-dump-index] built: N accounts …` in the backend log (cached 5 min after).
Non-waste `getSite` returns `waste_invoice_documents: null` — correct.

## 3. Check the backend log line

On the first manifest load (per 5-min cache window) you should see, in the backend logs:

```
[contract-index] built: N businesses with contracts (sheet=<id>)
```

If instead you see `[manifest] contract enrichment skipped: …`, the enrichment caught an error
(e.g. sheet not shared / `FILE_IDS_SHEET_ID` unset) — the manifest still returns, just with
`contract: null` everywhere and `contracts_available: false`. Fix the sheet access and reload.

## 4. Regression — ACES Waste page still works

Open **ACES Waste Discrepancy Review** → search **Frankston** → open the Waste account. Confirm the
contract chip and invoice PDF links still render exactly as before (this path is unchanged).

## 5. Performance sanity

The manifest does **one** extra cached sheet read. It should not be noticeably slower than before.
(The ~2-min freeze you saw earlier is the *existing* per-client Airtable fetch + Marcus's synchronous
XHR — unrelated to this change, and still his async `_apiGet` fix to make.)

---

## Pass criteria
- [ ] `py_compile` OK on both backend modules.
- [ ] manifest: `contracts_available: true`, Waste site has a `contract` block with a working Drive link.
- [ ] site-detail: `contract` + `member_business_name` present.
- [ ] log shows `[contract-index] built: …`.
- [ ] ACES Waste page unchanged.

When all five pass → push backend + frontend to dev, then send Marcus handover §13
(the field shapes + his one-line bind). His badge goes green once he ships that.
