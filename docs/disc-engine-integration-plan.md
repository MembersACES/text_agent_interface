# Disc Engine — integration plan & review (for Marcus's pack)

*Prepared 23 Jun 2026. Status: PLAN FOR REVIEW — nothing built, nothing merged, no config changed.*
*Source pack inspected read-only: `DISC-E_1.ZIP` (README, embed-snippet, integration-spec, `disc-engine-embed.html` 1,752 lines).*

---

## TL;DR (conclusion first)

**DECIDED 23 Jun (see §4):** ACES-native self-hosted embed ("Option A"). ACES hosts Marcus's dashboard HTML as a static asset under the frontend origin, wrapped in a thin page that authenticates with the existing NextAuth staff session — exactly like the live Disc Check page. **No Prograde server, no shared key, no token minting, no terms-endpoint CSP.** Marcus's pack was built for the wrong data path (browser→ACES token handshake) but the file is reusable once we remap its endpoints (`/api/aces/*` → `/api/climate/*`) and fix three small defects. §5 is the build contract; one item (D4, two missing JS files) blocks rendering and needs Marcus.

*History: the pack's "host our HTML same-origin + postMessage the staff token, recommended option (a)" rested on two premises false for this stack (we're not same-origin frontend↔backend; we run no CSP). Because Morgan owns both ends, those concerns dissolve into the cleaner native build above rather than a Prograde-hosted variant.*

Confidence key: **[V]** verified in our repo / the pack · **[I]** inferred · **[?]** can't verify here (needs backend or Prograde).

> **Addendum — backend verified 23 Jun (Morgan owns `text_agent_backend`). Supersedes the open questions below.**
>
> 1. **The endpoints exist, but the namespace is `/api/climate/*`, not `/api/aces/*`.** Remap required:
>    - `…/activity-sources/manifest` → `GET /api/climate/entities/{entity_id}/activity-sources/manifest` ✓ (`main.py:863`)
>    - `…/activity-sources/site` → `GET /api/climate/entities/{entity_id}/activity-sources/site` ✓ (`main.py:878`)
>    - `/clients` → use the purpose-built **`GET /api/climate/roster`** ("Clients with reporting_entity — for Prograde launcher", `main.py:814`), not generic `/api/clients`.
>    - `/api/aces/config` → **no backend equivalent exists.** Either add `GET /api/climate/config` or let the dashboard's env banner stay on its inert mirror default (cosmetic). **[V]**
> 2. **`/site` returns per-meter invoice line detail — answers Marcus's question.** `build_entity_site_detail` fetches up to **~50 actual invoice rows** per `(utility_type, identifier)` via `get_utility_invoice_rows_by_identifier`, **plus** a small sample, **plus** ETL preview, **plus** staged SQL activity (`climate_entity_sources.py:701`). So the meter deep-dive is a **wiring job on Prograde's side, not a new endpoint** — *unless* they need >50 rows/meter, which is a one-line route change to expose `invoice_fetch_limit` (cappable to 100; currently not surfaced as a query param). **[V]**
> 3. **The backend already supports a no-token server proxy.** `verify_roster_access` (`main.py:792`) accepts **either** a Google ID token **or** a shared service key via header `X-ACES-Service-Key` matched against env `CLIMATE_ROSTER_SERVICE_KEY` — docstring: *"Google JWT or shared service key (Prograde server proxy)."* This means **Option C below is already wired server-side** and the staff `id_token` need never reach the browser. Caveat: the service key is a **broad shared secret** (returns fixed identity `roster@prograde.internal`, bypasses per-user rostering) — it must stay server-side, never in the embed. **[V]**
> 4. **CORS already allows the Prograde origins** (`prograde-sustainability-dev-…run.app`) and the real ACES frontend origin (`acesagentinterface-…run.app` — note: differs from the stale `aces-text-agent-interface` in DEPLOYMENT.md). `allow_credentials=True`, methods/headers `*` (`main.py:368–390`). So cross-origin is already wired; no new CORS work for option B. **[V]**
>
> Net: with you owning both ends, the integration is more feasible **and** safer than Marcus's pack implied — the service-key proxy path was evidently built for exactly this.

---

## 1. The challenge — lead objection

**Option (a) "host our HTML same-origin + postMessage the staff Google ID token in" puts third-party-authored code inside the ACES origin, holding live staff credentials.**

- "Read-only GET" is a property of *this version of their JavaScript*, not a guarantee we can enforce. Same-origin code can issue writes, call any endpoint the staff session permits, and read our cookies / `localStorage` / DOM. We'd re-inherit that risk **with every new HTML version they hand over** — and the spec already promises more (P1/P3 fast-follow, a terms endpoint). This is ongoing unreviewed third-party code in our trust boundary, not a one-off asset. **[V]**
- The token requested is the **full Google `id_token`** (`src/lib/auth.ts` line 29/43 — same identity token the app uses, ~1 h). That is over-privileged for a read-only billing view. **[V]**
- Marcus's later ask — open `connect-src` to a Prograde "terms endpoint" — completes the toxic trifecta: access to private client data + third-party code + an outbound channel to a third-party domain. Even if Prograde is entirely trustworthy, that is a poor audit story for a GRC firm and a wide blast radius. **[I]**

**Steelman of their position:** option (a) is genuinely the *simplest* wire — no CORS, staff session "just applies", one HTML file per version. For a short parallel-run that simplicity has real value. My counter: the simplicity comes precisely *from* erasing the origin boundary, which is the thing we shouldn't trade. One sharp challenge, then your call.

## 2. Four facts to send back (premise corrections)

1. **We are NOT same-origin.** Frontend = `aces-text-agent-interface-…run.app`; backend (`/api/*`) = `text-agent-backend-…run.app` — different Cloud Run services. `getApiBaseUrl()` and the existing Disc Check page (`src/app/resources/discrepancy-check/page.tsx` → `${base}/api/resources/discrepancy-check`) both call the backend cross-origin already. So **option (a)'s "same-origin = zero CORS" does not apply to us** — the dashboard's GETs are cross-origin wherever the HTML is hosted. **[V]** *(Answers Marcus's Q2.)*
2. **The pack calls `/api/aces/*`; our backend exposes `/api/resources/*`.** No `/api/aces/*` route exists anywhere in the frontend repo. Either the backend has a separate aces surface we haven't confirmed, or these endpoints are assumed. Must be reconciled against the real `text_agent_backend` before anything is wired. **[V that it's absent frontend-side / ? backend]**
3. **We run no CSP today.** `next.config.mjs` has no `headers()` block; no CSP in middleware, server, Dockerfile, or cloudbuild. So "a one-line `connect-src` allowance" is misleading — there is no policy to add a line to. Introducing a CSP is net-new, app-wide, and must whitelist what the app already uses (Google, Sanity CDN, R2, the backend) or it breaks prod. Not a one-liner. **[V]**
4. **The pack is incomplete and has code defects** (detail in §3). It will not run as delivered.

## 3. Defects found in `disc-engine-embed.html` (verified by reading the file)

| # | Finding | Line(s) | Severity |
|---|---|---|---|
| D1 | Inbound `aces:auth` handler does **not** validate `ev.origin` — any framing page can inject a token | 1163–1164 | HIGH |
| D2 | Outbound `aces:reauth` uses target origin `'*'` — should be pinned to the ACES origin | 1075 | MED |
| D3 | Bearer host (`ACES_API_HOST` / `aces_api_host`) is an injectable string with **no same-origin pin** — the staff token attaches to whatever host is configured; a misconfig sends it off-origin | 1072, 1080–1081 | HIGH |
| D4 | `previewer_invoices.js` + `previewer_contracts.js` referenced but **missing from the pack** — won't run standalone | 54–55 | MED (blocker) |
| D5 | pdf.js pulled from cdnjs with **no SRI integrity hash** — supply-chain exposure, worse if hosted in our origin | 56 | MED |
| D6 | `DATA_SOURCE` defaults to `'api'`; P1 ranking + P3 meter deep-dive are placeholder stubs in this cut (spec §6) — only Page 2 renders live | 1059 | INFO (expected) |

**Confirmed *good* (their claims hold for the static asset):** GETs only — no POST/PUT/DELETE/`sendBeacon` anywhere **[V]**; client/entity mirror is empty (`ACES_MANIFEST.clients:[]` line 62) so nothing confidential is baked in **[V]**; no external *data* egress in the file — only the same-host XHR, cdnjs pdf.js, and the reauth ping **[V]**.

## 4. Architecture — DECIDED: Option A (ACES-native, self-hosted embed)

Agreed 23 Jun. The earlier counter-proposals (Prograde-hosted B / proxy C / shared-key) are **dropped** — they're moot now that ACES owns both ends and the page lives directly in the interface.

**Shape:** Disc Engine's HTML is hosted by ACES as a static asset under the **frontend origin**, embedded in a thin authenticated ACES page. The page authenticates as the signed-in staff member using the app's existing NextAuth session — identical to how `discrepancy-check/page.tsx` already calls the backend. No shared key, no Prograde server, no terms-endpoint CSP, no token minting.

Why A over a native React port (B): Marcus keeps shipping new dashboard versions (P1/P3 fast-follow). Keeping his file droppable makes each update a **file-swap, not a re-port**. We pay a one-time wiring cost (token feed + endpoint remap + defect fixes) and his iterations stay cheap.

**What's confirmed in code:** `discrepancy-check/page.tsx:614–616, 701` reads `session.id_token` and sends `Authorization: Bearer <token>`; `verify_roster_access` (`backend main.py:792`) accepts that same Google ID token. CORS already allows the frontend origin. So the data path needs no new auth machinery. **[V]**

## 5. Phase-0 contract — endpoint remap + token-feed wiring

### 5a. Endpoint remap (pack's assumed `/api/aces/*` → real ACES backend)

| Dashboard accessor | Pack assumed | **Real ACES route** | Notes |
|---|---|---|---|
| `getConfig` | `GET /api/aces/config` | **none** | No backend route. Add `GET /api/climate/config` *or* leave the env banner on its inert mirror default (cosmetic). **Decision needed (minor).** |
| `getClients` (P1) | `GET /clients?period=` | `GET /api/climate/roster?period=&q=&limit=` | Purpose-built "ACES live roster"; returns clients with `reporting_entity`. |
| `getManifest` (P2) | `GET /entities/{e}/activity-sources/manifest?period=` | `GET /api/climate/entities/{entity_id}/activity-sources/manifest?period=` | As-is. |
| `getSite` (P2/P3) | `GET /entities/{e}/activity-sources/site?…` | `GET /api/climate/entities/{entity_id}/activity-sources/site?utility_type=&identifier=&member_aces_client_id=&member_loa_record_id=&period=&invoice_sample_limit=` | **Required:** `utility_type`, `identifier` (both from the manifest's site entries). Returns ~50 invoice rows/meter + sample + ETL preview + staged activity. |

All four: `Authorization: Bearer <staff id_token>`. The remap is applied **only in the ACES-hosted copy** of the HTML — Marcus's source file is unchanged so his updates still drop in (we re-apply the remap as a small patch script on each new version, see §6).

### 5b. Token-feed wiring (the thin wrapper)

The HTML reads two injected values: `ACES_API_HOST` (backend base, line 1072) and `ACES_AUTH.token` (populated via `postMessage {type:'aces:auth'}`, line 1164). Wiring:

1. **New page** `src/app/resources/disc-engine/page.tsx` — `useSession()` to get `session.id_token` (copy the Disc Check pattern). Add nav entry (`src/components/Layouts/sidebar/data/index.ts`) + header title (`src/lib/route-titles.ts`).
2. **Host the asset** at `public/disc-engine/` (HTML + its deps). Iframe `src="/disc-engine/disc-engine-embed.html"` — **same-origin** as the wrapper.
3. **Feed host + token by postMessage**, origin-pinned to `window.location.origin`: on iframe `load`, post `{type:'aces:auth', token, apiHost: getApiBaseUrl()}`. Page sets `ACES_API_HOST` from `apiHost` (keeps prod URL out of the static asset, per Marcus's design intent).
4. **Reauth:** on `{type:'aces:reauth'}` from the iframe, re-read the session and re-post a fresh token. ⚠ **Known limitation:** NextAuth keeps the old `id_token` if Google doesn't reissue one on refresh (`auth.ts:117`) — same constraint the live Disc Check page has. Re-auth may need a page refresh / re-sign-in after ~1h. Acceptable for a review tool; flagged to verify in dev.

### 5c. Defect fixes (applied to the ACES-hosted copy)

- **D1** — add `if (ev.origin !== window.location.origin) return;` to the inbound `aces:auth` handler (line 1163).
- **D2** — change the outbound `aces:reauth` target origin from `'*'` to `window.location.origin` (line 1075).
- **D3** — `ACES_API_HOST` comes only from the authenticated wrapper's `getApiBaseUrl()`, never an untrusted source.
- **D4 — RESOLVED 23 Jun.** Marcus sent both files; **security-verified clean** (≈360 B each, define only the four empty globals `ACES_INVOICE_PDFS/SHA` + `ACES_CONTRACT_PDFS/SHA` — no embedded client data, no `fetch`/`eval`/network/token access). The originals were ~2 MB of base64-embedded client PDFs, deliberately stripped — correct, since data now comes from the live API. Self-host under `public/disc-engine/`. **New gap surfaced (G1, §7):** the document-preview flyout (click invoice/contract → PDF) is empty until a live document endpoint exists — none does yet. Marcus's follow-up, same `/api/climate/*` workstream as the deep-dive. The data views render normally without it.
- **D5** — self-host pdf.js under `public/disc-engine/` (or add an SRI integrity hash) instead of bare cdnjs.

## 6. Sequence (Option A)

Additive throughout; live Disc Check (`/resources/discrepancy-check`) untouched until parity sign-off.

- **Phase 0 — this contract.** Endpoint remap (5a) + wiring (5b) + defect fixes (5c) agreed. *Gate before code.* **← here.**
- **Phase 1 — build in DEV.** Wrapper page + nav/title; host HTML+deps under `public/disc-engine/`; apply remap + D1/D2/D3/D5. Write the remap as a re-runnable patch script so future Prograde versions are a file-swap.
- **Phase 2 — wire proof (DEV).** Confirm `manifest`/`site` return live data — the `aligned-leisure` waste-rows test.
- **Phase 3 — parity vs Disc Check.** Spec §6 sign-off checklist; every delta resolved as logic-difference or defect.
- **Phase 4 — prod.**
- **Phase 5 — P1/P3 fast-follow** (Marcus) lands; full 3-page parity; **then retire Disc Check.**
- **Verification gate (each phase):** re-diff the ACES-hosted copy against Marcus's source so we know exactly what we changed; confirm GET-only + origin pins; dev smoke before prod.

## 7. Open items (none block Phase 1 — D4 now resolved)

- **G1 — document-preview flyout** (click invoice/contract → PDF) renders empty until a live document endpoint exists; none does today. Marcus's follow-up, same `/api/climate/*` workstream as the deep-dive. Data views are unaffected — does **not** block parity on the numbers. **[V]**
- **Marcus/Morgan:** does the P3 deep-dive need >50 invoice rows/meter? If yes, expose `invoice_fetch_limit` on the `site` route (one-line backend change). **[?]**
- **Morgan:** add `GET /api/climate/config` for the env banner, or leave it cosmetic? (minor)
- **Verify in dev:** the `id_token` re-auth behaviour after ~1h (§5b step 4).

---

## 8. Build status — Phase 1 complete in dev (23 Jun)

**Built, verified, NOT yet deployed.** Files:

- `src/app/resources/disc-engine/page.tsx` — authenticated wrapper (handshake).
- `src/components/Layouts/sidebar/data/index.ts` — nav entry (+1 line).
- `src/lib/route-titles.ts` — header title (+1 line).
- `scripts/build-disc-engine.mjs` — re-runnable embed transform (remap + D1/D2/D3/D5).
- `vendor/disc-engine/*` — Marcus's pristine HTML + verified stubs.
- `public/disc-engine/*` — generated hosted embed + stubs + self-hosted pdf.js (v3.11.174).
- `docs/disc-engine-INTEGRATION-for-prograde.md` — the Prograde-facing contract.

**Verification done:** ESLint clean on all 3 source edits; new page type-checks clean; embed diff
shows ONLY the intended transforms (0 `/api/aces/` refs, 8 `/api/climate/`, origin-pinned handshake,
self-hosted pdf.js); stubs SHA-verified byte-identical to the security-reviewed copies; `ACES_*_PDFS`
globals confirmed used only by the (dormant) PDF preview, so empty stubs don't blank data views.
Full `next build` not run here (sandbox time limit) — to be run locally (§9).

### Operational notes (important)

1. **This mount tears host-tool writes.** During the build, the Edit tool silently **truncated the tail**
   of `route-titles.ts` and `sidebar/data/index.ts` (lost the last few lines). Root cause: intermittent
   torn write on the Windows mount, not a code error. Fixed by rebuilding both from the committed git
   blob and verifying byte-for-byte. **Any future file write here must verify byte size / tail after
   writing** (don't trust the write).
2. **Git shows the whole tree as modified** (CRLF/autocrlf line-ending normalisation — pre-existing,
   not from this work). When committing, stage **only** the Disc Engine paths explicitly
   (`git add src/app/resources/disc-engine src/lib/route-titles.ts
   src/components/Layouts/sidebar/data/index.ts scripts/build-disc-engine.mjs vendor/disc-engine
   public/disc-engine docs/disc-engine-*.md`) — **do not** `git add -A`.

## 9. Next steps (Morgan)

1. **Local test:** `npm run dev` → sign in → open **/resources/disc-engine**. Confirm the dashboard
   paints, then navigate into a client's Page 2 and confirm live data loads (the `aligned-leisure`
   waste-rows check). Watch the network tab for `GET /api/climate/...` returning 200.
2. **Build:** `npm run build` (catches anything the sandbox couldn't).
3. **Deploy to dev** via the existing Cloud Build → Cloud Run pipeline; confirm the service comes up
   green in Cloud Console and `/resources/disc-engine` loads on the dev URL.
4. **Update Marcus** with the Prograde-facing doc + the open items (G1 doc endpoint, P1/P3 wiring).
5. **Then:** parity vs Disc Check → prod → retire Disc Check.

---

## 11. Re-base off `reporting_entity` → linked-utility population (23 Jun, DECIDED)

**Decision:** Disc Engine must serve any client with a linked utility (waste now; all utilities as
they go live), not the climate `reporting_entity` rollup. Rationale + Prograde-facing contract: see
`disc-engine-INTEGRATION-for-prograde.md` §9.

**Where the coupling lives (verified):**
- `services/climate_store.py::list_climate_roster` filters `Client.reporting_entity IS NOT NULL` → the
  engine's whole population. **[V]**
- `services/climate_entity_sources.py::build_entity_activity_manifest` resolves a slug via
  `clients_in_disclosure_rollup(db, slug)` → climate rollup of CRM clients. **[V]**
- `build_entity_site_detail` resolves by `(utility_type, identifier, member_aces_client_id,
  member_loa_record_id)` — **already client/utility-keyed; `entity_id` is contextual, not the lookup key.** **[V]**

**Backend changes (ACES side — gated on confirming the linkage source, below):**
1. **Roster:** new/parallel to `list_climate_roster` — return **clients with ≥1 linked utility** (drop the
   `reporting_entity` filter; add a linked-utility filter). Likely route `GET /api/climate/roster` (new
   mode) or a sibling like `/api/discrepancy/roster`.
2. **Manifest by client:** a resolver entered by **client identifier** instead of
   `clients_in_disclosure_rollup`. Reuse the existing per-client site enumeration inside
   `build_entity_activity_manifest`; just change the entry from rollup→single client.
3. **Site detail:** minimal — already keyed by `(utility_type, identifier, member ids)`; `entity_id`
   becomes a client id pass-through.

**Frontend changes (trivial, pending backend):** `scripts/build-disc-engine.mjs` re-points `getClients`
→ the linked-utility roster and `getManifest` → the client-keyed route; the embed's `entity` route key
becomes a **client identifier**. No wrapper change.

**MUST resolve before building (the one real unknown):** how is "a client has a linked utility"
represented? The activity-sources pipeline pulls LOA-linked utilities + invoices from **Airtable**, so
linkage may not be a local column. If it's Airtable-only, the new roster needs either a local linkage
mirror or an Airtable query (cost/latency). **[?]** — next step is to trace the linkage source in
`services/` before speccing the exact roster query.

**Parity note:** until this lands, Disc Engine shows only climate-enrolled clients and **cannot** be
parity-checked against Disc Check (full book). Parity is therefore gated on this re-base.

---

## 12. FINAL DIRECTION — two pages (23 Jun, SUPERSEDES §11 re-base)

Decision: ship **both** a `reporting_entity`-scoped engine and a contextual utility view; compare value.
The §11 roster re-base is **dropped** — we do not re-key Marcus's engine.

**Page A — Disc Engine** (`/resources/disc-engine`, Marcus's embed): unchanged, `reporting_entity`-scoped.
Built earlier this session (§8). Pending: his P1/P3 fast-follow + local test.

**Page B — Utility Discrepancy** (`/resources/utility-discrepancy`, ACES-built): **DONE this session.**
- `src/app/resources/utility-discrepancy/page.tsx` — reads `?utility_type=&identifier=&business_name=`,
  auto-loads `POST /api/utility-invoice-rows` (Bearer staff id_token, `verify_google_token`), renders the
  account's invoice rows (dynamic columns) + total_count; empty/instructional state without params.
- `src/components/crm-member/tabs/UtilitiesTab.tsx` — added a **"Discrepancy Check"** action on the
  **Waste** row (gated `row.config.key === "Waste"`) → opens Page B in a new tab with the utility context.
  Additive; Account Info / Data Request / Quote Request untouched.
- Nav entry + route title added.
- Backend: **no change** — reuses existing `/api/utility-invoice-rows` (returns `{rows,total_count}` from
  Airtable, keyed by `(utility_type, identifier)`, up to 500). Covers any client with a linked utility.

**Verification:** ESLint clean on all four changed files; all writes byte-verified (mount torn-write guard);
button anchor matched exactly once; nav/title/page tails intact. Full `next build` to be run locally.

**v1 scope:** Page B shows the consolidated invoice records for the account. Contract-vs-actuals comparison
(the "discrepancy" proper) is a later layer — surfacing the records is step one.

**No longer needed:** the linked-utility roster + client-keyed manifest re-base (§11) — Page B reaches the
records directly per utility, so no global roster is required.
