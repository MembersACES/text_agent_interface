export type UtilityKeyFields = {
  identifier: string;
  identifierLabel: string;
  address: string;
  retailer: string;
  clientName: string;
};

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Map a utility invoice row to the summary fields shown in linking / LOA upload UIs. */
export function getUtilityKeyFields(
  utilityType: string,
  record: Record<string, unknown> | null | undefined,
): UtilityKeyFields {
  const r = record ?? {};

  switch (utilityType) {
    case "ELECTRICITY_CI":
    case "ELECTRICITY_SME":
      return {
        identifier: str(r.NMI),
        identifierLabel: "NMI",
        address: str(r["Site Address"] || r["Supply Address"]),
        retailer: str(r.Retailer),
        clientName: str(r["Client Name"]),
      };
    case "GAS_CI":
    case "GAS_SME":
      return {
        identifier: str(r.MRIN),
        identifierLabel: "MRIN",
        address: str(r["Site Address:"] || r["Site Address"] || r["Supply Address"]),
        retailer: str(r.Retailer),
        clientName: str(r["Client Name"]),
      };
    case "WASTE":
      return {
        identifier: str(r["Account Number or Customer Number"]),
        identifierLabel: "Account Number",
        address: str(r["Supply Address"]),
        retailer: str(r.Provider),
        clientName: str(r["Client Name"]),
      };
    case "COOKING_OIL":
    case "GREASE_TRAP":
      return {
        identifier: str(r["Account Number / Customer Code"]),
        identifierLabel: "Account Number / Customer Code",
        address: str(r["Site Address"]),
        retailer: str(r.Retailer),
        clientName: str(r["Client Name"]),
      };
    case "WATER":
      return {
        identifier: str(r["Account Number"]),
        identifierLabel: "Account Number",
        address: str(r["Supply Address"] || r["Account Name"]),
        retailer: str(r.Provider),
        clientName: str(r["Account Name"] || r["Client Name"]),
      };
    case "CLEANING":
      return {
        identifier: str(r.invoice_number || r["Invoice Number"]),
        identifierLabel: "Invoice Number",
        address: str(r.client_address || r["Client Address"]),
        retailer: str(r.supplier_name || r["Supplier Name"]),
        clientName: str(r.client_name || r["Client Name"]),
      };
    default:
      return {
        identifier: "N/A",
        identifierLabel: "ID",
        address: "N/A",
        retailer: "N/A",
        clientName: "N/A",
      };
  }
}
