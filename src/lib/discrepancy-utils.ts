export const DISCREPANCY_NUMERIC_EPSILON = 0.001;

export type DiscrepancyRow = {
  discrepancy_type: string;
  utility_identifier: string;
  linked_business_name: string;
  invoice_period: string;
  invoice_rate: string;
  contract_period: string;
  contract_rate: string;
  rate_difference: string;
  pct_difference: string;
  annual_quantity_gj: string;
  annual_potential_overcharge: string;
  take_or_pay_invoice: string;
};

export type ElectricityContractRow = {
  discrepancy_type: string;
  utility_identifier: string;
  linked_business_name: string;
  retailer: string;
  site_address: string;
  invoice_period: string;
  contract_period: string;
  peak_quantity_kwh: string;
  peak_contract_rate: string;
  peak_invoice_rate: string;
  peak_rate_difference: string;
  peak_pct_difference: string;
  shoulder_quantity_kwh: string;
  shoulder_contract_rate: string;
  shoulder_invoice_rate: string;
  shoulder_rate_difference: string;
  shoulder_pct_difference: string;
  off_peak_quantity_kwh: string;
  off_peak_contract_rate: string;
  off_peak_invoice_rate: string;
  off_peak_rate_difference: string;
  off_peak_pct_difference: string;
  service_charge_contract: string;
  service_charge_invoice: string;
  service_charge_difference: string;
  service_charge_pct_difference: string;
  contract_target_consumption_kwh: string;
  discrepancy_detected: string;
  notes: string;
};

export type DmaRow = {
  discrepancy_type: string;
  utility_identifier: string;
  linked_business_name: string;
  dma_annual_fee: string;
  dma_daily_rate: string;
  invoice_period: string;
  invoice_comparison_days: string;
  expected_charge: string;
  actual_invoice_charge: string;
  difference: string;
  status: string;
};

export type GasAggregationMode = "worst" | "summed";
export type DmaAggregationMode = "worst" | "summed";
export type ElectricityContractPickMode = "latest_hit" | "max_peak_diff";

export type GasSummary = {
  hitCount: number;
  totalAnnualOvercharge: number | null;
  totalAnnualOverchargeFormatted: string | null;
  representativeRow: DiscrepancyRow | null;
  moreCount: number;
};

export type ElectricityContractSummary = {
  hitCount: number;
  representativeRow: ElectricityContractRow | null;
  moreCount: number;
};

export type DmaSummary = {
  hitCount: number;
  totalDifference: number | null;
  totalDifferenceFormatted: string | null;
  representativeRow: DmaRow | null;
  moreCount: number;
};

export function parseNumericCell(val: string | undefined): number | null {
  const raw = (val ?? "").trim().replace(/[$,%]/g, "");
  if (!raw || raw === "—") return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

export function formatCurrencyAmount(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function isTruthyDetected(val: string | undefined): boolean {
  const v = (val ?? "").trim().toUpperCase();
  return v === "TRUE" || v === "YES" || v === "1";
}

export function isGasOvercharged(row: DiscrepancyRow): boolean {
  const overcharge = parseNumericCell(row.annual_potential_overcharge);
  if (overcharge != null && overcharge > DISCREPANCY_NUMERIC_EPSILON) return true;
  const rateDiff = parseNumericCell(row.rate_difference);
  if (rateDiff != null && Math.abs(rateDiff) > DISCREPANCY_NUMERIC_EPSILON) return true;
  const pctDiff = parseNumericCell(row.pct_difference);
  if (pctDiff != null && Math.abs(pctDiff) > DISCREPANCY_NUMERIC_EPSILON) return true;
  return false;
}

export function isElectricityContractHit(row: ElectricityContractRow): boolean {
  return isTruthyDetected(row.discrepancy_detected);
}

export function isDmaMismatch(row: DmaRow): boolean {
  const status = (row.status ?? "").toLowerCase();
  return status.includes("❌") || status.includes("mismatch");
}

export function isDemandMismatch(row: Record<string, string>): boolean {
  const status = (row.status ?? "").toLowerCase();
  if (
    status.includes("❌") ||
    status.includes("mismatch") ||
    status.includes("issue") ||
    status.includes("overcharge")
  ) {
    return true;
  }
  for (const key of ["difference", "demand_difference"] as const) {
    const n = parseNumericCell(row[key]);
    if (n != null && Math.abs(n) > DISCREPANCY_NUMERIC_EPSILON) return true;
  }
  return false;
}

export function rowHasAnyValue(row: Record<string, string>): boolean {
  return Object.values(row).some((v) => (v ?? "").trim() !== "");
}

export function filterGasHits(rows: DiscrepancyRow[]): DiscrepancyRow[] {
  return rows.filter(isGasOvercharged);
}

export function filterContractHits(rows: ElectricityContractRow[]): ElectricityContractRow[] {
  return rows.filter(isElectricityContractHit);
}

export function filterDmaHits(rows: DmaRow[]): DmaRow[] {
  return rows.filter(isDmaMismatch);
}

export function hasGasHits(rows: DiscrepancyRow[]): boolean {
  return rows.some(isGasOvercharged);
}

export function hasElectricityContractHits(rows: ElectricityContractRow[]): boolean {
  return rows.some(isElectricityContractHit);
}

export function hasDmaHits(rows: DmaRow[]): boolean {
  return rows.some(isDmaMismatch);
}

export function hasElectricityHits(
  contractRows: ElectricityContractRow[],
  dmaRows: DmaRow[]
): boolean {
  return hasElectricityContractHits(contractRows) || hasDmaHits(dmaRows);
}

export function parseInvoicePeriodEndDate(period: string): number {
  if (!period?.trim()) return 0;
  const part = period.includes("-") ? period.split("-").pop()?.trim() : period.trim();
  const [d, m, y] = (part ?? "").split("/").map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d).getTime();
}

export function sortByInvoicePeriod<T extends { invoice_period?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const timeA = parseInvoicePeriodEndDate(a.invoice_period ?? "");
    const timeB = parseInvoicePeriodEndDate(b.invoice_period ?? "");
    return timeB - timeA;
  });
}

function sumNumericField<T>(rows: T[], getter: (row: T) => string | undefined): number | null {
  let total = 0;
  let hasValue = false;
  for (const row of rows) {
    const n = parseNumericCell(getter(row));
    if (n != null) {
      total += n;
      hasValue = true;
    }
  }
  return hasValue ? total : null;
}

export function pickGasSummary(
  rows: DiscrepancyRow[],
  mode: GasAggregationMode = "summed"
): GasSummary {
  const hits = sortByInvoicePeriod(filterGasHits(rows));
  const hitCount = hits.length;
  if (hitCount === 0) {
    return {
      hitCount: 0,
      totalAnnualOvercharge: null,
      totalAnnualOverchargeFormatted: null,
      representativeRow: null,
      moreCount: 0,
    };
  }

  let totalAnnualOvercharge: number | null;
  let representativeRow: DiscrepancyRow;

  if (mode === "summed") {
    totalAnnualOvercharge = sumNumericField(hits, (r) => r.annual_potential_overcharge);
    representativeRow = hits[0];
  } else {
    const worst = [...hits].sort((a, b) => {
      const oa = parseNumericCell(a.annual_potential_overcharge) ?? 0;
      const ob = parseNumericCell(b.annual_potential_overcharge) ?? 0;
      return ob - oa;
    })[0];
    representativeRow = worst;
    totalAnnualOvercharge = parseNumericCell(worst.annual_potential_overcharge);
  }

  return {
    hitCount,
    totalAnnualOvercharge,
    totalAnnualOverchargeFormatted:
      totalAnnualOvercharge != null ? formatCurrencyAmount(totalAnnualOvercharge) : null,
    representativeRow,
    moreCount: Math.max(0, hitCount - 1),
  };
}

export function pickElectricityContractSummary(
  rows: ElectricityContractRow[],
  mode: ElectricityContractPickMode = "latest_hit"
): ElectricityContractSummary {
  const hits = sortByInvoicePeriod(filterContractHits(rows));
  const hitCount = hits.length;
  if (hitCount === 0) {
    return { hitCount: 0, representativeRow: null, moreCount: 0 };
  }

  let representativeRow = hits[0];
  if (mode === "max_peak_diff") {
    representativeRow = [...hits].sort((a, b) => {
      const pa = Math.abs(parseNumericCell(a.peak_rate_difference) ?? 0);
      const pb = Math.abs(parseNumericCell(b.peak_rate_difference) ?? 0);
      return pb - pa;
    })[0];
  }

  return {
    hitCount,
    representativeRow,
    moreCount: Math.max(0, hitCount - 1),
  };
}

export function pickDmaSummary(rows: DmaRow[], mode: DmaAggregationMode = "summed"): DmaSummary {
  const hits = sortByInvoicePeriod(filterDmaHits(rows));
  const hitCount = hits.length;
  if (hitCount === 0) {
    return {
      hitCount: 0,
      totalDifference: null,
      totalDifferenceFormatted: null,
      representativeRow: null,
      moreCount: 0,
    };
  }

  let totalDifference: number | null;
  let representativeRow: DmaRow;

  if (mode === "summed") {
    totalDifference = sumNumericField(hits, (r) => r.difference);
    representativeRow = hits[0];
  } else {
    representativeRow = [...hits].sort((a, b) => {
      const da = Math.abs(parseNumericCell(a.difference) ?? 0);
      const db = Math.abs(parseNumericCell(b.difference) ?? 0);
      return db - da;
    })[0];
    totalDifference = parseNumericCell(representativeRow.difference);
  }

  return {
    hitCount,
    totalDifference,
    totalDifferenceFormatted:
      totalDifference != null ? formatCurrencyAmount(totalDifference) : null,
    representativeRow,
    moreCount: Math.max(0, hitCount - 1),
  };
}

export type DiscrepancyCheckViewType = "gas" | "electricity_contract" | "dma" | "demand";

export function parseDiscrepancyViewType(raw: string | null): DiscrepancyCheckViewType {
  const t = (raw ?? "gas").toLowerCase();
  if (t === "electricity" || t === "electricity_contract" || t === "contract") {
    return "electricity_contract";
  }
  if (t === "dma" || t === "electricity_dma") return "dma";
  if (t === "demand") return "demand";
  return "gas";
}

export function buildDiscrepancyCheckUrl(
  businessName: string,
  identifier: string,
  type: DiscrepancyCheckViewType
): string {
  const params = new URLSearchParams({
    business_name: businessName,
    identifier,
    type,
    mismatches_only: "1",
  });
  return `/resources/discrepancy-check?${params.toString()}`;
}

export function shouldDefaultMismatchFilter(
  hasIdentifierDeepLink: boolean,
  viewType: DiscrepancyCheckViewType,
  mismatchesOnlyParam?: string | null
): boolean {
  if (mismatchesOnlyParam === "1" || mismatchesOnlyParam === "true") return true;
  if (!hasIdentifierDeepLink) return false;
  return viewType === "electricity_contract" || viewType === "dma" || viewType === "gas";
}
