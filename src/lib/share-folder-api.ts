import { formatBackendErrorBody } from "@/lib/api-errors";
import { getApiBaseUrl } from "@/lib/utils";

export type SharedFolderFile = {
  id: string;
  name: string;
  mime_type?: string;
  web_view_link?: string | null;
  modified_time?: string | null;
};

export type SharedFolderPerson = {
  email: string;
  role: string;
  kind?: string;
  display_name?: string;
};

export type ShareFolderStatus = {
  ok: boolean;
  exists: boolean;
  folder_name?: string;
  folder_id?: string | null;
  folder_url?: string | null;
  files: SharedFolderFile[];
  shared_with: SharedFolderPerson[];
};

export type ShareFolderCopyResult = {
  file_id: string;
  name: string;
  action: "copied" | "already_present" | "failed" | string;
  copied_file_id?: string;
  error?: string;
};

export type ShareFolderResult = ShareFolderStatus & {
  folder_created?: boolean;
  copy_results?: ShareFolderCopyResult[];
  copy_failures?: ShareFolderCopyResult[];
  permission?: { email: string; role: string; action: string; error?: string };
  permissions?: Array<{ email: string; role: string; action: string; error?: string }>;
};

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function parseShareEmails(value: string): string[] {
  const tokens = (value || "")
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(token);
  }
  return unique;
}

export function isShareEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function roleLabel(role: string | undefined): string {
  const r = (role || "").toLowerCase();
  if (r === "reader") return "Viewer";
  if (r === "writer") return "Editor";
  if (r === "commenter") return "Commenter";
  if (r === "owner") return "Owner";
  return role || "Viewer";
}

export function defaultShareEmail(
  businessInfo?: Record<string, unknown> | null,
  fallback?: string | null,
): string {
  const contact = businessInfo?.contact_information;
  if (contact && typeof contact === "object") {
    const email = (contact as Record<string, unknown>).email;
    if (typeof email === "string" && email.trim()) return email.trim();
  }
  return (fallback || "").trim();
}

export async function fetchShareFolderStatus(
  gdriveUrl: string,
  token: string,
): Promise<ShareFolderStatus> {
  const res = await fetch(`${getApiBaseUrl()}/api/share-folder/status`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ gdrive_url: gdriveUrl }),
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(formatBackendErrorBody(data));
  }
  const payload = data as ShareFolderStatus;
  return {
    ok: payload.ok !== false,
    exists: Boolean(payload.exists),
    folder_name: payload.folder_name,
    folder_id: payload.folder_id ?? null,
    folder_url: payload.folder_url ?? null,
    files: Array.isArray(payload.files) ? payload.files : [],
    shared_with: Array.isArray(payload.shared_with) ? payload.shared_with : [],
  };
}

export async function shareMemberFolder(args: {
  gdriveUrl: string;
  fileIds: string[];
  email: string;
  sendNotification: boolean;
  token: string;
}): Promise<ShareFolderResult> {
  const res = await fetch(`${getApiBaseUrl()}/api/share-folder`, {
    method: "POST",
    headers: authHeaders(args.token),
    body: JSON.stringify({
      gdrive_url: args.gdriveUrl,
      file_ids: args.fileIds,
      email: args.email,
      send_notification: args.sendNotification,
    }),
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(formatBackendErrorBody(data));
  }
  return data as ShareFolderResult;
}
