/** Alinta market load factor. 1 is a flat load; they lodge agreements at 2. */
const MDQ_YEAR_DAYS = 365;
const MDQ_MARKET_LOAD_FACTOR = 2;

export function parseQuantity(raw: string): number | null {
  const text = raw.replace(/,/g, "").trim();
  if (!text) return null;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** MDQ (GJ/day) = CPQ / 365 × 2, rounded to a whole GJ. */
export function estimateMdqGj(cpq: number): number | null {
  if (!Number.isFinite(cpq) || cpq <= 0) return null;
  const rounded = Math.round((cpq / MDQ_YEAR_DAYS) * MDQ_MARKET_LOAD_FACTOR);
  return rounded >= 1 ? rounded : null;
}

export function formatMdq(value: number): string {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(value);
}
