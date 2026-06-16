# ACES — Next steps plan

**Purpose:** Execution checklist for upcoming work across `text_agent_interface` and `text_agent_backend`.  
**Not implementation** — use one focused session per item; follow [N8N_DEPRECATION_PLAN.md](../../text_agent_backend/docs/N8N_DEPRECATION_PLAN.md) §0, §14, Appendix C/D for n8n retirements.

---

## 1. Track C — `utility_linked_post_process` (n8n migration)

**Status:** Not started (`—` in Appendix C)  
**Track:** C (climate)  
**Prerequisite:** Confirm Oil/Waste Airtable fixes per [frankston-rsl-integration-audit.md](../../text_agent_backend/docs/frankston-rsl-integration-audit.md) (`UTILITY_CONFIG` in `airtable_client.py` — verify tests pass before ETL cutover).

### Scope (this webhook only)

| Rule | Detail |
|------|--------|
| Replace | n8n forward from `POST /api/webhooks/utility-linked` → B4 ETL ingest (`climate_activity_etl` / `climate_activity_records`) |
| Do not | Disable n8n Cloud workflow (user disables in n8n UI after local test) |
| Do not | Start next Appendix C item in same session |
| Do not | Touch KEEP flows (comparisons, document-generation, drive_filing, email/SMS, Base 1, Pudu) |

### Current flow

1. User links utility on `/utility-linking` or `/loa-upload`
2. Airtable updated (still via n8n for `update_airtable_utility_link` — out of scope here)
3. Interface calls `/api/utility-linked-notify` → backend `POST /api/webhooks/utility-linked`
4. Backend today forwards JSON to `membersaces.app.n8n.cloud/webhook/utility_linked_post_process`

### Target flow

1. Same trigger from interface
2. Backend runs ETL staging (reuse logic from `POST /api/clients/{id}/climate/etl/sync`) per linked identifier
3. **No** POST to `utility_linked_post_process` on n8n Cloud

### Deliverables per §14

- [ ] Code: B4 replacement in backend only (webhook handler)
- [ ] Appendix C row → `IMPL`
- [ ] `text_agent_backend/docs/n8n-retirements/utility_linked_post_process.md` (Appendix D draft)
- [ ] Golden payloads: `text_agent_backend/docs/n8n-exports/golden/utility_linked_post_process/`
- [ ] STOP for user local test — do not mark `TESTED` / `RETIRED` without approval

### Local test (after IMPL)

| Step | Where |
|------|--------|
| Backend | `text_agent_backend` — `uvicorn main:app --reload` (port 8000) |
| Frontend | `text_agent_interface` — `npm run dev` |
| Pages | `/utility-linking?businessName=…&token=…`, `/loa-upload` (post-link notify path) |
| Verify | Network: notify goes to backend only; **no** `membersaces.app.n8n.cloud/.../utility_linked_post_process` |
| Climate | Member Climate tab — staged record count increases after link (pilot member e.g. Frankston) |

### Env vars

**Backend `.env`:** `AIRTABLE_API_KEY`, `USE_AIRTABLE_DIRECT=true`, `BACKEND_API_KEY`, `SERVICE_ACCOUNT_JSON` (or `SERVICE_ACCOUNT_FILE`)

**Interface `.env.local`:** `NEXT_PUBLIC_API_BASE_URL`, `BACKEND_API_KEY` (for `/api/utility-linked-notify` proxy)

### Approval gate

Reply: `Approved for utility_linked_post_process` or `Not approved — [issue]` before TESTED/RETIRED or next webhook.

---

## 2. Dev stack — `npm run dev:stack` port cleanup

**Status:** Not started  
**File:** `text_agent_interface/scripts/dev.ps1`

### Goal

Before starting backend + frontend (+ optional climate), check whether dev ports are in use and kill those processes so the stack starts cleanly.

### Ports to cover

| Service | Port | Notes |
|---------|------|--------|
| Backend | 8000 | `uvicorn main:app` |
| Frontend | 3000 (default Next) | Confirm actual port from terminal / config |
| Climate (optional) | 8081 | `npm run dev:stack:climate` |

### Tasks

- [ ] Add `Stop-PortProcess` (or equivalent) in `dev.ps1` for each port
- [ ] Log which PID was killed (or “port free”)
- [ ] Update `README.md` dev stack section if behaviour changes

---

## 3. CRM member stages — simplify to Lead / Won / Lost

**Status:** Not started  
**Repos:** `text_agent_backend` + `text_agent_interface` (keep in sync)

### Goal

Reduce coarse client/member stage from 5 values to 3: `lead`, `won`, `lost`.  
**Out of scope:** `OfferPipelineStage`, `OfferStatus`, offer micro-steps.

### Business rules

| Stage | When |
|-------|------|
| **Lead** | Fresh CRM account — not won, not lost. LOA/SFA in progress does not change stage. |
| **Won** | Onboarded: (a) ≥1 linked offer `accepted`, or (b) `has_signed_contract = 1` from ACES FILE_IDS sync. |
| **Lost** | Offer lost or staff sets Lost manually. |

### Auto-promotion

- Offer → `accepted` → client stage → `won` (never downgrade `won` on second accepted offer)
- Offer → `lost` → client stage → `lost`
- `POST /api/admin/sync-signed-contracts`: signed + stage `lead` → auto-promote `won` (replace optional promote to `existing_client`)

### Remove

- `qualified`, `existing_client` enum values
- “Signed — not promoted” UI, filter, promote-to-existing-member flow
- `POST_WIN_STAGES` dual concept → only `won`

### Backend checklist

| Area | Files / actions |
|------|-----------------|
| Enum | `crm_enums.py` — `ClientStage`: LEAD, WON, LOST only; `POST_WIN_STAGES = (WON,)` |
| Schema | `schemas.py` — normalize legacy stages on read; reject unknown on write |
| CRM service | `services/crm.py` — post-win guard uses `won` only |
| Signed sync | `services/signed_contract_dry_run.py`, `scripts/dry_run_signed_contract_stage.py` — `signed_but_lead`, promote to `won` |
| API | `main.py` — `signed_not_promoted` → `signed_but_lead`; `promote_signed` default auto-won; `is_existing_client` from `stage == won` |
| Migration | `migrations/` + `database.py` bootstrap — SQL to remap legacy stages |
| Tests | `tests/test_crm.py`, `tests/test_entity_groups.py`, `tests/test_crm_loa_link.py` if needed |

### Frontend checklist

| Area | Files / actions |
|------|-----------------|
| Constants | `src/constants/crm.ts` — 3 stages + `CLIENT_STAGE_DESCRIPTIONS` |
| Stage UI | `StageSelectShell.tsx`, `StageBadge.tsx`, `EditableStageBadge.tsx` |
| Member page | `MemberProfileHeader.tsx`, `crm-members/[id]/page.tsx` — remove signed-not-promoted / promote |
| Members list | `crm-members/page.tsx` — filters, sync summary, bulk promote, legacy stage classes |
| Offers | `offers/page.tsx`, `offers/[id]/page.tsx` — `is_existing_client` = won member |
| Docs | `CLAUDE.md`, `docs/TESTING_SIGNED_CONTRACTS_DEV.md` |
| Lint | `npm run lint` |

### Acceptance criteria

- Only lead / won / lost in dropdowns, filters, reports
- Signed sync auto-promotes lead → won
- No “Signed — not promoted” UI
- Legacy DB rows migrated; API normalizes old strings on read
- Backend tests pass; frontend lint clean
- `crm_enums.py` ↔ `src/constants/crm.ts` aligned

---

## 4. Suggested session order

1. **Dev stack port cleanup** — small, unblocks daily dev  
2. **`utility_linked_post_process`** — Track C cycle 1 (one chat, STOP for test)  
3. **CRM 3-stage model** — larger cross-repo change; own session(s)

---

## 5. Reference links

| Doc | Path |
|-----|------|
| n8n migration plan | `text_agent_backend/docs/N8N_DEPRECATION_PLAN.md` |
| Frankston / Oil-Waste audit | `text_agent_backend/docs/frankston-rsl-integration-audit.md` |
| Appendix C checklist | N8N plan § Appendix C |
| Cursor prompt template | N8N plan § Appendix E |

---

*Last updated: June 2026 — plan only; no code implied.*
