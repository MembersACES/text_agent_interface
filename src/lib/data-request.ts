/** Utility-linking keys that can send a supplier data request. */
export const DATA_REQUEST_UTILITY_TYPES = [
  "ELECTRICITY_CI",
  "ELECTRICITY_SME",
  "GAS_CI",
  "GAS_SME",
  "WASTE",
] as const;

export type DataRequestUtilityType = (typeof DATA_REQUEST_UTILITY_TYPES)[number];

export type DataRequestType =
  | "electricity_ci"
  | "electricity_sme"
  | "gas_ci"
  | "gas_sme"
  | "waste";

export type DataRequestSummary = {
  businessName: string;
  retailer: string;
  identifier: string;
  requestType: DataRequestType;
  param: string;
  /** Periods the coverage report found no invoice for, human-formatted ("Jul 2025"). */
  missingMonths?: string[];
  /** An invoice we already hold for this meter, attached beside the LOA. */
  invoiceUrl?: string | null;
  /** Where this request came from - shown in the modal so the sender has context. */
  context?: string;
  /** C&I gas only. Sends the network meter-data email instead of the retailer one. */
  networkDataRequest?: boolean;
  /** Years of interval and meter-read history a network request asks for. 1–10. */
  networkDataHistoryYears?: number;
  /** Send the email only to data quote, and not to the network or retailer. */
  testSend?: boolean;
  /** Retailer to restore when the network checkbox is turned off. */
  retailerRequestName?: string;
};

/** Gas networks a C&I network data request can be addressed to. Longest MIRN prefix wins. */
export const GAS_DATA_REQUEST_NETWORKS = [
  {
    label: "Jemena Gas Networks (NSW)",
    prefixes: ["52"],
    note: "Sent to customerrelations@jemena.com.au, with data.quote@fornrg.com copied in.",
  },
  {
    label: "Australian Gas Networks",
    prefixes: ["55", "532"],
    note: "Sent to agnl@agig.com.au (general enquiries, not confirmed for meter data), with data.quote@fornrg.com copied in.",
  },
  {
    label: "Multinet Gas",
    prefixes: ["531"],
    note: "Sent to mgservicedesk@agig.com.au (general enquiries, not confirmed for meter data), with data.quote@fornrg.com copied in.",
  },
  {
    label: "AusNet Gas",
    prefixes: ["533"],
    note: "Sent to meterdata@ausnetservices.com.au (published for electricity; gas is unconfirmed), with data.quote@fornrg.com copied in.",
  },
  {
    label: "Allgas (APA)",
    prefixes: [],
    note: "Sent to connectionsqld@apa.com.au (the only published address), with data.quote@fornrg.com copied in.",
  },
  {
    label: "Evoenergy",
    prefixes: [],
    note: "No data inbox is published. This goes to data.quote@fornrg.com to lodge via the Evoenergy enquiry form or 13 23 86.",
  },
  {
    label: "ATCO Gas",
    prefixes: ["56"],
    note: "No email is published. This goes to data.quote@fornrg.com to send on. Phone 08 6163 5000.",
  },
  {
    label: "TasGas Networks",
    prefixes: [],
    note: "No email is published. This goes to data.quote@fornrg.com to send on. Phone 1800 770 018.",
  },
] as const;

export function gasNetworkLabelForMirn(mirn: string): string | null {
  const digits = (mirn || "").replace(/\D/g, "");
  let best: { label: string; length: number } | null = null;
  for (const network of GAS_DATA_REQUEST_NETWORKS) {
    for (const prefix of network.prefixes) {
      if (!prefix || !digits.startsWith(prefix)) continue;
      if (!best || prefix.length > best.length) {
        best = { label: network.label, length: prefix.length };
      }
    }
  }
  return best?.label ?? null;
}

export function gasNetworkRequestNote(label: string): string | null {
  return GAS_DATA_REQUEST_NETWORKS.find((network) => network.label === label)?.note ?? null;
}

/** How far back a C&I gas network data request can ask. */
export const NETWORK_DATA_HISTORY_YEAR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Matches the email this request used to send: 36 months. */
export const DEFAULT_NETWORK_DATA_HISTORY_YEARS = 3;

export function clampNetworkDataHistoryYears(years: number | undefined): number {
  if (years == null || !Number.isInteger(years) || years < 1 || years > 10) {
    return DEFAULT_NETWORK_DATA_HISTORY_YEARS;
  }
  return years;
}

export function networkDataHistoryLabel(years: number | undefined): string {
  const count = clampNetworkDataHistoryYears(years);
  return count === 1 ? "1 year" : `${count} years`;
}

export function networkDataRequestFields(
  enabled: boolean | undefined,
  years: number | undefined,
  testSend?: boolean,
): { network_data_request: boolean; data_years?: number; test_send?: boolean } {
  const test = testSend === true ? { test_send: true as const } : {};
  if (enabled !== true) return { network_data_request: false, ...test };
  return {
    network_data_request: true,
    data_years: clampNetworkDataHistoryYears(years),
    ...test,
  };
}

export function applyNetworkDataRequest<
  T extends {
    retailer: string;
    identifier: string;
    networkDataRequest?: boolean;
    retailerRequestName?: string;
    networkDataHistoryYears?: number;
  },
>(summary: T, enabled: boolean): T {
  if (!enabled) {
    return {
      ...summary,
      networkDataRequest: false,
      retailer: summary.retailerRequestName ?? summary.retailer,
    };
  }
  return {
    ...summary,
    networkDataRequest: true,
    retailerRequestName: summary.retailerRequestName ?? summary.retailer,
    retailer: gasNetworkLabelForMirn(summary.identifier) ?? "",
    networkDataHistoryYears: clampNetworkDataHistoryYears(summary.networkDataHistoryYears),
  };
}

/** Everyone on the To/CC line already, whatever the retailer. */
export const DATA_REQUEST_INTERNAL_CC = "data.quote@fornrg.com";

export const CI_DATA_REQUEST_RETAILERS = [
  "Origin C&I",
  "Momentum C&I",
  "Shell Energy",
  "Alinta C&I",
  "Energy Australia",
  "AGL",
] as const;

export const SME_DATA_REQUEST_RETAILERS = [
  "Origin SME",
  "Momentum SME",
  "BlueNRG SME",
  "CovaU SME",
  "Next Business Energy",
  "1st Energy",
  "Red Energy",
  "GloBird Energy",
  "Powerdirect",
  "Sumo",
  "Tango Energy",
  "Sun Retail",
  "Ergon Energy",
] as const;

export const WASTE_DATA_REQUEST_RETAILERS = ["Veolia"] as const;

export function isDataRequestUtilityType(
  utilityType: string,
): utilityType is DataRequestUtilityType {
  return (DATA_REQUEST_UTILITY_TYPES as readonly string[]).includes(utilityType);
}

export function dataRequestConfigForUtility(
  utilityType: string,
): { requestType: DataRequestType; param: string } | null {
  switch (utilityType) {
    case "ELECTRICITY_CI":
      return { requestType: "electricity_ci", param: "nmi" };
    case "ELECTRICITY_SME":
      return { requestType: "electricity_sme", param: "nmi" };
    case "GAS_CI":
      return { requestType: "gas_ci", param: "mrin" };
    case "GAS_SME":
      return { requestType: "gas_sme", param: "mrin" };
    case "WASTE":
      return { requestType: "waste", param: "account_number" };
    default:
      return null;
  }
}

/**
 * The gap report names utilities the way a person does ("C&I Electricity"),
 * not the way utility-linking keys them ("ELECTRICITY_CI"). Same five types,
 * different spelling, so map rather than duplicate.
 */
export function dataRequestConfigForDisplayUtility(
  utilityType: string,
): { requestType: DataRequestType; param: string } | null {
  const key = (utilityType || "").trim().toLowerCase();
  switch (key) {
    case "c&i electricity":
      return dataRequestConfigForUtility("ELECTRICITY_CI");
    case "sme electricity":
      return dataRequestConfigForUtility("ELECTRICITY_SME");
    case "c&i gas":
      return dataRequestConfigForUtility("GAS_CI");
    case "sme gas":
      return dataRequestConfigForUtility("GAS_SME");
    case "waste":
      return dataRequestConfigForUtility("WASTE");
    default:
      return null;
  }
}

/** True when a coverage-report row is something we can actually chase by email. */
export function canRequestDataForUtility(utilityType: string): boolean {
  return dataRequestConfigForDisplayUtility(utilityType) !== null;
}

/**
 * Build a request off a coverage-report row: same shape as the utility-linking
 * one, plus the months we are chasing and an invoice to attach.
 */
export function buildGapDataRequestSummary(opts: {
  businessName: string;
  utilityType: string;
  identifier: string;
  retailer?: string;
  missingMonths?: string[];
  invoiceUrl?: string | null;
  context?: string;
}): DataRequestSummary | null {
  const config = dataRequestConfigForDisplayUtility(opts.utilityType);
  const identifier = (opts.identifier || "").trim();
  const businessName = (opts.businessName || "").trim();
  if (!config || !identifier || !businessName) return null;
  return {
    businessName,
    retailer: (opts.retailer || "").trim(),
    identifier,
    requestType: config.requestType,
    param: config.param,
    missingMonths: opts.missingMonths ?? [],
    invoiceUrl: opts.invoiceUrl ?? null,
    context: opts.context,
  };
}

export function buildDataRequestSummary(opts: {
  businessName: string;
  utilityType: string;
  identifier: string;
  retailer: string;
}): DataRequestSummary | null {
  const config = dataRequestConfigForUtility(opts.utilityType);
  const identifier = opts.identifier.trim();
  const businessName = opts.businessName.trim();
  if (!config || !identifier || !businessName) return null;
  return {
    businessName,
    retailer: opts.retailer.trim(),
    identifier,
    requestType: config.requestType,
    param: config.param,
  };
}
