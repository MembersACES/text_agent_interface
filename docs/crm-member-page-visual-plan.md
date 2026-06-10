# CRM member page — visual modernisation plan

Visual-only pass for `/crm-members/[id]`: header, stat row, sidebar cards, Offers card, and page shell consistency.  
**Goal:** clear hierarchy, disciplined violet accent (`#5750F1` / `primary`), unified card system — feel like a considered product, not a flat internal tool.

Reference mock: Claude header redesign (Box Hill RSL example) — single surface, chip row, styled native stage select, icon stat tiles.

**Prerequisite:** Commercial entity group card already restyled — see `docs/crm-entity-group-section-visual-plan.md` and `EntityGroupSection.tsx`. Match that card system elsewhere.

---

## Core problem

The page has almost no hierarchy or accent discipline:

- Everything is grey-on-white at similar weight
- Cards are framed inconsistently (double borders, mixed radius, mixed header patterns)
- Violet accent appears on one button only
- Header has **card-in-card** framing (`page.tsx` wrapper + `MemberProfileHeader` inner `Card`)
- Stage control is a raw native `<select>` next to styled buttons — different height, no shared baseline
- **Duplicate status:** green `StageBadge` on title line + stage value in select
- Stat row is flat text; agreements tile is confusing; empty values show bare `—`
- Sidebar empty states leave large dead space

---

## Scope lock (read before implementing)

### In scope — visual/layout only

| File | What to change |
|------|----------------|
| `src/components/crm-member/MemberProfileHeader.tsx` | Header identity, action row, stat row — **primary** |
| `src/components/crm-member/MemberSidebar.tsx` | Contact, Tasks, Recent activity cards |
| `src/components/crm-member/tabs/OverviewTab.tsx` | Offers & Quote Requests card shell + empty state; **section-header consistency only** for other Overview blocks (not business-details grid logic) |
| `src/app/crm-members/[id]/page.tsx` | Remove outer header card wrapper; grid + spacing only (Pin §4) |
| `src/components/crm-member/shared/SectionHeader.tsx` | Reuse as-is; add icons where needed |
| `src/components/crm-groups/GroupBadge.tsx` | Reuse for group chip in header |

Optional small extract (visual only): `StageSelectShell.tsx` in `shared/` — styled **wrapper around native `<select>` only**; no custom popover.

### Out of scope — do not touch

| File / area | Reason |
|-------------|--------|
| `BusinessInfoDisplay.tsx` | Project hard lock (~4.8k lines; `/business-info` page) |
| `ClimateTab.tsx` | Hard lock |
| `CleaningRobotDashboard.tsx` | Hard lock |
| Climate / strategy / reporting selects | Hard lock |
| Backend, API routes, hooks logic | No behaviour changes |
| `use-member-actions.ts`, `use-member-data.ts` | No logic changes |
| `EntityGroupSection.tsx` | Already done — only tweak if matching tokens |

### Important clarification: Overview “Business Information”

On the CRM member page, the collapsible **Business Information** block (trading name, addresses, contracts grid) lives **inline in `OverviewTab.tsx`** — it does **not** import `BusinessInfoDisplay.tsx`.

`BusinessInfoDisplay.tsx` is a separate ~4.8k-line component used on `/business-info` only. It remains **hard locked**. Do not conflate the two.

For this pass:

- **Do** align the Overview block’s **outer card shell** (border, radius, header icon pattern) with the unified system — low-risk, no locked file involved
- **Do not** refactor the inner InfoRow / document helpers / collapsible behaviour
- If unsure, leave Business Information inner content unchanged

---

## Pin before running (non-negotiable)

These four decisions prevent the most common “visual pass broke behaviour” regressions. **Read before implementing.**

### 1. Stage control = styled native `<select>` only

**Highest-risk change** — the only “visual” item with real behaviour (PATCH on change, `savingStage` disabled, keyboard).

- **Required:** Keep the real `<select>` for behaviour, a11y, and keyboard. Style its **wrapper** to 36px with matching border/radius; overlay status dot + chevron cosmetically if feasible.
- **Do NOT** build a custom button + popover. That re-implements a form control and is where `onStageChange` / `disabled` / keyboard quietly break.
- Preserve: `onStageChange`, `savingStage`, `CLIENT_STAGES`, `CLIENT_STAGE_LABELS`, parent PATCH via `use-member-actions.handleStageChange`.
- **Priority:** matching height/border to action buttons is the required fix; status dot is polish — ship height/border first if dot styling fights the native select.

### 2. Header must NOT clip dropdown menus

Generate Documents, More, and the native select’s option list must render **above** the card shell.

- Card shell spec uses `overflow-hidden` elsewhere — **do not apply `overflow-hidden` to the header shell** unless menus portal outside it.
- Either: header shell without clip on the action row, or ensure menus use a portal / `z-index` stack that escapes the header bounds.
- **Verify manually:** open all three menus after implementation — clipping won’t show in a static mock.

### 3. `businessInfo` is lazy-loaded — no visible swap flash

Trading name, contracts count, and agreements date come from `businessInfo`, which loads asynchronously after the client record.

- **Do not** promote trading name to `h1` on fetch if that causes a visible swap from legal name → trading name (jarring).
- **Title rule:** Keep **`client.business_name` as stable `h1`** until/unless trading name is available on first paint without swap — or show trading name in **subtitle only** when loaded. Legal/trustee name can move to a muted second line when trading name is shown in subtitle, but **`h1` must not change after load**.
- **Stat tiles:** Use subtle skeletons (or hold previous stable placeholder) while `businessInfo` is loading — **not** “Not loaded” → number flip, which reads as a glitch.
- Contracts / agreements tiles: skeleton or muted “Loading…” until `businessInfo` resolves; then show value once.

### 4. One shell owner — no ambiguity

| Owner | Responsibility |
|-------|----------------|
| **`MemberProfileHeader.tsx`** | Owns the single header shell (border, radius, ring, header + stat row + tabs divider if tabs stay nested). **No inner `Card`.** |
| **`page.tsx`** | Grid, spacing, error/loading states only — **remove** the outer `rounded-xl border …` wrapper around the header |

Do not half-implement both and end up with no border or a fresh double-frame.

---

## Design system (apply everywhere in scope)

### Accent

- **Primary violet:** `primary` (`#5750F1`) — section-header icons, primary CTAs, key figures, active tab indicator
- Use intentionally (~5–10% of surface area), not as wallpaper
- Group identity: existing violet `GroupBadge` / chip pattern

### Card shell (match `EntityGroupSection`)

```
rounded-xl (or consistent ~12px)
ring-1 ring-gray-200/60 dark:ring-gray-700/50
border border-stroke/40 dark:border-dark-3/60
overflow-hidden p-0 — OK for sidebar / Offers / entity-group cards
```

**Header exception:** do **not** use `overflow-hidden` on the header shell if it would clip Generate Documents / More menus or the stage `<select>`. See “Pin before running §2”.

For non-header cards: `overflow-hidden p-0` for header/body split OR `p-4` with `SectionHeader`.

### Section header pattern

- Leading icon in `size-7` rounded-lg grey/violet-tint chip
- Title `text-sm font-semibold`
- Optional subtitle `text-xs text-gray-500`
- Optional right actions (links, CTAs)

### Empty states

- Compact: centred icon (~32px) + one line + one CTA
- Override `EmptyState` `className` to reduce `py-12` → `py-6` where needed
- Never bare `—` for missing stats — use muted phrases (`No activity yet`) once data is **known** empty
- While `businessInfo` is loading, prefer **skeleton** over “Not loaded” text that later flips to a number (see Pin §3)

### Control height

- Action row controls: **36px** unified height (`h-9`), shared border radius (`rounded-lg`)

---

## 1. Page shell (`crm-members/[id]/page.tsx`)

**Current:** Header sits inside `rounded-xl border …` wrapper; `MemberProfileHeader` renders another `Card` inside → double frame.

**Target (Pin §4):**

- **`page.tsx`:** Remove outer card wrapper around header. Provide grid (`lg:grid-cols-4`), spacing, error/loading only.
- **`MemberProfileHeader`:** Owns the **single** header shell (identity, actions, stat row). Tabs (`MemberTabs`) may remain as border-top section inside header shell or directly below — same visual surface, no second card.
- Preserve grid: main `col-span-3`, sidebar `col-span-1`
- No changes to tab routing, data fetching, modals

---

## 2. Header (`MemberProfileHeader.tsx`) — primary

### Props — preserve exactly

```tsx
client, firstOfferId, businessInfo, fetchBusinessInfo,
onOpenTools, onDeleteMember, onStageChange, savingStage,
onPromoteToExisting, offersCount, lastActivityAt
```

All document/Base 2/More menu handlers stay; restyle only.

### Layout (wide screen)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Avatar]  Title (stable client.business_name — see Pin §3)       │
│           Subtitle: trading name · ABN … · Owner … (when loaded)│
│           Chips: [GroupBadge] [Drive] [Signed-not-promoted?]     │
│                                          [Stage] [Gen docs] [B2] [More] │
├─────────────────────────────────────────────────────────────────┤
│ [Stat] Offers │ [Stat] Contracts │ [Stat] Agreements │ [Stat] Activity │
└─────────────────────────────────────────────────────────────────┘
```

On narrow screens action row wraps below identity (existing `flex-col` / `md:flex-row` pattern is fine).

### Identity block

| Element | Current | Target |
|---------|---------|--------|
| Avatar | `size-11`, grey border box | Larger **rounded-square** (~48–52px, ~14px radius), `bg-violet-50 dark:bg-violet-900/30`, initial `text-violet-800 dark:text-violet-200` |
| Title | Full `client.business_name` @ 18px | **~21px / font-medium** — **`client.business_name` stays h1** (stable, no post-fetch swap). See Pin §3. |
| Subtitle | `tradingName · ABN · Owner` | When `businessInfo` loads, include trading name here if useful; legal/trustee detail as muted second line if needed — **without changing h1** |
| Stage badge on title | `<StageBadge />` inline | **Remove** — stage shown only in stage control |
| Group badge | Inline with title | Move to **chip row under subtitle**; use `GroupBadge` + link to `/crm-groups/{slug}` if slug set |
| Drive chip | Inline with title | Move to chip row; keep external link behaviour |
| Signed-not-promoted | Inline | Keep in chip row or near stage control |

**Title strategy (display only — Pin §3):**

- **`h1` = `client.business_name` always** on first paint and after load (no swap to trading name).
- When `businessInfo` loads: show **trading name in subtitle** (already partially there via `subtitleParts`) and/or a muted second line for long legal/trustee strings.
- Do **not** promote trading name to `h1` after lazy fetch — that causes a visible title jump.

### Action row

All controls **same height (36px)**, aligned baseline:

1. **Stage control** — styled wrapper around **native `<select>`** (Pin §1)
2. **Generate Documents** — primary violet; keep dropdown menu behaviour (verify not clipped — Pin §2)
3. **Base 2** — secondary
4. **⋯ More** — secondary; keep menu items (Update LOA, Tools, Delete)

### Stage control — styled native select (Pin §1)

- Visual target: bordered control ~36px — optional **status dot** (colour by stage, reuse `StageBadge` intent map) + chevron overlaid on wrapper; real `<select>` underneath for interaction.
- **Implementation:** wrapper `relative` + styled border/radius; native `<select>` with transparent or minimal chrome; **not** a custom popover list.
- Map dot colours: `existing_client`/`won` → green, `lost` → red, etc.
- `disabled={savingStage}` preserved on the `<select>`.
- `CLIENT_STAGES` / `CLIENT_STAGE_LABELS` unchanged.
- PATCH still via parent `onStageChange`.

### Header shell (Pin §4)

- **`MemberProfileHeader` owns one shell** — replace inner `Card` with a single outer `div` (border, radius, ring).
- **`page.tsx` removes** its duplicate wrapper around the header.
- **No `overflow-hidden`** on the action-row region (Pin §2).

### Stat row

Replace flat `HeaderStat` with **icon tile** pattern:

| Stat | Label | Value | Icon (Lucide) | Notes |
|------|-------|-------|---------------|-------|
| Offers | Offers | `offersCount` | `FileText` or `Layers` | Available immediately; round number |
| Contracts | Contracts | `contractCount` | `FileCheck` | **Skeleton** until `businessInfo` loaded; then count or “None” |
| Agreements | Agreements · LOA, SFA | See below | `ScrollText` | **Skeleton** until `businessInfo` loaded |
| Last activity | Last activity | `formatDate(lastActivityAt)` or **No activity yet** | `Clock` | Available from activities; never bare `—` |

**Agreements tile (current confusion):**

- Today: LOA/SFA tab badges float above date; label missing
- Target: label **Agreements · LOA, SFA**; value **Signed {loaSignedDate}** when date exists; if LOA/SFA files exist show small link chips
- While `businessInfo` pending: skeleton or muted **Loading…** — not a value that later changes

Reuse/adapt `TabCountBadge` for LOA/SFA links if helpful.

**Lazy-load rule (Pin §3):** Pass `businessInfoLoading` into header if needed (prop addition is OK only if parent already has it — check `page.tsx` / `use-member-data`; prefer deriving `!businessInfo && client.business_name` pattern already used on Overview). Avoid stat tile text flip after fetch.

---

## 3. Sidebar (`MemberSidebar.tsx`)

Three cards: **Contact**, **Tasks**, **Recent activity**.

### Unified shell

Match entity-group card:

- `SectionHeader` with Lucide icon per section (`User`, `ListTodo`, `Activity` / `History`)
- Same border/radius/padding as plan design system
- Violet tint on header icons (subtle)

### Contact card

- Keep data sources: `client.primary_contact_email`, `businessInfo.contact_information`, `representative_details`
- Add row icons: `Mail`, `Phone`, `MapPin` beside email / phone / address
- Tighten label (`text-xs text-gray-400`) vs value (`text-sm text-gray-800`)
- Avatar: optional alignment with header avatar style (rounded-square, violet tint)

### Tasks card

- Keep: `onAddTaskClick`, `onDeleteTask`, slice(0, 3), links to `/tasks`
- **Empty state:** compact centred `ListTodo` icon + “No tasks linked to this client yet” + **Add task** CTA (calls `onAddTaskClick`)
- Reduce vertical padding vs current plain paragraph

### Recent activity card

- Keep: `timelineEvents`, link to `?tab=activity`, event rendering via `getOfferActivityEventVisual` / `getStageChangeEventVisual`
- **Empty state:** compact icon + “No timeline events yet” + **View activity tab** link
- Header action “View all” when events exist — keep

---

## 4. Overview tab — Offers card (`OverviewTab.tsx`)

**Location:** lines ~557+ — `Card` with local `CardHeader`, `EmptyState`, offer list.

### Changes

- Replace local `CardHeader` with shared `SectionHeader` + quote icon (violet chip) for consistency
- Same card shell as entity-group / sidebar
- **Empty state:** compact (reduce `py-10`); icon + “No offers recorded yet” + **Create the first offer** CTA — keep `onCreateOfferClick`
- Offer rows: light touch only (hover, spacing) — no data/logic change
- “View all →” link to `?tab=commercial` — keep

### Other Overview blocks (light touch)

| Block | Action |
|-------|--------|
| `EntityGroupSection` | Done — no change unless token tweak |
| Business Information collapsible | Shell/header icon alignment only; **do not** rewrite inner grid |
| Notes one-liner | Optional typographic tidy |
| Documents/contracts inside Business Information | Out of scope |

---

## 5. Tabs (`MemberTabs.tsx`) — optional micro-pass

If time permits within header/shell work:

- Active tab: violet bottom border or text `text-primary`
- Inactive: muted grey
- **No** route or tab config changes

---

## 6. Reuse checklist

- `@/components/ui/card`, `button`, `badge` — stage uses native `<select>` in styled wrapper, not `@/components/ui/select` label float unless it wraps the same native element cleanly at 36px
- `GroupBadge` (stage badge removed from title; reuse stage colour map for dot only)
- `SectionHeader` from `shared/SectionHeader.tsx`
- `EmptyState` with compact overrides
- `formatDate` from `shared/formatDate`
- Lucide icons (already used elsewhere in CRM)

---

## 7. Verification

### Manual — behaviour-critical (review diffs hardest here)

- [ ] **Stage control:** PATCH on change; `savingStage` disables select; keyboard opens native picker; no custom popover
- [ ] **Menus not clipped:** Generate Documents, More dropdowns fully visible (open each near bottom of viewport)
- [ ] **No title/stat flash:** Reload page — h1 stable; contract/agreement stats skeleton then settle (no “Not loaded” → number jump)
- [ ] Generate Documents / Base 2 / More menus open correct URLs
- [ ] Group chip links to hub when slug present
- [ ] Drive chip opens folder
- [ ] Stat row values correct after `businessInfo` loads
- [ ] Promote (signed-not-promoted) still works
- [ ] Tasks add/delete; activity links
- [ ] Create offer from empty state
- [ ] Dark mode: all sections readable
- [ ] Mobile: action row wraps cleanly
- [ ] **Single header shell:** no double border/frame (`page.tsx` + header)

### Build

```bash
cd text_agent_interface
npm run build
```

Confirm untouched: `BusinessInfoDisplay.tsx`, `ClimateTab.tsx`, backend files (`git diff --name-only`).

---

## 8. Implementation order (suggested)

1. **Shell ownership (Pin §4)** — header owns shell; strip wrapper from `page.tsx` and inner `Card` from header
2. **Stage control (Pin §1)** — 36px styled native `<select>` wrapper; verify menus not clipped (Pin §2)
3. **Identity + chips** — avatar, stable h1, chip row, remove duplicate `StageBadge`
4. **Stat row** — icon tiles + skeletons for lazy `businessInfo` fields (Pin §3)
5. **MemberSidebar** — three cards + compact empty states
6. **OverviewTab** — Offers card shell + empty state; light Business Information header alignment
7. **Polish** — tab active state, dark mode QA

---

## 9. Future pass (explicitly out of scope)

- Trading name as **h1** when available at first paint (would need eager `businessInfo` or server-side trading name on `Client`)
- Full Overview **Business Information** inner redesign (large inline JSX in `OverviewTab`)
- Commercial / Utilities / Documents / Activity tab pages

---

## One-line agent prompt

> Visual modernisation per `docs/crm-member-page-visual-plan.md`: header owns single shell (page.tsx grid only); styled **native** stage select at 36px; no menu clipping; stable h1 + stat skeletons for lazy businessInfo; sidebar + Offers cards — preserve all callbacks/APIs; do not touch BusinessInfoDisplay.tsx, ClimateTab, backend.
