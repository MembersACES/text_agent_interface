# PR 1 — amendments to the Ask-mode plan

Send these with the original prompt when you switch to Agent mode. The plan is
sound; these five change behaviour, and #5 is the one that matters most.

## 1. Keep the DOMParser fix

The plan correctly spotted that `vitest.config.ts` runs `environment: "node"`, so
`DOMParser` is undefined in tests. Guard it with the tag-strip fallback as
proposed. Do not add jsdom.

## 2. `validateTemplate` must receive the MAPPED subset, never `MERGE_FIELDS`

The plan's test example calls `validateTemplate(template, MERGE_FIELDS)`, and its
page section says "against mapped fields only". Only the second is correct, and
it must be true everywhere.

Why it matters: `industry` is in `MERGE_FIELDS`. If the operator maps the
Industry column to **Intelligence** and still types `{{industry}}`, validating
against `MERGE_FIELDS` passes, and `renderTemplate` then substitutes empty
because the key is absent from the merge row. The operator gets a silently
degraded email with no error.

Required behaviour: a token that names a known merge field which is **not
currently mapped** is a hard error in the red strip, worded distinctly —
"`{{industry}}` is held back for this campaign" — not the generic unknown-token
message.

Add a test for exactly that case.

## 3. Token regex: tolerate whitespace, and fail loudly on case

`/\{\{([a-z][a-z0-9_]*)\}\}/g` misses two things operators will type:

- `{{ first_name }}` with spaces — allow optional inner whitespace:
  `/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g`
- `{{First_Name}}` — matching only lowercase means this never matches, never
  errors, and ships to the client as literal `{{First_Name}}`.

Match any case in the regex, then compare against the mapped keys
case-sensitively so a case mismatch surfaces as an unknown token in the red
strip. Loud beats silent. Add a test for `{{First_Name}}`.

## 4. contenteditable will split tokens across nodes

Typing `{{first_name}}` by hand in a contenteditable can produce
`{{first_<span>name}}` or `&nbsp;` inside the braces, and `extractTokens` runs
over `innerHTML`. Before extracting or rendering, normalise: decode `&nbsp;` to a
space and strip zero-width characters. Prefer the token picker for insertion and
say so in the hint text under the editor.

Do not attempt to fully sanitise or reparse the HTML in this PR — note it with
the sanitiser follow-up for PR 2.

## 5. Duplicate handling must GROUP and SURFACE, not silently drop

**Change this from the original spec.** My §4.2 said "duplicate email within the
upload → mark later rows `suppressed/duplicate`". That is wrong, and the GCI data
proves it: the source list repeats each business roughly seven times, so
row-level dedupe would have kept one row, silently discarded the rest, and
reported nothing unusual. The operator would never have learned the list was
duplicated.

Required behaviour in the mapping/validation step:

- Group rows by `contact_email` (normalised lowercase).
- Show the group count prominently as a headline pair:
  **"78 rows · 12 unique recipients"** — both numbers, always, even when equal.
- List the groups with more than one row, showing how many rows each covers and
  whether the other mapped fields within a group are identical or differ.
- If any group has rows that differ on a mapped field, flag it in amber: the
  operator must choose which row represents that recipient. Do not pick one
  automatically.
- The row stepper and coverage summary operate on **unique recipients**, not raw
  rows, once grouping is applied.

This is the check that catches a broken source file before anything is sent, and
on real data it is the single most valuable thing on the page.

## 6. Also worth doing while you are in there

Add a column-alignment sanity check to the import summary: for each mapped
column, what fraction of values look like the right shape (state in a known set,
email containing `@`, phone containing 8+ digits). Report anything under 90% as
an amber warning naming the column.

Rationale: the GCI source had 15 rows shifted one column to the right, which put
contact names in the phone field and dates in the rate field. A shape check on
the mapped columns would have surfaced it immediately.
