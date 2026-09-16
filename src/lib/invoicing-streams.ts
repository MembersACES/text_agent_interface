import type { InvoicingDriveCategoryKey } from "@/lib/invoicing-drive-categories";

export type InvoicingStreamGroup = "retailer" | "direct" | "payments";

export type InvoicingStreamId =
  | "origin-gas"
  | "origin-elec"
  | "alinta-gas"
  | "alinta-ci-elec"
  | "trojan-oil"
  | "era"
  | "momentum-ci-elec"
  | "automation-services"
  | "one-month-savings"
  | "equipment-rental"
  | "solar-cleaning"
  | "cleaning-scrubber"
  | "bank-rec";

export type InvoicingCadence = "Recurring" | "Monthly" | "One-off" | "Active";

export type RetailerApiKey =
  | "origin-gas"
  | "origin-elec"
  | "alinta-gas"
  | "alinta-ci-elec";

export type InvoicingMetricKind =
  | "origin-ready"
  | "commission-figures"
  | "trojan-clients";

export type InvoicingSheetTab = {
  name: string;
  gid?: string;
  shortLabel?: string;
};

export type InvoicingStream = {
  id: InvoicingStreamId;
  title: string;
  shortLabel: string;
  group: InvoicingStreamGroup;
  cadence?: InvoicingCadence;
  dashboardHref?: string;
  driveCategory?: InvoicingDriveCategoryKey;
  retailerKey?: RetailerApiKey;
  metrics?: InvoicingMetricKind;
  defaultTabGid?: string | null;
  sheet?: {
    sheetIdOrUrl: string;
    tabs: InvoicingSheetTab[];
  };
};

export const LAST_INVOICING_STREAM_KEY = "invoicing:last-stream";

export const INVOICING_STREAM_GROUPS: Array<{
  id: InvoicingStreamGroup;
  title: string;
  description: string;
}> = [
  {
    id: "payments",
    title: "Payments",
    description: "Bank reconciliation",
  },
  {
    id: "retailer",
    title: "Retailer",
    description: "Commission and mass invoicing",
  },
  {
    id: "direct",
    title: "Direct client",
    description: "Member and service invoices",
  },
];

export const INVOICING_STREAMS: InvoicingStream[] = [
  {
    id: "origin-gas",
    title: "Origin Gas",
    shortLabel: "Origin Gas",
    group: "retailer",
    cadence: "Recurring",
    driveCategory: "origin_ci_gas",
    retailerKey: "origin-gas",
    metrics: "origin-ready",
    defaultTabGid: "0",
    sheet: {
      sheetIdOrUrl:
        "https://docs.google.com/spreadsheets/d/13KUaL34dV8TCUtcExCZI9tC8yAb2XiYK3-MyVLglphE/edit",
      tabs: [
        { name: "Database Sheet", gid: "204183407" },
        { name: "Commission Figures", gid: "1703322444" },
        { name: "Gas Commission Up to Date", gid: "0", shortLabel: "Ready to invoice" },
        { name: "Already Invoiced", gid: "1411900023" },
        { name: "Invoices Sent" },
      ],
    },
  },
  {
    id: "origin-elec",
    title: "Origin Electricity",
    shortLabel: "Origin Elec",
    group: "retailer",
    cadence: "Recurring",
    driveCategory: "origin_ci_electricity",
    retailerKey: "origin-elec",
    metrics: "origin-ready",
    defaultTabGid: "0",
    sheet: {
      sheetIdOrUrl:
        "https://docs.google.com/spreadsheets/d/1cqi0rFfcD8fLFehPIg6IDHJqwRL1AHR3b-_t2Gsyz7k/edit",
      tabs: [
        { name: "Database Sheet", gid: "204183407" },
        { name: "Commission Figures", gid: "1703322444" },
        { name: "Commission Up to Date", gid: "0", shortLabel: "Ready to invoice" },
        { name: "Already Invoiced", gid: "1411900023" },
        { name: "Invoices Sent" },
      ],
    },
  },
  {
    id: "alinta-gas",
    title: "Alinta Gas",
    shortLabel: "Alinta Gas",
    group: "retailer",
    cadence: "Recurring",
    driveCategory: "alinta_ci_gas",
    retailerKey: "alinta-gas",
    metrics: "commission-figures",
    defaultTabGid: "1703322444",
    sheet: {
      sheetIdOrUrl:
        "https://docs.google.com/spreadsheets/d/16t1eFN8gIXr-EmcI08POzEMfCNwO3LazHYB2RSKDmk0/edit",
      tabs: [
        { name: "Database Sheet", gid: "204183407" },
        { name: "Commission Figures", gid: "1703322444" },
        { name: "Gas Commission Up to Date", gid: "0" },
        { name: "Already Invoiced", gid: "1411900023" },
      ],
    },
  },
  {
    id: "alinta-ci-elec",
    title: "Alinta C&I Electricity",
    shortLabel: "Alinta C&I Elec",
    group: "retailer",
    cadence: "Recurring",
    driveCategory: "alinta_ci_electricity",
    retailerKey: "alinta-ci-elec",
    metrics: "commission-figures",
    defaultTabGid: "1703322444",
    sheet: {
      sheetIdOrUrl:
        "https://docs.google.com/spreadsheets/d/1t_Eta4M8bgWVuj9UPgKLWz7A7WBw8U8GCSgrKrzgYzY/edit",
      tabs: [
        { name: "Database Sheet", gid: "204183407" },
        { name: "Commission Figures", gid: "1703322444" },
        { name: "Commission Up to Date", gid: "0" },
        { name: "Already Invoiced", gid: "1411900023" },
      ],
    },
  },
  {
    id: "trojan-oil",
    title: "Trojan Oil",
    shortLabel: "Trojan Oil",
    group: "retailer",
    cadence: "Recurring",
    driveCategory: "trojan_oil",
    metrics: "trojan-clients",
    defaultTabGid: "2013429471",
    sheet: {
      sheetIdOrUrl: "1lFAUB1nl7yh2JkwgEI7Zd_lSDGusDtVnDIuZFPVmhdU",
      tabs: [
        { name: "All Data", gid: "2013429471", shortLabel: "All data" },
        { name: "Invoices Sent", gid: "1341033158" },
      ],
    },
  },
  {
    id: "era",
    title: "ERA",
    shortLabel: "ERA",
    group: "retailer",
    cadence: "Recurring",
    defaultTabGid: "2013429471",
    sheet: {
      sheetIdOrUrl: "16YuoSLf-uH_aUlLe1lnvqp1xTpMJlSMTGTO4ZG1FKPY",
      tabs: [
        { name: "Client's To Invoice", gid: "2013429471", shortLabel: "To invoice" },
        { name: "Invoices Sent", gid: "1341033158" },
      ],
    },
  },
  {
    id: "momentum-ci-elec",
    title: "Momentum C&I Electricity",
    shortLabel: "Momentum C&I Elec",
    group: "retailer",
    cadence: "Recurring",
    driveCategory: "momentum_ci_electricity",
  },
  {
    id: "automation-services",
    title: "Automation Services",
    shortLabel: "Automation Services",
    group: "direct",
    cadence: "One-off",
    driveCategory: "automation_services",
    defaultTabGid: "2013429471",
    sheet: {
      sheetIdOrUrl: "1qycTrM4TnJRhaVTXc-cowQCCAujiGMlRknuWT1qgb-Y",
      tabs: [
        { name: "One Off Invoicing", gid: "2013429471", shortLabel: "One-off" },
        { name: "One Off Invoiced", gid: "501226163" },
        { name: "Recurring Invoicing", gid: "645819368", shortLabel: "Recurring" },
        { name: "Invoices Sent", gid: "1537028524" },
      ],
    },
  },
  {
    id: "one-month-savings",
    title: "1 Month Savings",
    shortLabel: "1 Month Savings",
    group: "direct",
    cadence: "Active",
    dashboardHref: "/one-month-savings",
    driveCategory: "one_month_savings",
    defaultTabGid: "1015313886",
    sheet: {
      sheetIdOrUrl:
        "https://docs.google.com/spreadsheets/d/1uBv1L7pQmO5SJCE4jvPknBki1GsmnMFPVsNRShMl-7o/edit?gid=1015313886#gid=1015313886",
      tabs: [
        { name: "1st Month Savings Invoice", gid: "1015313886", shortLabel: "To invoice" },
        { name: "Outstanding" },
      ],
    },
  },
  {
    id: "equipment-rental",
    title: "Equipment Rental",
    shortLabel: "Equipment Rental",
    group: "direct",
    cadence: "Monthly",
    driveCategory: "equipment_rental",
    defaultTabGid: "2013429471",
    sheet: {
      sheetIdOrUrl: "13g2tQQ1f65K3icPR1JNk5X1sfxSP5kbsJwSn-fGHtDo",
      tabs: [
        { name: "Client's To Invoice - Opex", gid: "2013429471", shortLabel: "To invoice" },
        { name: "Invoices Sent", gid: "1341033158" },
      ],
    },
  },
  {
    id: "solar-cleaning",
    title: "Solar Cleaning",
    shortLabel: "Solar Cleaning",
    group: "direct",
    cadence: "Active",
    driveCategory: "solar_cleaning",
    defaultTabGid: "760779528",
    sheet: {
      sheetIdOrUrl: "1WiLksDOwrQkEwVhF25F_RQ1G0zxF5VHiu9lAxQhQox4",
      tabs: [
        { name: "Dashboard Quotes Signed", gid: "760779528", shortLabel: "Signed quotes" },
        { name: "Invoices Sent", gid: "1341033158" },
        { name: "Dashboard Quotes Invoiced", gid: "347698556", shortLabel: "Invoiced" },
      ],
    },
  },
  {
    id: "cleaning-scrubber",
    title: "Cleaning Scrubber",
    shortLabel: "Cleaning Scrubber",
    group: "direct",
    cadence: "Active",
    driveCategory: "cleaning_scrubber",
  },
  {
    id: "bank-rec",
    title: "Bank Rec",
    shortLabel: "Bank Rec",
    group: "payments",
    cadence: "Active",
    defaultTabGid: "0",
    sheet: {
      sheetIdOrUrl: "1ONg6g9kn-TmNaJ50yoX-oXu-2pJdW_qYibblv2pbQuU",
      tabs: [
        { name: "ForNRG - 10400759", gid: "0", shortLabel: "ForNRG" },
        {
          name: "Environmental Global Benefits - 1057 8739",
          gid: "518622372",
          shortLabel: "EGB",
        },
      ],
    },
  },
];

export const INVOICING_STREAM_IDS = new Set(
  INVOICING_STREAMS.map((stream) => stream.id)
);

export function getInvoicingStream(
  id: string | null | undefined
): InvoicingStream | undefined {
  if (!id) return undefined;
  return INVOICING_STREAMS.find((stream) => stream.id === id);
}

export function isInvoicingStreamId(value: string | null): value is InvoicingStreamId {
  return Boolean(value && INVOICING_STREAM_IDS.has(value as InvoicingStreamId));
}

export function extractSheetId(value: string): string {
  const raw = value.trim();
  const match = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  return raw;
}

export function toSheetUrl(value: string, gid?: string): string {
  const base =
    value.startsWith("http://") || value.startsWith("https://")
      ? value.split("?")[0].split("#")[0]
      : `https://docs.google.com/spreadsheets/d/${extractSheetId(value)}/edit`;
  if (gid) return `${base}?gid=${gid}#gid=${gid}`;
  return base;
}

export function toEmbedUrl(value: string, gid?: string): string {
  const id = extractSheetId(value);
  const base = `https://docs.google.com/spreadsheets/d/${id}/preview`;
  if (gid) return `${base}?gid=${gid}#gid=${gid}`;
  return base;
}

export function mergeSheetTabs(
  configured: InvoicingSheetTab[],
  live: { name: string; gid: string }[] | null
): InvoicingSheetTab[] {
  if (!live?.length) return configured;
  const byName = new Map(live.map((tab) => [tab.name.trim().toLowerCase(), tab.gid]));
  const merged = configured.map((tab) => {
    const gid = byName.get(tab.name.trim().toLowerCase());
    return gid ? { ...tab, gid } : tab;
  });
  const known = new Set(configured.map((tab) => tab.name.trim().toLowerCase()));
  for (const tab of live) {
    if (!known.has(tab.name.trim().toLowerCase())) {
      merged.push({ name: tab.name, gid: tab.gid });
    }
  }
  return merged;
}

export function formatAud(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

export function tabLabel(tab: InvoicingSheetTab): string {
  return tab.shortLabel ?? tab.name;
}

export function getSessionToken(session: unknown): string | undefined {
  const s = session as { id_token?: string; accessToken?: string } | null;
  return s?.id_token ?? s?.accessToken;
}

export function readLastInvoicingStream(): InvoicingStreamId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_INVOICING_STREAM_KEY);
    return isInvoicingStreamId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeLastInvoicingStream(id: InvoicingStreamId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_INVOICING_STREAM_KEY, id);
  } catch {
    // ignore quota / private mode
  }
}
