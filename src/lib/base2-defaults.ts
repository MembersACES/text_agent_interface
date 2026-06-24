/**
 * Base 2 comparison/offer-rate defaults.
 *
 * Mirrors the Base 1 "comparison buckets" pattern: a single versioned config
 * object holds every benchmark/offer rate the Base 2 review compares current
 * invoices against. Segmentation matches Base 1:
 *   - C&I electricity offer rates are chosen by STATE (NSW vs other states).
 *   - C&I gas benchmark is chosen by ANNUAL LOAD tier (GJ/year).
 *   - SME electricity, SME gas, oil, waste, cleaning remain flat.
 *
 * Persistence: stored server-side behind the `/api/base2-comparison-defaults`
 * proxy (GET/PUT). See docs/base2-comparison-defaults-plan.md.
 */

/** A C&I gas annual-load tier. Benchmark applies when annual GJ/year >= minGj
 *  (the highest tier whose minGj is met wins). */
export interface Base2GasTier {
  minGj: number;
  benchmarkPerGj: number;
}

/** C&I electricity offer rates, segmented by state (c/kWh). */
export interface Base2ElectricityCiDefaults {
  nsw: { peak: number; shoulder: number; offPeak: number };
  other: {
    peak: number;
    offPeak: number;
    shoulderDefault: number;
    shoulderWhenSameAsOffPeak: number;
    shoulderSameAsOffPeakTolerance: number;
  };
  meterAnnual: number;
  vasAnnual: number;
  dailySupply: number;
  demandCharge: number;
}

/** SME electricity. Comparison = current * discountFactor when a current rate
 *  exists; otherwise the *Default fallback below is used. */
export interface Base2ElectricitySmeDefaults {
  discountFactor: number;
  peakRateDefault: number;
  offPeakRateDefault: number;
  shoulderRateDefault: number;
  meteringAnnual: number;
  dailySupplyDefault: number;
  demandChargeDefault: number;
}

/** Gas. C&I uses the annual-load tiers; SME uses the flat ciComparisonPerGj
 *  fallback (current * discountFactor when a current rate exists). */
export interface Base2GasDefaults {
  tiers: Base2GasTier[];
  ciComparisonPerGj: number;
  commissionPerGj: number;
  dailySupplyDefault: number;
  smeEnergyShare: number;
  discountFactor: number;
}

export interface Base2OilDefaults {
  comparisonPerL: number;
}

export interface Base2DiscountOnlyDefaults {
  discountFactor: number;
}

export interface Base2Defaults {
  version: number;
  updatedAt: string;
  updatedBy?: string;
  electricity: {
    ci: Base2ElectricityCiDefaults;
    sme: Base2ElectricitySmeDefaults;
  };
  gas: Base2GasDefaults;
  oil: Base2OilDefaults;
  waste: Base2DiscountOnlyDefaults;
  cleaning: Base2DiscountOnlyDefaults;
}

/** In-code fallback, used until the backend config loads. C&I electricity (by
 *  state) and C&I gas (by load) values match the Base 1 comparison buckets. */
export const DEFAULT_BASE2_DEFAULTS: Base2Defaults = {
  version: 1,
  updatedAt: "1970-01-01T00:00:00.000Z",
  electricity: {
    ci: {
      nsw: { peak: 10, shoulder: 10, offPeak: 12 },
      other: {
        peak: 9,
        offPeak: 7,
        shoulderDefault: 9,
        shoulderWhenSameAsOffPeak: 7,
        shoulderSameAsOffPeakTolerance: 0.01,
      },
      meterAnnual: 600,
      vasAnnual: 300,
      dailySupply: 0,
      demandCharge: 0,
    },
    sme: {
      discountFactor: 0.95,
      peakRateDefault: 24.5,
      offPeakRateDefault: 18.0,
      shoulderRateDefault: 20.0,
      meteringAnnual: 700.0,
      dailySupplyDefault: 1.5,
      demandChargeDefault: 12.0,
    },
  },
  gas: {
    tiers: [
      { minGj: 1000, benchmarkPerGj: 17.1 },
      { minGj: 10000, benchmarkPerGj: 15 },
      { minGj: 30000, benchmarkPerGj: 13.9 },
    ],
    ciComparisonPerGj: 17.8,
    commissionPerGj: 3.0,
    dailySupplyDefault: 1.2,
    smeEnergyShare: 0.75,
    discountFactor: 0.95,
  },
  oil: { comparisonPerL: 3 },
  waste: { discountFactor: 0.95 },
  cleaning: { discountFactor: 0.95 },
};

/** Pick the C&I gas benchmark ($/GJ) for an annualised load (GJ/year): the
 *  highest tier whose minGj is met. Falls back to the lowest tier when unknown. */
export function ciGasBenchmarkForAnnualGJ(
  annualGJ: number | undefined,
  tiers: Base2GasTier[],
): number {
  const sorted = [...(tiers ?? [])].sort((a, b) => a.minGj - b.minGj);
  if (sorted.length === 0) return 0;
  let rate = sorted[0].benchmarkPerGj;
  if (annualGJ && annualGJ > 0) {
    for (const t of sorted) if (annualGJ >= t.minGj) rate = t.benchmarkPerGj;
  }
  return rate;
}

/** Deep-merge a partial config from the backend over the in-code defaults. */
export function mergeBase2Defaults(
  partial: Partial<Base2Defaults> | null | undefined,
): Base2Defaults {
  const base = DEFAULT_BASE2_DEFAULTS;
  if (!partial) return base;
  const pe = partial.electricity;
  const pg = partial.gas;
  return {
    version: partial.version ?? base.version,
    updatedAt: partial.updatedAt ?? base.updatedAt,
    updatedBy: partial.updatedBy ?? base.updatedBy,
    electricity: {
      ci: {
        ...base.electricity.ci,
        ...(pe?.ci ?? {}),
        nsw: { ...base.electricity.ci.nsw, ...(pe?.ci?.nsw ?? {}) },
        other: { ...base.electricity.ci.other, ...(pe?.ci?.other ?? {}) },
      },
      sme: { ...base.electricity.sme, ...(pe?.sme ?? {}) },
    },
    gas: {
      ...base.gas,
      ...(pg ?? {}),
      tiers: Array.isArray(pg?.tiers) && pg!.tiers.length > 0 ? pg!.tiers : base.gas.tiers,
    },
    oil: { ...base.oil, ...(partial.oil ?? {}) },
    waste: { ...base.waste, ...(partial.waste ?? {}) },
    cleaning: { ...base.cleaning, ...(partial.cleaning ?? {}) },
  };
}
