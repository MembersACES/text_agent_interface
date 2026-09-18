export function isPartnerMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_PARTNER_MODE === "1" ||
    process.env.PARTNER_MODE === "1"
  );
}
