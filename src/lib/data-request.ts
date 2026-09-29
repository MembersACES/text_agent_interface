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
};

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
