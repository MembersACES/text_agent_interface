export type InvoicingDriveCategoryKey =
  | "automation_services"
  | "one_month_savings"
  | "equipment_rental"
  | "solar_cleaning"
  | "cleaning_scrubber"
  | "alinta_ci_electricity"
  | "alinta_ci_gas"
  | "origin_ci_electricity"
  | "origin_ci_gas"
  | "trojan_oil"
  | "momentum_ci_electricity";

export type InvoicingDriveCategoryGroup = "direct" | "retailer";

export type InvoicingDriveCategory = {
  key: InvoicingDriveCategoryKey;
  label: string;
  shortLabel: string;
  group: InvoicingDriveCategoryGroup;
};

/** Display config only — Drive folder IDs live on the backend. */
export const INVOICING_DRIVE_CATEGORIES: InvoicingDriveCategory[] = [
  {
    key: "automation_services",
    label: "Automation Services",
    shortLabel: "Automation Services",
    group: "direct",
  },
  {
    key: "one_month_savings",
    label: "1 Month Savings",
    shortLabel: "1 Month Savings",
    group: "direct",
  },
  {
    key: "equipment_rental",
    label: "Equipment Rental",
    shortLabel: "Equipment Rental",
    group: "direct",
  },
  {
    key: "solar_cleaning",
    label: "Solar Cleaning",
    shortLabel: "Solar Cleaning",
    group: "direct",
  },
  {
    key: "cleaning_scrubber",
    label: "Cleaning Scrubber",
    shortLabel: "Cleaning Scrubber",
    group: "direct",
  },
  {
    key: "alinta_ci_electricity",
    label: "Alinta C&I Electricity",
    shortLabel: "Alinta C&I Elec",
    group: "retailer",
  },
  {
    key: "alinta_ci_gas",
    label: "Alinta C&I Gas",
    shortLabel: "Alinta C&I Gas",
    group: "retailer",
  },
  {
    key: "origin_ci_electricity",
    label: "Origin C&I Electricity",
    shortLabel: "Origin C&I Elec",
    group: "retailer",
  },
  {
    key: "origin_ci_gas",
    label: "Origin C&I Gas",
    shortLabel: "Origin C&I Gas",
    group: "retailer",
  },
  {
    key: "trojan_oil",
    label: "Trojan Oil",
    shortLabel: "Trojan Oil",
    group: "retailer",
  },
  {
    key: "momentum_ci_electricity",
    label: "Momentum C&I Electricity",
    shortLabel: "Momentum C&I Elec",
    group: "retailer",
  },
];

export const INVOICING_DRIVE_CATEGORY_GROUPS: Array<{
  id: InvoicingDriveCategoryGroup;
  title: string;
}> = [
  { id: "direct", title: "Direct client" },
  { id: "retailer", title: "Retailer" },
];

export const DEFAULT_INVOICING_DRIVE_CATEGORY: InvoicingDriveCategoryKey =
  "automation_services";
