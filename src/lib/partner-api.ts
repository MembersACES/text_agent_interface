import { getApiBaseUrl } from "@/lib/utils";

export type PartnerMe = {
  email: string;
  partner_id: number;
  tools: string[];
};

export type PartnerClient = {
  id: number;
  business_name: string;
  primary_contact_email?: string | null;
  created_at?: string | null;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function partnerApiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (Array.isArray(detail)) return detail.map(String).join(", ");
  return fallback;
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchPartnerMe(token: string): Promise<PartnerMe> {
  const res = await fetch(`${getApiBaseUrl()}/api/partner/me`, {
    headers: authHeaders(token),
  });
  const data = await parseJson(res);
  if (res.status === 403) {
    throw new Error(
      "This Google account is not linked to a distributor portal. Ask ACES staff to invite you.",
    );
  }
  if (!res.ok) {
    throw new Error(partnerApiErrorMessage(data, `Could not load your account (${res.status})`));
  }
  return data as PartnerMe;
}

export async function fetchPartnerClients(token: string): Promise<PartnerClient[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/partner/clients`, {
    headers: authHeaders(token),
  });
  const data = await parseJson(res);
  if (res.status === 403) {
    throw new Error(
      "This Google account is not linked to a distributor portal. Ask ACES staff to invite you.",
    );
  }
  if (!res.ok) {
    throw new Error(partnerApiErrorMessage(data, `Could not load clients (${res.status})`));
  }
  return Array.isArray(data) ? (data as PartnerClient[]) : [];
}

export async function fetchPartnerClient(
  token: string,
  clientId: number,
): Promise<PartnerClient> {
  const res = await fetch(`${getApiBaseUrl()}/api/partner/clients/${clientId}`, {
    headers: authHeaders(token),
  });
  const data = await parseJson(res);
  if (res.status === 404) {
    throw new Error("Client not found.");
  }
  if (res.status === 403) {
    throw new Error(
      "This Google account is not linked to a distributor portal. Ask ACES staff to invite you.",
    );
  }
  if (!res.ok) {
    throw new Error(partnerApiErrorMessage(data, `Could not load client (${res.status})`));
  }
  return data as PartnerClient;
}

export type PartnerBase1Result =
  | { kind: "created"; client_id: number }
  | { kind: "received" };

export async function submitPartnerBase1(
  token: string,
  form: FormData,
): Promise<PartnerBase1Result> {
  const res = await fetch(`${getApiBaseUrl()}/api/partner/base1`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      partnerApiErrorMessage(data, "Submission failed. Please try again shortly."),
    );
  }
  const body = (data || {}) as { status?: string; client_id?: number };
  if (body.status === "received") {
    return { kind: "received" };
  }
  return { kind: "created", client_id: Number(body.client_id) };
}
