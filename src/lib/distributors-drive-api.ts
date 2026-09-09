import { getApiBaseUrl } from "@/lib/utils";

export type DistributorFolder = {
  id: string;
  name: string;
  display_name: string;
  folder_id: string;
  folder_url: string;
  modified_time?: string | null;
};

export type DistributorFoldersResponse = {
  parent_folder_id: string;
  parent_folder_url: string;
  distributors: DistributorFolder[];
};

export type DistributorFile = {
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

export type DistributorPathItem = {
  id: string;
  name: string;
  folder_url: string;
};

export type DistributorDocumentsResponse = {
  distributor: DistributorFolder;
  current_folder: DistributorPathItem;
  path: DistributorPathItem[];
  folders: DistributorFile[];
  files: DistributorFile[];
};

export type DistributorUploadResult = {
  id: string;
  name: string;
  web_view_link: string;
  folder_id: string;
  folder_url: string;
  distributor_name: string;
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

export async function fetchDistributorFolders(
  token: string | undefined,
): Promise<DistributorFoldersResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/distributors/drive`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to load distributors (${res.status})`));
  }
  return {
    parent_folder_id: data.parent_folder_id ?? "",
    parent_folder_url: data.parent_folder_url ?? "",
    distributors: Array.isArray(data.distributors) ? data.distributors : [],
  };
}

export async function fetchDistributorDocuments(
  token: string | undefined,
  folderId: string,
): Promise<DistributorDocumentsResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/distributors/drive/${encodeURIComponent(folderId)}/files`,
    { headers: authHeaders(token) },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to load documents (${res.status})`));
  }
  return {
    distributor: data.distributor,
    current_folder: data.current_folder,
    path: Array.isArray(data.path) ? data.path : [],
    folders: Array.isArray(data.folders) ? data.folders : [],
    files: Array.isArray(data.files) ? data.files : [],
  };
}

export async function uploadDistributorDocument(
  token: string | undefined,
  folderId: string,
  file: File,
  accessToken?: string,
  displayName?: string,
): Promise<DistributorUploadResult> {
  const form = new FormData();
  form.append("file", file);
  if (displayName?.trim()) form.append("filename", displayName.trim());
  if (accessToken) form.append("google_access_token", accessToken);
  const res = await fetch(
    `${getApiBaseUrl()}/api/distributors/drive/${encodeURIComponent(folderId)}/files`,
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
  return data as DistributorUploadResult;
}
