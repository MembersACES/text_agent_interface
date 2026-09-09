import { getApiBaseUrl } from "@/lib/utils";

export type SupplierCategory = "energy" | "waste" | "other";

export type SupplierFolder = {
  id: string;
  name: string;
  folder_id: string;
  folder_url: string;
  category: SupplierCategory;
  modified_time?: string | null;
};

export type SupplierFoldersResponse = {
  parent_folder_id: string;
  parent_folder_url: string;
  suppliers: SupplierFolder[];
};

export type SupplierFile = {
  id: string;
  name: string;
  mime_type: string;
  file_type: string;
  web_view_link: string;
  preview_url?: string | null;
  created_time?: string | null;
  modified_time?: string | null;
  size?: string | null;
};

export type SupplierPathItem = {
  id: string;
  name: string;
  folder_url: string;
};

export type SupplierDocumentsResponse = {
  supplier: SupplierFolder;
  current_folder: SupplierPathItem;
  path: SupplierPathItem[];
  folders: SupplierFile[];
  files: SupplierFile[];
};

export type SupplierUploadResult = {
  id: string;
  name: string;
  web_view_link: string;
  folder_id: string;
  folder_url: string;
  supplier_name: string;
};

function authHeaders(token: string | undefined, accessToken?: string): HeadersInit {
  return {
    Authorization: `Bearer ${token ?? ""}`,
    ...(accessToken ? { "X-Google-Access-Token": accessToken } : {}),
  };
}

function detailMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(String).join(", ");
  return fallback;
}

export async function fetchSupplierFolders(
  token: string | undefined,
): Promise<SupplierFoldersResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/suppliers`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to load suppliers (${res.status})`));
  }
  return {
    parent_folder_id: data.parent_folder_id ?? "",
    parent_folder_url: data.parent_folder_url ?? "",
    suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
  };
}

export async function fetchSupplierDocuments(
  token: string | undefined,
  folderId: string,
): Promise<SupplierDocumentsResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/suppliers/${encodeURIComponent(folderId)}/files`,
    { headers: authHeaders(token) },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to load documents (${res.status})`));
  }
  return {
    supplier: data.supplier,
    current_folder: data.current_folder,
    path: Array.isArray(data.path) ? data.path : [],
    folders: Array.isArray(data.folders) ? data.folders : [],
    files: Array.isArray(data.files) ? data.files : [],
  };
}

export async function createSupplierFolder(
  token: string | undefined,
  name: string,
  accessToken?: string,
): Promise<SupplierFolder & { created: boolean }> {
  const form = new FormData();
  form.append("name", name);
  if (accessToken) form.append("google_access_token", accessToken);
  const res = await fetch(`${getApiBaseUrl()}/api/suppliers`, {
    method: "POST",
    headers: authHeaders(token, accessToken),
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to create folder (${res.status})`));
  }
  return data as SupplierFolder & { created: boolean };
}

export async function uploadSupplierDocument(
  token: string | undefined,
  folderId: string,
  file: File,
  accessToken?: string,
  displayName?: string,
): Promise<SupplierUploadResult> {
  const form = new FormData();
  form.append("file", file);
  if (displayName?.trim()) form.append("filename", displayName.trim());
  if (accessToken) form.append("google_access_token", accessToken);
  const res = await fetch(
    `${getApiBaseUrl()}/api/suppliers/${encodeURIComponent(folderId)}/files`,
    {
      method: "POST",
      headers: authHeaders(token, accessToken),
      body: form,
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to upload (${res.status})`));
  }
  return data as SupplierUploadResult;
}
