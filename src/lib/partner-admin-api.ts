import { getApiBaseUrl } from "@/lib/utils";

export type PartnerToolOption = {
  id: string;
  label: string;
};

export type PartnerLogin = {
  id: number;
  email: string;
  active: boolean;
};

export type DistributorPartner = {
  id: number;
  name: string;
  slug: string;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  enabled_tools: string[];
  active: boolean;
  deactivated_at: string | null;
  users: PartnerLogin[];
};

export type DistributorPartnersResponse = {
  tools: PartnerToolOption[];
  partners: DistributorPartner[];
};

function authHeaders(token: string | undefined): HeadersInit {
  return {
    Authorization: `Bearer ${token ?? ""}`,
    "Content-Type": "application/json",
  };
}

function detailMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (Array.isArray(detail)) return detail.map(String).join(", ");
  return fallback;
}

async function parse(res: Response, fallback: string): Promise<DistributorPartner> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(detailMessage(data, fallback));
  return data as DistributorPartner;
}

export async function fetchDistributorPartners(
  token: string | undefined,
): Promise<DistributorPartnersResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/distributors/partners`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to load distributor partners (${res.status})`));
  }
  return {
    tools: Array.isArray(data.tools) ? data.tools : [],
    partners: Array.isArray(data.partners) ? data.partners : [],
  };
}

export async function createDistributorPartner(
  token: string | undefined,
  body: {
    name: string;
    slug: string;
    enabled_tools: string[];
    drive_folder_id?: string | null;
  },
): Promise<DistributorPartner> {
  const res = await fetch(`${getApiBaseUrl()}/api/distributors/partners`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parse(res, "Failed to create distributor");
}

export async function updateDistributorPartner(
  token: string | undefined,
  partnerId: number,
  body: {
    enabled_tools?: string[];
    drive_folder_id?: string;
    provision_drive_folder?: boolean;
  },
): Promise<DistributorPartner> {
  const res = await fetch(`${getApiBaseUrl()}/api/distributors/partners/${partnerId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parse(res, "Failed to update distributor");
}

export async function deactivateDistributorPartner(
  token: string | undefined,
  partnerId: number,
): Promise<DistributorPartner> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/distributors/partners/${partnerId}/deactivate`,
    { method: "POST", headers: authHeaders(token) },
  );
  return parse(res, "Failed to deactivate distributor");
}

export async function inviteDistributorPartnerUser(
  token: string | undefined,
  partnerId: number,
  email: string,
): Promise<DistributorPartner> {
  const res = await fetch(`${getApiBaseUrl()}/api/distributors/partners/${partnerId}/users`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ email }),
  });
  return parse(res, "Failed to invite login");
}

export async function deactivateDistributorPartnerUser(
  token: string | undefined,
  partnerId: number,
  userId: number,
): Promise<DistributorPartner> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/distributors/partners/${partnerId}/users/${userId}/deactivate`,
    { method: "POST", headers: authHeaders(token) },
  );
  return parse(res, "Failed to deactivate login");
}
