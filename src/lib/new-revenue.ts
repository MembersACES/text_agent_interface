export const DEFAULT_FEE_PERCENT = 20;

export const NEW_REVENUE_TYPES = [
  { id: "electricity_discrepancy", label: "Electricity Discrepancy Recovery", category: "Discrepancy" },
  { id: "gas_discrepancy", label: "Gas Discrepancy Recovery", category: "Discrepancy" },
  { id: "waste_discrepancy", label: "Waste Discrepancy Recovery", category: "Discrepancy" },
  { id: "resource_recovery", label: "Resource Recovery", category: "New Revenue" },
  { id: "asset_optimisation", label: "Asset Optimisation", category: "New Revenue" },
  { id: "carbon_credits", label: "Carbon Credits", category: "New Revenue" },
  { id: "certificate_offsets", label: "Certificate Offsets", category: "New Revenue" },
  { id: "cds", label: "CDS (Container Deposit Scheme)", category: "New Revenue" },
  { id: "other_rebate", label: "Other Rebate / New Revenue", category: "New Revenue" },
] as const;

export type NewRevenueTypeId = (typeof NEW_REVENUE_TYPES)[number]["id"];

export type NewRevenueFeeBreakdown = {
  gross: number;
  feePercent: number;
  fee: number;
  gst: number;
  total: number;
};

export const GST_MULTIPLIER = 1.1;

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Convert a typed amount to ex-GST. Ticked = the figure already includes 10% GST. */
export function toExGst(amount: number, includesGst: boolean): number {
  const value = Number.isFinite(amount) ? amount : 0;
  if (!includesGst) return roundCents(value);
  return roundCents(value / GST_MULTIPLIER);
}

/** Service fee is 20% of the gross outcome (ex GST); GST is 10% on the fee. */
export function calcNewRevenueFee(
  grossExGst: number,
  feePercent: number = DEFAULT_FEE_PERCENT
): NewRevenueFeeBreakdown {
  const gross = roundCents(Number.isFinite(grossExGst) ? grossExGst : 0);
  const pct = Number.isFinite(feePercent) ? feePercent : DEFAULT_FEE_PERCENT;
  const fee = roundCents(gross * (pct / 100));
  const gst = roundCents(fee * 0.1);
  const total = roundCents(fee + gst);
  return { gross, feePercent: pct, fee, gst, total };
}

export function formatAud(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number.isFinite(amount) ? amount : 0);
}
