# Discrepancy tooling — dev plan (REV 2, FOR REVIEW)

*23 Jun 2026. Goal: a single "Discrepancy" group on the dashboard holding all discrepancy tools,
each clearly distinct, callable, testable side-by-side on dev. Nothing built from this rev yet.*

## New nav structure — a "Discrepancy" group (near Automation)

A new collapsible group **"Discrepancy"** (added to `JOB_GROUPS`, beside *Automation*), containing:

| # | Entry label | Route | What it is |
|---|---|---|---|
| 1 | **Discrepancy Check** | `/resources/discrepancy-check` (existing) | Your current gas/electricity/DMA sheet-based check. Moved into the group as the first/original tool. Route unchanged. |
| 2 | **ACES Waste Discrepancy Review** | `/resources/utility-discrepancy` (existing) | ACES operational view from utility/Airtable data. **Member-gatekept root** (below). |
| 3 | **Reporting Entity Assurance — Marcus Engine** | `/resources/disc-engine` (existing) | Marcus's independent `reporting_entity` / terms-API view. **Roster picker** (below) so Marcus has his route. |

The two current flat entries ("Disc Engine", "Utility Discrepancy") move **into** this group and are removed
from the Resources section. Routes don't change — this is nav grouping + relabelling only.

## ACES Waste Discrepancy Review — member-gatekept root

Today the page only works when handed `?utility_type=&identifier=` (from the member Utilities-tab button).
New self-contained root so it's usable straight from the nav:

1. **Land on a CRM member picker** (reuse the existing member-search pattern used on `crm-members` /
   `BusinessInfoTool`). Nothing loads until a member is chosen.
2. On select → `POST /api/get-business-info` (by `business_name`) → read `Linked_Details.linked_utilities`.
3. **If Waste is linked**, show the waste account(s) (identifier + retailer) → click one to load the
   discrepancy view (the invoiced-vs-calculated table we already have). If a member has no waste, say so.
4. The existing deep-link entry still works: the Utilities-tab button passes the params and **skips the
   picker**, landing straight on the account. So both routes in: pick-a-member, or click-through from a member.

**Self-validating (your Q4 — no manual number gate):** the page flags two things, so bad data surfaces itself:
- *Discrepancy* — invoiced ≠ calculated → "review this invoice."
- *Data-integrity* — the fields don't reconcile with each other (`invoiced − calculated` ≠ stored `Difference`,
  or a value missing) → "numbers don't add up — check source." (This is what replaces me pre-confirming columns.)

## Reporting Entity Assurance — Marcus Engine — roster picker

Add a small **reporting_entity picker** on the `/resources/disc-engine` wrapper: fetch `/api/climate/roster`,
list the entities, click one to load it into Marcus's embed (`?entity=<slug>`). Dev has reporting_entities
(confirmed), so this gives Marcus his expected validation route from the dashboard, no hand-typed URLs.

## Decisions (from your answers)

1. **Grouped** under a new "Discrepancy" group near Automation. ✓
2. **Roster picker** for Marcus's entry. ✓
3. **Rename** the Waste utility-row button → **"Waste Discrepancy Review"**. ✓
4. **Self-validating flags**, no manual number confirmation — the page flags discrepancies AND data-integrity issues. ✓

## Phasing

- **Phase 1 (this rev — for dev side-by-side):** new Discrepancy nav group; move/relabel the 3 entries;
  ACES member-gatekept root + waste click-through + self-validation flags; Marcus roster picker; button rename.
  Local `npm run build` → push to dev.
- **Phase 2 (after dev side-by-side):** assurance-grade polish on the ACES page to match Marcus's feel —
  hero "recoverable" figure, severity pills, plain-English findings, and the click-to-expand **bin-by-bin
  evidence** (built to show its working + flag if the bins don't sum to the calculated total).

## Files touched (Phase 1)

- `src/components/Layouts/sidebar/data/index.ts` — new "Discrepancy" group; move the 3 entries in.
- `src/lib/route-titles.ts` — titles for the renamed pages.
- `src/app/resources/utility-discrepancy/page.tsx` — member-picker root + waste click-through + self-validation.
- `src/app/resources/disc-engine/page.tsx` — reporting_entity roster picker.
- `src/components/crm-member/tabs/UtilitiesTab.tsx` — button label → "Waste Discrepancy Review".
- Backend: **none** (reuses `/api/get-business-info`, `/api/utility-invoice-rows`, `/api/climate/roster`).

## To confirm at build time (not blockers)

- Exact reusable member-search component (crm-members vs BusinessInfoTool) — I'll pick the lightest fit.
- New group placement: sibling group beside Automation (recommended) vs nested inside it.
- Whether the ACES root should also list non-waste linked utilities now (greyed "coming soon") or waste-only.

---

## BUILT — 23 Jun (Phase 1 + 2, ready for dev)

Shipped, ESLint + type-check clean, all writes byte-verified:

- **Discrepancy nav group** (beside Automation) with: Discrepancy Check · ACES Waste Discrepancy
  Review · Reporting Entity Assurance — Marcus Engine. The two old flat Resources entries removed.
- **ACES Waste Discrepancy Review** (`/resources/utility-discrepancy`): member-gated root (search →
  `get-business-info` → click a linked waste account); deep-link still skips the gate; hero overcharge
  figure; severity-graded findings; plain-English per row; expandable **bin-by-bin evidence** that
  **self-reconciles** to the calculated total and flags itself if it doesn't; data-integrity flags;
  raw-fields toggle.
- **Reporting Entity Assurance — Marcus Engine** (`/resources/disc-engine`): reporting_entity **roster
  picker** (from `/api/climate/roster`) loads any entity into Marcus's embed; relabelled; cross-linked.
- **Utilities-tab button** renamed → "Waste Discrepancy Review".
- Backend: unchanged.

### Push to dev
1. `npm run build`  (must pass locally — full typecheck).
2. Stage only these paths (NOT `git add -A`):
   `git add src/app/resources/disc-engine src/app/resources/utility-discrepancy src/components/crm-member/tabs/UtilitiesTab.tsx src/components/Layouts/sidebar/data/index.ts src/lib/route-titles.ts scripts/build-disc-engine.mjs vendor/disc-engine public/disc-engine docs/disc-engine-INTEGRATION-for-prograde.md docs/disc-engine-integration-plan.md docs/discrepancy-tools-dev-plan.md`
3. Commit + push to your dev branch → Cloud Build deploys to dev Cloud Run.
4. Test: Discrepancy group → all three entries. ACES page: search a member with waste (Frankston).
   Marcus page: pick a reporting_entity from the dropdown.
