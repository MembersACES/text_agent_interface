# Dev testing: Signed via ACES (Members page)

Use after Cloud Run deploy from `dev` branch completes.

## URLs

| Service | Dev URL |
|---------|---------|
| Frontend | https://acesagentinterfacedev-672026052958.australia-southeast2.run.app |
| Backend | https://text-agent-backend-dev-672026052958.australia-southeast2.run.app |
| Members page | `/crm-members` |

Sign in with an `@acesolutions.com.au` Google account.

---

## 1. Wait for deploy

Confirm both repos finished Cloud Build / Cloud Run deploy:

- `MembersACES/text_agent_backend` → `dev` (commit `9d167d3` or later)
- `MembersACES/text_agent_interface` → `dev` (commit `9198ef8` or later)

Backend startup runs `init_db()` and adds `has_signed_contract` columns if missing.

---

## 2. First-time: sync signed flags

1. Open **Members** (`/crm-members`).
2. Click **Sync signed status** (ACES staff only).
3. Confirm in the modal — by default sync **only updates flags** (stage unchanged).
4. Optional: tick **Also promote signed Lead/Qualified members to Existing Member** before **Run sync**.
5. Expect a blue summary banner, e.g.:
   - ~119 clients updated
   - ~54 signed via ACES
   - ~N signed but not promoted (or promoted count if opt-in was checked)

---

## 3. Badges and filter

1. Enable filter **Signed but not promoted** (Filters popover).
2. List should show only members with `has_signed_contract` and stage Lead or Qualified.
3. Each row should show an amber **Signed — not promoted** badge.

---

## 4. Bulk promote (explicit only)

1. With filter on (or Select mode), tick 1–2 test members — or use row **Promote** next to the amber badge.
2. Click **Promote to Existing Member** (bulk bar) or profile **Stage** dropdown / **Promote** link.
3. Rows should move to **Existing Member**; signed badge should disappear for those rows.
5. Re-run **Sync signed status** — promoted members should no longer count as “signed but not promoted”.

---

## 5. API smoke (optional)

With a staff Bearer token:

```http
POST /api/admin/sync-signed-contracts
GET  /api/clients?signed_not_promoted=1&limit=50
GET  /api/admin/signed-contract-dry-run
```

Dry-run should report `record_id_column_detected: true` and mostly ID joins.

---

## 6. Regression

- [ ] Page load does **not** call sync automatically
- [ ] Drive filing / member profile still work (n8n unchanged)
- [ ] Export CSV still works

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| No **Sync signed status** button | Logged-in email must end with `@acesolutions.com.au` |
| Sync 503 | Backend `SERVICE_ACCOUNT_*` and `FILE_IDS_SHEET_ID` on dev Cloud Run |
| Filter returns empty | Run sync first; flags are DB-backed |
| Promote fails | `PATCH /api/client-bulk-update` with `stage: existing_client` |
