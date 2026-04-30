/** After n8n updates Airtable, notify the backend for post-link automation (placeholder → n8n switch). */

export type UtilityLinkedNotifyDetail = {
  identifier: string | null | undefined;
  identifier_type: string;
  client_name: string | null | undefined;
  retailer: string | null | undefined;
  site_address: string | null | undefined;
};

export type UtilityLinkedNotifyPayload = {
  business_name: string;
  utility_type: string;
  utility_details: UtilityLinkedNotifyDetail[];
  linked_by?: string | null;
};

export async function notifyUtilityLinkedPostProcess(
  payload: UtilityLinkedNotifyPayload
): Promise<void> {
  const body = {
    event: "UTILITY_LINKED",
    business_name: payload.business_name,
    utility_type: payload.utility_type,
    utility_details: payload.utility_details,
    linked_at: new Date().toISOString(),
    linked_by: payload.linked_by ?? undefined,
  };

  const res = await fetch("/api/utility-linked-notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `utility-linked-notify failed: ${res.status}`);
  }
}
