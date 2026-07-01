import { getApiBaseUrl } from "@/lib/utils";

export type ReturnUtilityInfoPayload = {
  utility_type: string;
  business_name?: string;
};

/**
 * Latest processed utility invoice row (sheet row 2), n8n-compatible array response.
 */
export async function fetchReturnUtilityInfo(
  payload: ReturnUtilityInfoPayload,
  token: string,
): Promise<Record<string, unknown> | Record<string, unknown>[] | null> {
  const res = await fetch(`${getApiBaseUrl()}/api/return-utility-info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      utility_type: payload.utility_type,
      business_name: payload.business_name ?? "",
    }),
  });

  if (res.status === 401) {
    const err = new Error("REAUTHENTICATION_REQUIRED");
    throw err;
  }

  if (!res.ok) {
    let detail = "Unknown error";
    try {
      const err = await res.json();
      detail = String(err.detail || err.message || detail);
    } catch {
      detail = res.statusText || detail;
    }
    throw new Error(detail);
  }

  return res.json();
}
