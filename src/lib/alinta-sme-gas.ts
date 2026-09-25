/**
 * Alinta SME gas offer — BusinessDeal Flex, Group 1 (inc GST).
 *
 * Source: the "Business Gas" sheet on the Alinta Group 1 workbooks.
 * Price is by gas network, season, and declining MJ/day blocks.
 * c/MJ and c/day on the sheet. Dollars = cents / 100.
 */

export type AlintaGasNetworkId = "multinet" | "agn" | "ausnet";

export type AlintaFlagLevel = "error" | "warning" | "info";

export interface AlintaSmeGasFlag {
  id: string;
  level: AlintaFlagLevel;
  title: string;
  detail: string;
}

export interface AlintaBlock {
  /** MJ/day in this step. Null is the remainder. */
  mjPerDay: number | null;
  rateCPerMj: number;
}

export interface AlintaSeason {
  id: string;
  label: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  blocks: AlintaBlock[];
  supplyCPerDay: number;
}

export interface AlintaNetworkCard {
  id: AlintaGasNetworkId;
  label: string;
  product: string;
  seasons: AlintaSeason[];
}

export const ALINTA_SME_GAS_PRODUCT = "BusinessDeal Flex";
export const ALINTA_SME_GAS_GROUP = "Group 1";

const MULTINET_OFFPEAK_BLOCKS: AlintaBlock[] = [
  { mjPerDay: 250, rateCPerMj: 3.168 },
  { mjPerDay: 750, rateCPerMj: 2.662 },
  { mjPerDay: 500, rateCPerMj: 2.453 },
  { mjPerDay: 3500, rateCPerMj: 2.332 },
  { mjPerDay: null, rateCPerMj: 2.2 },
];

const MULTINET_PEAK_BLOCKS: AlintaBlock[] = [
  { mjPerDay: 250, rateCPerMj: 3.278 },
  { mjPerDay: 750, rateCPerMj: 2.673 },
  { mjPerDay: 500, rateCPerMj: 2.497 },
  { mjPerDay: 3500, rateCPerMj: 2.354 },
  { mjPerDay: null, rateCPerMj: 2.2 },
];

const AGN_BLOCKS: AlintaBlock[] = [
  { mjPerDay: 50, rateCPerMj: 3.828 },
  { mjPerDay: 500, rateCPerMj: 2.926 },
  { mjPerDay: 820, rateCPerMj: 2.75 },
  { mjPerDay: null, rateCPerMj: 2.464 },
];

/** Sheet row labelled "1 October to 31 May" — same on Fawkner and Warrnambool. */
const AUSNET_LABELLED_BLOCKS: AlintaBlock[] = [
  { mjPerDay: 100, rateCPerMj: 2.607 },
  { mjPerDay: 100, rateCPerMj: 2.53 },
  { mjPerDay: 1200, rateCPerMj: 2.519 },
  { mjPerDay: null, rateCPerMj: 2.486 },
];

/** Fawkner’s second row. Higher first step, so this is treated as winter. */
const AUSNET_WINTER_BLOCKS: AlintaBlock[] = [
  { mjPerDay: 100, rateCPerMj: 2.673 },
  { mjPerDay: 100, rateCPerMj: 2.607 },
  { mjPerDay: 1200, rateCPerMj: 2.574 },
  { mjPerDay: null, rateCPerMj: 2.519 },
];

export const ALINTA_SME_GAS_NETWORKS: Record<AlintaGasNetworkId, AlintaNetworkCard> = {
  multinet: {
    id: "multinet",
    label: "Multinet",
    product: ALINTA_SME_GAS_PRODUCT,
    seasons: [
      {
        id: "offpeak",
        label: "Off-peak 1 Nov–30 Apr",
        startMonth: 11,
        startDay: 1,
        endMonth: 4,
        endDay: 30,
        blocks: MULTINET_OFFPEAK_BLOCKS,
        supplyCPerDay: 123.057,
      },
      {
        id: "peak",
        label: "Peak 1 May–31 Oct",
        startMonth: 5,
        startDay: 1,
        endMonth: 10,
        endDay: 31,
        blocks: MULTINET_PEAK_BLOCKS,
        supplyCPerDay: 123.057,
      },
    ],
  },
  agn: {
    id: "agn",
    label: "Australian Gas Networks",
    product: ALINTA_SME_GAS_PRODUCT,
    seasons: [
      {
        id: "all",
        label: "All times",
        startMonth: 1,
        startDay: 1,
        endMonth: 12,
        endDay: 31,
        blocks: AGN_BLOCKS,
        supplyCPerDay: 90.552,
      },
    ],
  },
  ausnet: {
    id: "ausnet",
    label: "AusNet",
    product: ALINTA_SME_GAS_PRODUCT,
    seasons: [
      {
        id: "labelled",
        label: "1 Oct–31 May (as labelled on the sheet)",
        startMonth: 10,
        startDay: 1,
        endMonth: 5,
        endDay: 31,
        blocks: AUSNET_LABELLED_BLOCKS,
        supplyCPerDay: 104.423,
      },
      {
        id: "winter",
        label: "Winter 1 Jun–30 Sep (assumed — higher block)",
        startMonth: 6,
        startDay: 1,
        endMonth: 9,
        endDay: 30,
        blocks: AUSNET_WINTER_BLOCKS,
        supplyCPerDay: 104.423,
      },
    ],
  },
};

const LISTED_SITES: Record<string, { network: AlintaGasNetworkId; name: string }> = {
  "53107627601": { network: "multinet", name: "Upper Yarra RSL" },
  "53101636277": { network: "multinet", name: "Caulfield RSL" },
  "53104321389": { network: "multinet", name: "Clayton RSL" },
  "53202463627": { network: "agn", name: "West Heidelberg RSL" },
  "53301269869": { network: "ausnet", name: "Fawkner RSL" },
  "53300366476": { network: "ausnet", name: "Warrnambool RSL" },
};

const NON_SERVICEABLE: Record<string, { network: string; address: string; reason: string }> = {
  "53107843940": {
    network: "AusNet",
    address: "5 Smith Street, Leongatha VIC 3953",
    reason: "No energy plans available at this location",
  },
};

export interface AlintaPriceStep {
  mj: number;
  rateCPerMj: number;
  aud: number;
  /** The MJ/day band this step prices, e.g. 0–250. `toMjPerDay` null is the open top block. */
  fromMjPerDay: number;
  toMjPerDay: number | null;
  /** MJ/day of this bill that falls in the band. */
  mjPerDay: number;
}

export interface AlintaPriceSlice {
  seasonId: string;
  seasonLabel: string;
  days: number;
  mj: number;
  energyAud: number;
  supplyAud: number;
  steps: AlintaPriceStep[];
}

export interface AlintaSmeGasQuote {
  networkId: AlintaGasNetworkId | null;
  networkLabel: string | null;
  product: string | null;
  match: "listed" | "prefix" | "manual" | "none" | "non_serviceable";
  listedName?: string;
  serviceable: boolean;
  flags: AlintaSmeGasFlag[];
  slices: AlintaPriceSlice[];
  offerEnergyAud: number | null;
  offerSupplyAud: number | null;
  /** Blended energy rate for this bill’s load shape, $/GJ. */
  offerAudPerGj: number | null;
  /** Supply in $/day (c/day ÷ 100). */
  offerDailyAud: number | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export function normalizeMirn(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/** Invoice supply price is already $/day when it looks like one. Do not divide it by the day count. */
export function smeInvoiceDailySupplyAud(rate: number, days: number): number | undefined {
  if (!Number.isFinite(rate) || rate <= 0) return undefined;
  if (rate >= 0.2 && rate <= 20) return rate;
  if (days > 1) {
    const perDay = rate / days;
    if (perDay >= 0.2 && perDay <= 20) return perDay;
  }
  if (rate >= 20 && rate <= 400) return rate / 100;
  return rate;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

export function parseLooseDate(raw: string): string | null {
  const text = raw.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
  if (dmy) return isoFromParts(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  const named = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    if (month) return isoFromParts(Number(named[3]), month, Number(named[1]));
  }
  return null;
}

function isoFromParts(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1990 || year > 2100) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateRange(raw: string): { start: string; end: string } | null {
  const text = raw.replace(/\s+/g, " ").trim();
  // Invoice sheet format: "27/03/2026-24/06/2026", no spaces around the dash.
  const packed = text.match(/^(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})\s*[-–—]\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})$/);
  if (packed) {
    const start = parseLooseDate(packed[1]);
    const end = parseLooseDate(packed[2]);
    return start && end && start <= end ? { start, end } : null;
  }
  const parts = text.split(/\s+(?:to|–|—|-)\s+/i);
  if (parts.length < 2) return null;
  const start = parseLooseDate(parts[0]);
  const end = parseLooseDate(parts[parts.length - 1]);
  if (!start || !end || start > end) return null;
  return { start, end };
}

function dateFromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function monthDay(date: Date): number {
  return (date.getMonth() + 1) * 100 + date.getDate();
}

function seasonCovers(season: AlintaSeason, date: Date): boolean {
  const cur = monthDay(date);
  const start = season.startMonth * 100 + season.startDay;
  const end = season.endMonth * 100 + season.endDay;
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end;
}

function seasonOn(card: AlintaNetworkCard, date: Date): AlintaSeason | undefined {
  return card.seasons.find((season) => seasonCovers(season, date));
}

function dearestSeason(card: AlintaNetworkCard): AlintaSeason {
  return [...card.seasons].sort((a, b) => (b.blocks[0]?.rateCPerMj ?? 0) - (a.blocks[0]?.rateCPerMj ?? 0))[0];
}

function inclusiveDays(startIso: string, endIso: string): number {
  const start = dateFromIso(startIso);
  const end = dateFromIso(endIso);
  const ms = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.round(ms / 86400000) + 1;
}

function priceSteps(mj: number, days: number, blocks: AlintaBlock[]): AlintaPriceStep[] {
  if (days <= 0 || mj <= 0) return [];
  let remainingDaily = mj / days;
  let bandStart = 0;
  const steps: AlintaPriceStep[] = [];
  for (const block of blocks) {
    if (remainingDaily <= 1e-9) break;
    const takeDaily = block.mjPerDay == null ? remainingDaily : Math.min(remainingDaily, block.mjPerDay);
    const bandEnd = block.mjPerDay == null ? null : bandStart + block.mjPerDay;
    if (takeDaily > 1e-9) {
      const takeMj = takeDaily * days;
      steps.push({
        mj: takeMj,
        rateCPerMj: block.rateCPerMj,
        aud: takeMj * block.rateCPerMj / 100,
        fromMjPerDay: bandStart,
        toMjPerDay: bandEnd,
        mjPerDay: takeDaily,
      });
      remainingDaily -= takeDaily;
    }
    if (bandEnd != null) bandStart = bandEnd;
  }
  return steps;
}

function prefixNetwork(mirn: string): AlintaGasNetworkId | null {
  if (mirn.startsWith("531")) return "multinet";
  if (mirn.startsWith("532")) return "agn";
  if (mirn.startsWith("533")) return "ausnet";
  return null;
}

function ausnetFlag(mirn: string): AlintaSmeGasFlag {
  const warrnambool = normalizeMirn(mirn) === "53300366476";
  return {
    id: "ausnet-winter-assumption",
    level: "warning",
    title: "AusNet winter rate is an assumption",
    detail: warrnambool
      ? "The Alinta sheet labels both AusNet periods “1 October to 31 May”. The higher block (2.673 / 2.607 / 2.574 / 2.519 c/MJ) is treated as winter, 1 June–30 September. The lower block is used for 1 October–31 May. Warrnambool RSL is the same price in both rows on the sheet, so this winter uplift is not a Warrnambool-specific rate."
      : "The Alinta sheet labels both AusNet periods “1 October to 31 May”. The higher block, from Fawkner’s second row (2.673 / 2.607 / 2.574 / 2.519 c/MJ), is treated as winter, 1 June–30 September. The lower block (2.607 / 2.530 / 2.519 / 2.486 c/MJ) is used for 1 October–31 May, which is the only period the sheet names. Warrnambool is the same price in both rows, so the winter uplift is taken from the higher AusNet block.",
  };
}

export function quoteAlintaSmeGas(input: {
  mirn: string;
  periodMj: number;
  invoiceDays: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  networkOverride?: AlintaGasNetworkId | null;
}): AlintaSmeGasQuote {
  const mirn = normalizeMirn(input.mirn);
  const flags: AlintaSmeGasFlag[] = [];
  const blocked = NON_SERVICEABLE[mirn];
  const listed = LISTED_SITES[mirn];

  if (blocked && !input.networkOverride) {
    flags.push({
      id: "non-serviceable",
      level: "error",
      title: "Alinta has no plan for this site",
      detail: `${blocked.address} (${blocked.network}) is on the Group 1 non-serviceable list: ${blocked.reason}. No offer rate was applied. You can still pick a network below if you want to price it anyway.`,
    });
    return emptyQuote(flags, "non_serviceable", input.periodStart ?? null, input.periodEnd ?? null);
  }

  if (blocked && input.networkOverride) {
    flags.push({
      id: "non-serviceable-override",
      level: "warning",
      title: "This site is on the non-serviceable list",
      detail: `${blocked.address} is listed as ${blocked.reason}. A network was chosen manually, so an offer was still priced.`,
    });
  }

  let networkId: AlintaGasNetworkId | null = input.networkOverride ?? null;
  let match: AlintaSmeGasQuote["match"] = input.networkOverride ? "manual" : "none";
  if (!networkId && listed) {
    networkId = listed.network;
    match = "listed";
  } else if (!networkId) {
    networkId = prefixNetwork(mirn);
    if (networkId) {
      match = "prefix";
      flags.push({
        id: "prefix-network",
        level: "warning",
        title: "Network was inferred from the MIRN prefix",
        detail: "This MIRN is not on the Group 1 sheet. 531 is treated as Multinet, 532 as Australian Gas Networks, and 533 as AusNet. That prefix is not always the distributor — Leongatha starts with 531 and is AusNet, and it is non-serviceable. Confirm the network before sending the comparison.",
      });
    }
  } else {
    flags.push({
      id: "manual-network",
      level: "info",
      title: "Network was set manually",
      detail: `Offer uses ${ALINTA_SME_GAS_NETWORKS[networkId].label}, not an automatic MIRN match.`,
    });
  }

  if (!networkId) {
    flags.push({
      id: "no-network",
      level: "error",
      title: "No gas network for this MIRN",
      detail: "It is not on the Alinta Group 1 sheet, and the prefix is not 531, 532, or 533. Choose Multinet, Australian Gas Networks, or AusNet to price an offer. Nothing was applied automatically.",
    });
    return emptyQuote(flags, "none", input.periodStart ?? null, input.periodEnd ?? null);
  }

  // Every card on the Group 1 sheet is a Victorian network. A non-VIC MIRN (e.g. 55 = SA)
  // must not be priced on Victorian rates, even when a network is picked manually.
  if (mirn && !mirn.startsWith("53")) {
    flags.push({
      id: "non-vic-mirn",
      level: "error",
      title: "No Alinta rates for this state",
      detail: `MIRN ${mirn} is not a Victorian meter (VIC MIRNs start with 53). The Group 1 sheet only has Victorian networks, so ${ALINTA_SME_GAS_NETWORKS[networkId].label} rates would be wrong here. Nothing was priced.`,
    });
    return emptyQuote(flags, match, input.periodStart ?? null, input.periodEnd ?? null);
  }

  const card = ALINTA_SME_GAS_NETWORKS[networkId];
  if (networkId === "ausnet") flags.push(ausnetFlag(mirn));

  const periodMj = input.periodMj;
  const invoiceDays = input.invoiceDays;
  if (!(periodMj > 0) || !(invoiceDays > 0)) {
    flags.push({
      id: "missing-usage",
      level: "error",
      title: "Bill usage or days are missing",
      detail: "Alinta’s blocks need the bill’s MJ and the number of days. Enter both before an offer rate can be calculated.",
    });
    return {
      ...emptyQuote(flags, match, input.periodStart ?? null, input.periodEnd ?? null),
      networkId,
      networkLabel: card.label,
      product: card.product,
      listedName: listed?.name,
    };
  }

  let start = input.periodStart || null;
  let end = input.periodEnd || null;
  if (start && end && start > end) {
    flags.push({
      id: "dates-reversed",
      level: "warning",
      title: "Bill dates are reversed",
      detail: "The end date is before the start date, so the period was priced on the higher season instead of a date split.",
    });
    start = null;
    end = null;
  }

  const dayBuckets = new Map<string, number>();
  let pricedDays = invoiceDays;
  if (start && end) {
    const walked = inclusiveDays(start, end);
    if (Math.abs(walked - invoiceDays) > 1) {
      flags.push({
        id: "days-mismatch",
        level: "warning",
        title: "Bill dates do not match the day count",
        detail: `The dates span ${walked} days, and the invoice says ${invoiceDays} days. Usage was spread across the dates. Check both before generating.`,
      });
    }
    pricedDays = walked;
    for (let cursor = dateFromIso(start); ; cursor = addDays(cursor, 1)) {
      const iso = isoFromParts(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
      if (!iso || iso > end) break;
      const season = seasonOn(card, cursor);
      if (!season) continue;
      dayBuckets.set(season.id, (dayBuckets.get(season.id) ?? 0) + 1);
    }
  } else {
    const winter = dearestSeason(card);
    dayBuckets.set(winter.id, invoiceDays);
    if (card.seasons.length > 1) {
      flags.push({
        id: "no-bill-dates",
        level: "warning",
        title: "No bill dates — priced on the higher season",
        detail: `Start and end dates were not found, so all ${invoiceDays} days use ${winter.label}. Enter the bill dates to split seasons. Annual savings then stretch this higher-season price across 365 days.`,
      });
    }
  }

  const mjPerDay = periodMj / pricedDays;
  const slices: AlintaPriceSlice[] = [];
  for (const season of card.seasons) {
    const days = dayBuckets.get(season.id) ?? 0;
    if (days <= 0) continue;
    const mj = mjPerDay * days;
    const steps = priceSteps(mj, days, season.blocks);
    const energyAud = steps.reduce((sum, step) => sum + step.aud, 0);
    const supplyAud = days * season.supplyCPerDay / 100;
    slices.push({
      seasonId: season.id,
      seasonLabel: season.label,
      days,
      mj,
      energyAud,
      supplyAud,
      steps,
    });
  }

  if (slices.length > 1) {
    flags.push({
      id: "season-split",
      level: "info",
      title: "This bill crosses a season boundary",
      detail: slices.map((slice) => `${slice.seasonLabel}: ${slice.days} days`).join(". ") + ". Each slice uses that season’s blocks at this bill’s average MJ/day.",
    });
  }

  const offerEnergyAud = slices.reduce((sum, slice) => sum + slice.energyAud, 0);
  const offerSupplyAud = slices.reduce((sum, slice) => sum + slice.supplyAud, 0);
  const pricedMj = slices.reduce((sum, slice) => sum + slice.mj, 0);
  const offerAudPerGj = pricedMj > 0 ? (offerEnergyAud / pricedMj) * 1000 : null;
  const offerDailyAud = pricedDays > 0 ? offerSupplyAud / pricedDays : null;

  return {
    networkId,
    networkLabel: card.label,
    product: card.product,
    match,
    listedName: listed?.name,
    serviceable: true,
    flags,
    slices,
    offerEnergyAud,
    offerSupplyAud,
    offerAudPerGj,
    offerDailyAud,
    periodStart: start,
    periodEnd: end,
  };
}

function emptyQuote(
  flags: AlintaSmeGasFlag[],
  match: AlintaSmeGasQuote["match"],
  periodStart: string | null,
  periodEnd: string | null,
): AlintaSmeGasQuote {
  return {
    networkId: null,
    networkLabel: null,
    product: null,
    match,
    serviceable: false,
    flags,
    slices: [],
    offerEnergyAud: null,
    offerSupplyAud: null,
    offerAudPerGj: null,
    offerDailyAud: null,
    periodStart,
    periodEnd,
  };
}

const START_KEYS = ["period_start", "start_date", "billing_start", "invoice_start", "from_date", "bill_start", "period_from", "invoice_from"];
const END_KEYS = ["period_end", "end_date", "billing_end", "invoice_end", "to_date", "bill_end", "period_to", "invoice_to"];
const RANGE_KEYS = ["invoice_period", "billing_period", "bill_period", "period", "supply_period", "billing_period_label"];

export function extractSmeGasBillPeriod(invoiceData: unknown): { start: string | null; end: string | null } {
  const sme = invoiceData && typeof invoiceData === "object"
    ? (invoiceData as { gas_sme_invoicedetails?: Record<string, unknown> }).gas_sme_invoicedetails
    : undefined;
  if (!sme || typeof sme !== "object") return { start: null, end: null };

  const bags: Record<string, unknown>[] = [sme];
  for (const value of Object.values(sme)) {
    if (value && typeof value === "object" && !Array.isArray(value)) bags.push(value as Record<string, unknown>);
  }

  let start: string | null = null;
  let end: string | null = null;
  for (const bag of bags) {
    for (const [key, value] of Object.entries(bag)) {
      if (typeof value !== "string" && typeof value !== "number") continue;
      const text = String(value);
      const normalised = key.toLowerCase().replace(/\s+/g, "_");
      if (!start && START_KEYS.some((name) => normalised.includes(name))) start = parseLooseDate(text);
      if (!end && END_KEYS.some((name) => normalised.includes(name))) end = parseLooseDate(text);
      if ((!start || !end) && RANGE_KEYS.some((name) => normalised === name || normalised.endsWith(`_${name}`))) {
        const range = parseDateRange(text);
        if (range) return range;
      }
    }
  }
  if (!start || !end) {
    for (const bag of bags) {
      for (const value of Object.values(bag)) {
        if (typeof value !== "string" || value.length > 80) continue;
        const range = parseDateRange(value);
        if (range) return range;
      }
    }
  }
  if (start && end && start <= end) return { start, end };
  return { start: null, end: null };
}
