# CRM member Overview — Commercial entity group visual plan

Visual-only restyle of `EntityGroupSection` on `/crm-members/[id]` (Overview tab).  
**No API, save logic, or parent wiring changes.**

Reference mock: Claude design — group identity up front, siblings as clickable rows, LOA ID demoted, assignment controls collapsed when assigned.

---

## Problem

The current card treats every block with equal visual weight: grey status text, LOA record ID, dropdown, and sibling list all compete for attention. The group identity (the thing staff care about) does not read as the headline. Sibling sites look like plain text links rather than navigable member rows. Assignment controls are always visible even when the member is already correctly grouped.

---

## Design intent (what changes and why)

| Change | Why |
|--------|-----|
| **"Part of [Centurion] · 2 sites"** with violet `GroupBadge` | Group is **identity**, not metadata. Badge matches header pill and Groups hub. |
| **Sibling rows** — initials avatar, `StageBadge`, truncated LOA `rec…`, chevron, hover | Reads as something you click; stage and LOA aid disambiguation (e.g. multisite Centurion). |
| **"View group hub →"** in section header | Ties member page to `/crm-groups/[slug]` hub already built. |
| **LOA record ID at bottom** in quiet technical sub-block | CRM↔Airtable linking is important but not the headline; stops competing with group identity. |
| **"Change group" toggle** hides dropdown / Save / New group when assigned | Resting state stays clean; all save logic unchanged, just collapsed until needed. |
| **Unassigned** — amber empty state + controls visible | Staff need assign path immediately when no group. |

---

## Scope

### Primary file

- `src/components/crm-member/EntityGroupSection.tsx`

### May touch (visual only)

- `src/components/crm-groups/GroupBadge.tsx` — reuse; adjust styling only if needed for “Part of” line
- `src/components/crm-member/shared/SectionHeader.tsx` — icon + right-aligned actions (if not already sufficient)

### Do not change (functionality)

Per existing brief — preserve exactly:

- Prop names and callback signatures on `EntityGroupSection`
- Any API URL, request body, or HTTP method
- `CreateGroupForm` props and create/assign flow
- `hasUnsavedChange` / Save button disable logic
- Sibling fetch keyed on `client.entity_group_slug`; filter `m.id !== client.id`
- `Link href={/crm-members/${s.id}}` navigation
- `OverviewTab.tsx`, `use-member-actions.ts`, `page.tsx`
- `BusinessInfoDisplay.tsx`, `ClimateTab.tsx`
- Backend

Use shared primitives: `@/components/ui/*` (card, button, input, select), `GroupBadge`, `StageBadge`, `SectionHeader`. Preserve dark mode.

---

## Visual specification

### 1. Section header

- Add leading icon (e.g. sitemap / network — `ti-sitemap` or Lucide equivalent consistent with app).
- Subtitle (existing helper text): *"Link this site to a multisite commercial group. Separate from the Climate-tab reporting entity."*
- When `client.entity_group_slug` is set: right-aligned **"View group hub →"** link → `/crm-groups/{encodeURIComponent(slug)}`.

### 2. Group status (assigned)

Replace plain *"Current group: X (slug)"* with:

```
Part of  [GroupBadge: Centurion]  ·  2 sites
```

- **N sites:** prefer group `member_count` from the loaded groups list (dropdown already shows `"Centurion (2)"`); fallback `siblings.length + 1`.
- Slug: keep visible, muted, monospace (secondary to display name).
- **Unassigned:** proper amber empty state (not a bare sentence) — e.g. bordered callout or icon + short copy; assignment controls shown inline (no collapse).

### 3. Airtable LOA record ID (demoted)

Move to **bottom** of card in a visually separated sub-block:

- Small muted heading: *"Airtable LOA record ID"* + small link icon
- Existing `Input` + **Save ID** button and hint text unchanged in behaviour
- Reads as technical linking detail, not primary content

### 4. Sibling list — "Other sites in this group"

When `groupSlug` is set and siblings exist (or loading/empty):

- Section label: uppercase tracking label (existing pattern) — *"OTHER SITES IN THIS GROUP"*
- **Compact rows** (each row = existing `/crm-members/{id}` link):
  - Initials avatar (reuse pattern from `member-profile-recent` / `getMemberInitials` if available, or inline 2-letter)
  - Business name (primary)
  - Truncated LOA `rec…` — mono, muted
  - `StageBadge` for `s.stage`
  - Trailing chevron
  - Hover background on row
- Footer CTA: **"View all N sites in hub →"** → `/crm-groups/{slug}` (N = member count or siblings + 1)
- Loading / empty: tidy muted copy (no layout shift)

### 5. Assignment controls (unchanged logic)

Keep: group `Select`, **Save**, **New group**, inline `CreateGroupForm` when open.

**When member is already assigned** (`client.entity_group_id != null`):

- Collapse assign UI behind subtle **"Change group"** toggle (with pencil/edit affordance).
- Expanded: show dropdown + Save + New group exactly as today.

**When unassigned:**

- Show assign controls directly (no toggle).

### 6. Loading / empty states

- Groups dropdown loading: disable select, optional skeleton or muted "Loading groups…"
- Siblings loading: muted inline text
- No siblings: *"No other members in this group yet."* — styled consistently with empty states elsewhere

---

## Data & props reference (read-only for implementer)

```tsx
// EntityGroupSection props — do not change
client: Client;
onSaveEntityGroup: (entity_group_id: number | null) => Promise<void>;
onSaveExternalBusinessId?: (external_business_id: string | null) => Promise<void>;
saving?: boolean;
savingExternalBusinessId?: boolean;
```

**Client fields used:** `id`, `entity_group_id`, `entity_group_slug`, `entity_group_display_name`, `external_business_id`, `business_name`.

**APIs (unchanged):** `GET /api/entity-groups`, `GET /api/entity-groups/{slug}`, `POST /api/entity-groups`, `PATCH /api/clients/{id}`.

---

## Suggested layout order (top → bottom)

```
┌ Commercial entity group          [View group hub →] ─┐
│ [icon]  subtitle (muted)                              │
├───────────────────────────────────────────────────────┤
│ Part of [Centurion badge] · 2 sites    [Change group] │
│                                                       │
│ OTHER SITES IN THIS GROUP                             │
│ ┌ [CS] Centurion SA Investments    [Existing]    > ┐ │
│ │     recioi3Xjzi2Rxy4y                            │ │
│ └──────────────────────────────────────────────────┘ │
│ View all 2 sites in hub →                             │
│                                                       │
│ ── (when Change group expanded, or unassigned) ──     │
│ [Assign dropdown] [Save] [New group]                  │
│ [CreateGroupForm if open]                             │
│                                                       │
│ ── technical sub-block ──                             │
│ Airtable LOA record ID  [link icon]                   │
│ [rec… input] [Save ID]                                │
│ hint text                                             │
└───────────────────────────────────────────────────────┘
```

When unassigned, omit "Part of" line and sibling block; show amber empty state + assign controls + LOA block at bottom.

---

## Verification

- [ ] Assigned member: resting state shows badge + siblings; assign UI hidden until "Change group"
- [ ] Unassigned member: amber empty state; assign controls visible
- [ ] Save group / remove group / create & assign — same behaviour as before
- [ ] LOA ID save — same behaviour; field at bottom of card
- [ ] Sibling links → correct `/crm-members/{id}`
- [ ] Hub links → `/crm-groups/{slug}`
- [ ] Dark mode readable
- [ ] `npm run build` — no TypeScript errors (Button variants: `primary` | `secondary` | `ghost` | `danger` only)

---

## Separate pass (out of scope for this task)

Wider "whole page feels dull" improvements — touch other components; do **after** this lands:

| Area | File(s) | Idea |
|------|---------|------|
| **Header title** | `MemberProfileHeader.tsx` | Lead with **trading name** ("Dwell Village Melbourne City"); demote full legal/trustee name to muted subtitle. Display reorder only. |
| **Stat row** | `MemberProfileHeader.tsx` | Offers / Contracts / LOA / Last activity — small leading icons, slightly heavier numbers. |
| **Empty states** | Sidebar / tasks | "No tasks linked…" — light icon + single action CTA. |

---

## One-line agent prompt

> Visual-only restyle `EntityGroupSection.tsx`: group identity via `GroupBadge` + site count, hub links, clickable sibling rows with `StageBadge`, LOA ID demoted to bottom sub-block, assignment controls behind "Change group" when assigned — preserve all props, APIs, and save logic per `docs/crm-entity-group-section-visual-plan.md`.
