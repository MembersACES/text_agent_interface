export const PARTNER_CANONICAL_HOST = "partners.acesolutions.com.au";
export const PARTNER_CANONICAL_ORIGIN = `https://${PARTNER_CANONICAL_HOST}`;

const PARTNER_RUN_APP_HOSTS = new Set([
  "acespartnerinterfacedev-672026052958.australia-southeast2.run.app",
  "acespartnerinterface-672026052958.australia-southeast2.run.app",
]);

export function isPartnerMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_PARTNER_MODE === "1" ||
    process.env.PARTNER_MODE === "1"
  );
}

export function isPartnerRunAppHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() || "";
  return PARTNER_RUN_APP_HOSTS.has(hostname);
}
