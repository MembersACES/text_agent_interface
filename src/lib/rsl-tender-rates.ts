/**
 * RSL tender C&I electricity offer rates by NMI group.
 *
 * Sheet rates are $/MWh (Peak / Off Peak) + commission $/MWh.
 * Base 2 offer UI uses c/kWh → cPerKwh = audPerMwh / 10.
 *
 * Applied as an overlay on Base 2 when a loaded NMI matches a group
 * (does not replace global Comparison rates defaults).
 */

export interface RslTenderPeriodAudPerMwh {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  peakAudPerMwh: number;
  offPeakAudPerMwh: number;
}

export interface RslTenderGroup {
  id: string;
  /** Display label for the Base 2 match banner */
  label: string;
  loadMwh: number;
  commissionAudPerMwh: number;
  nmis: string[];
  periods: [RslTenderPeriodAudPerMwh, RslTenderPeriodAudPerMwh, RslTenderPeriodAudPerMwh];
}

/** Card fields set when a tender NMI matches (c/kWh for rates). */
export interface RslTenderCardPatch {
  comparisonPeakRate: number;
  comparisonOffPeakRate: number;
  ciOfferPeriodYears: "3";
  ciOfferPricingType: "stepped";
  ciOfferStartDate: string;
  ciOfferSteppedRates: { peak?: number; offPeak?: number; shoulder?: number }[];
  ciElectricityCommissionAudPerMwh: number;
  ciOfferTenderMatched: true;
  ciOfferTenderGroupId: string;
  ciOfferTenderGroupLabel: string;
  ciOfferTenderGroupNmiCount: number;
}

/** $/MWh → c/kWh (same $/kWh×100 scale used on Base 2 offer rates). */
export function audPerMwhToCPerKwh(audPerMwh: number): number {
  return parseFloat((audPerMwh / 10).toFixed(4));
}

export function normalizeNmi(raw: string): string {
  return raw.replace(/[\s\u00a0]+/g, "").toUpperCase();
}

/** Split a pasted NMI cell that may use commas, newlines, or spaces. */
export function parseNmiList(raw: string): string[] {
  return raw
    .split(/[,;\n\r\t]+/)
    .map((s) => normalizeNmi(s))
    .filter(Boolean);
}

/**
 * Five RSL tender groups from the pricing sheet (Jan 2027 – Jun 2029 stepped).
 * NMI strings kept as provided so they match Airtable identifiers.
 */
export const RSL_TENDER_GROUPS: RslTenderGroup[] = [
  {
    id: "g1-veee0m2b6f0",
    label: "VEEE0M2B6F0 (405 MWh)",
    loadMwh: 405,
    commissionAudPerMwh: 0.6,
    nmis: ["VEEE0M2B6F0"],
    periods: [
      { startDate: "2027-01-01", endDate: "2027-12-31", peakAudPerMwh: 69.46, offPeakAudPerMwh: 69.17 },
      { startDate: "2028-01-01", endDate: "2028-12-31", peakAudPerMwh: 77.83, offPeakAudPerMwh: 77.75 },
      { startDate: "2029-01-01", endDate: "2029-06-30", peakAudPerMwh: 91.88, offPeakAudPerMwh: 91.3 },
    ],
  },
  {
    id: "g2-62030039602",
    label: "62030039602 + VBBB001517 (482 MWh)",
    loadMwh: 482,
    commissionAudPerMwh: 0.6,
    nmis: ["62030039602", "VBBB001517"],
    periods: [
      { startDate: "2027-01-01", endDate: "2027-12-31", peakAudPerMwh: 68.6, offPeakAudPerMwh: 69.31 },
      { startDate: "2028-01-01", endDate: "2028-12-31", peakAudPerMwh: 74.5, offPeakAudPerMwh: 76.0 },
      { startDate: "2029-01-01", endDate: "2029-06-30", peakAudPerMwh: 88.5, offPeakAudPerMwh: 91.0 },
    ],
  },
  {
    id: "g3-8333",
    label: "Multi-site group (8,333 MWh)",
    loadMwh: 8333,
    commissionAudPerMwh: 0.9,
    nmis: [
      "61025357713",
      "VEEE0WPKWT9",
      "VDDD0011352",
      "VBBB0009263",
      "VDDD0008026",
      "VCCCGG00278",
      "VDDD0008991",
      "VBBB0014066",
      "VBBB0014833",
      "VEEE0WKME74",
      "VBBB0014692",
      "VEEE0A02735",
      "VEEE064TC62",
      "VEEE0Q7FDD7",
      "VDDD0011908",
      "VEEE02LMQR1",
      "VBBB0015377",
      "VEEE04772A9",
      "VEEE0VKDG73",
      "63050053746",
      "63050028914",
      "VCCCTC0037",
      "VCCCSC00169",
      "6203004577",
      "VEEE0KK6K4",
    ],
    periods: [
      { startDate: "2027-01-01", endDate: "2027-12-31", peakAudPerMwh: 71.09, offPeakAudPerMwh: 72.92 },
      { startDate: "2028-01-01", endDate: "2028-12-31", peakAudPerMwh: 77.23, offPeakAudPerMwh: 78.88 },
      { startDate: "2029-01-01", endDate: "2029-06-30", peakAudPerMwh: 91.03, offPeakAudPerMwh: 92.39 },
    ],
  },
  {
    id: "g4-1814",
    label: "4-site group (1,814 MWh)",
    loadMwh: 1814,
    commissionAudPerMwh: 0.9,
    nmis: ["VBBB0017003", "VCCCRE00594", "VEEE0VGRNR0", "VEEE0DAEL6"],
    periods: [
      { startDate: "2027-01-01", endDate: "2027-12-31", peakAudPerMwh: 72.34, offPeakAudPerMwh: 68.13 },
      { startDate: "2028-01-01", endDate: "2028-12-31", peakAudPerMwh: 79.52, offPeakAudPerMwh: 76.52 },
      { startDate: "2029-01-01", endDate: "2029-06-30", peakAudPerMwh: 91.27, offPeakAudPerMwh: 89.76 },
    ],
  },
  {
    id: "g5-7805",
    label: "Multi-site group (7,805 MWh)",
    loadMwh: 7805,
    commissionAudPerMwh: 1.2,
    nmis: [
      "VEEE0U1Y2S0",
      "VDDD0010486",
      "VEEE0DXHWM5",
      "VBBB0016368",
      "62038280643",
      "VEEE0DMBPA3",
      "VBBB0008389",
      "VEEE0FAAYM8",
      "VBBB0014354",
      "VCCCCC00364",
      "VCCCAE00611",
      "VCCCLD00726",
      "VEEE0Y8MAU",
      "VCCCHB0020",
      "VEEE0AA6WM",
    ],
    periods: [
      { startDate: "2027-01-01", endDate: "2027-12-31", peakAudPerMwh: 72.89, offPeakAudPerMwh: 69.6 },
      { startDate: "2028-01-01", endDate: "2028-12-31", peakAudPerMwh: 79.26, offPeakAudPerMwh: 77.18 },
      { startDate: "2029-01-01", endDate: "2029-06-30", peakAudPerMwh: 93.31, offPeakAudPerMwh: 92.73 },
    ],
  },
];

const NMI_TO_GROUP: Map<string, RslTenderGroup> = (() => {
  const map = new Map<string, RslTenderGroup>();
  for (const group of RSL_TENDER_GROUPS) {
    for (const nmi of group.nmis) {
      map.set(normalizeNmi(nmi), group);
    }
  }
  return map;
})();

export function findRslTenderGroup(nmi: string): RslTenderGroup | null {
  const key = normalizeNmi(nmi);
  if (!key) return null;

  // 1. Exact match against the tender sheet
  const exact = NMI_TO_GROUP.get(key);
  if (exact) return exact;

  // 2. Invoice/loaded NMI may have one extra trailing digit vs the sheet
  if (key.length > 1) {
    const withoutLast = NMI_TO_GROUP.get(key.slice(0, -1));
    if (withoutLast) return withoutLast;
  }

  // 3. Sheet NMI may have one extra trailing digit vs the invoice
  for (const [listed, group] of NMI_TO_GROUP) {
    if (listed.length > 1 && listed.slice(0, -1) === key) {
      return group;
    }
  }

  return null;
}

export function rslTenderGroupToCardPatch(group: RslTenderGroup): RslTenderCardPatch {
  const [y1, y2, y3] = group.periods;
  return {
    comparisonPeakRate: audPerMwhToCPerKwh(y1.peakAudPerMwh),
    comparisonOffPeakRate: audPerMwhToCPerKwh(y1.offPeakAudPerMwh),
    ciOfferPeriodYears: "3",
    ciOfferPricingType: "stepped",
    ciOfferStartDate: y1.startDate,
    ciOfferSteppedRates: [
      {
        peak: audPerMwhToCPerKwh(y2.peakAudPerMwh),
        offPeak: audPerMwhToCPerKwh(y2.offPeakAudPerMwh),
      },
      {
        peak: audPerMwhToCPerKwh(y3.peakAudPerMwh),
        offPeak: audPerMwhToCPerKwh(y3.offPeakAudPerMwh),
      },
    ],
    ciElectricityCommissionAudPerMwh: group.commissionAudPerMwh,
    ciOfferTenderMatched: true,
    ciOfferTenderGroupId: group.id,
    ciOfferTenderGroupLabel: group.label,
    ciOfferTenderGroupNmiCount: group.nmis.length,
  };
}

/** Lookup NMI → Base 2 card patch, or null if not in the tender sheet. */
export function lookupRslTenderOffer(nmi: string): RslTenderCardPatch | null {
  const group = findRslTenderGroup(nmi);
  if (!group) return null;
  return rslTenderGroupToCardPatch(group);
}

/** Overlay tender offer rates onto extracted C&I electricity rates when NMI matches. */
export function applyRslTenderOfferIfMatched<T extends Record<string, unknown>>(
  rates: T,
  nmi: string,
): T {
  const patch = lookupRslTenderOffer(nmi);
  if (!patch) return rates;
  return { ...rates, ...patch };
}
