# Cursor prompt — Campaign lane, PR 2: persistence and import

Second PR of `docs/campaign-lane-plan.md`. PR 1 (`docs/cursor-prompt-campaign-pr1-preview.md`
plus `docs/cursor-campaign-pr1-amendments.md`) must be merged first — this PR
gives that page somewhere to save to.

**Backend + wiring. No sending, no scheduling, no Offers, no Retell.** A campaign
saved by this PR does nothing except sit in the database.

## Decision already made

`offer_id` uses **option (b)** from the plan: stub Offers get created per row so
the existing engine is satisfied, rather than making `offer_id` nullable. Those
stubs are created in **PR 3, at start time — not in this PR.** A campaign in
`draft` must not create a single CRM row.

## Tables

### `campaigns`

| column | type | notes |
|---|---|---|
| `id` | pk | |
| `name` | str, required | |
| `sequence_type` | str, required | FK by value to `autonomous_sequence_templates.sequence_type` |
| `status` | str | `draft` / `ready` / `sending` / `paused` / `done`; default `draft` |
| `first_touch_subject` | text | |
| `first_touch_html` | text | |
| `first_touch_text` | text | generated from html on save, stored |
| `merge_field_map` | JSON | uploaded header → merge key, or the intelligence sentinel |
| `provenance_note` | text, nullable | see §Guards |
| `daily_cap` | int, nullable | |
| `send_window_start`, `send_window_end` | str `HH:MM`, nullable | |
| `created_by`, `created_at`, `updated_at` | | |

### `campaign_rows`

| column | type | notes |
|---|---|---|
| `id` | pk | |
| `campaign_id` | fk | |
| `merge_json` | JSON, required | **only** merge-set fields |
| `intelligence_json` | JSON | everything else |
| `recipient_key` | str, indexed | normalised lowercase email — the grouping key |
| `row_status` | str | `pending` / `suppressed` / `started` / `failed` |
| `suppression_reason` | str, nullable | `unsubscribed` / `bounced` / `dnc` / `manual` |
| `run_id` | int, nullable | set in PR 3 |
| `offer_id` | int, nullable | set in PR 3 |

Two separate JSON columns is the point — it is what makes Hard Rule 1 testable
at the storage layer rather than trusted at the UI layer.

## Endpoints

All under `/api/autonomous/campaigns`, same auth as the rest of the autonomous
routes (`get_current_user_with_db`).

- `POST /` — create from `{name, sequence_type}`. Returns the campaign.
- `GET /` — list, newest first, with row counts by status.
- `GET /{id}` — campaign plus its rows (paginated, default 100).
- `PATCH /{id}` — name, template fields, `merge_field_map`, `provenance_note`,
  cap/window. Rejects any change once `status != draft`.
- `POST /{id}/rows` — replace the row set. Body is the parsed rows plus the
  mapping. **Server-side split** (see Guards). Returns the summary counts.
- `DELETE /{id}` — only while `draft`.

No sending endpoint in this PR.

## Guards — these are the reason this PR exists

### 1. The split is enforced server-side, not trusted from the client

`POST /{id}/rows` receives raw rows and the mapping. The server rebuilds
`merge_json` itself from the mapping, using the same allow-list as
`src/lib/merge-template.ts`. It must **not** accept a client-supplied
`merge_json`. Everything not mapped to a merge key goes to `intelligence_json`.

Test: post a payload whose client-supplied merge object contains
`current_rate: "16.76"`. Assert the stored `merge_json` does not contain it, and
that `16.76` appears only in `intelligence_json`.

### 2. Grouping is reported, never silently applied

Compute `recipient_key` per row. Return in the summary:

```
{ rows: 336, unique_recipients: 45, groups_with_conflicts: [...] }
```

Store every row. Do not drop duplicates at import. Which row represents a
recipient is a PR 3 decision made by the operator, not a server default.

### 3. A campaign cannot leave `draft` without the required fields

`PATCH /{id}` to `status: "ready"` returns 400 unless all of: a subject, a body,
at least one mapped merge field, at least one `pending` row, and a non-empty
`provenance_note`. The provenance field is required because the first-touch email
must describe how the contact details were actually obtained — see
`docs/campaign-lane-plan.md` §6.4.

### 4. Sanitise the template HTML on save

PR 1 deliberately left the contenteditable output unsanitised because nothing was
stored. This PR stores it and later replays it into emails, so sanitisation lands
**here**, not later.

Sanitise `first_touch_html` server-side on every write — strip `<script>`,
`<style>`, `<iframe>`, `<object>`, event handler attributes (`on*`), and
`javascript:` / `data:` URLs, keeping the inline formatting tags an email needs
(`p`, `br`, `div`, `span`, `strong`, `b`, `em`, `i`, `u`, `a[href]`, `ul`, `ol`,
`li`, `table`-family, `img[src]` with http/https only). Store the sanitised
version, not the submitted one.

This is the one place a dependency is justified over hand-rolling — use an
established sanitiser rather than regexes. Sanitising client-side as well is
optional; server-side is mandatory, because the client is not the only caller.

Test: post a template containing `<script>alert(1)</script>` and
`<a href="javascript:alert(1)">x</a>`; assert neither survives in the stored row.

### 5. Rows that must never be automated

The campaign knowledge base requires escalation to a human consultant for
"a government, hospital, listed company, large industrial site or other sensitive
account". Today nothing in the design can express that, and on the GCI list it
covers the majority of the load — Nissan Casting and General Mills alone are 132k
of the 250k GJ in the target segment.

Add to `campaign_rows`:

| column | notes |
|---|---|
| `human_only` | bool, default false |
| `human_only_reason` | str, nullable |

Rows flagged `human_only` are stored and shown, are excluded from the `pending`
count used for sending, and in PR 3 must never have a run created. Setting the
flag is a manual operator action in the row list for now — do not attempt to
classify automatically from the company name.

Surface the count next to the recipient count: `45 rows · 43 recipients · 5 human
only`.

### 6. Template validation runs again on the server

Reject `ready` if the subject or body contains a `{{token}}` that is not in the
campaign's own `merge_field_map`. The client already checks this; the server must
not rely on that.

## Frontend wiring

Extend the PR 1 page at `/autonomous-agent/campaign-preview`:

- A campaign picker at the top: new, or load an existing draft.
- Save button persisting name, template, mapping, rows.
- Show the returned summary — `336 rows · 45 unique recipients` — from the server
  response, not recomputed client-side, so the two agree.
- Read-only once `status != draft`.

Still **not** in the sidebar or `route-titles.ts`. That comes with PR 3 when the
page can actually do something.

## Migration

One migration adding both tables. No changes to existing tables in this PR —
`offers` and `autonomous_sequence_runs` are untouched until PR 3.

## Tests

1. The split guard above — the most important test in this PR.
2. `recipient_key` normalisation: case, surrounding whitespace.
3. Grouping summary counts correct on a file where one email covers 10 rows.
4. `ready` transition rejected for each missing prerequisite in turn, including
   the provenance note.
5. Server-side token validation rejects a token mapped to intelligence.
6. Sanitiser strips `<script>` and `javascript:` hrefs on save.
7. `human_only` rows are excluded from the sendable `pending` count.

## Note for PR 3, do not implement now

When stub Offers are created, every figure field on `Offer` —
`annual_savings`, `current_cost`, `new_cost`, `contracted_rate`, `offer_rate`,
`annual_usage_gj` — **must be left NULL**. The email agent merges the offer's
activity metadata into the drafting context (`db.py:614`), so populating any of
those from the spreadsheet would reintroduce exactly the leak Hard Rule 1 exists
to prevent, through the back door.

Add a nullable `campaign_id` to `offers` in PR 3 so campaign stubs can be
filtered out of the normal pipeline views in one predicate.
