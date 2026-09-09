# Cursor prompt — Campaign lane, PR 3: test send, stub Offers, bulk start

Third PR of `docs/campaign-lane-plan.md`. Needs PR 2 merged.

This is the PR where a campaign can put email in front of a human, so the safety
rules below are the substance of it, not decoration.

## The one-line summary

A `draft` campaign can send to **exactly one address you type in**, and to
nothing else. Only a `ready` campaign can send to its list. There is no path that
skips that.

---

## 1. Test send — build this first

The operator must be able to fire the real first-touch email at an arbitrary
address, using a real recipient's merge data, without touching the list.

**UI** — a panel on the campaign page, available in `draft`:

- **Send test to:** free-text email input, defaults to the logged-in user's
  address.
- **Using merge data from:** the recipient stepper's current selection, shown by
  name so it is obvious whose data is being borrowed (`Recipient 7 of 41 —
  Polystar Pty Ltd`).
- **Send test** button, with the resolved subject line shown beneath it.

**`POST /api/autonomous/campaigns/{id}/test-send`**, body `{to, row_id}`:

- Renders subject and body from that row's `merge_json`, through the same render
  path a real send uses. Not a separate code path — if the preview and the test
  send can disagree, the test is worthless.
- Prefixes the subject with `[TEST]`.
- Sends through the same email service as the sequence (`n8n` webhook), so
  deliverability, signature and threading behave identically.
- Creates **no** run, **no** Offer, **no** `campaign_rows` change.
- Writes a `campaign_events` row: who sent, to where, which row, when.
- Rate limit: 20 test sends per campaign per hour. Enough to iterate, not enough
  to become a sending channel.

**Guards:**

- `to` must be a single valid address. Reject lists, commas, semicolons, BCC.
- Works in any status. This is the one send that is always allowed.
- The `[TEST]` prefix is not optional and not configurable.

## 2. Stub Offers

Created at **start**, never at import or save. A `draft` campaign creates zero
CRM rows.

For each `pending` row, create an `Offer` with:

- `business_name` from `merge_json.company_name`
- `client_id` null
- `utility_type` `"gas"`
- `status` `autonomous_agent_trigger` so the existing Autonomous Agent workspace
  Running tab picks it up
- `campaign_id` — **new nullable column on `offers`**, added in this PR, so
  campaign stubs can be filtered out of the normal pipeline views with one
  predicate. Add that filter to the existing Offers list view.

**Every figure field stays NULL**: `annual_savings`, `current_cost`, `new_cost`,
`contracted_rate`, `offer_rate`, `annual_usage_gj`, `estimated_value`, and the
TOU rate fields. The email agent merges offer activity metadata into the drafting
context (`autonomous_agent_backend/src/clients/db.py:614`), so a figure written
here reappears in a drafted email. That is the Hard Rule 1 leak path through the
back door, and it is the single easiest way to undo everything PR 1 and 2 did.

Test: start a campaign whose `intelligence_json` is full of rates and volumes;
assert every figure column on every created Offer is NULL.

## 3. Bulk start

`POST /api/autonomous/campaigns/{id}/start`. Only from `ready`.

For each row where `row_status = 'pending'` **and** `human_only = false` **and**
`recipient_key` is not on the suppression list:

1. Create the stub Offer.
2. Create the `autonomous_sequence_run` with `context_json = merge_json`, the
   campaign's `sequence_type`, and the contact fields.
3. Set `row_status = 'started'`, store `run_id` and `offer_id`.

**Required properties:**

- **Idempotent.** A row with a `run_id` is skipped. Nothing else in this engine
  is idempotent; do not add a second place that can double-send.
- **Resumable.** A failure partway leaves started rows started; re-running
  continues.
- **Throttled.** Respect `daily_cap` and the send window. Rows beyond the cap
  stay `pending` for the next window rather than erroring.
- **`human_only` rows are never started.** Not skipped-with-a-warning — never
  passed to the loop at all.

Set campaign `status` to `sending`, then `done` when no `pending` rows remain.

`POST /{id}/pause` sets `paused` and stops further starts. It does **not** stop
runs already going — that is what the existing per-run stop is for. Say so in the
UI text so nobody assumes pause is a kill switch.

## 4. The `ready` gate

Already specced in PR 2 §3. Add one more precondition here: a campaign cannot go
`ready` until **at least one test send has been recorded** for it. If nobody has
looked at the real email, it does not go to a list.

## 5. Suppression, minimum viable

Enough to send safely; the full treatment is PR 4.

- `suppressions` table: `email` (normalised, unique), `reason`, `source`,
  `created_at`.
- Checked at start, and again immediately before each email dispatch — someone
  who unsubscribes on day one must not receive the day-three step from a run
  already scheduled.
- Unsubscribe link with a signed token in the first-touch template, public
  endpoint, one click, no confirmation step, writes the suppression and stops any
  live run for that address.
- `List-Unsubscribe` and `List-Unsubscribe-Post` headers on campaign email.

## 6. Sidebar

Now the page does something, add it to
`src/components/Layouts/sidebar/data/index.ts` and `src/lib/route-titles.ts`.
Rename the route from `campaign-preview` to `campaigns`.

## Tests

1. Test send creates no run, no Offer, no row change; writes one event.
2. Test send rejects a comma-separated `to`.
3. Stub Offers have every figure column NULL.
4. Start is idempotent — running twice creates one run per row.
5. `human_only` rows are never started.
6. Suppressed addresses are never started.
7. `ready` is refused with zero recorded test sends.
8. Cap of N starts exactly N and leaves the rest `pending`.

## Out of scope

Bounce handling, open/click tracking, DNC washing and the voice/SMS gate — PR 4.
For the first live campaign, run email-only.
