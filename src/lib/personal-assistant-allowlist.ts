function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Prefer server-only allowlist (works on Cloud Run without rebuilding the client bundle).
 * Falls back to NEXT_PUBLIC_* for local dev / legacy setups.
 */
export function getPersonalAssistantAllowlistRaw(): string {
  return (
    process.env.PERSONAL_ASSISTANT_ALLOWED_EMAILS ??
    process.env.NEXT_PUBLIC_PERSONAL_ASSISTANT_ALLOWED_EMAILS ??
    ""
  );
}

export function parsePersonalAssistantAllowlist(raw: string): string[] {
  return raw
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isEmailInPersonalAssistantAllowlist(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  const allowed = parsePersonalAssistantAllowlist(getPersonalAssistantAllowlistRaw());
  if (allowed.length === 0) return false;
  return allowed.includes(normalizeEmail(email));
}
