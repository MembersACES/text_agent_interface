import { getApiBaseUrl } from "@/lib/utils";

export type MemberWipPayload = {
  ok?: boolean;
  business_name?: string;
  additional_documents?: Array<Record<string, unknown>>;
  signedEF_row?: Record<string, unknown>;
  engagement_forms?: Array<{
    fileId?: string;
    file_id?: string;
    id?: string;
    name?: string;
    fileName?: string;
    uploaded_at?: string;
    modifiedTime?: string | null;
    signedDate?: string;
  }>;
  file_count?: number;
  has_files?: boolean;
};

export type MemberSimpleDoc = {
  fileName: string;
  id: string;
  uploadedAt?: string;
};

const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{10,}$/;
const DATE_FIELD_KEYS = [
  "uploaded_at",
  "Upload Date",
  "Uploaded",
  "Date Uploaded",
  "Signed Date",
  "Sign Date",
  "Date",
  "createdTime",
  "created_time",
  "modifiedTime",
  "modified_time",
] as const;

export async function fetchMemberEoiIds(
  businessName: string,
  token: string,
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/member-eoi-ids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ business_name: businessName }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchMemberWip(
  businessName: string,
  token: string,
): Promise<MemberWipPayload | null> {
  const res = await fetch(`${getApiBaseUrl()}/api/member-wip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ business_name: businessName }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return data[0] as MemberWipPayload;
  }
  if (data && typeof data === "object") {
    return data as MemberWipPayload;
  }
  return null;
}

/** Map EOI webhook/API rows into _processed_file_ids keys (eoi_*). */
export function mapEoiRowsToFileIds(
  rows: Record<string, unknown>[],
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const row of rows) {
    const eoiType = row["EOI Type"];
    const eoiFileId = row["EOI File ID"];
    if (typeof eoiType !== "string" || typeof eoiFileId !== "string") continue;
    if (!DRIVE_ID_RE.test(eoiFileId)) continue;
    const cleanKey = eoiType.trim().replace(/\s+/g, "_");
    mapped[`eoi_${cleanKey}`] =
      `https://drive.google.com/file/d/${eoiFileId}/view?usp=drivesdk`;
  }
  return mapped;
}

function pickUploadedAt(item: Record<string, unknown> | undefined): string | undefined {
  if (!item) return undefined;
  for (const key of DATE_FIELD_KEYS) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function parseAdditionalDocuments(
  data: MemberWipPayload | null,
): MemberSimpleDoc[] {
  if (!data?.additional_documents || !Array.isArray(data.additional_documents)) {
    return [];
  }
  return data.additional_documents
    .filter((item) => {
      if (!item || typeof item !== "object") return false;
      const keys = Object.keys(item);
      if (keys.length === 0 || (keys.length === 1 && keys[0] === "row_number")) return false;
      return !!(item["File Name"] || item["file_name"]);
    })
    .map((item) => ({
      fileName: String(item["File Name"] || item["file_name"] || item["fileName"] || "Unknown"),
      id: String(item["File ID"] || item["file_id"] || item["id"] || item["FileID"] || ""),
      uploadedAt: pickUploadedAt(item),
    }))
    .filter((doc) => doc.id);
}

export function parseEngagementForms(
  data: MemberWipPayload | null,
): MemberSimpleDoc[] {
  if (!data?.engagement_forms || !Array.isArray(data.engagement_forms)) {
    return [];
  }
  return data.engagement_forms
    .map((form) => ({
      fileName: String(form?.name || form?.fileName || "Unknown"),
      id: String(form?.fileId || form?.file_id || form?.id || ""),
      uploadedAt: pickUploadedAt(form as Record<string, unknown>),
    }))
    .filter((form) => form.id);
}

export function extractDriveFileId(value: string | undefined | null): string | null {
  if (!value || typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = s.match(pattern);
    if (match?.[1]) return match[1];
  }
  const token = s.split("/", 1)[0]?.trim() ?? "";
  return DRIVE_ID_RE.test(token) ? token : null;
}

export function extractDriveFileIds(value: string | undefined | null): string[] {
  if (!value) return [];
  const ids: string[] = [];
  for (const part of value.split(",")) {
    const id = extractDriveFileId(part);
    if (id) ids.push(id);
  }
  return ids;
}

export function collectMemberDocumentFileIds(
  processed: Record<string, unknown> | undefined,
  extraIds: string[] = [],
): string[] {
  const ids = new Set<string>();
  if (processed) {
    for (const value of Object.values(processed)) {
      if (typeof value !== "string") continue;
      for (const id of extractDriveFileIds(value)) ids.add(id);
    }
  }
  for (const raw of extraIds) {
    const id = extractDriveFileId(raw);
    if (id) ids.add(id);
  }
  return [...ids];
}

export function uploadDateForRef(
  urlOrId: string | undefined | null,
  dates: Record<string, string>,
): string | undefined {
  if (!urlOrId) return undefined;
  for (const id of extractDriveFileIds(urlOrId)) {
    if (dates[id]) return dates[id];
  }
  return undefined;
}

export async function fetchDriveFileUploadDates(
  fileIds: string[],
  token: string,
): Promise<Record<string, string>> {
  const unique = [...new Set(fileIds.map((id) => extractDriveFileId(id)).filter((id): id is string => !!id))];
  if (!unique.length || !token) return {};
  const res = await fetch(`${getApiBaseUrl()}/api/drive-file-metadata`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ file_ids: unique }),
  });
  if (!res.ok) return {};
  const data = await res.json();
  const files = data?.files && typeof data.files === "object" ? data.files : {};
  const out: Record<string, string> = {};
  for (const [id, meta] of Object.entries(files as Record<string, unknown>)) {
    if (!meta || typeof meta !== "object") continue;
    const rec = meta as { created_time?: unknown; modified_time?: unknown };
    const stamp =
      (typeof rec.created_time === "string" && rec.created_time) ||
      (typeof rec.modified_time === "string" && rec.modified_time) ||
      "";
    if (stamp) out[id] = stamp;
  }
  return out;
}

export function formatDocumentUploadDate(value?: string | null): string {
  if (!value || typeof value !== "string") return "";
  const s = value.trim();
  if (!s) return "";
  const au = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (au) {
    const day = Number(au[1]);
    const month = Number(au[2]);
    const year = au[3].length === 2 ? 2000 + Number(au[3]) : Number(au[3]);
    const d = new Date(year, month - 1, day);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
    }
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
