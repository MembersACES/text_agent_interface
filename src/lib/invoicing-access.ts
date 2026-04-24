"use client";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getAllowedEmailsFromEnv(): string[] {
  const raw = process.env.NEXT_PUBLIC_INVOICING_ALLOWED_EMAILS ?? "";
  return raw
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function canAccessInvoicing(email?: string | null): boolean {
  if (!email) return false;
  const allowed = getAllowedEmailsFromEnv();
  if (allowed.length === 0) return false;
  return allowed.includes(normalizeEmail(email));
}
