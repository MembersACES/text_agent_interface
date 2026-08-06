import brandLogo from "@/../public/images/logo/CARBON ZERO Logo.png";

export const BRAND = {
  name: "Carbon Zero Australasia",
  shortName: "Carbon Zero",
  portalName: "Carbon Zero Portal",
  copyrightHolder: "Prograde IP Holdings",
  logo: brandLogo,
  /** Legacy value sent to n8n drive filing — do not change without workflow update */
  signedContractStatusValue: "Signed via ACES",
  /** User-facing label for signed contract status */
  signedContractStatusLabel: "Signed via Carbon Zero Australasia",
  /** Filed / signed outside CZA (not via ACES) */
  signedExternallyStatusValue: "Signed Externally",
  signedExternallyStatusLabel: "Signed externally (not by CZA)",
  existingContractStatusValue: "Existing Contract",
  existingContractStatusLabel: "Existing Contract (Copy)",
} as const;

/** Status values allowed by PATCH /api/contracts/status and drive filing. */
export const CONTRACT_STATUS_OPTIONS = [
  {
    value: BRAND.signedContractStatusValue,
    label: BRAND.signedContractStatusLabel,
  },
  {
    value: BRAND.signedExternallyStatusValue,
    label: BRAND.signedExternallyStatusLabel,
  },
  {
    value: BRAND.existingContractStatusValue,
    label: BRAND.existingContractStatusLabel,
  },
] as const;

export function copyrightNotice(year = new Date().getFullYear()): string {
  return `© ${year} ${BRAND.copyrightHolder}`;
}
