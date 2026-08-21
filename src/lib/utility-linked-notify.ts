/** After Airtable link succeeds, wait for n8n utility_linked_post_process (Drive move + file-ID register). */

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
    throw new Error(formatNotifyError(text, res.status));
  }
}

function formatNotifyError(text: string, status: number): string {
  if (!text) return `utility-linked-notify failed: ${status}`;
  try {
    const parsed = JSON.parse(text) as { detail?: unknown; error?: unknown };
    const detail = parsed.detail ?? parsed.error;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const joined = detail
        .map((item) =>
          typeof item === "string"
            ? item
            : item && typeof item === "object" && "msg" in item
              ? String((item as { msg: unknown }).msg)
              : "",
        )
        .filter(Boolean)
        .join("; ");
      if (joined) return joined;
    }
  } catch {
    // use raw text
  }
  return text.slice(0, 400);
}
