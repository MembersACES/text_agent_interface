# Campaign lane — cold outbound sequences from an uploaded list

Plan for the 2027–29 Forward Gas Allocation (GCI) campaign, and for every cold
outbound campaign after it. Written 09/09/2026. Read this whole file before
starting; Phase 0 is blocking and the two Hard Rules are not negotiable.

---

## 1. What this is, and what it is not

Every existing autonomous lane is a **follow-up** lane: a document was generated
and sent to a known client, and the sequence chases a response. There is an
Offer, a comparison, a per-client document.

This is an **outbound campaign** lane: a list of prospects, a templated first
touch, then a sequence. There is no offer, no comparison, no per-client document.

Concretely, that means four things the current engine has never had to do:

1. Start hundreds of runs from one import instead of one run per manual click.
2. Send a first-touch email that is **not** LLM-drafted.
3. Hold a suppression list and honour unsubscribes across runs.
4. Keep some uploaded columns permanently out of the agent's reach.

Do not model this as another `*_followup_v1` template with a different slug. It
shares the scheduler, the dispatcher and the stop detection; it does not share
the entry point.

---

## 2. Hard rules

### Rule 1 — the field split

The campaign's own knowledge base (`Autonomous Voice Agent Knowledge Base.docx`)
states, verbatim:

> "Do not quote a prospect's exact contracted price, contract period or annual
> gas quantity unless the prospect has provided or confirmed that information in
> the conversation. Do not say 'we know your current contract' or 'we know what
> you pay.'"

The upload contains exactly those fields. Anything written into
`autonomous_sequence_runs.context_json` becomes visible to both agents — the
email agent receives `{**ctx, **activity_meta}`
(`autonomous_agent_backend/src/clients/db.py:614`) and the voice agent receives
the flattened context via `_build_dynamic_variables` (`db.py:704`). The numeric
guard's allow-list admits **any float-parseable value anywhere in context**
(`src/agents/savings.py:117-133`), so a rate in context is a rate the model is
permitted to say out loud.

Therefore the importer classifies every column into exactly one of two sets, and
the classification is enforced at the persistence boundary, not by convention:

| Set | Columns | Destination |
|---|---|---|
| **Merge** | company_name, contact_name, first_name, contact_email, contact_phone, state, city, postcode, industry | `context_json` |
| **Intelligence** | current rate, ACQ, MIRN, ABN, contract start, contract end, and anything not on the merge list | campaign-row storage only; **never** `context_json` |

Implement as an explicit allow-list. A column that is not on the merge list is
intelligence by default — never the other way round. Add a unit test that
constructs a campaign row with every intelligence field populated, starts a run,
and asserts none of those values and none of those keys appear anywhere in the
serialised `context_json`.

### Rule 2 — the first touch is a merge template, never LLM-drafted

Cold first contact must be the same provable text every time, reviewable before
send and reproducible after. The LLM owns follow-up steps 2..n only.

This also makes the live preview real: a merge preview shows exactly what will
be sent, rather than guessing at what a model might produce.

---

## 3. Phase 0 — blockers (do these first, in this order)

Nothing in Phase 1 works until these clear.

### 0.1 — `offer_id` must stop being mandatory

`autonomous_sequence_runs.offer_id` is `nullable=False` with an FK to `offers.id`
(`text_agent_backend/models.py:417`), and `AutonomousSequenceStartRequest.offer_id`
is required (`schemas.py:980`). Cold prospects have no offer.

Two options — pick one and write it down:

- **(a) Make it nullable.** Migration on `autonomous_sequence_runs`, make
  `offer_id` optional in the start schema, and audit every read path that assumes
  an offer exists — including `restart_sequence_from_finished_run`
  (`services/autonomous_sequence.py:1423-1425`) and the run-detail metrics
  sidebar. Cleanest long-term.
- **(b) Create a lightweight Offer per prospect at import.** No migration, and it
  gives you CRM pipeline tracking for free, since `/autonomous-agent` already
  keys off Offer statuses (`src/constants/crm.ts:17-18, 36-37`). Costs you N offer
  rows of pipeline noise per campaign and needs a bulk-create path that does not
  exist yet.

Recommendation: **(b) for the first campaign, (a) as the real fix.** (b) gets GCI
out the door without a migration on a table three services read; (a) stops every
future campaign polluting the offer pipeline. Do not do (a) in the same PR as
Phase 1.

Also note the uniqueness constraint: one running run per
`(offer_id, sequence_type)` (`autonomous_sequence.py:1605-1623`). Under (b) each
prospect has its own offer so this is satisfied; under (a) it needs revisiting,
because many runs would share a null offer.

### 0.2 — the savings block needs a per-lane escape hatch

`EmailAgent.draft` calls `savings_facts()` unconditionally with no lane check
(`autonomous_agent_backend/src/agents/email_agent.py:25`) and always injects one
of two hardcoded blocks (`:38-54`). With no figures present it emits:

> "Refer the client to the figures in the proposal already sent, and offer to
> walk through them."

There is no proposal. For this campaign that sentence is simply false, and it
will appear in follow-up emails to cold prospects.

Add a third mode, selected by the template rather than by a slug comparison — a
`figures_mode` column on the sequence template with values
`comparison` (today's behaviour) / `none`. In `none`, replace the block with:

```
Savings rules — these are ABSOLUTE:
- No figures of any kind are available for this prospect.
- Do NOT state any dollar amount, rate, percentage, volume or estimate.
- Do NOT refer to a proposal, comparison or document as though one has been sent.
- If pressed for a number, say pricing is indicative and depends on final
  confirmed group volume, and offer to have a consultant follow up.
```

Do **not** implement this as `if sequence_type == "..."`. There are already five
such branches for the solar engagement lane
(`autonomous_sequence.py:1365-1372, 1637-1644, 1689-1691`) and they are the
reason this is hard to extend.

The indicative range A$12.00–18.00/GJ belongs in the **template's extra context**
and in the Retell prompt as fixed text — never as a per-prospect variable the
model can re-derive or scale.

### 0.3 — per-lane email wording must actually reach the worker

The CRM writes the column `system_prompt` (`main.py:12471-12480`); the worker
reads `email_system_prompt` and `sms_system_prompt`
(`autonomous_agent_backend/src/db/models.py:27,29`, used at `db.py:616,636`).
Different columns. Whatever is typed into a template's Email tab today does not
reach the drafting agent.

Verify against **prod Postgres**, not the checked-in dev sqlite — the worker runs
in prod, so prod most likely has the worker's columns and the CRM is writing to
one nothing reads. Then reconcile on one set of names and delete the other.

This campaign is entirely about lane-specific email wording, so it cannot ship
before this is fixed.

---

## 4. Phase 1 — the campaign lane

### 4.1 Data model

New table `campaigns`:

| column | notes |
|---|---|
| `id`, `name`, `sequence_type` | `sequence_type` FKs the template that supplies the cadence |
| `status` | `draft` / `ready` / `sending` / `paused` / `done` |
| `first_touch_subject`, `first_touch_html`, `first_touch_text` | the merge template (Phase 2) |
| `merge_field_map` | JSON: uploaded header → canonical merge key |
| `send_window_start`, `send_window_end`, `daily_cap` | throttling |
| `created_by`, `created_at` |

New table `campaign_rows`:

| column | notes |
|---|---|
| `id`, `campaign_id` | |
| `merge_json` | **only** merge-set fields — this is what becomes `context_json` |
| `intelligence_json` | everything else; never leaves the server |
| `row_status` | `pending` / `suppressed` / `started` / `failed` |
| `suppression_reason` | `unsubscribed` / `bounced` / `dnc` / `manual` / `duplicate` |
| `run_id` | set once the sequence starts |

Keeping the two blobs in separate columns is what makes Rule 1 testable.

### 4.2 Import

CSV upload, not Google Sheets API — a file drop needs no new OAuth scope and no
Drive permissions, and the user exports from Sheets in one click. Revisit only if
someone asks for live re-sync.

Flow: upload → parse headers → **column mapping screen** (each uploaded header
mapped to a merge key, or explicitly marked "intelligence — do not send") →
validation → preview of the first five rows as they will be stored, both blobs
shown side by side → save as `draft`.

Validation at import, all non-fatal and surfaced as counts:

- email present and syntactically valid
- phone normalises to E.164 via `src/lib/au-phone.ts:13` `checkAuPhone` — reuse
  it, do not write a third copy (there is already a private duplicate at
  `InfoToolPage.tsx:49`)
- duplicate email within the upload → mark later rows `suppressed/duplicate`
- email present on the suppression list → `suppressed/unsubscribed`

Show the operator a summary before they can move to `ready`: N rows, N valid
emails, N valid phones, N suppressed and why.

### 4.3 Bulk start

`POST /api/autonomous/campaigns/{id}/start`. Iterates `pending` rows, creates the
offer (option b) or null-offer run, writes `merge_json` as `context_json`, and
schedules. Must be:

- **Idempotent** — a row that already has a `run_id` is skipped. The engine has
  no idempotency anywhere today; do not add a second place that double-sends.
- **Throttled** — respect `daily_cap` and the send window; 78 emails landing in
  one minute from a new sending pattern is a deliverability problem regardless of
  everything else.
- **Resumable** — a failure partway leaves started rows started.

---

## 5. Phase 2 — first-touch template and live preview

### 5.1 The merge template editor

Reuse the pattern in `SignatureHtmlEditor.tsx:36-63` — a contenteditable
authoring pane beside a read-only rendered pane. Same component shape, different
payload.

Merge tokens: `{{first_name}}`, `{{company_name}}`, `{{contact_name}}`,
`{{state}}`, `{{industry}}`. The token picker is populated **from the campaign's
`merge_field_map`**, so intelligence columns are not offerable — the operator
cannot insert `{{current_rate}}` because it is not in the list.

Validate on save: any `{{token}}` not in the merge map is a hard error naming the
token. This is the gap that bit the voice prompts — nothing today lints an
unknown placeholder, and a typo is silent until a client sees it.

### 5.2 The preview

Live-updating, driven by a row picker defaulting to row 1:

- rendered HTML as the recipient sees it
- a plain-text tab (the text alternative is what many corporate clients render)
- **unresolved-token warnings** — this row has no `industry`, so
  `{{industry}}` renders empty; show it in the preview rather than sending it
- a "next row" control so the operator can click through five or ten real rows
  and see the merge hold up
- the signature appended exactly as the sequence will append it

This is the smallest genuinely useful piece of the whole plan and it demos on its
own. Consider building it first even though it is listed second.

---

## 6. Phase 3 — suppression and consent

None of this exists today and the campaign cannot send without it.

### 6.1 Suppression list

Table `suppressions`: `email` (normalised lowercase), `reason`, `source`,
`created_at`. Checked at import **and** immediately before every email send —
someone who unsubscribes on day 1 must not get the day 3 email from a run that is
already scheduled.

### 6.2 Unsubscribe

Every campaign email carries a one-click unsubscribe link with a signed token.
The endpoint is public, requires no login, works on first click without a
confirmation step, writes to `suppressions`, and stops any live run for that
address. Under the Spam Act a functional unsubscribe is mandatory on every
commercial electronic message and must keep working for at least 30 days.

Also add `List-Unsubscribe` and `List-Unsubscribe-Post` headers — the bulk
senders' one-click standard, and it materially affects whether Gmail and Outlook
treat a new sending pattern as legitimate.

### 6.3 Voice and SMS hold

Do not dispatch a `voice_call` or `sms` step for a campaign row until the number
has been checked against the Do Not Call Register. Implement as a per-row
`dnc_checked_at` that the dispatcher requires before those channels fire; the
wash itself can be manual for the first campaign, but the gate must be in code.

For GCI specifically: the safest first campaign is email-only until a prospect
replies or completes the form, at which point voice becomes a response to
engagement rather than cold contact.

### 6.4 Sender identification and provenance

The first-touch template must carry accurate sender identification — legal
entity, physical address, contact route.

The provenance sentence is a **campaign-level configurable field**, not
hardcoded copy, and it must describe how the details were actually obtained. The
draft's current claim ("identified through AI-assisted market research and
business data review") is only true if that is genuinely the source. Where a list
came from a third party, APP 5 requires the recipient to be told the
circumstances of collection — so the two supported patterns are:

- **Public-sourced contacts.** Contact details rebuilt from public records, with
  a private list used only to choose which companies to research. The existing
  sentence is then accurate.
- **Third-party sourced contacts.** The email says so plainly and leads with
  removal — a re-permission first touch, no voice or SMS until the prospect
  responds.

Leave the field blank in code and require it to be set before a campaign can move
from `draft` to `ready`.

---

## 7. Out of scope for v1

- Google Sheets live sync (CSV export covers it)
- A/B testing of subject lines
- Open and click tracking — adds consent obligations and deliverability cost for
  little decision value at 78 rows
- Reply classification beyond what the engine already does. The existing stop
  detectors already handle "not interested" and "remove me"
  (`email_analysis_agent.py:30-45`). "Wrong person, here is the right contact" is
  a **new** outcome this campaign needs and does not exist — log it as a follow-up
  rather than scope-creeping v1.

---

## 8. Open questions for Morgan

1. Phase 0.1 — option (a) or (b)? Recommendation is (b) now, (a) later.
2. Prod Postgres: does `autonomous_sequence_type` have `email_system_prompt`, or
   `system_prompt`, or both? Blocks 0.3.
3. Which provenance pattern for GCI (§6.4)? Blocks the send, not the build.
4. Who signs off the first-touch copy before 78 emails go out?
5. Daily cap and send window for a brand-new sending pattern — suggest 25/day
   inside business hours for the first campaign.
