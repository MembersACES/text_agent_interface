import { getApiBaseUrl } from "@/lib/utils";

export type OperationalEmailTemplate = {
  id: number;
  key: string;
  category: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  merge_fields: string[];
  sample_values: Record<string, string>;
  updated_by: string | null;
  updated_at: string | null;
  created_at: string | null;
};

export type OperationalEmailRecipient = {
  id: number;
  flow: string;
  key: string;
  display_name: string;
  emails: string[];
  email: string;
  aliases: string[];
  group_name: string;
  extra_groups: string[];
  is_placeholder: boolean;
  is_active: boolean;
  sort_order: number;
  updated_by: string | null;
  updated_at: string | null;
  created_at: string | null;
};

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const detail = (body as { detail?: string | { msg?: string }[] }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return res.statusText || "Request failed";
}

export async function fetchEmailTemplates(token: string, category?: string) {
  const url = new URL(`${getApiBaseUrl()}/api/email-templates`);
  if (category) url.searchParams.set("category", category);
  const res = await fetch(url.toString(), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { templates: OperationalEmailTemplate[] };
}

export async function patchEmailTemplate(
  token: string,
  key: string,
  body: { subject?: string; html_body?: string; name?: string; description?: string },
) {
  const res = await fetch(`${getApiBaseUrl()}/api/email-templates/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as OperationalEmailTemplate;
}

export async function fetchEmailRecipients(token: string, flow?: string, includeInactive = false) {
  const url = new URL(`${getApiBaseUrl()}/api/email-recipients`);
  if (flow) url.searchParams.set("flow", flow);
  if (includeInactive) url.searchParams.set("include_inactive", "true");
  const res = await fetch(url.toString(), { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { recipients: OperationalEmailRecipient[] };
}

export async function createEmailRecipient(
  token: string,
  body: {
    flow: string;
    key: string;
    display_name?: string;
    emails: string[];
    aliases?: string[];
    group_name?: string;
    extra_groups?: string[];
    is_placeholder?: boolean;
  },
) {
  const res = await fetch(`${getApiBaseUrl()}/api/email-recipients`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as OperationalEmailRecipient;
}

export async function patchEmailRecipient(
  token: string,
  id: number,
  body: Partial<{
    key: string;
    display_name: string;
    emails: string[];
    aliases: string[];
    group_name: string;
    extra_groups: string[];
    is_placeholder: boolean;
    is_active: boolean;
  }>,
) {
  const res = await fetch(`${getApiBaseUrl()}/api/email-recipients/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as OperationalEmailRecipient;
}

export async function deactivateEmailRecipient(token: string, id: number) {
  const res = await fetch(`${getApiBaseUrl()}/api/email-recipients/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as OperationalEmailRecipient;
}

export function renderMergeTokens(text: string, values: Record<string, string>): string {
  return (text || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? "");
}
