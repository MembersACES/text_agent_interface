const DEFAULT_ALLOWED_EMAIL_DOMAINS = [
  "acesolutions.com.au",
  "czeroanz.com",
];

function parseDomains(raw: string | undefined): string[] {
  if (!raw?.trim()) return DEFAULT_ALLOWED_EMAIL_DOMAINS;
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function getAllowedEmailDomains(): string[] {
  return parseDomains(process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS);
}

export function isAllowedEmailDomain(email: string | null | undefined): boolean {
  if (!email?.includes("@")) return false;
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  return getAllowedEmailDomains().includes(domain);
}

export function formatAllowedDomainsLabel(): string {
  return getAllowedEmailDomains().map((d) => `@${d}`).join(" or ");
}
