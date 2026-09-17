# Contract ending — follow-up plan

Reporting columns (business name, state, contact, portal) shipped first. This plan covers the rest of the ops request: contacted / relationship handling, LLM outreach, and NMI/MRIN end-date cross-check.

Written after the reporting-only change. Do not start automation until the reporting list has been used for a cycle and the product questions below are confirmed.

---

## What is already live

The Contract Ending / Expiring page lists C&I Electricity and C&I Gas with:

- Business name and state (member + pricing context)
- Contact name, email, phone (Mobile / Landline chip)
- Portal link to `/crm-members/{id}`, or member search by name if unmatched
- Retailer, NMI/MRIN, end date

Sync from the Member ACES Data sheet still **only fills blank Airtable end dates**. It never overwrites an existing date. That is the main data bug the cross-check phase must fix.

---

## Product questions to lock before Phase 2

1. **Checkbox grain:** per member (recommended) vs per NMI/MRIN. Per member matches “we have a relationship with this member.” Per site only if one site is relationship-managed and another is not.
2. **One checkbox or two fields:** the email asked for a contacted box that also removes the member from auto LLM. Those are different states (contacted this cycle vs never auto-contact). Recommend two fields; UI can still look like one tick for relationship-managed.
3. **Who services the member:** use existing CRM `owner_email`, or a separate “serviced by” list.
4. **Window:** 4 months, 6 months, or a 4–6 month band. Confirm whether ended-but-unsigned sites stay in the LLM universe.

---

## Phase 2 — Contacted + relationship (no sending)

Goal: the list can be worked by humans, and later automation can read the same flags.

### Data (CRM DB, not Airtable)

New table, e.g. `contract_ending_outreach`, keyed by **client_id** (and optionally identifier if we decide per-site):

| Field | Purpose |
|---|---|
| `servicing_mode` | `auto` (default) or `relationship` |
| `owner_email` | copy/display of CRM owner; who would call personally |
| `outreach_status` | `not_contacted` / `contacted_llm` / `contacted_manual` / `attempted` / `do_not_contact` |
| `contacted_at`, `contacted_by` | audit |
| `notes` | optional |

Ticking “contacted / relationship” sets `servicing_mode = relationship` and `outreach_status = contacted_manual` (or LLM if we later stamp it from a sequence). Untick returns to `auto` / `not_contacted` only if a human confirms — do not silently re-queue.

### UI

- Checkbox column on the reporting table.
- Persist immediately (PATCH). Show who/when on hover.
- Filter: Hide relationship-managed / Hide already contacted.
- Show `owner_email` when present (“Serviced by”).
- Landline chip stays as a hint that LLM voice/SMS must not be used.

No emails, SMS, or calls in this phase.

---

## Phase 3 — NMI / MRIN new-contract cross-check

Goal: if a new contract is signed against the same identifier, the end date on this list updates (or is proposed) so we stop chasing a dead term.

### Detection

For each NMI/MRIN, compare:

1. Airtable `Contract End Date` (what the page shows today)
2. Max end date on Member ACES Data sheets (17th C&I E, 13th Signed C&I Gas) — already keyed by identifier, including checksum-digit matching in `contract_ending_sheet.py`
3. Signed-via-ACES / FILE_IDS / offer `identifier` when a new signed artefact exists

**Flag** when sheet or signed artefact date is **later than** Airtable.

### Apply rule

- Never move a date backwards without a human.
- Auto-update Airtable only when the new date is later **and** there is a signed-contract artefact for that identifier.
- Otherwise show “Newer contract found” + **Update end date** (reuse existing PATCH).
- Add a filter: Sheet date newer than Airtable. Rows on the “ended” tab with a newer sheet date are the smoking gun.

Reuse the existing identifier matcher. Do not invent a second NMI/MRIN normaliser.

This phase can run in parallel with Phase 2. It has no dependency on LLM sending.

---

## Phase 4 — LLM outreach (4–6 months out)

Do not model this as another offer follow-up template. It is a **renewal** trigger: due when `contract_end_date` falls in the window, not when an offer is sent.

### Universe

1. C&I E / C&I G with an end date in the agreed window (and not already ended, unless product says otherwise).
2. Drop `relationship`, `do_not_contact`, and already contacted this renewal cycle.
3. One sequence per **member/contact**, not per NMI (a 12-NMI site must not get 12 emails).
4. Channel:
   - Email present → LLM email first.
   - Mobile → SMS/call allowed later.
   - Landline only → create a human task; never LLM voice.

### Stop conditions

- New signed contract on that NMI/MRIN (Phase 3).
- Offer already in flight for that identifier.
- Member replies.
- Someone sets relationship / contacted / do not contact.

### Implementation sketch

- New autonomous flow trigger, e.g. `contract_renewal_v1`, scheduled.
- Sequence template owned in the existing autonomous-agent UI.
- Stamp `outreach_status = contacted_llm` when the first step sends.
- Landline-only rows create a CRM task assigned to `owner_email` if set.

---

## Suggested order

| Order | Work | Depends on |
|---|---|---|
| Done | Reporting columns | — |
| Next | Phase 2 flags + checkbox | Product questions 1–3 |
| Parallel | Phase 3 newer-date detection (report first, auto-write later) | — |
| Last | Phase 4 LLM sequence | Phase 2 + 3, and a dry run on the reporting list |

---

## Out of scope until asked

- SME electricity/gas on this page
- Changing offer pipeline stages from this list
- Auto-creating CRM members for unmatched LOA rows
