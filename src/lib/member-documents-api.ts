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
  }>;
  file_count?: number;
  has_files?: boolean;
};

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
  const googleDriveIdPattern = /^[a-zA-Z0-9_-]{10,}$/;
  for (const row of rows) {
    const eoiType = row["EOI Type"];
    const eoiFileId = row["EOI File ID"];
    if (typeof eoiType !== "string" || typeof eoiFileId !== "string") continue;
    if (!googleDriveIdPattern.test(eoiFileId)) continue;
    const cleanKey = eoiType.trim().replace(/\s+/g, "_");
    mapped[`eoi_${cleanKey}`] =
      `https://drive.google.com/file/d/${eoiFileId}/view?usp=drivesdk`;
  }
  return mapped;
}

export function parseAdditionalDocuments(
  data: MemberWipPayload | null,
): Array<{ fileName: string; id: string }> {
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
    }))
    .filter((doc) => doc.id);
}

export function parseEngagementForms(
  data: MemberWipPayload | null,
): Array<{ fileName: string; id: string }> {
  if (!data?.engagement_forms || !Array.isArray(data.engagement_forms)) {
    return [];
  }
  return data.engagement_forms
    .map((form) => ({
      fileName: String(form?.name || form?.fileName || "Unknown"),
      id: String(form?.fileId || form?.file_id || form?.id || ""),
    }))
    .filter((form) => form.id);
}
