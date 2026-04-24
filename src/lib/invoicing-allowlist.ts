function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Prefer server-only allowlist (works on Cloud Run without rebuilding the client bundle).
 * Falls back to NEXT_PUBLIC_* for local dev / legacy setups.
 */
export function getInvoicingAllowlistRaw(): string {
  return (
    process.env.INVOICING_ALLOWED_EMAILS ??
    process.env.NEXT_PUBLIC_INVOICING_ALLOWED_EMAILS ??
    ""
  );
}

export function parseInvoicingAllowlist(raw: string): string[] {
  return raw
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isEmailInInvoicingAllowlist(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = parseInvoicingAllowlist(getInvoicingAllowlistRaw());
  if (allowed.length === 0) return false;
  return allowed.includes(normalizeEmail(email));
}
