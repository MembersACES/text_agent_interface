import { getAutonomousApiBaseUrl } from "@/lib/utils";

export type CampaignStatus = "draft" | "ready" | "sending" | "paused" | "done";

export type CampaignSummary = {
  id: number;
  name: string;
  sequence_type: string;
  status: CampaignStatus;
  first_touch_subject: string | null;
  first_touch_html: string | null;
  first_touch_text: string | null;
  merge_field_map: Record<string, string>;
  provenance_note: string | null;
  daily_cap: number | null;
  send_window_start: string | null;
  send_window_end: string | null;
  row_counts: {
    rows: number;
    unique_recipients: number;
    pending: number;
    human_only: number;
    test_sends: number;
  };
  rows?: CampaignRowPayload[];
};

export type CampaignRowPayload = {
  id: number;
  merge_json: Record<string, string>;
  intelligence_json: Record<string, string>;
  recipient_key: string | null;
  row_status: string;
  human_only: boolean;
  run_id: number | null;
  offer_id: number | null;
};

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function formatApiDetail(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string" && item.trim()) return item.trim();
        if (item && typeof item === "object" && "msg" in item) {
          const msg = (item as { msg: unknown }).msg;
          if (typeof msg === "string" && msg.trim()) return msg.trim();
        }
        return "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }
  return null;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data === "object" && "detail" in data) {
      const formatted = formatApiDetail((data as { detail: unknown }).detail);
      if (formatted) return formatted;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function base() {
  return getAutonomousApiBaseUrl();
}

export async function listCampaigns(token: string): Promise<CampaignSummary[]> {
  const res = await fetch(`${base()}/api/autonomous/campaigns`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not list campaigns"));
  return res.json();
}

export async function createCampaign(
  token: string,
  name: string,
  sequence_type: string,
): Promise<CampaignSummary> {
  const res = await fetch(`${base()}/api/autonomous/campaigns`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ name, sequence_type }),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not create campaign"));
  return res.json();
}

export async function getCampaign(token: string, id: number): Promise<CampaignSummary> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}?limit=500`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not load campaign"));
  return res.json();
}

export async function patchCampaign(
  token: string,
  id: number,
  body: Record<string, unknown>,
): Promise<CampaignSummary> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not save campaign"));
  return res.json();
}

export async function saveCampaignRows(
  token: string,
  id: number,
  headersList: string[],
  rows: string[][],
  column_map: Record<string, string>,
): Promise<{
  rows: number;
  unique_recipients: number;
  groups_with_conflicts: unknown[];
  pending?: number;
  suppressed_addresses?: string[];
}> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}/rows`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ headers: headersList, rows, column_map }),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not save rows"));
  return res.json();
}

export async function sendCampaignTest(
  token: string,
  id: number,
  to: string,
  row_id: number,
): Promise<{ ok: boolean; subject: string; to: string }> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}/test-send`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ to, row_id }),
  });
  if (!res.ok) throw new Error(await readError(res, "Test send failed"));
  return res.json();
}

export async function startCampaign(token: string, id: number) {
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}/start`, {
    method: "POST",
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not start campaign"));
  return res.json() as Promise<{
    ok: boolean;
    started: number;
    pending: number;
    skipped_suppressed?: number;
    skipped_suppressed_addresses?: string[];
    status: CampaignStatus;
  }>;
}

export async function pauseCampaign(token: string, id: number): Promise<CampaignSummary> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}/pause`, {
    method: "POST",
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not pause campaign"));
  return res.json();
}

export async function resumeCampaign(token: string, id: number): Promise<CampaignSummary> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}/resume`, {
    method: "POST",
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not resume campaign"));
  return res.json();
}

export type SuppressionRow = {
  id: number;
  email: string;
  reason: string | null;
  source: string | null;
  created_at: string | null;
};

export async function listSuppressions(token: string): Promise<SuppressionRow[]> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/suppressions`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not load suppressions"));
  return res.json();
}

export async function deleteSuppression(token: string, id: number): Promise<void> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/suppressions/${id}`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not remove suppression"));
}

export type CampaignSequenceOption = {
  sequence_type: string;
  display_name: string;
  linked_flow_keys: string[];
  is_active: boolean;
};

export async function listSequenceTypes(token: string): Promise<CampaignSequenceOption[]> {
  const res = await fetch(`${base()}/api/autonomous/sequences/templates`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not load sequence templates"));
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.items || [];
  return items.map(
    (t: {
      sequence_type: string;
      display_name: string;
      linked_flow_keys?: string[] | null;
      is_active?: boolean;
    }) => ({
      sequence_type: t.sequence_type,
      display_name: t.display_name || t.sequence_type,
      linked_flow_keys: Array.isArray(t.linked_flow_keys) ? t.linked_flow_keys : [],
      is_active: t.is_active !== false,
    }),
  );
}
