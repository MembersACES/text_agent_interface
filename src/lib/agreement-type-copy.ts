import { validateTemplate, type MergeField } from "@/lib/merge-template";

export type AgreementTypeDraft = {
  id: string | null;
  label: string;
  utility: string;
  retailer: string;
  subject: string;
  body: string;
  chaseBody: string;
  chaseDays: string;
};

export const AGREEMENT_COPY_FIELDS: MergeField[] = [
  { key: "agreement_label", label: "Agreement name" },
  { key: "business_name", label: "Business name" },
  { key: "label", label: "Type name" },
  { key: "contact_name", label: "Contact name" },
  { key: "company_name", label: "Company name" },
];

export const DEFAULT_TYPE_SUBJECT = "{{agreement_label}} ready for signing — {{business_name}}";
export const DEFAULT_TYPE_BODY = [
  "Hi {{contact_name}},",
  "",
  "Please find attached the {{agreement_label}} for {{business_name}}.",
  "",
  "Could you review and return the signed agreement at your earliest convenience? Reply to this email with the signed PDF, or let us know if you have any questions.",
  "",
  "Kind regards,",
].join("\n");

export function blankTypeDraft(): AgreementTypeDraft {
  return {
    id: null,
    label: "",
    utility: "",
    retailer: "",
    subject: DEFAULT_TYPE_SUBJECT,
    body: DEFAULT_TYPE_BODY,
    chaseBody: "",
    chaseDays: "1, 3, 5, 7",
  };
}

export function unknownTokenMessage(parts: string[]): string | null {
  const unknown: string[] = [];
  for (const part of parts) {
    const result = validateTemplate(part, AGREEMENT_COPY_FIELDS);
    if (result.ok) continue;
    for (const token of result.unknown) {
      if (!unknown.includes(token)) unknown.push(token);
    }
  }
  if (!unknown.length) return null;
  const named = unknown.map((token) => `{{${token}}}`).join(", ");
  const verb = unknown.length === 1 ? "is" : "are";
  return `${named} ${verb} not available on this lane.`;
}

export function parseChaseDays(raw: string): { ok: true; days: number[] } | { ok: false; error: string } {
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return { ok: false, error: "At least one chase day is required" };
  const days = parts.map((part) => Number(part));
  if (days.some((day) => !Number.isInteger(day) || day < 1 || day > 30)) {
    return { ok: false, error: "Chase days must be whole numbers between 1 and 30" };
  }
  if (days.length > 5) return { ok: false, error: "A type can have at most 5 chase steps" };
  const sorted = [...days].sort((a, b) => a - b);
  if (days.some((day, index) => day !== sorted[index]) || new Set(days).size !== days.length) {
    return { ok: false, error: "Chase days must be in ascending order with no duplicates" };
  }
  return { ok: true, days };
}

export function typeDraftProblem(draft: AgreementTypeDraft): string | null {
  if (!draft.label.trim()) return "Give the type a name, e.g. Origin C&I Gas.";
  if (!draft.subject.trim()) return "Subject is required";
  if (!draft.body.trim()) return "First email body is required";
  const days = parseChaseDays(draft.chaseDays);
  if (!days.ok) return days.error;
  return unknownTokenMessage([draft.subject, draft.body, draft.chaseBody]);
}
