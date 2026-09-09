# Cursor prompt — Campaign lane, PR 1: merge template + live preview

First PR of the plan in `docs/campaign-lane-plan.md`. Read §2 (Hard rules) and
§5 of that file before starting.

**Frontend only. No backend, no database, no API route, no migration.** Nothing
is persisted in this PR — state lives in the component. Do not add the page to
the sidebar (`src/components/Layouts/sidebar/data/index.ts`) or to
`src/lib/route-titles.ts`; this ships unlinked and is reached by URL until PR 2
gives it somewhere to save to.

## Why this PR exists

It is the smallest piece of the campaign lane with independent value, and it
forces the merge-field map to be settled early — which is what makes Hard Rule 1
(the field split) enforceable later.

## Deliverables

### 1. `src/app/autonomous-agent/campaign-preview/page.tsx`

A single client page with three stacked sections: **Upload → Map columns →
Compose & preview**. No routing between steps, just sections that light up as
the previous one completes.

### 2. `src/app/autonomous-agent/_components/MergeTemplateEditor.tsx`

The two-pane authoring component. Follow the exact structural pattern of
`_components/SignatureHtmlEditor.tsx` — contenteditable authoring pane on the
left, read-only output pane on the right, `useLayoutEffect` guarding against
clobbering the DOM while focused, `onInput`/`onBlur` emitting upward. Same
Tailwind idiom, same `cn()` from `@/lib/utils`.

Difference: the right pane shows the **rendered merge result for the selected
row**, not the raw HTML. Add a small tab control on the right pane for
`Rendered` / `HTML` / `Plain text`.

### 3. `src/lib/merge-template.ts`

Pure functions, unit tested. No React.

```ts
export type MergeField = { key: string; label: string };

export function extractTokens(template: string): string[];
export function validateTemplate(template: string, allowed: MergeField[]):
  { ok: true } | { ok: false; unknown: string[] };
export function renderTemplate(
  template: string,
  row: Record<string, string>,
): { output: string; unresolved: string[] };
export function htmlToPlainText(html: string): string;
```

Token syntax is `{{snake_case}}`. `renderTemplate` substitutes known tokens,
leaves unknown ones **visibly intact** in the output (never silently blanked),
and reports every token that resolved to an empty string in `unresolved`.

### 4. `src/lib/csv.ts`

A minimal RFC-4180 parser: quoted fields, embedded commas, embedded newlines
inside quotes, doubled `""` escapes, and a leading UTF-8 BOM. Returns
`{ headers: string[]; rows: string[][] }`.

**Do not add a CSV dependency.** `package.json` has no CSV library and
`CLAUDE.md` forbids heavy dependencies for single-purpose work. This is about
sixty lines.

## Behaviour

### Upload

File input plus drag-and-drop, `.csv` only, parsed entirely in the browser —
the file must not be uploaded anywhere in this PR. Show row count and header
count once parsed. Reject a file with zero data rows with a clear message.

### Map columns

One row per uploaded header. Each maps to either a merge field or the explicit
option **"Intelligence — do not send"**.

Merge fields available: `first_name`, `contact_name`, `company_name`,
`contact_email`, `contact_phone`, `state`, `city`, `postcode`, `industry`.

Rules:

- Default every unmapped header to **Intelligence**, never to a merge field.
  Intelligence is the safe default and the UI must reflect that.
- Auto-suggest a mapping on exact and near-exact header match (case- and
  punctuation-insensitive, so `Company Name:` → `company_name`,
  `Email.` → `contact_email`). A suggestion is pre-selected but always
  overridable.
- A merge field may be used at most once. Selecting one already in use clears
  the previous holder.
- Derive `first_name` from `contact_name` when `contact_name` is mapped and
  `first_name` is not — first whitespace-delimited token. Show it in the mapping
  list as a derived row so it is not invisible.
- Show a persistent count: "9 fields will be sent · 15 columns held back".

Intelligence-mapped columns must not appear in the token picker, must not be
substitutable by `renderTemplate`, and must not appear in the preview. Test this.

### Compose & preview

- Subject line input (single line, same token rules as the body).
- Body via `MergeTemplateEditor`.
- **Token picker**: chips for every mapped merge field only. Clicking inserts at
  the caret.
- **Row stepper**: `‹ Row 3 of 78 ›` plus a jump-to-row input. Preview updates
  live.
- **Unresolved token warning**: an amber inline strip listing tokens that
  resolved to empty for the current row — "this row has no `industry`". Not a
  toast; it must persist while the row is selected.
- **Unknown token error**: a red strip naming any `{{token}}` not in the mapped
  set. This is a hard error state — surface it, and disable nothing else, but
  make it impossible to miss.
- **Coverage summary** across all rows: for each token used in the template, how
  many rows would render it empty. This is the check that catches "40 of 78 rows
  have no contact name" before a send, and it is the most valuable single number
  on the page.

## Constraints

- The contenteditable pane means user-authored HTML. There is no sanitiser in
  `package.json`; do not add one in this PR and do not render untrusted HTML from
  anywhere except the operator's own editor. Note it as a follow-up in the PR
  description — sanitisation belongs with PR 2 where templates get persisted and
  replayed.
- Follow the repo conventions in `CLAUDE.md`: `@/*` alias, existing `ui/`
  primitives (`input`, `select`, `textarea`, `button`, `badge`, `empty-state`
  all exist — check `src/components/ui/` before writing any primitive), Tailwind
  with the Prettier class sorter, dark mode via the `dark:` variants already used
  throughout `autonomous-agent/`.
- Keep `merge-template.ts` and `csv.ts` free of React and DOM APIs except
  `htmlToPlainText`, which may use `DOMParser`.

## Tests (`vitest`, already installed — `npm test`)

Cover in `src/lib/__tests__/`:

1. `extractTokens` finds repeated and adjacent tokens, ignores `{ single }` and
   `{{ }}` empties.
2. `validateTemplate` returns every unknown token, not just the first.
3. `renderTemplate` substitutes correctly; leaves unknown tokens intact;
   reports empty-resolved tokens in `unresolved`.
4. **An intelligence-mapped column is not substitutable** — build a row where
   the raw CSV had `$ per GJ`, map it to Intelligence, and assert
   `{{current_rate}}` and any variant renders unsubstituted and the value `16.76`
   appears nowhere in the output. This is the Hard Rule 1 regression test and it
   is the most important test in the PR.
5. CSV parser: quoted commas, embedded newline, doubled quotes, BOM, ragged rows
   (pad short rows rather than throwing).

## Acceptance

Drop `Claude outputs/GCI-target-list-2026-27.csv` on the page. The `XX_`-prefixed
columns default to Intelligence with no manual action. Compose a subject and body
using the token chips. Step through rows and watch the preview change. The
coverage summary reports empties per token. Nothing in the preview, the HTML tab
or the plain-text tab ever contains a rate, ACQ, MIRN, ABN or contract date.

## Out of scope

Persistence, campaign records, sending, suppression, scheduling, Google Sheets,
the sidebar entry. All PR 2 and later.
