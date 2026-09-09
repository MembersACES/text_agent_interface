# Cursor prompt — new stop condition + acknowledgement drafts

Two changes, both across `autonomous_agent_backend` and `text_agent_backend`.
Applies to **all** lanes, not just campaigns.

## Current state (verified)

- `StopReason` has exactly two values (`src/models/action.py:29-33`):
  `agreement_signed`, `negative_sentiment_stop`.
- Stops happen at `src/flow.py:346` (signed) and `:358` (negative), plus
  `api.py:260` and `sms_webhook.py:107`.
- **Nothing drafts or acknowledges anywhere.** A prospect who returns a signed
  form gets silence.

---

## 1. New stop reason: `invoice_received`

Add `INVOICE_RECEIVED = "invoice_received"` to `StopReason`. The enum docstring
says values must match what the CRM writes — so add it in `text_agent_backend`'s
stop handling and to the dashboard's label map in the same PR, or the run will
render with a blank reason.

### Detection

Add a fifth output to `EmailAnalysis` (`src/agents/email_analysis_agent.py`):

```
is_invoice_received — Has the prospect attached or sent a utility invoice or
bill? Check attachment names (invoice, bill, statement, tax invoice, a retailer
name, .pdf) and explicit statements in the body such as "attached is our latest
gas bill". Set FALSE for an attachment that is clearly something else — a signed
form, a logo, a signature image, a calendar invite. Set FALSE if they only
promise to send one later.
```

### Lane gating — do not hardcode a slug

`invoice_received` must not stop a lane that never asked for an invoice, and
`agreement_signed` should not stop a lane that never sent a form.

Add `stop_on` to the sequence template: a JSON array of stop reasons this lane
honours, defaulting to `["agreement_signed", "negative_sentiment_stop"]` so
existing lanes are unchanged. The GCI/future-gas lane gets
`["invoice_received", "negative_sentiment_stop"]`.

`negative_sentiment_stop` is always honoured regardless of what `stop_on` says —
it is not optional, and the config must not be able to switch it off.

Read `stop_on` in `flow.py` where the analysis result is evaluated, and skip any
condition the lane does not list. **Do not add another
`if sequence_type == "..."` branch** — there are already five of those for the
solar engagement lane and they are why this is hard to extend.

---

## 2. Acknowledgement drafts on stop

When a sequence stops because the prospect **did what we asked**, draft a reply
in-thread. Do not send it.

| Stop reason | Draft? |
|---|---|
| `agreement_signed` | yes |
| `invoice_received` | yes |
| `negative_sentiment_stop` | **no — silence** |
| `manual_stop`, `policy` | no |

Replying to "not interested" is what generates complaints. The silence on that
branch is deliberate; do not make it configurable.

### The acknowledgement is a MERGE TEMPLATE, not LLM-drafted

Two new nullable text fields on the sequence template:
`ack_template_signed`, `ack_template_invoice` (subject + html each, so four
columns, or one JSON column — your call).

Rendered with the same `render_template` merge path the campaign first touch
uses. Reasons this is not LLM-drafted:

1. It is the highest-stakes message in the sequence — they just did the thing —
   and it is entirely formulaic.
2. `EmailAgent.draft` injects the savings block unconditionally
   (`src/agents/email_agent.py:25, 38-54`). With no figures it emits *"Refer the
   client to the figures in the proposal already sent"* — false for an invoice
   thank-you, and false for GCI generally. Templating sidesteps that blocker
   rather than waiting on it.

If `ack_template_*` is null for a lane, log and skip. No draft is better than a
wrong one.

### Mechanism — reuse the existing webhook

Post to `N8N_AUTONOMOUS_EMAIL_WEBHOOK_URL` with `"action": "draft"` and the
thread anchor (`email_id` / `message_id`, whichever the working lanes use).

n8n side: a branch on `action == "draft"` into a Gmail node with
`resource: draft, operation: create`, threaded onto the original message so the
draft appears in the existing conversation rather than as a new one.

Record a `sequence_event` with `event_type = "ack_drafted"` carrying the run id,
stop reason and thread id, so the dashboard can show "draft ready for review".

### Order of operations

Draft **before** marking the run stopped, and do not let a draft failure prevent
the stop. A sequence that fails to stop keeps emailing someone who already
signed; a missing draft is a person not thanked. Stop is the safety-critical
half.

---

## 3. Dashboard

On a stopped run, show the stop reason and, when one exists, an "Acknowledgement
drafted — review in Gmail" line with a link to the thread. Otherwise nobody will
know a draft is waiting and it will sit unsent.

---

## Tests

1. `stop_on` omitted → existing two-condition behaviour, unchanged.
2. A lane with `stop_on: ["invoice_received", "negative_sentiment_stop"]` does
   not stop on `is_document_signed`.
3. `negative_sentiment_stop` fires even when `stop_on` omits it.
4. `invoice_received` → one draft request posted, run stopped, event written.
5. `negative_sentiment_stop` → run stopped, **no** draft request posted.
6. Null `ack_template_*` → run still stops, warning logged, no post.
7. A draft-post failure still stops the run.

---

## Note for Morgan

`flow.py` already references a lane called **`future_gas`** in
`EMAIL_FACTS_LANES`. Check whether that is the GCI lane someone has already
started — reuse that slug rather than creating a second one.
