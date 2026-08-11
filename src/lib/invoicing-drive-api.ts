import { getApiBaseUrl } from "@/lib/utils";
import type { InvoicingDriveCategoryKey } from "@/lib/invoicing-drive-categories";

export type InvoicingDriveBusiness = {
  id: string;
  name: string;
  folder_id: string;
  folder_url: string;
  document_count: number | null;
};

export type InvoicingDriveBusinessesResponse = {
  category: string;
  business_parent_folder_id: string;
  business_parent_folder_url: string;
  discovery: string;
  businesses: InvoicingDriveBusiness[];
};

export type InvoicingDriveDocument = {
  id: string;
  name: string;
  mime_type: string;
  file_type: string;
  web_view_link: string;
  preview_url: string;
  created_time?: string | null;
  modified_time?: string | null;
  inferred_invoice_number?: string | null;
};

export type InvoicingDriveDocumentsResponse = {
  category: string;
  business: {
    id: string;
    name: string;
    folder_id: string;
    folder_url: string;
  };
  documents: InvoicingDriveDocument[];
};

function authHeaders(token: string | undefined): HeadersInit {
  return { Authorization: `Bearer ${token ?? ""}` };
}

function detailMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(String).join(", ");
  return fallback;
}

export async function fetchInvoicingDriveBusinesses(
  token: string | undefined,
  category: InvoicingDriveCategoryKey
): Promise<InvoicingDriveBusinessesResponse> {
  const u = new URL(`${getApiBaseUrl()}/api/invoicing/drive/businesses`);
  u.searchParams.set("category", category);
  const res = await fetch(u.toString(), { headers: authHeaders(token) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to load businesses (${res.status})`));
  }
  return {
    category: data.category ?? category,
    business_parent_folder_id: data.business_parent_folder_id ?? "",
    business_parent_folder_url: data.business_parent_folder_url ?? "",
    discovery: data.discovery ?? "",
    businesses: Array.isArray(data.businesses) ? data.businesses : [],
  };
}

export async function fetchInvoicingDriveDocuments(
  token: string | undefined,
  category: InvoicingDriveCategoryKey,
  businessId: string
): Promise<InvoicingDriveDocumentsResponse> {
  const u = new URL(`${getApiBaseUrl()}/api/invoicing/drive/documents`);
  u.searchParams.set("category", category);
  u.searchParams.set("businessId", businessId);
  const res = await fetch(u.toString(), { headers: authHeaders(token) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to load documents (${res.status})`));
  }
  return {
    category: data.category ?? category,
    business: data.business ?? {
      id: businessId,
      name: "",
      folder_id: "",
      folder_url: "",
    },
    documents: Array.isArray(data.documents) ? data.documents : [],
  };
}
