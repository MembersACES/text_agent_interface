# Base 2 comparison-defaults — design & backend contract

Editable, persisted comparison/offer rates for the Base 2 review page, mirroring
the Base 1 "comparison buckets" pattern. Goal: an expandable section at the top
of `/base-2` where staff can see and edit every rate Base 2 benchmarks against,
saved server-side so **every future Base 2 review (for every user) uses the
edited rates**.

Status: frontend foundation built (schema + proxy route + editor); **backend
storage endpoint still to be implemented** (this doc is its contract).

## Why this differs from Base 1 (and is simpler)

In Base 1, the savings logic runs in the **backend agent**, which reads the
buckets JSON from GCS at review time. In Base 2, the comparison is computed
**client-side** in `src/app/base-2/page.tsx`, and the resulting rates are already
sent downstream in the generate-DMA / offer payloads. So we only need to:

1. Hold the defaults in one config object (done: `src/lib/base2-defaults.ts`).
2. Let staff edit + persist that object (editor panel + proxy route + backend store).
3. Have `extractCurrentRates` seed from the loaded config instead of literals.

No backend compute change is required — unlike Base 1.

## Architecture

```
Editor panel (/base-2, collapsible)
   │  GET / PUT  { defaults, generation }
   ▼
Next.js proxy  src/app/api/base2-comparison-defaults/route.ts
   │  adds session auth + X-Base2-Admin-Key, sets updatedBy from session email
   ▼
Backend endpoint  {BASE2_DEFAULTS_API_URL}/api/base2-comparison-defaults
   │  GCS read/write with ifGenerationMatch (optimistic lock)
   ▼
GCS object  base2-comparison-defaults.json   (single global org config)
```

## Config schema

Source of truth: `src/lib/base2-defaults.ts` (`Base2Defaults` interface +
`DEFAULT_BASE2_DEFAULTS`). The default values are byte-for-byte the literals
previously hardcoded in `extractCurrentRates`:

| Utility | Field | Default | Was (page.tsx) |
|---|---|---|---|
| C&I elec | meterAnnual | 600 | hardcoded 600 |
| C&I elec | vasAnnual | 300 | hardcoded 300 |
| C&I elec | peak/offpeak/shoulder/supply/demand | 0 | hardcoded 0 (manual entry) |
| SME elec | discountFactor | 0.95 | ×0.95 of current |
| SME elec | peakRateDefault | 24.50 | fallback 24.50 |
| SME elec | offPeakRateDefault | 18.00 | fallback 18.00 |
| SME elec | shoulderRateDefault | 20.00 | fallback 20.00 |
| SME elec | meteringAnnual | 700.00 | hardcoded 700 |
| SME elec | dailySupplyDefault | 1.50 | fallback 1.50 |
| SME elec | demandChargeDefault | 12.00 | fallback 12.00 |
| Gas | ciComparisonPerGj | 17.8 | DEFAULT_CI_GAS_COMPARISON_RATE_PER_GJ |
| Gas | commissionPerGj | 3.00 | DEFAULT_CI_GAS_COMMISSION_AUD_PER_GJ |
| Gas | dailySupplyDefault | 1.20 | fallback 1.20 |
| Gas | smeEnergyShare | 0.75 | DEFAULT_SME_CI_ENERGY_SHARE |
| Gas | discountFactor | 0.95 | ×0.95 of current |
| Oil | comparisonPerL | 3 | DEFAULT_OIL_COMPARISON_RATE_PER_L |
| Waste | discountFactor | 0.95 | ×0.95 of current (no fixed fallback) |
| Cleaning | discountFactor | 0.95 | ×0.95 of current (no fixed fallback) |

## Backend contract (to implement)

Endpoint: `GET` and `PUT` `/api/base2-comparison-defaults`. Auth: require header
`X-Base2-Admin-Key` to equal the configured write secret. Persist a single
global JSON object to GCS.

### GET
- Read `base2-comparison-defaults.json` from GCS.
- If absent, return the seed (`DEFAULT_BASE2_DEFAULTS` shape) with `generation: null`.
- Response: `200 { "defaults": Base2Defaults, "generation": string | null }`
  where `generation` is the GCS object generation (for optimistic locking).

### PUT
- Body: `{ "defaults": Base2Defaults, "generation": string | null }`.
- Validate the payload shape (reject unknown/missing fields; numeric ranges
  sane — e.g. rates ≥ 0). Return `400 { error, details: string[] }` on failure.
- Write to GCS using `ifGenerationMatch: <generation>` so a concurrent edit
  fails. On precondition failure return `409 { error: "stale generation" }`.
- On success bump `version`, set `updatedAt` (server time) and persist
  `updatedBy` (already injected by the Next.js proxy from the session email).
- Response: `200 { "defaults": Base2Defaults, "generation": string }`.

### Env / config
- Interface: `BASE2_DEFAULTS_API_URL` (backend base URL; may reuse the existing
  backend host), `BASE2_DEFAULTS_WRITE_SECRET` (admin key the proxy sends).
- Backend: GCS bucket + object name; the same write secret to compare against.

## Frontend wiring (in this repo)

1. `src/lib/base2-defaults.ts` — schema + `DEFAULT_BASE2_DEFAULTS` + `mergeBase2Defaults`. ✅ built
2. `src/app/api/base2-comparison-defaults/route.ts` — session-gated GET/PUT proxy. ✅ built
3. `Base2ComparisonDefaultsEditor` — collapsible editor, explicit Save, 409 handling. ⏳
4. `base-2/page.tsx` — load config to state on mount; mount the panel at top;
   refactor `extractCurrentRates` to read `base2Defaults ?? DEFAULT_BASE2_DEFAULTS`
   instead of inline literals. ⏳

## Behaviour notes / decisions

- **Until the backend endpoint exists**, the proxy returns 503 (like Base 1
  without its secret) and the page falls back to `DEFAULT_BASE2_DEFAULTS` — i.e.
  today's exact behaviour, no regression.
- **Scope**: single global config (all staff share one set), matching Base 1.
- **C&I offer energy rates** default to 0 because they're entered per deal; they
  are included in the config so they *can* be defaulted if desired.
- **No retro-edit**: changing defaults affects future loads only; already-loaded
  utilities on screen keep their values unless reloaded.
