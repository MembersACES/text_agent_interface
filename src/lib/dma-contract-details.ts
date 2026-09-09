import { getApiBaseUrl } from "@/lib/utils";

const ENGAGEMENT_FORM_LINK_KEYS = [
  "engagement_form_link",
  "engagement_form_document_link",
  "engagement_form_url",
  "ef_document_link",
  "ef_link",
  "pdf_engagement_form_link",
  "engagementFormLink",
] as const;

export type DmaContractDetailsPayload = {
  nmi: string;
  business?: string;
  business_name?: string;
  abn?: string;
  postal_address?: string;
  main_address?: string;
  site_address?: string;
  frmp?: string;
  retailer?: string;
  contact?: string;
  contact_name?: string;
  position?: string;
  telephone?: string;
  contact_number?: string;
  email?: string;
  meter?: string | number;
  dma_price?: string | number;
  vas?: string | number;
  vas_price?: string | number;
  start_date?: string;
  dma_start_date?: string;
  end_date?: string;
  dma_end_date?: string;
  engagement_form_link?: string;
  client_folder_url?: string;
  offer_id?: number | null;
  client_id?: number | null;
};

export type DmaContractDetailsResult = {
  status?: string;
  message?: string;
  file_id?: string;
  file_link?: string;
  file_name?: string;
  folder_id?: string;
  folder_url?: string;
};

function firstLinkFromRecord(record: Record<string, unknown>): string {
  for (const key of ENGAGEMENT_FORM_LINK_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function pickEngagementFormLink(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const root = result as Record<string, unknown>;
  const direct = firstLinkFromRecord(root);
  if (direct) return direct;
  const nested = root.data;
  if (nested && typeof nested === "object") {
    return firstLinkFromRecord(nested as Record<string, unknown>);
  }
  return "";
}

function stringifyPayload(payload: DmaContractDetailsPayload): Record<string, unknown> {
  const out: Record<string, unknown> = { nmi: payload.nmi };
  for (const [key, value] of Object.entries(payload)) {
    if (key === "nmi") continue;
    if (value == null || value === "") continue;
    if (key === "offer_id" || key === "client_id" || key === "row_number") {
      out[key] = value;
      continue;
    }
    out[key] = typeof value === "number" ? String(value) : value;
  }
  return out;
}

/** Fire-and-forget: never throw. Comparison UI must not wait on this. */
export async function fileDmaContractDetails(
  token: string,
  payload: DmaContractDetailsPayload,
  accessToken?: string,
): Promise<DmaContractDetailsResult | null> {
  const nmi = (payload.nmi || "").trim();
  if (!nmi || !token) return null;
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/dma/contract-details`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(accessToken ? { "X-Google-Access-Token": accessToken } : {}),
      },
      body: JSON.stringify(stringifyPayload(payload)),
    });
    if (!response.ok) {
      const body = await response.text();
      console.warn("[DMA contract details] backend error", response.status, body);
      return null;
    }
    const result = (await response.json()) as DmaContractDetailsResult;
    if (result?.status !== "success") {
      console.warn("[DMA contract details] fill/upload failed", result);
    }
    return result;
  } catch (error) {
    console.warn("[DMA contract details] request failed", error);
    return null;
  }
}
