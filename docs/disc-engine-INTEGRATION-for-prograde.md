# Disc Engine — ACES integration contract (for Prograde / Marcus)

*Living doc. ACES maintains it; updated whenever our structure or the contract changes.
Plain-English where it crosses teams. Share THIS with Prograde — not our internal plan doc.*

**Status:** built + locally tested on the ACES side. Freeze fixed (async transport, §14), `getConfig`
live, manifest/site enriched with contract + invoice-file data (§13). Pending: dev deploy → parity vs
Disc Check. **Owner (ACES):** Morgan. **Last updated:** 23 Jun 2026.

**TL;DR for Prograde:** your file is hosted as-is and remapped to our `/api/climate/*` routes (§2). Two
things are new in the payloads you already pull, ready for you to render with a one-line bind each:
a `contract` block per site (§13.1) and `waste_invoice_documents` on waste `getSite` (§13.2). We also
made your `_apiGet` async in our hosted copy to kill a tab-freeze — please fold that into your source
(§14). Open items for you are in §6.

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
| `getConfig` | `/api/aces/config` | `/api/climate/config` | **Live.** Returns `{aces_data_env, aces_api_host:"", period, today}`. (`aces_api_host` is intentionally empty — the host comes from the authenticated wrapper, see §4.) |
| `getClients` | `/api/aces/clients?period=` | `/api/climate/roster?period=&q=&limit=` | Returns `{clients:[…]}`. For P1 ranking — see §6 open item on field coverage. |
| `getManifest` | `/api/aces/entities/{e}/activity-sources/manifest?period=` | `/api/climate/entities/{e}/activity-sources/manifest?period=` | 1:1. **Now enriched:** each `sites[]` entry carries a `contract` block + top-level `contracts_available`/`contract_sheet_id` — see §13.1. |
| `getSite` | `/api/aces/entities/{e}/activity-sources/site?…` | `/api/climate/entities/{e}/activity-sources/site?utility_type=&identifier=&member_aces_client_id=&member_loa_record_id=&period=` | 1:1. **Required:** `utility_type`, `identifier`. Returns real per-meter invoice rows (up to ~50), `etl_preview`, `staged_activity_records`. **Now enriched:** `member_business_name`, `contract`, and (waste only) `waste_invoice_documents` — see §13. |

**Auth on every call:** `Authorization: Bearer <staff Google ID token>`, validated by our backend's
`verify_roster_access` (manifest/site/config) or `verify_google_token`. No shared service key, no
Prograde server in this path — the page acts as the signed-in staff user.

**Transport note (perf):** your `_apiGet` is synchronous XHR; on our hosted copy we made it **async**
so a slow call can't freeze the tab. Behaviour is unchanged — see §14. We also parallelised the
manifest's backend Airtable fetches, so it returns faster.

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

- **G1 — document preview is dark (now partly unblocked).** The render stubs (`previewer_*.js`) are
  empty by design. **You no longer need a document-bytes endpoint just to open invoices/contracts** —
  the payload now carries Google Drive view links directly: `contract.link` per site (§13.1),
  `waste_invoice_documents[].webview_link` on waste `getSite` (§13.2), and for other utilities the raw
  invoice fields (incl. any Drive link) are already spread into your `getSite` rows. Open the Drive link
  in a new tab, exactly as our ACES panel does. A document-bytes endpoint is only needed if you want to
  render the PDF *inside* your own flyout rather than hand off to Drive — that remains your follow-up.
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

- **2026-06-23 (h) — `/api/climate/config` now exists (perf fix).** Marcus's engine works on dev (PORT
  seed renders live Page 2), but it was slow + console-spammy because `getConfig` 404-stormed the
  missing config route ~8×/render (each a synchronous XHR). Added `GET /api/climate/config` →
  `{aces_data_env, aces_api_host:'', period, today}` (first backend change in this effort). The env
  banner now populates and the stalls/404s stop.
- **2026-06-23 (i) — Contract surfacing (ACES side).** Added `GET /api/contracts/by-business?business_name=`
  reusing `signed_contract_dry_run`'s parser of the FILE_IDS 'Data from Airtable' tab — returns signed-
  contract file IDs + status per utility, matched by business name. The ACES Waste page now shows
  "Signed waste contract on file: [link] · status". (This is the operational contract check; full
  contract-vs-actuals term extraction is a later phase / your terms API.)

- **2026-06-23 (j) — "Client not found" was misleading on load; we patched it to "Loading…".** On a
  deep-linked `?entity=`, `L2()` renders `_clientNotFound` at parse time (before our PORT seed runs
  post-auth), so users briefly saw "Client not found" even though live data was on its way. Our build
  script now shows "Loading <entity>… (fetching live data)" while `PORT` is empty, and only shows the
  real "Client not found" once seeded and still unresolved. **For you, Marcus:** worth a native fix —
  ideally `L2()` distinguishes "still loading / unauthenticated" from "genuinely not in roster", and
  `getConfig` should be cached (it's currently called ~8×/render; we added `/api/climate/config` so
  it's at least a fast 200 now instead of a 404).

- **2026-06-23 (k) — Invoice PDFs surfaced (ACES side, addresses G1 for waste).** The ACES Waste page
  now reads the RAW waste dump ('Member ACES Data' → '7th Sheet - Waste') via a new
  `GET /api/waste-invoice-rows?account=`, computes the expected cost from the bin schedule itself
  (rates × pickups + per-bin extras + fuel levy), and shows the Drive **invoice PDF** per row from the
  `Webview Link` column. Blank link = **missing invoice** (flagged as a discrepancy, per ACES rule);
  duplicate invoice numbers flagged. This is the ACES operational answer to the invoice-PDF gap —
  Marcus's own embed flyout (G1) is still separate and needs his live document endpoint.

- **2026-06-23 (l) — Perf: we now cache `_apiGet` by URL (supersedes the getConfig/getManifest memoize).**
  Your dashboard reads EVERYTHING via synchronous XHR (config, roster, manifest, site) and re-fetches on
  every render, which blocks the whole browser tab. Caching each unique path means re-renders/clicks hit
  cache and don't block. **The one-time first-load is still synchronous and can briefly freeze the tab —
  the real fix is yours: make `_apiGet` async (XHR `true` / fetch) so the UI thread never blocks.** Flagging
  as the top perf item for your next version.

- **2026-06-23 (m) — We now feed you signed-contract status + invoice file links in the API (so your
  "unsigned / no contract on file" badge can go green).** You flagged that your engine needs the same
  files we do. Rather than hand-patch your render, we enriched the payloads your engine *already* pulls.
  See **§13** for the exact field shapes. Net for you: a one-line bind in your render, no new endpoints.

- **2026-06-23 (n) — We fixed the tab-freeze ourselves by converting `_apiGet` to async (in our hosted
  copy). Supersedes (l).** The synchronous URL cache in (l) didn't stop the first-load freeze, because a
  single slow call still blocks the tab. We replaced `_apiGet` with a **non-blocking** version (see
  **§14**) — cache hit returns synchronously, cache miss fires an async XHR and returns `null` now, and
  when the response lands we re-call `render()` (which re-reads `getManifest`/`getSite` live). The UI
  thread never blocks. **Please fold this into your source** so future versions ship async by default —
  it's the correct fix and our build re-applies it each version until you do. We also cut the backend
  side: the manifest's per-member Airtable lookups now run in parallel, so the data *arrives* faster too.

---

## 13. Contract + invoice files now in the payload (for your `getManifest` / `getSite`)

You showed "**UNSIGNED · no contract on file**" per utility because your engine had no contract source.
It does now — we attached it to the responses you already consume. Two parts:

### 13.1 Signed-contract status — **new fields, bind your badge to these**

We read the ACES **FILE_IDS** sheet once (cached ~5 min server-side — negligible vs the manifest's
Airtable cost) and attach a `contract` object to **every site** in `getManifest`, and to the
`getSite` detail.

**`getManifest` → each entry in `sites[]` now carries:**

```jsonc
{
  "site_key": "Waste|09097571",
  "utility_type": "Waste",
  "identifier": "09097571",
  "member_business_name": "Frankston RSL Sub Branch Inc",
  "contract": {                      // ← NEW. null when no signed contract on file.
    "file_id": "1AbC...driveId",
    "status":  "Signed via ACES",
    "link":    "https://drive.google.com/file/d/1AbC...driveId/view"
  }
}
```

Plus two top-level manifest flags: `"contracts_available": true|false` and `"contract_sheet_id"`
(diagnostic — tells you the enrichment ran and which sheet it read).

**`getSite` detail** now also returns `"member_business_name"` and the same `"contract": {…}|null`.

**Your change:** where you currently render the `UNSIGNED · no contract on file` badge, check
`site.contract`. If present → show "✓ contract on file" linking `site.contract.link` (and optionally
`status`). If `null` → keep your unsigned badge. That's it — the matching (business name × utility) is
done our side; `utility_type` values match your section labels (`C&I Electricity`, `C&I Gas`, `Waste`,
`Oil`, plus `SME …`/`DMA`).

### 13.2 Invoice PDFs

**Non-waste utilities:** your `getSite` invoice rows are returned by our
`get_utility_invoice_rows_by_identifier`, which spreads **every raw field of the invoice record** into
each row (`{record_id, **fields, airtable_created_time}`). Any Drive/attachment link on the invoice
record is **already in the rows you receive** — render it for your G1 flyout (open the Drive link
directly, like our ACES Waste page) without needing your document-bytes endpoint.

**Waste — NEW field `waste_invoice_documents`.** The waste invoice Drive links do **not** live in the
Airtable invoice table; they live only in the raw dump sheet (`7th Sheet - Waste`, `Webview Link`). So
your waste invoice rows alone can't show PDFs. We now attach the dump's links additively to the **waste
`getSite`** payload:

```jsonc
{
  "utility_type": "Waste",
  "identifier": "09097571",
  "airtable_invoices": { ... },          // unchanged (your existing rows)
  "waste_invoice_documents": {           // ← NEW, waste only; null for other utilities
    "total_count": 12,
    "with_pdf": 11,
    "missing_count": 1,                  // blank Webview Link = missing invoice (a discrepancy, per ACES rule)
    "documents": [
      {
        "invoice_number": "INV-1",
        "invoice_date": "01/02/2026",
        "invoice_total": "123.45",
        "provider": "J.J. Richards & Sons Pty Ltd",
        "review_period": "Jan-2026",
        "webview_link": "https://drive.google.com/file/d/.../view",
        "missing": false                 // true when webview_link is blank
      }
    ]
  }
}
```

**Your change:** for waste, render `waste_invoice_documents.documents[]` as a PDF list (link =
`webview_link`); show `missing: true` rows as a "missing invoice" flag, same as our operational page.
This is the **slim** view (links + the missing signal) — the dump is verbatim/uncleaned, so it may carry
duplicate runs. If you'd rather your engine compute the waste discrepancy from the bin schedule itself
(full parity with our page), say so and we'll repoint your waste source to the dump deliberately — we did
**not** do that here because it would change the source your ETL preview consumes.

### 13.3 What we deliberately did **not** do

We did **not** patch your render to display any of this — that badge logic lives deep in your
synchronous render, and hand-patching it would (a) add another blocking call and (b) break every time
you ship a new build. We give you the **data**; the **display** is your one-liner. Keeps the file-swap
clean.

---

## 14. The tab-freeze: what we changed and why (please fold into your source)

**Symptom:** selecting a reporting entity froze the entire browser tab (couldn't scroll, click, or even
open DevTools) for ~2 minutes, then the data appeared.

**Root cause (two compounding factors):**
1. **Your `_apiGet` uses a *synchronous* XHR** (`xhr.open(GET, url, false)`), and `render()` re-reads
   `getManifest`/`getSite` live on every paint. A synchronous XHR blocks the **main thread** for the
   *entire* duration of the request — so any slow response freezes the whole tab, by design.
2. **Our manifest endpoint was slow** (~2 min for a multi-member entity) because it fetched each
   member's Airtable data sequentially. So the synchronous call had ~2 minutes to block on.

**What we changed (both ends):**

- **Front end (your hosted copy only — your `vendor/` file is untouched):** our build script replaces
  `_apiGet` with a **non-blocking** version:
  - cache **hit** → return the value synchronously (your render shows data, unchanged);
  - cache **miss** → fire an **async** XHR (`open(..., true)`) and return `null` *immediately* (your
    accessor falls through to the mirror → the loading shell shows, the tab does **not** block);
  - when the response lands → store it and re-call `render()`, which re-reads `getManifest`/`getSite`
    (now a cache hit) and paints the real data.
  - It preserves your behaviour faithfully: same `_apiHost()` / `_apiHeaders()` / `_apiReauth()` on 401.
    Re-renders are debounced (~30 ms) so a burst of responses coalesces into one paint.

- **Back end (ours):** the manifest's per-member Airtable lookups now run in a small thread pool
  (sequential merge afterwards, so site order is unchanged), so the data also *arrives* faster.

**Why this is the right layer:** the freeze is structural to synchronous XHR — no amount of caching or
backend speed fully removes it, because the *first* call always blocks. Async is the only real fix.
**Please make `_apiGet` async in your source** (XHR `true`, or `fetch`, with a re-render on resolve);
then our build won't need to re-apply this each version. Until then, we re-apply it automatically — it's
a transport change only, it does not touch your render logic.

---

## 15. Handover summary — what's live, what's yours

**Live on the ACES side (you consume, nothing to do):**

- `getConfig` returns real config (§2). `getClients`/`getManifest`/`getSite` all live and remapped.
- Manifest `sites[]` carry `contract` + `contracts_available`/`contract_sheet_id` (§13.1).
- `getSite` carries `member_business_name`, `contract`, and waste `waste_invoice_documents` (§13.2).
- Your `_apiGet` runs **async** in the hosted copy (no tab-freeze); manifest fetches parallelised (§14).
- Pdf.js self-hosted; `aces:auth`/`aces:reauth` origin-pinned (§3–4).

**Your side to render / fold in (each small):**

1. **Contract badge** → bind to `site.contract` (green + `contract.link` when present; keep "unsigned"
   when `null`). §13.1.
2. **Waste invoice PDFs** → render `waste_invoice_documents.documents[]` (link = `webview_link`, flag
   `missing`). §13.2.
3. **Make `_apiGet` async in your source** so we stop re-applying it each build. §14.
4. **G1 in-flyout PDF render** (optional) — Drive links already work; a bytes endpoint is only for
   rendering inside your own flyout. §6.
5. **P1 roster fields**, **getSite member-ID spelling**, **>50 rows/meter** — confirm/extend. §6.

**Meanwhile, ACES already surfaces this evidence itself** so the data is proven to flow and Morgan can
verify against it: the wrapper page (`/resources/disc-engine`) shows an **"ACES Evidence"** panel above
your engine with the signed-contract links and per-utility invoice PDF links, pulled live from the
sheets (FILE_IDS sheet for contracts; the Member ACES Data workbook, one tab per utility, for invoices).
That panel is ACES-internal (not part of your contract) — it's how we confirm the same file IDs your
payload carries are real, before you bind them. When you wire items 1–2, your engine shows them natively
and the panel becomes redundant.

**Note on coverage bars (`footed_ym`):** we deliberately do **not** pre-populate your "X/Y collected"
bars from invoice *presence*. Your model treats footed = reconciled-to-the-cent (green) vs staged =
present-but-unreconciled (amber), and auto-greening from mere presence would overstate verified coverage
in an assurance view. Footing stays driven by your reconciliation, as designed.
