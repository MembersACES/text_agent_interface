/** Sequence keys the app starts from product pages. Changing these disconnects that page. */

export const AUTONOMOUS_SEQUENCE_CI_GAS = "gas_base2_followup_v1";
export const AUTONOMOUS_SEQUENCE_CI_ELECTRICITY = "ci_electricity_base2_followup_v1";
export const AUTONOMOUS_SEQUENCE_BNE_GAS = "bne_gas_base2_followup_v1";
export const AUTONOMOUS_SEQUENCE_CI_ELECTRICITY_OFFER = "ci_electricity_offer";
export const AUTONOMOUS_SEQUENCE_SOLAR_FOLLOWUP = "solar_panel_cleaning_followup_v1";
export const AUTONOMOUS_SEQUENCE_SOLAR_ENGAGEMENT = "solar_panel_cleaning_engagement_form_v1";

export const BASE2_SEQUENCE_LINKS = [
  {
    sequence_type: AUTONOMOUS_SEQUENCE_CI_GAS,
    label: "C&I / SME→C&I Gas",
    startsWhen: "Generate C&I G or SME G Offer Comparison",
  },
  {
    sequence_type: AUTONOMOUS_SEQUENCE_CI_ELECTRICITY,
    label: "C&I Electricity",
    startsWhen: "Generate C&I E Offer Comparison",
  },
  {
    sequence_type: AUTONOMOUS_SEQUENCE_BNE_GAS,
    label: "B&E Gas",
    startsWhen: "Generate B&E Gas",
  },
] as const;

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
