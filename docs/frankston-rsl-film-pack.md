# Carbon Zero Australasia — Frankston RSL Hero Pack (v2)

*Powered by Prograde IP Holdings.* For Donatien (video) and ops/dev staging. Real production figures — treat as confidential.

**Repo support:** run `python scripts/frankston_film_prep.py` in `text_agent_backend` (see [Film prep script](#film-prep-script-repo)).  
**Local dev stack:** `npm run dev:stack` or `.\scripts\dev.ps1` in `text_agent_interface`.

---

## Gate: consent + on-camera identifiers

Frankston RSL is a real club with signed LOA utilities. For **public** marketing you need the club's written sign-off, or crop/blur MRINs, rates and dollar figures.

**On camera, refer to the client only as "Frankston RSL."** Do **not** show or say any contact name, title, email, phone, or ABN — strip those from every frame (watch member-profile headers and offer activity, which display contact details).

---

## Film environment

| Item | Value |
|------|--------|
| **Frontend (local)** | `http://localhost:8080` (or `:3000` if configured) |
| **Backend (local)** | `http://localhost:8000` |
| **Start stack** | From `text_agent_interface`: `npm run dev:stack` or `.\scripts\dev.ps1` |
| **Login** | Google OAuth — `@acesolutions.com.au` only |
| **Backend deps** | Sheets + Airtable service account / `.env` (`AIRTABLE_API_KEY`, `SERVICE_ACCOUNT_*`) |
| **Do not film** | `/resources` (legacy demo passwords on page) |

**Prod vs local:** Local CRM uses `aces-task-db.sqlite3` with `DISABLE_DB_SYNC=true` — autonomous run IDs match our audit but prod Cloud SQL may differ. Verify offer/run IDs before a prod shoot.

---

## Identity (what's safe to use)

| Field | Value |
|-------|--------|
| On-camera name | **Frankston RSL** (only) |
| Legal name (filters/API only) | Frankston RSL Sub Branch Inc |
| CRM client ID | `1` |
| Airtable LOA | `recjQ6GSka3b4kiB1` |
| CRM member route | `/crm-member/1` |
| Stage | Existing client |
| Signed utilities | C&I Electricity, C&I Gas, Oil, DMA, Waste, Cleaning, Pudu robot |
| Drive folder | [Client folder](https://drive.google.com/drive/folders/1g8Ns1a-C9P9L_DM12ayYewFSCrowJ5lq) |
| Parent Drive | `1r8lxBR2J-Y2DCVTUajUzsvN7kOCpDaOa` |

**Name-matching:** Discrepancy sheet uses the legal name. If a filter returns empty, try **Frankston RSL Sub Branch Inc** first, then Frankston RSL.

---

## Utility identifiers (two gas meters)

| Utility | ID | Retailer | Note |
|---------|-----|----------|------|
| **C&I Gas — hero meter** | MRIN **5321568754** | Origin | Overcharge + big Base 2 savings |
| C&I Gas — second meter | MRIN 53215687544 | Alinta | No overcharge; **keep out of cut** |
| C&I Electricity (main) | NMI VEEE0U1Y2S | Origin | Base 2 saving offer #44 |
| C&I Electricity (sub) | NMI 6407647367 | Origin | DMA rows only |
| DMA | 2002323086 | — | $47.56 mismatch (spare angle) |

**Rule:** Never mix MRIN **5321568754** with **53215687544** in the same shot.

---

## Pre-open tabs (shot day)

Replace `{BASE}` with your app origin (e.g. `http://localhost:8080`).

| Purpose | URL |
|---------|-----|
| V1 Discrepancy | `{BASE}/resources/discrepancy-check?business_name=Frankston%20RSL%20Sub%20Branch%20Inc&identifier=5321568754&type=gas&mismatches_only=1` |
| V2/V3 Member | `{BASE}/crm-member/1` |
| V2/V3 Base 2 | Open from member profile → **Base 2** (loads both MRINs). Fallback: `{BASE}/base-2?businessName=Frankston+RSL+Sub+Branch+Inc&clientId=1` |
| V2 Offer | `{BASE}/offers/22` |
| V3 Offer (loop savings) | `{BASE}/offers/18` |
| V3 Autonomous | `{BASE}/autonomous-agent/3` (sidebar empty unless staged — see below) |
| V5 Member Agent | `{BASE}/solution-range/one-pager/frankston-rsl-agent` |
| V5 Booking Alex | `{BASE}/solution-range/one-pager/inbound-booking-alex` |
| V4 Kanban | `{BASE}/base-1` (Lead A — see below) |

**Direct assets (open in separate tabs):**

| Asset | Link |
|-------|------|
| Big gas PDF (V2 hero, $31,463) | https://drive.google.com/file/d/1ebPrl6d9_85xE2JBq6K0jgNZWPupv76k/view |
| Loop gas PDF (V3, $18,098) | https://drive.google.com/file/d/1pAoXz3pj3tRzzFCcV47jVYIer67pYNUA/view |
| Latest gas PDF (V2 alt, $1,628) | https://drive.google.com/file/d/1QQOzZhrmeEfrwHeDAlyBtCBvTvVqNAk3/view |
| Elec comparison sheet (V2 alt) | https://docs.google.com/spreadsheets/d/1hI4L_oFfFgomujK6DnVnarAZtlIb6HLPy59Eux2mSZI |
| Origin invoice (MRIN 5321568754) | https://drive.google.com/file/d/1oRj94Amh6hacWbhmpP_LEcZwwXndTGo6/view |

---

## Crop / blur guide

| Screen | Hide before filming |
|--------|---------------------|
| `/crm-member/1` Overview | Contact name, email, phone, postal/site address, ABN |
| Business Info result | LOA signatory, email, phone |
| `/offers/*` | `created_by` emails if visible |
| Base 2 recipient modal | Client email if shown |
| Drive PDFs | Full legal letterhead if policy requires "Frankston RSL" only |

**Safe on camera:** Frankston RSL, MRIN 5321568754, rates, savings totals, red discrepancy row.

---

## The numbers, by video

### Video 1 — Overcharge proof

| Field | Value |
|-------|--------|
| MRIN | 5321568754 |
| Invoice rate | $21.8626/GJ |
| Contract rate | $20.180856/GJ |
| Rate difference | $1.682/GJ (8.33%) |
| Annual quantity | 3,007.6 GJ |
| **Annual overcharge** | **$5,058.01** |

**VO one-liner:** "Invoice $21.86/GJ vs contract $20.18/GJ — **$5,058 a year** on this meter."

### Video 2 — Savings hero (YouTube hero)

| Option | ID | Annual saving | Current → New | Source |
|--------|-----|---------------|---------------|--------|
| **Big gas (recommended)** | MRIN 5321568754 | **$31,462.65** | $97,394 → $65,931 | Offer #22 PDF |
| Electricity | NMI VEEE0U1Y2S | $12,621.50 | $102,849 → $90,227 | Offer #44 sheet |
| Gas (loop) | MRIN 5321568754 | $18,098.17 | $97,394 → $79,296 | Offer #18 PDF |

**VO one-liner:** "Market comparison — **$31,463 annual saving** in a board-ready PDF." (Do not imply this equals the $5,058 discrepancy check.)

Pre-open PDF tab — do not rely on live Generate on shoot day.

### Video 3 — Full loop

**Path:** CRM member → Base 2 (MRIN 5321568754) → offer **#18** → autonomous run **#3**.

**Autonomous UI today (local DB audit):**

| Run | Offer | MRIN | Status | Steps | Sidebar |
|-----|-------|------|--------|-------|---------|
| 3 | 21 | 5321568754 | running | 5× `ready` (0/5 bar) | empty |
| 8 | 26 | 53215687544 | running | 5× `ready` | empty |
| 5 | 22 | 5321568754 | stopped | skipped | empty |

**Film plan:**

1. **Default:** Show savings on **`/offers/18`** ($18,098), not the run sidebar.
2. **Local dev only:** Run `python scripts/frankston_film_prep.py --stage-local-run 3` to inject `comparison_snapshot` + mark first 3 steps `executed` (see script).
3. **Proper fix:** Fresh Base 2 generate → start new sequence (stores snapshot in newer path).

**Kanban beat:** Frankston is **not** on Base 1 kanban (existing CRM client).

**Suggested Lead A (videos 3 & 4):** **Consolidated Linen Service** (QLD) — latest non-CRM landing row with Drive + Base 1 review link. On camera use company name only; do not show contact email.

| Lead A | Value |
|--------|--------|
| Company | Consolidated Linen Service |
| Kanban | `/base-1` |
| Review (pre-stage tab) | [Base 1 review](https://docs.google.com/spreadsheets/d/1RcCCH1-h-7ap6JuDefJZ3lb_RTkVqhcW/edit) |
| Drive | [Folder](https://drive.google.com/drive/folders/1D4f54eIIbLteBky_lfOsC_R0GAcka-LA) |

Member B in the montage = Frankston (`/crm-member/1`). Do not imply same account.

### Video 4 — Base 1 lead magnet

Use **Lead A** above. Film kanban + pre-opened review spreadsheet. **Never** film live Base 1 submit spinner.

### Video 5 — Strategy deck or agent

- **Strategy:** `/initial-strategy-generator` → search Frankston RSL → Generate → PDF in [Drive folder](https://drive.google.com/drive/folders/1g8Ns1a-C9P9L_DM12ayYewFSCrowJ5lq).
- **Alternative:** Member Agent or Inbound Booking one-pagers (no live MRIN/rates).

### Video 6 — Brand sizzle

Static one-pagers + net-new motion (agent panels, stack diagram not in app).

---

## Deliverable mapping (6 topics × 3 assets)

| Topic | Long film | Short cut | Mini-deck |
|-------|-----------|-----------|-----------|
| 1 Discrepancy | Discrepancy link, $5,058 row | Red row + "$5,058" | `CZA-Video-Deliverables-List.md` §1 |
| 2 Savings | Offer #22 PDF, $31,463 | Savings total on PDF | §2 |
| 3 Full loop | CRM → Base 2 → offer #18 → optional run #3 | Montage; savings on offer page | §3 |
| 4 Base 1 | Lead A kanban + review tab | Kanban card drag | §4 |
| 5 Strategy | Drive deck or one-pager | One hero frame | §5 |
| 6 Brand | Designed assets | Logo / tagline | §6 |

---

## Owner matrix (before shoot)

| Task | Owner |
|------|--------|
| Club consent / blur policy | Morgan |
| Env + login working | Dona / Morgan |
| Pre-open tabs + PDFs | Dona |
| Kanban Lead A confirmed | Morgan (Consolidated Linen Service suggested) |
| Stage local autonomous run (optional) | Dona: `frankston_film_prep.py --stage-local-run 3` |
| Prod run/snapshot fix (optional) | Dev / ops on Cloud SQL |
| Legacy brand on filmed routes | Dev / design |

---

## Watch-outs

- **$5,058 overcharge ≠ $31,463 savings** — different products; don't conflate in edit.
- **Autonomous sidebar empty** until snapshot staged or regenerated.
- **Two gas meters** — only 5321568754 has a story.
- **Autonomous progress 0/5** unless steps staged or executed via runner.
- Strip contact/ABN from member profile and offers.

---

## Prep checklist

- [ ] `npm run dev:stack` — frontend + backend up
- [ ] Login with `@acesolutions.com.au`
- [ ] Run `python scripts/frankston_film_prep.py` — copy URL list
- [ ] Optional: `--stage-local-run 3` for sidebar + progress B-roll
- [ ] Discrepancy $5,058 confirmed
- [ ] PDF tabs open (offer #22, #18)
- [ ] Lead A Base 1 review tab open
- [ ] Contact/ABN off-screen verified
- [ ] Blur policy decided for public cut

---

## Film prep script (repo)

From `text_agent_backend`:

```powershell
cd "c:\My Projects\text_agent_backend"
python scripts/frankston_film_prep.py
python scripts/frankston_film_prep.py --base-url http://localhost:8080
python scripts/frankston_film_prep.py --stage-local-run 3
python scripts/frankston_film_prep.py --list-kanban-leads
```

Outputs: Frankston CRM summary, full URL list, kanban candidates, optional local DB staging for autonomous run #3.

---

## Related docs

- `text_agent_interface` — `CZA-Video-Deliverables-List.md` (in Downloads / marketing folder)
- `CRM-Testing-Checklist.md` — Frankston member smoke paths
