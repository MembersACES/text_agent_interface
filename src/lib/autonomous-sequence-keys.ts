/** Sequence keys the app starts from product pages. Changing these disconnects that page. */

export const AUTONOMOUS_SEQUENCE_CI_GAS = "gas_base2_followup_v1";
export const AUTONOMOUS_SEQUENCE_CI_ELECTRICITY = "ci_electricity_base2_followup_v1";
export const AUTONOMOUS_SEQUENCE_BNE_GAS = "bne_gas_base2_followup_v1";
export const AUTONOMOUS_SEQUENCE_CI_ELECTRICITY_OFFER = "ci_electricity_offer";
export const AUTONOMOUS_SEQUENCE_SOLAR_FOLLOWUP = "solar_panel_cleaning_followup_v1";
export const AUTONOMOUS_SEQUENCE_SOLAR_ENGAGEMENT = "solar_panel_cleaning_engagement_form_v1";

export type AutonomousSequenceLink = {
  sequence_type: string;
  label: string;
  startsWhen: string;
};

export const SEQUENCE_LINK_CI_GAS: AutonomousSequenceLink = {
  sequence_type: AUTONOMOUS_SEQUENCE_CI_GAS,
  label: "C&I / SME→C&I Gas",
  startsWhen: "Generate C&I G or SME G Offer Comparison",
};

export const SEQUENCE_LINK_CI_ELECTRICITY: AutonomousSequenceLink = {
  sequence_type: AUTONOMOUS_SEQUENCE_CI_ELECTRICITY,
  label: "C&I Electricity",
  startsWhen: "Generate C&I E Offer Comparison",
};

export const SEQUENCE_LINK_BNE_GAS: AutonomousSequenceLink = {
  sequence_type: AUTONOMOUS_SEQUENCE_BNE_GAS,
  label: "B&E Gas",
  startsWhen: "Generate B&E Gas",
};

export const SEQUENCE_LINK_CI_ELECTRICITY_OFFER: AutonomousSequenceLink = {
  sequence_type: AUTONOMOUS_SEQUENCE_CI_ELECTRICITY_OFFER,
  label: "C&I Electricity offer",
  startsWhen: "Send C&I Electricity Offer",
};

export const SEQUENCE_LINK_SOLAR_FOLLOWUP: AutonomousSequenceLink = {
  sequence_type: AUTONOMOUS_SEQUENCE_SOLAR_FOLLOWUP,
  label: "Solar cleaning quote",
  startsWhen: "Send solar panel cleaning quote",
};

export const SEQUENCE_LINK_SOLAR_ENGAGEMENT: AutonomousSequenceLink = {
  sequence_type: AUTONOMOUS_SEQUENCE_SOLAR_ENGAGEMENT,
  label: "Solar engagement form",
  startsWhen: "Send Solar Panel Cleaning engagement form",
};

export const BASE2_SEQUENCE_LINKS: AutonomousSequenceLink[] = [
  SEQUENCE_LINK_CI_GAS,
  SEQUENCE_LINK_CI_ELECTRICITY,
  SEQUENCE_LINK_BNE_GAS,
];

export function sequenceLinksForBase2Comparison(comparison: {
  utilityType: string;
  smeGasComparisonMode?: string | null;
}): AutonomousSequenceLink[] {
  const mode = comparison.smeGasComparisonMode ?? "invoice_blocks";
  if (comparison.utilityType === "C&I Gas") return [SEQUENCE_LINK_CI_GAS, SEQUENCE_LINK_BNE_GAS];
  if (comparison.utilityType === "SME Gas" && mode === "ci_offer") return [SEQUENCE_LINK_CI_GAS];
  if (comparison.utilityType === "C&I Electricity") return [SEQUENCE_LINK_CI_ELECTRICITY];
  return [];
}

export const WIRED_SEQUENCE_TYPE_LABELS: Record<string, string> = {
  [AUTONOMOUS_SEQUENCE_CI_GAS]: "Base 2 — C&I / SME→C&I Gas",
  [AUTONOMOUS_SEQUENCE_CI_ELECTRICITY]: "Base 2 — C&I Electricity",
  [AUTONOMOUS_SEQUENCE_BNE_GAS]: "Base 2 — B&E Gas",
  [AUTONOMOUS_SEQUENCE_CI_ELECTRICITY_OFFER]: "Utility Invoice Info — C&I Electricity",
  [AUTONOMOUS_SEQUENCE_SOLAR_FOLLOWUP]: "Solar cleaning quote",
  [AUTONOMOUS_SEQUENCE_SOLAR_ENGAGEMENT]: "Document Generation — engagement form",
};

export function isWiredSequenceType(sequenceType: string): boolean {
  return Object.prototype.hasOwnProperty.call(WIRED_SEQUENCE_TYPE_LABELS, sequenceType);
}

export function sequenceTypeLooksValid(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value.trim());
}
