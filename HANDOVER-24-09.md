# Handover 24 Sep 2026

No commits. No pushes. No git commands. Nothing was deployed.

## What you should read first

The timeout sentence was already in the tree from last night and I left it alone. The test still requires the exact words: "We could not confirm whether this was sent. Check the inbox before sending again."

A staff member can now create and edit an agreement type with its own first email, chase email, and chase days. Every type still runs on `agreement_followup_v1`. Stop rules are not on the form.

## Suite

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| text_agent_backend `python -m pytest` | 494 | 0 | 0 |
| autonomous_agent_backend `uv run pytest` | 49 | 0 | 0 |
| text_agent_interface `npm test` (vitest) | 49 | 0 | 0 |

The two member-folder failures were wrong patch targets. They now patch `pdf_to_text` and `collect_page_images`, and they pass. The climate failure was the test being over-strict. `test_site_detail_closes_before_airtable_and_returns_bundle` now allows `db.query(Client)` while the session is open, and still fails if that query runs after `db.close()` or if Airtable runs before the close. The climate function was not changed.

The dashboard form was not clicked in a browser. There are no browser tools in this session.

## What I built

### text_agent_backend

- `models.py` — `agreement_followup_types` gained `first_email_subject`, `first_email_body`, `chase_body`, `chase_days` (JSON text). `label` is still the display name. `utility_type` stays NOT NULL; optional means an empty string.
- `services/agreement_followup.py` — create and update validate the copy. Save rejects an empty subject, an empty first body, bad chase days, and any token outside the allow-list, and the error names the token and says it is not available on this lane. `chase_body` is optional. Blank means the model writes each chase. Filled means that exact text is sent on every chase day. Duplicate names, including hidden ones, are still rejected before the copy check. `ensure_agreement_followup_types` adds the columns if they are missing and backfills the first email and `[1, 3, 5, 7]`. It leaves `chase_body` empty, so the four Alinta tiles stay on the model. Start snapshots `chase_body` and `chase_days` onto the run, and does not write a per-send override back to the type.
- `services/autonomous_sequence.py` — if an agreement run has `chase_days`, those days replace the shared template plan. Same 09:00 business-day math. Default `[1, 3, 5, 7]` still produces step days `[0, 1, 3, 5, 7]` after the day-0 insert.
- `agreement_followup_routes.py` — create and update accept `display_name`, optional utility and retailer, the three copy fields, and `chase_days`.
- `tests/test_agreement_followup.py` — one test per guardrail, the byte-identical migration test, the custom copy and days test, and the inherited stop-rule test.

### autonomous_agent_backend

- `src/services/chase_copy.py` — fills tokens in a stored chase body. Missing tokens become empty. HTML is left as HTML. Plain text is wrapped in paragraphs.
- `src/graphs/email_graph.py` — if the run context has `chase_body`, that text is sent and the model is not called. `message_id` is still forwarded. Lanes with no `chase_body` still use the model.
- `tests/test_chase_copy.py` — the stored chase is what gets posted, and a run without one still drafts.
- `tests/test_stop_and_ack.py` — an agreement `stop_on` of signed + negative sentiment does not stop on an invoice.

### text_agent_interface

- `src/lib/agreement-type-copy.ts` — the allow-list, the default wording, and the same guardrails the server enforces.
- `src/lib/__tests__/agreement-type-copy.test.ts` — those guardrails.
- `src/app/autonomous-agent/agreement-follow-up/page.tsx` — one form for create and edit. Chips insert into whichever of subject, first body, or chase last had focus. Paste and blur run the token check. Hide and Show still only toggle `is_active`. The send page still posts `subject` and `body_text` for that one send and does not PATCH the type. The days shown on the send page come from the selected type.

## Decisions I made because you were asleep

- `display_name` is an alias of `label`. I did not rename the column.
- Utility and retailer may be blank. A non-empty utility still has to be one of the existing utility names. Blank utility is stored as `""`, not NULL.
- Chase days are required. Minimum 1, maximum 5, integers, strictly ascending, each from 1 to 30. Omitted on create means `[1, 3, 5, 7]`. An empty list is rejected.
- The agreement allow-list is five tokens: `agreement_label`, `business_name`, `label`, `contact_name`, `company_name`. `{{first_name}}` and `{{current_rate}}` are rejected. The stored first email greets with `{{contact_name}}`.
- `{{company_name}}` is filled with the business name. On the first email, `{{contact_name}}` is the greeting first name, which is what the old filler did.
- A token that is not on that list is rejected at save. Blank-fill remains only for a token that gets past save.
- Backfill: if `first_email_*` is empty and the row already has `default_subject` / `default_body`, those are copied across. Otherwise the row gets the hardcoded first email and `[1, 3, 5, 7]`. `chase_body` is left empty.
- The chase body and chase days are copied onto the run at start. Editing the type later does not change a run that has already started. Runs that are already in flight, with no `chase_body` on the context, still go through the model.
- Origin is not inserted as a fifth seed. Only `alinta_ci_gas`, `alinta_ci_electricity`, `alinta_sme_gas`, and `alinta_sme_electricity` are seeded. A row that already exists, including one named Origin, is backfilled.
- Stop rules stay on the shared agreement template: signed document, explicit stop, hard bounce. An invoice does not stop the run. Nothing on the type form edits that.
- The new-type form opens pre-filled with today's Alinta wording so staff edit it instead of starting from a blank email the server would reject.
- Saving the type you currently have selected does not wipe a one-off edit already typed on the send page.

## 3.1 Success claimed without reading the answer

I did not re-walk step dispatch.

The new type endpoints do not do this. `POST` and `PATCH /api/autonomous/agreement-followup/types` return the saved row only after validation and commit. A bad token or a bad chase day raises before the row is written, and the HTTP error is that message. They do not return `ok: true` for a send. Preview returns rendered copy. The start path is unchanged: a timeout still does not create a run, and a confirmed send still requires a Gmail id.

The chase short-circuit still goes through `EmailService.send`, which already refuses a body that says the send failed. I did not add a new "the HTTP call returned, so it worked" branch.

These older paths do claim success when there was no send. I left them.

- `services/autonomous_sequence.py` `_send_email_placeholder` around line 2484. If `N8N_EMAIL_URL` is empty it logs info and returns `{"ok": true, "mode": "placeholder"}`.
- Same file, `_send_sms_placeholder` around line 2524. Same pattern for SMS.
- Same file, `_voice_retell_placeholder` around line 2549. Empty Retell key returns `ok: true`.
- `services/campaigns.py` around line 993. Empty campaign webhook returns `ok: true` with mode placeholder.

## 3.2 Config read once at import

I did not change any of these.

Loud means the process errors, or it logs an error at boot. Silent means an empty value is stored and execution continues.

### The ones that match the agreement-lane failure

- `text_agent_backend/services/autonomous_sequence.py:833` `N8N_EMAIL_URL`. Silent at import. At send time an empty value is an info log plus `ok: true`. This is the dangerous one.
- `text_agent_backend/services/autonomous_sequence.py:834` `N8N_SMS_URL`. Same. Silent, then a successful placeholder.
- `text_agent_backend/services/autonomous_sequence.py:959` `RETELL_KEY`. Silent. Empty key becomes a successful voice placeholder.
- `text_agent_backend/services/campaigns.py:50` `N8N_EMAIL_URL`. Same variable, second copy, same placeholder success.

### Agreement webhook, which is not that bug anymore

- `text_agent_backend/services/agreement_followup.py:57` reads the webhook at import and stays quiet if it is empty. The send path reads the env again and, if it is still empty, uses the hardcoded n8n URL and logs a warning. Boot logs an error when the env is empty (`log_agreement_followup_webhook_at_boot`). Import of the constant is silent. The send does not die quietly.
- `autonomous_agent_backend/src/api.py:47-53` reads `K_SERVICE` and, at import, logs an error if `settings.n8n_agreement_followup_email_webhook_url` is empty. Loud.

### Worker settings, one object at import

`autonomous_agent_backend/src/config/settings.py:42` builds `Settings()` at import.

Loud. Missing any of these raises and the process does not start: `n8n_email_webhook_url`, `twilio_account_sid`, `twilio_auth_token`, `twilio_from_number`, `retell_api_key`, `retell_agent_id`, `retell_from_number`, `google_api_key`.

Silent defaults, empty is allowed: `backend_api_key`, `database_url`, `n8n_agreement_followup_email_webhook_url` (the api module then logs the error above), `gmail_service_account_json`, `gmail_delegated_user`, `langsmith_api_key`. `langsmith_tracing` defaults to false. `langsmith_project` defaults to `"default"`.

`src/db/session.py` builds the engine from `settings.database_url` at import. A blank URL fails when that module loads, which is loud, but only after Settings has already accepted the empty string.

`src/services/phone.py:14` `_RETELL_BASE` defaults to `https://api.retellai.com`. Silent, and harmless unless you needed a different host.

### CRM values captured at import that are not the webhook bug

Silent, empty or a hardcoded fallback, no boot error:

- `main.py:359` `GOOGLE_CLIENT_ID` — None if unset. Login fails later, not at import.
- `main.py:362` `TASKS_EXTERNAL_API_KEY` — empty string.
- `main.py:363` `TASKS_EXTERNAL_ACTOR_EMAIL` — empty string.
- `main.py:9333` `TESTIMONIAL_STORAGE_FOLDER_ID` — empty string.
- `database.py:15` `DB_TYPE` — defaults to sqlite.
- `database.py:16` `DATABASE_URL` — None if unset. Postgres mode fails when the engine is used.
- `services/autonomous_sequence.py:835` `N8N_ENGAGEMENT_FORM_URL` — empty. The engagement step then generates the form in-process instead of posting. Not a fake webhook success.
- `services/autonomous_sequence.py:958` `RETELL_BASE` — default Retell host.
- `services/retell_agents.py:18` `RETELL_BASE` — same default. The key is read inside the function, not at import.
- `services/airtable_client.py:29` `AIRTABLE_API_KEY` — None. Calls fail when used.
- `services/airtable_client.py:30` `AIRTABLE_BASE_ID` — hardcoded base id if unset.
- `services/airtable_client.py:31` `USE_AIRTABLE_DIRECT` — false if unset.
- `services/airtable_client.py:1275` and the following CI gas/elec reference tunables — numeric defaults, silent.
- `services/member_folder.py:45-54` — Airtable table ids and an n8n URL, all with hardcoded fallbacks.
- `partner_routes.py:41` `N8N_BASE1_WEBHOOK_URL` — hardcoded n8n URL if unset.
- `utils/storage.py:5-7` — `DISABLE_DB_SYNC` defaults false, `GCS_BUCKET_NAME` may be None, sqlite name defaults to `tasks.db`.

Tools and one-off scripts also read env at import, with a sheet id or webhook hardcoded as the fallback. They fail later when the Google or n8n call runs, not at import. I am not listing every sheet id. The files are `tools/alinta_gas_ef.py`, `tools/base1_chat.py`, `tools/business_info.py`, `tools/distributor_agreement.py`, `tools/egb_invoice_number.py`, `tools/loa_business_details.py`, `tools/member_documents.py`, `tools/member_folder_drive.py`, `tools/n8n_file_upload.py`, `tools/new_revenue.py`, `tools/one_month_savings.py`, `tools/one_month_savings_calculation.py`, `tools/return_utility_info.py`, `tools/solar_cleaning_quote.py`, `tools/testimonial_sheet.py`, `tools/testimonial_solution_content.py`, `tools/update_loa_contact_numbers.py`, plus `services/pudu_directory.py` and the scripts under `scripts/`. `scripts/_live_gate_run.py:20-21` is the exception: it indexes `os.environ[...]` at import and raises immediately if those two vars are missing. Loud.

## Started and not finished

- The manage-types form was not exercised in a browser. Paste, blur, save, and the send-page override were checked by tests of the functions, not by clicking.
- I did not add a fifth Origin tile. If production has no Origin row, the dashboard will not grow one on its own.
- Runs already in progress keep the model-written chase. A new run sends a fixed chase only when that type's chase field was filled in.

## Where I think you will disagree

`{{contact_name}}` does not mean the same thing in both emails. On the first email it is the greeting first name, so "Hi {{contact_name}}," renders "Hi Ada,". `{{first_name}}` is rejected, so that is the only greeting token. On a filled chase, the same token is the full name stored on the run, so it can render "Hi Ada Lovelace,". I left the fillers alone because you said to fix the list.

I required at least one chase day. A type that sends the PDF and never chases cannot be saved.

I did not seed Origin. You called it a tile. In this repo it is not one. It is a type someone created, and the tests create it. Backfill covers a row that is already there. It does not create one.

Utility is an empty string, not NULL. `label` was not renamed to `display_name`.

A timeout still does not start a run. The message no longer says the email was not sent. If n8n delivered it, there is still no sequence until someone checks the inbox and deals with it. That was already the agreed behaviour. I am repeating it because it is the remaining hole in "an email that left Gmail always has a sequence," and a timeout is the case where we cannot know whether it left.
