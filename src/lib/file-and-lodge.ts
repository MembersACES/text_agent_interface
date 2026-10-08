import type { OperationalEmailRecipient } from "@/lib/operational-email-api";

/** Drive filing mode. "append" is the "Add to contract" choice. */
export const DEFAULT_CONTRACT_UPLOAD_MODE = "append" as const;

export type ContractUploadMode = "replace" | "append" | "append_multiple";

export const CONTRACT_UPLOAD_MODE_LABELS: Record<ContractUploadMode, string> = {
  replace: "Replace contract — overwrites stored file ID(s)",
  append: "Add to contract — append one file ID (comma-separated)",
  append_multiple: "Multiple files — append all file IDs at once",
};

/** Status value that ticks "Also lodge with retailer" by default. */
export const LODGE_DEFAULT_STATUS = "Signed via ACES";

export const CONTRACT_UTILITY_LABELS = [
  "C&I Electricity",
  "SME Electricity",
  "C&I Gas",
  "SME Gas",
  "Waste",
  "Oil",
  "DMA",
] as const;

export type ContractUtilityLabel = (typeof CONTRACT_UTILITY_LABELS)[number];

const UTILITY_FILING: Record<string, string> = {
  "C&I Electricity": "signed_CI_E",
  "SME Electricity": "signed_SME_E",
  "C&I Gas": "signed_CI_G",
  "SME Gas": "signed_SME_G",
  Waste: "signed_WASTE",
  Oil: "signed_OIL",
  DMA: "signed_DMA",
};

export type SupplierOption = {
  key: string;
  name: string;
  email: string;
  isPlaceholder?: boolean;
};

/** Fallback when the live recipient list has not loaded. Matches CONTRACT_EMAIL_MAPPINGS groups. */
const FALLBACK_SUPPLIERS: { key: string; name: string; email: string; groups: string[] }[] = [
  { key: "Origin C&I Electricity", name: "Origin C&I", email: "MIContracts@originenergy.com.au, data.quote@fornrg.com", groups: ["C&I Electricity"] },
  { key: "Momentum C&I Electricity", name: "Momentum", email: "contracts.administration@momentum.com.au, data.quote@fornrg.com", groups: ["C&I Electricity"] },
  { key: "Alinta C&I Electricity", name: "Alinta", email: "Andrew.Barnes@alintaenergy.com.au, Lewis.Chase@alintaenergy.com.au, Cindy.Ho@alintaenergy.com.au, business@acesolutions.com.au, data.quote@fornrg.com", groups: ["C&I Electricity"] },
  { key: "Origin SME Electricity", name: "Origin SME", email: "MIContracts@originenergy.com.au, data.quote@fornrg.com", groups: ["SME Electricity"] },
  { key: "BlueNRG SME Electricity", name: "BlueNRG SME", email: "data.quote@fornrg.com", groups: ["SME Electricity"] },
  { key: "CovaU SME Electricity", name: "CovaU", email: "corp.sales@covau.com.au, data.quote@fornrg.com", groups: ["SME Electricity"] },
  { key: "Origin C&I Gas", name: "Origin C&I", email: "MIContracts@originenergy.com.au, data.quote@fornrg.com", groups: ["C&I Gas"] },
  { key: "Alinta C&I Gas", name: "Alinta", email: "Andrew.Barnes@alintaenergy.com.au, Lewis.Chase@alintaenergy.com.au, Cindy.Ho@alintaenergy.com.au, business@acesolutions.com.au, data.quote@fornrg.com", groups: ["C&I Gas"] },
  { key: "CovaU SME Gas", name: "CovaU", email: "corp.sales@covau.com.au, data.quote@fornrg.com", groups: ["SME Gas"] },
  { key: "Veolia Waste", name: "Veolia", email: "ric.luiyf@veolia.com, business@acesolutions.com.au", groups: ["Waste"] },
  { key: "PowerMetric DMA", name: "PowerMetric", email: "accountmanagement@powermetric.com.au, rmorse@powermetric.com.au, data.quote@fornrg.com", groups: ["DMA"] },
  {
    key: "Other",
    name: "Other",
    email: "members@acesolutions.com.au, data.quote@fornrg.com, morgan.h@acesolutions.com.au",
    groups: ["C&I Electricity", "SME Electricity", "C&I Gas", "SME Gas", "Waste", "DMA", "Oil", "Other"],
  },
];

export function filingTypeForUtility(utility: string): string {
  return UTILITY_FILING[utility] ?? utility.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function lodgeCheckedByDefault(status: string): boolean {
  return status === LODGE_DEFAULT_STATUS;
}

export type IdentifierKind = "nmi" | "mirn" | null;

export function identifierKind(utility: string): IdentifierKind {
  if (["C&I Electricity", "SME Electricity", "DMA"].includes(utility)) return "nmi";
  if (["C&I Gas", "SME Gas"].includes(utility)) return "mirn";
  return null;
}

export function identifierLabel(kind: IdentifierKind): string {
  if (kind === "nmi") return "NMI";
  if (kind === "mirn") return "MIRN";
  return "Identifier";
}

/** Non-blocking warning. Blank is allowed. */
export function identifierWarning(kind: IdentifierKind, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !kind) return null;
  if (kind === "nmi" && trimmed.length !== 10) {
    return "NMI is usually 10 characters.";
  }
  if (kind === "mirn" && !/^\d{11}$/.test(trimmed)) {
    return "MIRN is usually 11 digits.";
  }
  return null;
}

export function identifierList(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  return [];
}

export function identifierFieldState(values: string[]): {
  options: string[];
  value: string;
  useDropdown: boolean;
} {
  const options = values.map((s) => s.trim()).filter(Boolean);
  return {
    options,
    value: options[0] ?? "",
    useDropdown: options.length > 1,
  };
}

/** Split a shared recipient list into unique addresses. This send only — nothing is saved. */
export function recipientEmailsFromCsv(email: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of email.split(/[,;]/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function isRecipientEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function recipientEmailsCsv(emails: string[]): string {
  return recipientEmailsFromCsv(emails.join(", ")).join(", ");
}

export function suppliersForUtility(
  utility: string,
  live: OperationalEmailRecipient[] | null,
): SupplierOption[] {
  if (live && live.length > 0) {
    return live
      .filter((row) => {
        const groups = [row.group_name, ...(row.extra_groups || [])].filter(Boolean);
        return groups.includes(utility);
      })
      .map((row) => ({
        key: row.key,
        name: row.display_name || row.key,
        email: row.email || (row.emails || []).join(", "),
        isPlaceholder: row.is_placeholder,
      }));
  }
  return FALLBACK_SUPPLIERS.filter((row) => row.groups.includes(utility)).map((row) => ({
    key: row.key,
    name: row.name,
    email: row.email,
  }));
}

export type LodgementActivity = {
  activity_type: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

export function lodgementBadge(
  activities: LodgementActivity[],
  utility: string,
): string | null {
  const matches = activities.filter((row) => {
    if (row.activity_type !== "signed_agreement_lodged") return false;
    const meta = row.metadata;
    return meta != null && String(meta.utility ?? "") === utility;
  });
  if (!matches.length) return null;
  const latest = [...matches].sort((a, b) => {
    const at = new Date(a.created_at).getTime();
    const bt = new Date(b.created_at).getTime();
    return bt - at;
  })[0];
  const retailer = String(
    latest.metadata?.retailer_name ?? latest.metadata?.supplier ?? "",
  ).trim();
  if (!retailer) return null;
  return `Lodged with ${retailer}`;
}

export function buildDriveFilingFormData(input: {
  file: File;
  businessName: string;
  filingType: string;
  gdriveUrl: string;
  contractStatus: string;
  contractUpdateMode: ContractUploadMode;
}): FormData {
  const fd = new FormData();
  fd.append("business_name", input.businessName);
  fd.append("filing_type", input.filingType);
  fd.append("gdrive_url", input.gdriveUrl);
  fd.append("contract_status", input.contractStatus);
  fd.append("contract_update_mode", input.contractUpdateMode);
  fd.append("files", input.file);
  return fd;
}

export function buildLodgementFormData(input: {
  file: File;
  businessName: string;
  supplier: string;
  utility: string;
  identifierKind: IdentifierKind;
  identifier: string;
  documentLink?: string;
  clientId?: number | null;
  recipients?: string[];
}): FormData {
  const fd = new FormData();
  fd.append("file_0", input.file);
  fd.append("business_name", input.businessName);
  fd.append("contract_type", input.supplier);
  fd.append("agreement_type", "contract");
  fd.append("file_count", "1");
  fd.append("utility_type", input.utility);
  fd.append("skip_drive_filing", "true");
  const id = input.identifier.trim();
  if (id && input.identifierKind === "nmi") fd.append("nmi", id);
  if (id && input.identifierKind === "mirn") fd.append("mirn", id);
  if (input.documentLink) fd.append("document_link", input.documentLink);
  if (input.clientId != null && Number.isFinite(input.clientId)) {
    fd.append("client_id", String(input.clientId));
  }
  const recipients = recipientEmailsCsv(input.recipients ?? []);
  if (recipients) fd.append("recipient_emails", recipients);
  return fd;
}
