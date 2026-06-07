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
} as const;

export function copyrightNotice(year = new Date().getFullYear()): string {
  return `© ${year} ${BRAND.copyrightHolder}`;
}
