export type InvoicingDriveCategoryKey =
  | "automation_services"
  | "one_month_savings"
  | "equipment_rental"
  | "solar_cleaning"
  | "cleaning_scrubber";

export type InvoicingDriveCategory = {
  key: InvoicingDriveCategoryKey;
  label: string;
  shortLabel: string;
};

/** Display config only — Drive folder IDs live on the backend. */
export const INVOICING_DRIVE_CATEGORIES: InvoicingDriveCategory[] = [
  {
    key: "automation_services",
    label: "Automation Services",
    shortLabel: "Automation Services",
  },
  {
    key: "one_month_savings",
    label: "1 Month Savings",
    shortLabel: "1 Month Savings",
  },
  {
    key: "equipment_rental",
    label: "Equipment Rental",
    shortLabel: "Equipment Rental",
  },
  {
    key: "solar_cleaning",
    label: "Solar Cleaning",
    shortLabel: "Solar Cleaning",
  },
  {
    key: "cleaning_scrubber",
    label: "Cleaning Scrubber",
    shortLabel: "Cleaning Scrubber",
  },
];

export const DEFAULT_INVOICING_DRIVE_CATEGORY: InvoicingDriveCategoryKey =
  "automation_services";
