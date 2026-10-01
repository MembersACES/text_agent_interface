/**
 * SME vs SME electricity: charges read off the bill, offer rates typed in.
 * Annual dollars must match the comparison sheet. All figures are ex GST.
 * Airtable stores supply, solar metering, and demand rates in cents.
 */

export const SME_ELEC_MAX_USAGE_LINES = 6;

export type SmeElecTariffType = "Time of use" | "Flat" | "Stepped";

export interface SmeElecUsageLine {
  id: string;
  label: string;
  kwh: number;
  /** c/kWh from the invoice. Missing when the line has no rate. */
  currentCPerKwh?: number;
  /** c/kWh typed on the card. Starts at 0. */
  offerCPerKwh: number;
}

export interface SmeElecDayRate {
  /** $/day */
  currentPerDay?: number;
  offerPerDay: number;
}

export interface SmeElecDemandLine {
  id: string;
  label: string;
  /** For example "$/kW/day" or "$/kVA/month". */
  unit: string;
  quantity: number;
  /** Dollars in `unit`, not cents. */
  currentRate?: number;
  offerRate: number;
}

export interface SmeElecFeedIn {
  /** Bill-period export, kWh. */
  kwh: number;
  currentCPerKwh?: number;
  offerCPerKwh: number;
  offerFitIsZero: boolean;
}

export interface SmeElecOfferDraft {
  tariffType: SmeElecTariffType;
  usageLines: SmeElecUsageLine[];
  usageLineOverflow: boolean;
  dailySupply?: SmeElecDayRate;
  metering?: SmeElecDayRate;
  demandLines: SmeElecDemandLine[];
  feedIn?: SmeElecFeedIn;
  invoiceReviewDays?: number;
  billKwh: number;
  annualUsageKwh?: number;
  retailer?: string;
  invoiceReviewPeriod?: string;
  invoiceTotalExGst?: number;
  invoiceLink?: string;
  network?: string;
  networkTariffCode?: string;
  /**
   * Signed % vs the reference price (DMO) or Victorian Default Offer (VDO).
   * Negative means the plan is less than that price.
   */
  vdoPercentDiff?: number;
  /** Lowest annual price for this plan, $/year, including GST. */
  lowestAnnualPrice?: number;
}

export interface SmeElecPrice {
  scale: number | null;
  currentAnnual: number | null;
  offerAnnual: number | null;
  annualSavings: number | null;
  /** Why the annual totals could not be calculated. */
  pricingNotes: string[];
  /** Why Generate must stay blocked. Totals can still update while these are set. */
  generateBlockers: string[];
}

const DEMAND_SPECS: { id: string; label: string; rateKeys: string[]; qtyKeys: string[]; unit: string }[] = [
  {
    id: "chargeable",
    label: "Chargeable demand",
    rateKeys: ["Chargeable Demand Peak (c/kW)", "energy_charges_chargeable_demand_peak_rate"],
    qtyKeys: ["Chargeable Demand Peak (kW/Day)", "energy_charges_chargeable_demand_peak_quantity"],
    unit: "$/kW/day",
  },
  {
    id: "rolling",
    label: "Rolling demand",
    rateKeys: ["Rolling Demand (c/kVA)", "energy_charges_rolling_demand_rate"],
    qtyKeys: ["Rolling Demand (kVA/Day)", "energy_charges_rolling_demand_quantity"],
    unit: "$/kVA/day",
  },
  {
    id: "summer",
    label: "Summer demand",
    rateKeys: ["Summer Demand (c/kVA)", "energy_charges_summer_demand_rate"],
    qtyKeys: ["Summer Demand (kVA/Day)", "energy_charges_summer_demand_quantity"],
    unit: "$/kVA/day",
  },
];

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function smeElecNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (value == null || value === "") return undefined;
  const parsed = parseFloat(String(value).replace(/,/g, "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positive(value: unknown): number | undefined {
  const n = smeElecNumber(value);
  return n != null && n > 0 ? n : undefined;
}

function firstOf(fields: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (fields[key] != null && fields[key] !== "") return fields[key];
  }
  return undefined;
}

function textOf(fields: Record<string, unknown>, keys: string[]): string | undefined {
  const raw = firstOf(fields, keys);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

/** Sheet and extractor rates in cents → dollars. */
function centsToDollars(value: unknown): number | undefined {
  const n = positive(value);
  return n == null ? undefined : n / 100;
}

/**
 * Feed-in on the sheet is usually already c/kWh (49). Some bills store the
 * printed unit price in $/kWh instead (0.011 → 1.1c). A value under 1c, or one
 * that only matches the feed-in dollar amount as $/kWh, is converted.
 */
function feedInCentsPerKwh(rateRaw: unknown, kwh: number | undefined, amountRaw: unknown): number | undefined {
  const rate = smeElecNumber(rateRaw);
  if (rate == null || rate === 0) return undefined;
  const magnitude = Math.abs(rate);
  const amount = smeElecNumber(amountRaw);
  if (kwh != null && kwh > 0 && amount != null && amount !== 0) {
    const target = Math.abs(amount);
    const asCents = Math.abs((kwh * magnitude) / 100 - target);
    const asDollars = Math.abs(kwh * magnitude - target);
    if (asDollars <= 0.05 && asCents > 0.05) return roundRate(magnitude * 100);
    if (asCents <= 0.05 && asDollars > 0.05) return roundRate(magnitude);
  }
  if (magnitude < 1) return roundRate(magnitude * 100);
  return roundRate(magnitude);
}

function roundRate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function smeElecPeriodBounds(period: unknown): { start: string; end: string; endMs: number } | null {
  const match = String(period ?? "").match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  );
  if (!match) return null;
  const pad = (part: string) => part.padStart(2, "0");
  const start = `${pad(match[1])}/${pad(match[2])}/${match[3]}`;
  const end = `${pad(match[4])}/${pad(match[5])}/${match[6]}`;
  const endMs = new Date(Number(match[6]), Number(match[5]) - 1, Number(match[4])).getTime();
  if (!Number.isFinite(endMs)) return null;
  return { start, end, endMs };
}

export function latestSmeElecInvoiceRow(rows: Record<string, unknown>[]): Record<string, unknown> | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const aEnd = smeElecPeriodBounds(a["Invoice Review Period"] ?? a.invoice_review_period)?.endMs ?? 0;
    const bEnd = smeElecPeriodBounds(b["Invoice Review Period"] ?? b.invoice_review_period)?.endMs ?? 0;
    return bEnd - aEnd;
  })[0];
}

function invoiceFields(input: unknown): Record<string, unknown> {
  const root = asRecord(input) ?? {};
  const details =
    asRecord(root.electricity_sme_invoice_details) ?? asRecord(root.electricity_ci_invoice_details);
  const full = asRecord(details?.full_invoice_data) ?? asRecord(root.full_invoice_data);
  return { ...root, ...(full ?? {}), ...(details ?? {}) };
}

function usageLine(
  id: string,
  label: string,
  kwh: number | undefined,
  rate: number | undefined,
): SmeElecUsageLine | null {
  if ((kwh == null || !(kwh > 0)) && (rate == null || !(rate > 0))) return null;
  return {
    id,
    label,
    kwh: kwh != null && kwh > 0 ? kwh : 0,
    currentCPerKwh: rate != null && rate > 0 ? rate : undefined,
    offerCPerKwh: 0,
  };
}

function controlledLoadLines(fields: Record<string, unknown>): SmeElecUsageLine[] {
  const groups = new Map<string, { label: string; kwh?: number; rate?: number }>();
  for (const [key, value] of Object.entries(fields)) {
    const match = key.match(/controlled\s*load(?:\s*(\d+))?\s*(quantity|rate|kwh)?/i);
    if (!match) continue;
    const index = match[1] ?? "1";
    const kind = (match[2] ?? (key.toLowerCase().includes("rate") ? "rate" : "quantity")).toLowerCase();
    const group = groups.get(index) ?? { label: index === "1" && !match[1] ? "Controlled load" : `Controlled load ${index}` };
    const n = positive(value);
    if (kind.startsWith("rate")) group.rate = n;
    else group.kwh = n;
    groups.set(index, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([index, group]) => usageLine(`controlled_${index}`, group.label, group.kwh, group.rate))
    .filter((line): line is SmeElecUsageLine => line != null);
}

function demandLinesFrom(fields: Record<string, unknown>): SmeElecDemandLine[] {
  const lines: SmeElecDemandLine[] = [];
  for (const spec of DEMAND_SPECS) {
    const quantity = positive(firstOf(fields, spec.qtyKeys));
    const currentRate = centsToDollars(firstOf(fields, spec.rateKeys));
    if (quantity == null && currentRate == null) continue;
    lines.push({
      id: spec.id,
      label: spec.label,
      unit: spec.unit,
      quantity: quantity ?? 0,
      currentRate,
      offerRate: 0,
    });
  }
  return lines;
}

export function demandPeriodsPerYear(unit: string): number | null {
  const text = unit.toLowerCase();
  if (text.includes("day")) return 365;
  if (text.includes("month")) return 12;
  return null;
}

function tariffTypeFor(lines: SmeElecUsageLine[]): SmeElecTariffType {
  const tou = lines.some((line) => line.id === "peak" || line.id === "shoulder" || line.id === "off_peak");
  if (tou) return "Time of use";
  if (lines.some((line) => line.id === "general_next")) return "Stepped";
  return "Flat";
}

export function extractSmeElecOffer(input: unknown): SmeElecOfferDraft {
  const fields = invoiceFields(input);
  const peak = usageLine(
    "peak",
    "Peak",
    positive(firstOf(fields, ["Peak Consumption (kWh)", "energy_charges_peak_usage_quantity", "peak_usage"])),
    positive(firstOf(fields, ["Peak Rate (c/kWh)", "energy_charges_peak_usage_rate", "peak_rate"])),
  );
  const shoulder = usageLine(
    "shoulder",
    "Shoulder",
    positive(firstOf(fields, ["Shoulder Consumption (kWh)", "energy_charges_shoulder_usage_quantity", "shoulder_usage"])),
    positive(firstOf(fields, ["Shoulder Rate (c/kWh)", "energy_charges_shoulder_usage_rate", "shoulder_rate"])),
  );
  const offPeak = usageLine(
    "off_peak",
    "Off peak",
    positive(firstOf(fields, ["Off-Peak Consumption (kWh)", "energy_charges_off_peak_usage_quantity", "offpeak_usage", "off_peak_usage"])),
    positive(firstOf(fields, ["Off-Peak Rate (c/kWh)", "energy_charges_off_peak_usage_rate", "offpeak_rate", "off_peak_rate"])),
  );
  const generalKwh = positive(firstOf(fields, ["General Usage Quantity", "energy_charges_general_usage_quantity"]));
  const generalRate = positive(firstOf(fields, ["General Usage Rate", "energy_charges_general_usage_rate"]));
  const nextKwh = positive(firstOf(fields, ["General Usage Next Quantity", "energy_charges_general_usage_next_quantity"]));
  const nextRate = positive(firstOf(fields, ["General Usage Next Rate", "energy_charges_general_usage_next_rate"]));
  const stepped = nextKwh != null || nextRate != null;
  const general = usageLine(stepped ? "general" : "general", stepped ? "Step 1" : "General usage", generalKwh, generalRate);
  const generalNext = usageLine("general_next", "Step 2", nextKwh, nextRate);
  if (general && stepped) general.label = "Step 1";

  const usageLines = [peak, shoulder, offPeak, general, generalNext, ...controlledLoadLines(fields)].filter(
    (line): line is SmeElecUsageLine => line != null,
  );
  const periodRaw = firstOf(fields, ["Invoice Review Period", "invoice_review_period", "review_period"]);
  const bounds = smeElecPeriodBounds(periodRaw);
  const daysFromPeriod = String(periodRaw ?? "").match(/(\d+)\s*days/i);
  const invoiceReviewDays =
    positive(firstOf(fields, ["Invoice Review Number of Days", "invoice_number_of_days", "invoice_review_days"])) ??
    (daysFromPeriod ? positive(daysFromPeriod[1]) : undefined);
  const summedKwh = usageLines.reduce((sum, line) => sum + (line.kwh > 0 ? line.kwh : 0), 0);
  const billKwh =
    positive(firstOf(fields, ["Total Usage", "monthly_usage", "total_usage"])) ?? (summedKwh > 0 ? summedKwh : 0);
  const supply = centsToDollars(
    firstOf(fields, ["Daily Supply Charge Rate", "energy_charges_daily_supply_charge_rate"]),
  );
  const supplyDays = positive(firstOf(fields, ["Daily Supply Charge Quantity", "energy_charges_daily_supply_charge_quantity"]));
  const metering = centsToDollars(
    firstOf(fields, ["Solar Meter Charge Rate", "metering_charges_solar_meter_charge_rate"]),
  );
  const meterDays = positive(firstOf(fields, ["Solar Meter Charge Quantity", "metering_charges_solar_meter_charge_quantity"]));
  const fitKwh = positive(firstOf(fields, ["Solar Feed-in Quantity", "metering_charges_solar_feed_in_quantity"]));
  const fitRate = feedInCentsPerKwh(
    firstOf(fields, ["Solar Feed-in Rate", "metering_charges_solar_feed_in_rate"]),
    fitKwh,
    firstOf(fields, ["Solar Feed-in Amount", "metering_charges_solar_feed_in_amount"]),
  );

  return {
    tariffType: tariffTypeFor(usageLines),
    usageLines,
    usageLineOverflow: usageLines.length > SME_ELEC_MAX_USAGE_LINES,
    dailySupply: supply != null || supplyDays != null ? { currentPerDay: supply, offerPerDay: 0 } : undefined,
    metering: metering != null || meterDays != null ? { currentPerDay: metering, offerPerDay: 0 } : undefined,
    demandLines: demandLinesFrom(fields),
    feedIn: fitKwh != null || fitRate != null
      ? { kwh: fitKwh ?? 0, currentCPerKwh: fitRate, offerCPerKwh: 0, offerFitIsZero: false }
      : undefined,
    invoiceReviewDays,
    billKwh,
    annualUsageKwh: positive(firstOf(fields, ["Estimated Annual Usage", "estimated_annual_usage", "yearly_consumption"])),
    retailer: textOf(fields, ["Retailer", "retailer"]),
    invoiceReviewPeriod: bounds ? `${bounds.start}-${bounds.end}` : textOf(fields, ["Invoice Review Period", "invoice_review_period"]),
    invoiceTotalExGst: positive(firstOf(fields, ["Invoice Total:", "total_charges_subtotal", "total_invoice_cost"])),
    invoiceLink: textOf(fields, ["Invoice Link", "invoice_link"]),
    network: textOf(fields, ["Network", "Distributor", "network"]),
    networkTariffCode: textOf(fields, ["Network Tariff Code", "network_tariff_code", "Tariff Code"]),
  };
}

function billKwhOf(draft: SmeElecOfferDraft): number {
  if (draft.billKwh > 0) return draft.billKwh;
  return draft.usageLines.reduce((sum, line) => sum + (line.kwh > 0 ? line.kwh : 0), 0);
}

export function smeElecUsageScale(draft: SmeElecOfferDraft): number | null {
  const annual = draft.annualUsageKwh;
  const bill = billKwhOf(draft);
  if (annual != null && annual > 0 && bill > 0) return annual / bill;
  const days = draft.invoiceReviewDays;
  if (days != null && days > 0) return 365 / days;
  return null;
}

function pushBlocker(blockers: string[], message: string) {
  if (!blockers.includes(message)) blockers.push(message);
}

export function priceSmeElectricity(draft: SmeElecOfferDraft): SmeElecPrice {
  const pricingNotes: string[] = [];
  const generateBlockers: string[] = [];
  const scale = smeElecUsageScale(draft);
  const days = draft.invoiceReviewDays;

  if (draft.usageLineOverflow) {
    pushBlocker(
      generateBlockers,
      `This bill has ${draft.usageLines.length} usage lines. SME vs SME supports at most ${SME_ELEC_MAX_USAGE_LINES}, so Generate is blocked.`,
    );
  }
  if (draft.usageLines.length === 0) {
    pushBlocker(generateBlockers, "No usage lines were found on this bill.");
    pushBlocker(pricingNotes, "No usage lines were found on this bill.");
  }
  if (scale == null) {
    pushBlocker(generateBlockers, "Enter annual kWh or invoice days so usage can be annualised.");
    pushBlocker(pricingNotes, "Annual kWh or invoice days are missing, so usage cannot be annualised.");
  }

  let missingCurrent = false;
  for (const line of draft.usageLines) {
    if (!(line.currentCPerKwh != null && line.currentCPerKwh > 0)) {
      missingCurrent = true;
      pushBlocker(generateBlockers, `${line.label} needs a current rate from the invoice. No fallback rate is used.`);
    }
    if (!(line.offerCPerKwh > 0)) {
      pushBlocker(generateBlockers, `Enter an offer rate above 0 for ${line.label}.`);
    }
  }

  if (draft.dailySupply) {
    if (!(draft.dailySupply.currentPerDay != null && draft.dailySupply.currentPerDay > 0)) {
      missingCurrent = true;
      pushBlocker(generateBlockers, "Daily supply needs a current $/day from the invoice.");
    }
    if (!(draft.dailySupply.offerPerDay > 0)) {
      pushBlocker(generateBlockers, "Enter an offer rate above 0 for daily supply.");
    }
  }
  if (draft.metering) {
    if (!(draft.metering.currentPerDay != null && draft.metering.currentPerDay > 0)) {
      missingCurrent = true;
      pushBlocker(generateBlockers, "Metering needs a current $/day from the invoice.");
    }
    if (!(draft.metering.offerPerDay > 0)) {
      pushBlocker(generateBlockers, "Enter an offer rate above 0 for metering.");
    }
  }
  for (const demand of draft.demandLines) {
    if (demandPeriodsPerYear(demand.unit) == null) {
      pushBlocker(generateBlockers, `${demand.label} unit must contain "day" or "month".`);
      pushBlocker(pricingNotes, `${demand.label} unit must contain "day" or "month".`);
    }
    if (!(demand.quantity > 0)) {
      missingCurrent = true;
      pushBlocker(generateBlockers, `${demand.label} needs a quantity from the invoice.`);
    }
    if (!(demand.currentRate != null && demand.currentRate > 0)) {
      missingCurrent = true;
      pushBlocker(generateBlockers, `${demand.label} needs a current rate from the invoice.`);
    }
    if (!(demand.offerRate > 0)) {
      pushBlocker(generateBlockers, `Enter an offer rate above 0 for ${demand.label}.`);
    }
  }
  if (draft.feedIn) {
    if (!(days != null && days > 0)) {
      pushBlocker(generateBlockers, "Invoice days are required to annualise feed-in.");
      pushBlocker(pricingNotes, "Invoice days are required to annualise feed-in.");
    }
    if (!(draft.feedIn.kwh > 0)) {
      missingCurrent = true;
      pushBlocker(generateBlockers, "Feed-in needs bill-period kWh from the invoice.");
    }
    if (!(draft.feedIn.currentCPerKwh != null && draft.feedIn.currentCPerKwh > 0)) {
      missingCurrent = true;
      pushBlocker(generateBlockers, "Feed-in needs a current c/kWh from the invoice.");
    }
    if (!(draft.feedIn.offerCPerKwh > 0) && !draft.feedIn.offerFitIsZero) {
      pushBlocker(generateBlockers, "Enter a feed-in offer above 0, or tick “offer FiT is 0”.");
    }
  }

  const canPrice = scale != null && !missingCurrent && !draft.usageLineOverflow && pricingNotes.length === 0;
  if (!canPrice) {
    return { scale, currentAnnual: null, offerAnnual: null, annualSavings: null, pricingNotes, generateBlockers };
  }

  let currentUsage = 0;
  let offerUsage = 0;
  for (const line of draft.usageLines) {
    if (!(line.kwh > 0)) continue;
    currentUsage += line.kwh * scale * (line.currentCPerKwh as number) / 100;
    offerUsage += line.kwh * scale * (line.offerCPerKwh || 0) / 100;
  }
  let currentFixed = 0;
  let offerFixed = 0;
  if (draft.dailySupply?.currentPerDay != null) {
    currentFixed += draft.dailySupply.currentPerDay * 365;
    offerFixed += (draft.dailySupply.offerPerDay || 0) * 365;
  }
  if (draft.metering?.currentPerDay != null) {
    currentFixed += draft.metering.currentPerDay * 365;
    offerFixed += (draft.metering.offerPerDay || 0) * 365;
  }
  for (const demand of draft.demandLines) {
    const periods = demandPeriodsPerYear(demand.unit) as number;
    currentFixed += (demand.currentRate as number) * demand.quantity * periods;
    offerFixed += (demand.offerRate || 0) * demand.quantity * periods;
  }
  let currentFit = 0;
  let offerFit = 0;
  if (draft.feedIn && days != null && days > 0) {
    const fitScale = 365 / days;
    currentFit = draft.feedIn.kwh * fitScale * (draft.feedIn.currentCPerKwh as number) / 100;
    offerFit = draft.feedIn.kwh * fitScale * (draft.feedIn.offerCPerKwh || 0) / 100;
  }
  const currentAnnual = roundMoney(currentUsage + currentFixed - currentFit);
  const offerAnnual = roundMoney(offerUsage + offerFixed - offerFit);
  return {
    scale,
    currentAnnual,
    offerAnnual,
    annualSavings: roundMoney(currentAnnual - offerAnnual),
    pricingNotes,
    generateBlockers,
  };
}

/** Bill-period lines within this many dollars of the invoice total count as a match. */
export const SME_ELEC_BILL_MATCH_TOLERANCE = 0.05;

export interface SmeElecBillAmount {
  id: string;
  /** Quantity × rate, as shown on the row. */
  working: string | null;
  /** Ex-GST dollars for this invoice. Feed-in is negative. */
  dollars: number | null;
}

export interface SmeElecBillCheck {
  currentLines: SmeElecBillAmount[];
  offerLines: SmeElecBillAmount[];
  /** Sum of the rounded current line amounts. Null when a charge cannot be priced. */
  currentTotal: number | null;
  offerTotal: number | null;
  invoiceTotal: number | null;
  difference: number | null;
  status: "match" | "mismatch" | "incomplete" | "no_total";
}

function figureText(value: number): string {
  return value.toLocaleString("en-AU", { maximumFractionDigits: 6 });
}

function centsBillAmount(id: string, quantity: number, cents: number | undefined): SmeElecBillAmount {
  if (!(quantity > 0) || cents == null || !(cents > 0)) return { id, working: null, dollars: null };
  return {
    id,
    working: `${figureText(quantity)} × ${figureText(cents)}c`,
    dollars: roundMoney((quantity * cents) / 100),
  };
}

function dayBillAmount(id: string, perDay: number | undefined, days: number | undefined): SmeElecBillAmount {
  if (perDay == null || !(perDay > 0) || days == null || !(days > 0)) return { id, working: null, dollars: null };
  return {
    id,
    working: `${figureText(perDay)} × ${figureText(days)} days`,
    dollars: roundMoney(perDay * days),
  };
}

function demandBillMultiplier(unit: string, days: number | undefined): number | null {
  if (days == null || !(days > 0)) return null;
  const text = unit.toLowerCase();
  if (text.includes("day")) return days;
  if (text.includes("month")) return (days * 12) / 365;
  return null;
}

function demandBillAmount(line: SmeElecDemandLine, rate: number | undefined, days: number | undefined): SmeElecBillAmount {
  const multiplier = demandBillMultiplier(line.unit, days);
  if (!(line.quantity > 0) || rate == null || !(rate > 0) || multiplier == null) {
    return { id: line.id, working: null, dollars: null };
  }
  const periodLabel = line.unit.toLowerCase().includes("month") ? `${figureText(multiplier)} months` : `${figureText(days as number)} days`;
  return {
    id: line.id,
    working: `${figureText(rate)} × ${figureText(line.quantity)} × ${periodLabel}`,
    dollars: roundMoney(rate * line.quantity * multiplier),
  };
}

function sumBill(lines: SmeElecBillAmount[]): number | null {
  if (lines.some((line) => line.dollars == null)) return null;
  return roundMoney(lines.reduce((sum, line) => sum + (line.dollars as number), 0));
}

/** Bill-period dollars for each charge: kWh × c/kWh / 100, supply and metering × days, feed-in as a credit. */
export function smeElecBillCheck(draft: SmeElecOfferDraft): SmeElecBillCheck {
  const days = draft.invoiceReviewDays;
  const currentLines: SmeElecBillAmount[] = [];
  const offerLines: SmeElecBillAmount[] = [];

  for (const line of draft.usageLines) {
    currentLines.push(centsBillAmount(line.id, line.kwh, line.currentCPerKwh));
    offerLines.push(centsBillAmount(line.id, line.kwh, line.offerCPerKwh));
  }
  if (draft.dailySupply) {
    currentLines.push(dayBillAmount("daily_supply", draft.dailySupply.currentPerDay, days));
    offerLines.push(dayBillAmount("daily_supply", draft.dailySupply.offerPerDay, days));
  }
  if (draft.metering) {
    currentLines.push(dayBillAmount("metering", draft.metering.currentPerDay, days));
    offerLines.push(dayBillAmount("metering", draft.metering.offerPerDay, days));
  }
  for (const demand of draft.demandLines) {
    currentLines.push(demandBillAmount(demand, demand.currentRate, days));
    offerLines.push(demandBillAmount(demand, demand.offerRate, days));
  }
  if (draft.feedIn) {
    const current = centsBillAmount("feed_in", draft.feedIn.kwh, draft.feedIn.currentCPerKwh);
    currentLines.push(current.dollars == null ? current : { ...current, dollars: -current.dollars });
    if (draft.feedIn.offerFitIsZero) {
      offerLines.push({ id: "feed_in", working: "offer FiT is 0", dollars: 0 });
    } else {
      const offer = centsBillAmount("feed_in", draft.feedIn.kwh, draft.feedIn.offerCPerKwh);
      offerLines.push(offer.dollars == null ? offer : { ...offer, dollars: -offer.dollars });
    }
  }

  const currentTotal = sumBill(currentLines);
  const offerTotal = sumBill(offerLines);
  const invoiceTotal = draft.invoiceTotalExGst != null && draft.invoiceTotalExGst > 0 ? roundMoney(draft.invoiceTotalExGst) : null;
  if (currentTotal == null) {
    return { currentLines, offerLines, currentTotal, offerTotal, invoiceTotal, difference: null, status: "incomplete" };
  }
  if (invoiceTotal == null) {
    return { currentLines, offerLines, currentTotal, offerTotal, invoiceTotal, difference: null, status: "no_total" };
  }
  const difference = roundMoney(currentTotal - invoiceTotal);
  const status = Math.abs(difference) <= SME_ELEC_BILL_MATCH_TOLERANCE ? "match" : "mismatch";
  return { currentLines, offerLines, currentTotal, offerTotal, invoiceTotal, difference, status };
}

function webhookNumber(value: number | undefined | null): string {
  return value != null && Number.isFinite(value) ? String(value) : "0";
}

/** Fields posted to the SME vs SME electricity comparison webhook. Rates are the values on screen. */
export function smeElecSmeWebhookFields(draft: SmeElecOfferDraft): Record<string, unknown> {
  const priced = priceSmeElectricity(draft);
  const demand = draft.demandLines[0];
  return {
    retailer: draft.retailer ?? "",
    invoice_review_period: draft.invoiceReviewPeriod ?? "",
    invoice_review_days: draft.invoiceReviewDays != null ? String(draft.invoiceReviewDays) : "",
    invoice_total_ex_gst: draft.invoiceTotalExGst != null ? String(draft.invoiceTotalExGst) : "",
    invoice_link: draft.invoiceLink ?? "",
    network: draft.network ?? "",
    tariff_type: draft.tariffType,
    network_tariff_code: draft.networkTariffCode ?? "",
    bill_kwh: String(draft.billKwh),
    annual_usage_kwh: draft.annualUsageKwh != null ? String(draft.annualUsageKwh) : "",
    current_daily_supply: webhookNumber(draft.dailySupply?.currentPerDay),
    comparison_daily_supply: webhookNumber(draft.dailySupply?.offerPerDay),
    current_daily_metering: webhookNumber(draft.metering?.currentPerDay),
    comparison_daily_metering: webhookNumber(draft.metering?.offerPerDay),
    demand_unit: demand?.unit ?? "",
    demand_qty: demand ? String(demand.quantity) : "0",
    current_demand_rate: webhookNumber(demand?.currentRate),
    comparison_demand_rate: webhookNumber(demand?.offerRate),
    demand_lines: draft.demandLines.map((line) => ({
      label: line.label,
      unit: line.unit,
      quantity: line.quantity,
      current_rate: line.currentRate ?? 0,
      offer_rate: line.offerRate,
    })),
    feed_in_kwh: draft.feedIn ? String(draft.feedIn.kwh) : "0",
    current_fit_c_per_kwh: webhookNumber(draft.feedIn?.currentCPerKwh),
    comparison_fit_c_per_kwh: draft.feedIn?.offerFitIsZero ? "0" : webhookNumber(draft.feedIn?.offerCPerKwh),
    commission_c_per_kwh: "0",
    offer_basis: "manual",
    vdo_percent_diff: draft.vdoPercentDiff != null && Number.isFinite(draft.vdoPercentDiff) ? String(draft.vdoPercentDiff) : "",
    lowest_annual_price: draft.lowestAnnualPrice != null && Number.isFinite(draft.lowestAnnualPrice) ? String(draft.lowestAnnualPrice) : "",
    annual_savings_ui: priced.annualSavings != null ? priced.annualSavings.toFixed(2) : "",
    current_annual_cost: priced.currentAnnual != null ? priced.currentAnnual.toFixed(2) : "",
    offer_annual_cost: priced.offerAnnual != null ? priced.offerAnnual.toFixed(2) : "",
    sme_electricity_lines: draft.usageLines.map((line) => ({
      label: line.label,
      kwh: line.kwh,
      current_c_per_kwh: line.currentCPerKwh ?? 0,
      offer_c_per_kwh: line.offerCPerKwh,
    })),
  };
}
