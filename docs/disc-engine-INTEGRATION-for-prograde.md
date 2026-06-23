# Disc Engine — ACES integration contract (for Prograde / Marcus)

*Living doc. ACES maintains it; updated whenever our structure or the contract changes.
Plain-English where it crosses teams. Share THIS with Prograde — not our internal plan doc.*

**Status:** built on the ACES side (dev), pending local test → dev deploy → parity vs Disc Check.
**Owner (ACES):** Morgan. **Last updated:** 23 Jun 2026.

---

## 1. How we brought Disc Engine in (so you know what to build against)

We did **not** use the cross-origin iframe + token-handshake model from your pack. Because
ACES owns both the frontend and the API, we host your dashboard **natively** inside the ACES
app and authenticate it with our existing staff session. Net effect for you: your dashboard
file stays almost exactly as you ship it; we apply a thin, automated transform on our side.

- **Your file is hosted as-is** at `public/disc-engine/disc-engine-embed.html`, served from the
  ACES **frontend origin** (same origin as the page that embeds it).
- **A wrapper page** at `/resources/disc-engine` (sibling to `/resources/discrepancy-check`,
  which is untouched) authenticates as the signed-in staff member and passes your dashboard its
  API host + bearer token.
- **We transform your file automatically** with `scripts/build-disc-engine.mjs` (endpoint remap +
  small hardening). Your pristine file lives in `vendor/disc-engine/`; the script regenerates the
  hosted copy. **When you ship a new version, we drop it into `vendor/` and re-run the script** —
  a file-swap, not a re-port. The script **fails loudly** if your file's shape changes in a way we
  haven't mapped (see §5), so nothing ships unwired.

## 2. The real API contract (your `/api/aces/*` → our `/api/climate/*`)

Your dashboard calls `/api/aces/*`. Our live routes are `/api/climate/*`. We remap automatically;
this table is the source of truth so your future versions stay compatible.

| Your accessor | Your call | **Real ACES route (what it hits)** | Notes |
|---|---|---|---|
| `getConfig` | `/api/aces/config` | `/api/climate/config` | **Not built yet** on our side — currently 404s and your code falls back to the inert mirror (env banner cosmetic). Tell us if you need it. |
| `getClients` | `/api/aces/clients?period=` | `/api/climate/roster?period=&q=&limit=` | Returns `{clients:[…]}`. For P1 ranking — see §6 open item on field coverage. |
| `getManifest` | `/api/aces/entities/{e}/activity-sources/manifest?period=` | `/api/climate/entities/{e}/activity-sources/manifest?period=` | 1:1. |
| `getSite` | `/api/aces/entities/{e}/activity-sources/site?…` | `/api/climate/entities/{e}/activity-sources/site?utility_type=&identifier=&member_aces_client_id=&member_loa_record_id=&period=` | 1:1. **Required:** `utility_type`, `identifier`. Returns real per-meter invoice rows (up to ~50), `etl_preview`, `staged_activity_records`. |

**Auth on every call:** `Authorization: Bearer <staff Google ID token>`, validated by our backend's
`verify_roster_access`. No shared service key, no Prograde server in this path — the page acts as the
signed-in staff user.

## 3. The handshake we implement (host → your dashboard)

Same as your pack, with the host details filled in and origin-pinned:

- On iframe load (and whenever the token is ready), the wrapper posts
  `{ type: 'aces:auth', token: <staff id_token>, apiHost: <backend base URL> }` —
  **targeted to our own origin**, not `'*'`.
- Your dashboard stores the token (`ACES_AUTH.token` → `Authorization: Bearer`) and sets
  `window.ACES_API_HOST` from `apiHost`. We also re-call `render()` once auth lands, so the first
  paint isn't empty.
- On `401 REAUTHENTICATION_REQUIRED`, your dashboard posts `{ type: 'aces:reauth' }`; the wrapper
  re-issues a fresh token.

## 4. Hardening we apply on our side (in the hosted copy only)

Applied by the build script to the hosted copy; your `vendor/` source is never mutated:

1. **Inbound `aces:auth` listener** now checks `ev.origin === window.location.origin` (was unchecked).
2. **Outbound `aces:reauth`** targets our origin (was `'*'`).
3. **`pdf.js` is self-hosted** at `/disc-engine/pdf.min.js` + `pdf.worker.min.js` (v3.11.174), not cdnjs.
4. **API host** comes only from the authenticated wrapper (`getApiBaseUrl()`), never a hardcoded URL.

None change your dashboard's behaviour — they tighten the trust boundary. Ideally fold equivalents
into your source so future versions don't regress; if not, our script re-applies them each build.

## 5. Keep these stable so the file-swap keeps working

Our automated transform matches on these. If a new version changes them, the build **fails loudly**
and we reconcile before shipping — so this is a "heads-up", not a hard contract:

- Accessor functions `getConfig` / `getClients` / `getManifest` / `getSite` and the
  `_apiGet` / `_apiHost` / `ACES_AUTH` / `aces:auth` message-handler structure.
- `DATA_SOURCE='api'` default; **no confidential client data baked into the asset** (the live API is
  the source — keep the mirror stripped, as in the render stubs).
- Endpoints addressed under `/api/aces/...` (we remap the prefix). **If you add a new endpoint, the
  build will halt on the unmapped `/api/aces/` reference** until we map it — so just tell us when you add one.
- Keep `pdf.js` pinned to a version you name (we self-host that exact version).

## 6. Open items / what we still need from you

- **G1 — document preview is dark.** The render stubs (`previewer_*.js`) are empty by design, so the
  click-an-invoice/contract → PDF flyout shows "unavailable" until there's a **live document endpoint**
  to serve the bytes. None exists yet. This is your follow-up (same `/api/climate/*` workstream). Data
  views are unaffected.
- **P1 ranking fields.** `getClients` expects `{business_name, reporting_entity, activity_record_count,
  stage}`. Our `/api/climate/roster` returns `{clients:[…]}` but may not include every field — confirm /
  extend so P1 renders fully when you wire it.
- **getSite member IDs.** Manifest site entries expose `aces_client_id` / `loa_record_id`; `getSite`
  wants `member_aces_client_id` / `member_loa_record_id`. Confirm how your P2→P3 logic maps these
  (our `/site` accepts both spellings and echoes them back).
- **>50 invoice rows/meter?** `/site` returns up to ~50 rows. If the deep-dive needs more, we expose a
  higher limit (one-line change). Tell us the number.

## 7. Where the pieces live (ACES repo `text_agent_interface`)

```
vendor/disc-engine/disc-engine-embed.html   ← your pristine file (drop new versions here)
vendor/disc-engine/previewer_*.js           ← your render stubs (security-reviewed)
scripts/build-disc-engine.mjs               ← our transform (re-run on each new version)
public/disc-engine/                         ← generated hosted copy + stubs + self-hosted pdf.js
src/app/resources/disc-engine/page.tsx      ← the authenticated wrapper (handshake lives here)
```

The only external reference left in the hosted page is a `drive.google.com` view-link that was already
in your file — no other third-party hosts.

## 8. Changelog

- **2026-06-23** — Initial ACES-side build. Native embed wired: wrapper page + nav, endpoint remap
  (`/api/aces/*`→`/api/climate/*`, clients→roster), origin-pinned `aces:auth`/`aces:reauth` handshake,
  self-hosted pdf.js, render stubs received and verified clean. Pending: local test → dev deploy →
  parity vs Disc Check. Open: G1 document endpoint; P1/P3 fast-follow; roster field coverage.

---

## 9. DIRECTION CHANGE (23 Jun) — decoupling Disc Engine from `reporting_entity`

**What's changing:** the engine will be re-based off the **full discrepancy population — any client
with a linked utility** (waste now; all utilities as they go live) — **not** the climate
`reporting_entity` rollup it currently keys off.

**Why (ACES decision):**
- `reporting_entity` is a **climate-reporting** construct (nullable column, explicitly separate from
  the commercial grouping). The current roster (`/api/climate/roster`) filters
  `reporting_entity IS NOT NULL`, so the engine only ever sees climate-enrolled clients.
- Discrepancy detection is a **utility-linkage** concern: anyone with a linked waste utility is
  eligible for a waste discrepancy, regardless of climate enrolment. The current keying makes most
  of the client book invisible to the engine.
- It also can't reconcile against the existing **Disc Check** (which runs across the whole client
  book via `/api/resources/discrepancy-check`), so the parallel-run parity check is impossible by
  construction until the populations match.

**Target contract (what the engine will move to):**

| Accessor | Was (climate rollup) | **Will be (utility-linkage)** |
|---|---|---|
| `getClients` | `/api/climate/roster` (reporting_entity set) | roster of **clients with ≥1 linked utility** (no reporting_entity filter) |
| `getManifest` | `…/entities/{reporting_entity}/activity-sources/manifest` | resolve by **client identifier** (one client's linked sites) |
| `getSite` | `…/entities/{reporting_entity}/activity-sources/site?…` | unchanged in substance — already keyed by `(utility_type, identifier, member_aces_client_id, member_loa_record_id)`; the path `entity` becomes a **client identifier** |

So the embed's `entity` / route key becomes a **client identifier**, not a `reporting_entity` slug.

**What this means for you (Marcus):**
- **No big rebuild your side.** If your dashboard treats the `entity`/route key as an **opaque id**
  (any string) and just round-trips it into `getManifest`/`getSite`, the swap is transparent — we
  re-point the endpoints in our hosted copy via the build script. **Please confirm the key is opaque**
  (nothing in P2/P3 nav parses it as a climate slug).
- Build your **P1 ranking and P3 deep-dive fast-follow against the client/utility population**, not
  `reporting_entity`.
- The `aligned-leisure` test fixture won't exist in our data — testing uses real ACES client ids.

**Status:** direction agreed (ACES). Backend restructure is on the **ACES** side (new linked-utility
roster + client-keyed manifest resolution; `getSite` already client/utility-keyed). Until it lands,
the dev embed only shows climate-enrolled clients — a wiring stopgap, not the intended scope.

## 10. Changelog (append-only)

- **2026-06-23 (b)** — **Direction change:** decoupling from `reporting_entity` → utility-linkage
  population (see §9). Reason: engine must cover any client with a linked utility, and must be able to
  reconcile against Disc Check (full book). Backend re-key pending ACES side; dashboard file unaffected
  if the route key is opaque.
- **2026-06-23 (a)** — Initial ACES-side build (native embed, endpoint remap, handshake, self-hosted
  pdf.js, stubs verified). See §8.

---

## 11. FINAL DIRECTION (23 Jun) — two pages, ship both, compare value (SUPERSEDES §9 re-base)

We are **not** re-basing your engine off `reporting_entity` after all. Instead ACES runs **two
discrepancy pages side by side** and lets real-world value decide which to keep:

- **Page A — Disc Engine (yours, `/resources/disc-engine`)** — stays **exactly as you built it**,
  `reporting_entity`-scoped. No re-key, no changes to your file. Your P1 ranking / P3 deep-dive
  fast-follow and your contract-terms endpoint still apply to this page.
- **Page B — Utility Discrepancy (ACES-built, `/resources/utility-discrepancy`)** — a contextual
  per-utility view ACES owns. Entered from a member's **Utilities tab → "Discrepancy Check"** action
  (Waste first). It pulls that account's invoice records via `POST /api/utility-invoice-rows`, keyed
  only by `(utility_type, identifier)` — so it covers **any client with a linked utility**, not just
  climate-enrolled ones. It does **not** use your dashboard or your terms API; it's self-contained.

**Why two:** your engine is a top-down "client book" assurance view; Page B is a bottom-up "I'm on this
member, check this utility" view. Different shapes, possibly both valuable. Shipping both is cheap and
settles it with evidence rather than debate.

**Net for you (Marcus):** nothing new to build for Page B — it's entirely ACES-side. Your engine is
unchanged; keep going with its P1/P3 fast-follow + terms endpoint. The `reporting_entity` coverage gap
(§9) is now handled by Page B rather than by re-keying your engine.

## 12. Changelog (append-only)

- **2026-06-23 (c)** — **Final direction: two pages.** Your engine stays `reporting_entity`-scoped
  (Page A, unchanged); ACES builds a separate contextual `Utility Discrepancy` page (Page B) over
  `/api/utility-invoice-rows` for the full linked-utility population. Supersedes the §9 re-base — your
  engine is no longer being re-keyed. Page B v1 = consolidated records view; contract-vs-actuals is a
  later layer.
- **2026-06-23 (b)** — Direction change: decouple from `reporting_entity` (see §9). *Superseded by (c).*
- **2026-06-23 (a)** — Initial ACES-side build (native embed, remap, handshake, pdf.js, stubs). See §8.

- **2026-06-23 (d)** — Dev structure built: a "Discrepancy" nav group holds both tools as distinct,
  labelled entries. Your page = **Reporting Entity Assurance — Marcus Engine** (`/resources/disc-engine`)
  with a reporting_entity roster picker so you can load any entity and validate. ACES operational view =
  **ACES Waste Discrepancy Review**. Both callable side-by-side on dev. Your embed file unchanged.

- **2026-06-23 (e) — BLOCKER for your page (dev): `PORT` is never populated.** On dev, the
  reporting_entity picker loads correctly and hands the embed `?entity=<slug>`, but every entity shows
  **"Client not found — … isn't in the current roster."** Root cause: `L2()` gates on
  `_portOf(route.client)` (embed line ~757), which searches `PORT` — and `PORT` is `const PORT=[]`
  (line 137) that nothing ever fills. `getClients()` fetches `/api/climate/roster` live but the result
  is never written into `PORT`/`_ENTITY_OF`, so `_portOf` always returns null and the page short-circuits
  before any data fetch (hence no network activity / Reload does nothing). **Fix (yours):** populate
  `PORT` + `_ENTITY_OF` from `getClients()` — and do it on the **post-auth render path**, not at parse
  (the bearer token arrives via the `aces:auth` postMessage *after* the document parses; our wrapper
  re-calls `render()` once it lands). This is the "P1 wiring" fast-follow in §6 — but it's a hard
  dependency for the `?entity=` deep-link, not optional. Our side (token handshake + host + roster) is
  verified working.

- **2026-06-23 (f) — We wired `PORT` ourselves (in our hosted copy, not your vendor file).** Rather
  than wait on the P1 fast-follow, `scripts/build-disc-engine.mjs` now injects a small function
  `_acesSeedPortFromRoster()` and calls it from the `aces:auth` handler (right after the token/host
  land, before `render()`). It calls your existing `getClients()` (live `/api/climate/roster`) and
  fills `PORT` + `_ENTITY_OF` with one entry per `reporting_entity`
  (`{id:slug, client:business_name, entity:slug, sites:member_count, utils:{electricity,gas,waste:{state:'none',exp_a:0,exp_y:0}}}`),
  so `_portOf()` resolves and `L2()` renders the live manifest instead of "Client not found".
  **Per-utility *states* are left as `'none'`** — your `_p1Util()` already derives "comparison-basis"
  from the manifest, and real analysed/exposure figures remain yours to populate. **Your `vendor/`
  file is unchanged** — this is purely our build-time patch. **When you wire `PORT` natively** (your
  P1 fast-follow), tell us and we'll drop our injection so it doesn't double-seed. Transform name in
  the build report: `ACES:port-seed-fn`.

- **2026-06-23 (g) — Correction to (f): seed ONLY the selected entity, not the whole roster.** The
  first version seeded every roster client into `PORT`, which made the default client-book view (`L1`)
  fire a synchronous `getManifest` per client and freeze the page on load. Now `_acesSeedPortFromRoster()`
  seeds only `ACES_ENTRY.entity` (the one chosen in the picker), so `L1` stays empty/cheap and only the
  selected entity fetches its manifest (`L2`). NB: the `/api/climate/config` 404 in console is expected
  and harmless — that route was never built (the embed falls back to its mirror); **no backend change is
  required**.
