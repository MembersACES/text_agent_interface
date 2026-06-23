# Backend patch — raw waste-dump reader (paste into text_agent_backend if it didn't sync)

Two parts. After pasting: `git add services/waste_invoice_dump.py main.py`, commit, deploy backend.
Read-only GET; reuses the existing `get_sheets_service` (service account). No DB, no migration.

## 1. NEW FILE: `services/waste_invoice_dump.py`
(full contents are in the repo copy I wrote — if missing, it is the module that does:
`read_waste_invoice_rows(account)` → reads sheet `1ozwxJjqBQE3fJeMHmsXzPFCsekupwXZ3A7F0jstOfVw`,
tab `7th Sheet - Waste`, FORMATTED_VALUE, filters rows where `Account Number or Customer Number`
matches `account`, drops literal "null" cells, returns `{rows, total_count, account, sheet_id, sheet_tab}`.)

## 2. `main.py` — add this route (next to /api/climate/config)
```python
@app.get("/api/waste-invoice-rows")
def get_waste_invoice_rows(
    account: str = Query(..., description="Account / customer number to match in the raw waste dump sheet"),
    user_info: dict = Depends(verify_google_token),
):
    """Raw waste invoice rows (per-bin schedule + Invoice Total Amount + Webview Link / Drive PDF)
    from 'Member ACES Data' -> '7th Sheet - Waste', matched by account number."""
    from services.waste_invoice_dump import read_waste_invoice_rows
    try:
        return read_waste_invoice_rows(account)
    except Exception as e:
        logging.error("[waste-invoice-rows] %s", e)
        raise HTTPException(status_code=502, detail=f"Waste invoice lookup failed: {e}")
```

## Env note
Needs the service account to have **read access to that sheet** (`1ozwxJjq…`). Same service-account
plumbing as your signed-contract sync. If the page shows "Waste invoice lookup failed (502)", that's
the sheet not shared with the dev service account.
