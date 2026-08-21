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
};

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
