/** A retailer plan discount on the current rates. The invoice rows stay as printed. */

export type CurrentDiscountTarget = "usage" | "supply" | "both";

export interface CurrentPlanDiscount {
  /** Percent off the printed current rate. Empty or 0 leaves the rate unchanged. */
  percent?: number;
  target: CurrentDiscountTarget;
}

export function discountFactor(discount: CurrentPlanDiscount | undefined, kind: "usage" | "supply"): number {
  if (!discount) return 1;
  const percent = discount.percent;
  if (percent == null || !Number.isFinite(percent) || percent <= 0) return 1;
  if (discount.target !== "both" && discount.target !== kind) return 1;
  return 1 - Math.min(percent, 100) / 100;
}

export function applyCurrentDiscount(
  rate: number | undefined,
  discount: CurrentPlanDiscount | undefined,
  kind: "usage" | "supply",
): number | undefined {
  if (rate == null || !Number.isFinite(rate)) return rate;
  return rate * discountFactor(discount, kind);
}

export function formatDiscountedRate(
  rate: number | undefined,
  discount: CurrentPlanDiscount | undefined,
  kind: "usage" | "supply",
  digits: number,
): string {
  const next = applyCurrentDiscount(rate, discount, kind);
  if (next == null || !Number.isFinite(next)) return "0";
  return next.toFixed(digits);
}

/** Step c/MJ and dollars, after a usage discount. Supply discounts do not change these. */
export function withUsageDiscount<T extends { rateCPerMj?: number | null; amountAud?: number | null }>(
  block: T,
  discount: CurrentPlanDiscount | undefined,
): T {
  const factor = discountFactor(discount, "usage");
  if (factor === 1) return block;
  return {
    ...block,
    rateCPerMj: block.rateCPerMj != null ? Number((block.rateCPerMj * factor).toFixed(4)) : block.rateCPerMj,
    amountAud: block.amountAud != null ? Number((block.amountAud * factor).toFixed(2)) : block.amountAud,
  };
}
