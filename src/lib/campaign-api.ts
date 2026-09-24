import { getAutonomousApiBaseUrl } from "@/lib/utils";

export type CampaignStatus = "draft" | "ready" | "sending" | "paused" | "done";

export type CampaignShapeWarning = {
  key: string;
  label: string;
  ok_count: number;
  fail_count: number;
  total: number;
  ok_fraction: number;
};

export type CampaignRowPayload = {
  id: number;
  merge_json: Record<string, string>;
  intelligence_json: Record<string, string>;
  recipient_key: string | null;
  row_status: string;
  suppression_reason: string | null;
  human_only: boolean;
  human_only_reason: string | null;
  shape_warnings: string[];
  run_id: number | null;
  offer_id: number | null;
};

export type CampaignMidSendEdit = {
  id: number;
  actor: string | null;
  created_at: string | null;
  payload: {
    already_sent?: number;
    will_get_new?: number;
    subject?: string | null;
  };
};

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
  archived?: boolean;
  schedule_timezone?: string;
  row_counts: {
    rows: number;
    unique_recipients: number;
    pending: number;
    sendable: number;
    human_only: number;
    warnings: number;
    test_sends: number;
  };
  shape_warnings?: CampaignShapeWarning[];
  rows?: CampaignRowPayload[];
  mid_send_edits?: CampaignMidSendEdit[];
};

export class MidSendEditError extends Error {
  already_sent: number;
  will_get_new: number;

  constructor(already_sent: number, will_get_new: number, message: string) {
    super(message);
    this.name = "MidSendEditError";
    this.already_sent = already_sent;
    this.will_get_new = will_get_new;
  }
}

export function recipientFlagKey(row: {
  id: number;
  recipient_key: string | null;
}): string {
  const key = (row.recipient_key || "").trim();
  return key ? `email:${key}` : `row:${row.id}`;
}

export function applyPendingHumanOnly(
  rows: CampaignRowPayload[],
  pending: Record<string, { human_only: boolean; reason?: string }>,
): CampaignRowPayload[] {
  return rows.map((row) => {
    const local = pending[recipientFlagKey(row)];
    if (!local) return row;
    return {
      ...row,
      human_only: local.human_only,
      human_only_reason: local.reason ?? row.human_only_reason,
    };
  });
}

export function countsFromCampaignRows(rows: CampaignRowPayload[]): {
  sendable: number;
  human_only: number;
} {
  const humanKeys = new Set<string>();
  let humanBlanks = 0;
  const startedKeys = new Set<string>();
  for (const row of rows) {
    const key = (row.recipient_key || "").trim();
    if (row.run_id && key) startedKeys.add(key);
    if (!row.human_only) continue;
    if (key) humanKeys.add(key);
    else humanBlanks += 1;
  }
  const sendableKeys = new Set<string>();
  let sendableBlanks = 0;
  for (const row of rows) {
    const key = (row.recipient_key || "").trim();
    if (row.row_status !== "pending") continue;
    if (row.human_only || (key && humanKeys.has(key))) continue;
    if ((row.shape_warnings || []).length > 0) continue;
    if (row.run_id || (key && startedKeys.has(key))) continue;
    if (key) sendableKeys.add(key);
    else sendableBlanks += 1;
  }
  return {
    sendable: sendableKeys.size + sendableBlanks,
    human_only: humanKeys.size + humanBlanks,
  };
}

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
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const record = detail as { message?: unknown; msg?: unknown };
    if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
    if (typeof record.msg === "string" && record.msg.trim()) return record.msg.trim();
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

export async function listCampaigns(
  token: string,
  includeArchived = false,
): Promise<CampaignSummary[]> {
  const suffix = includeArchived ? "?include_archived=true" : "";
  const res = await fetch(`${base()}/api/autonomous/campaigns${suffix}`, {
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
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}?limit=2000`, {
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
  if (!res.ok) {
    let data: { detail?: unknown } = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    const detail = data.detail;
    if (
      res.status === 409 &&
      detail &&
      typeof detail === "object" &&
      !Array.isArray(detail) &&
      (detail as { code?: unknown }).code === "mid_send_edit_confirmation"
    ) {
      const payload = detail as {
        already_sent?: unknown;
        will_get_new?: unknown;
        message?: unknown;
      };
      throw new MidSendEditError(
        typeof payload.already_sent === "number" ? payload.already_sent : 0,
        typeof payload.will_get_new === "number" ? payload.will_get_new : 0,
        typeof payload.message === "string"
          ? payload.message
          : "This campaign has already sent. Confirm to apply the new email to the rest of the list.",
      );
    }
    throw new Error(formatApiDetail(detail) || "Could not save campaign");
  }
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
  sendable?: number;
  human_only?: number;
  warnings?: number;
  shape_warnings?: CampaignShapeWarning[];
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

export async function previewCampaignRows(
  token: string,
  headersList: string[],
  rows: string[][],
  column_map: Record<string, string>,
): Promise<{
  rows: number;
  unique_recipients: number;
  groups_with_conflicts: unknown[];
  pending?: number;
  sendable?: number;
  human_only?: number;
  warnings?: number;
  shape_warnings?: CampaignShapeWarning[];
  suppressed_addresses?: string[];
  preview?: boolean;
  preview_rows?: CampaignRowPayload[];
}> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/preview-rows`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ headers: headersList, rows, column_map }),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not preview rows"));
  return res.json();
}

export async function setCampaignRowHumanOnly(
  token: string,
  campaignId: number,
  rowId: number,
  human_only: boolean,
  reason?: string,
): Promise<CampaignRowPayload> {
  const res = await fetch(
    `${base()}/api/autonomous/campaigns/${campaignId}/rows/${rowId}/human-only`,
    {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ human_only, reason: reason || null }),
    },
  );
  if (!res.ok) throw new Error(await readError(res, "Could not update human-only flag"));
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

export async function sendCampaignNextN(
  token: string,
  id: number,
  n: number,
): Promise<{
  ok: boolean;
  started: number;
  pending: number;
  requested?: number;
  bypassed_daily_cap?: boolean;
  status: CampaignStatus;
  skipped_suppressed_addresses?: string[];
}> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}/send-next`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ n }),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not send the next batch"));
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
    reason?: string;
    daily_cap?: number | null;
    started_today?: number;
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

export type CampaignDeleteBlocked = {
  confirm_required: boolean;
  message: string;
  runs: number;
  offers: number;
};

export class CampaignDeleteError extends Error {
  runs: number;
  offers: number;
  confirmRequired: boolean;

  constructor(block: CampaignDeleteBlocked) {
    super(block.message);
    this.name = "CampaignDeleteError";
    this.runs = block.runs;
    this.offers = block.offers;
    this.confirmRequired = block.confirm_required;
  }
}

function parseDeleteBlock(detail: unknown): CampaignDeleteBlocked | null {
  if (!detail || typeof detail !== "object") return null;
  const record = detail as {
    confirm_required?: unknown;
    message?: unknown;
    runs?: unknown;
    offers?: unknown;
  };
  if (record.confirm_required !== true) return null;
  if (typeof record.message !== "string") return null;
  if (typeof record.runs !== "number" || typeof record.offers !== "number") return null;
  return {
    confirm_required: true,
    message: record.message,
    runs: record.runs,
    offers: record.offers,
  };
}

export async function archiveCampaign(token: string, id: number): Promise<CampaignSummary> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}/archive`, {
    method: "POST",
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not archive campaign"));
  return res.json();
}

export async function unarchiveCampaign(token: string, id: number): Promise<CampaignSummary> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}/unarchive`, {
    method: "POST",
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not unarchive campaign"));
  return res.json();
}

export async function archiveCampaigns(
  token: string,
  ids: number[],
): Promise<CampaignSummary[]> {
  const res = await fetch(`${base()}/api/autonomous/campaigns/archive`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not archive campaigns"));
  return res.json();
}

export async function deleteCampaign(
  token: string,
  id: number,
  confirm = false,
): Promise<void> {
  const suffix = confirm ? "?confirm=true" : "";
  const res = await fetch(`${base()}/api/autonomous/campaigns/${id}${suffix}`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (res.status === 409) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      throw new Error("Could not delete campaign");
    }
    const detail =
      data && typeof data === "object" && "detail" in data
        ? (data as { detail: unknown }).detail
        : data;
    const block = parseDeleteBlock(detail);
    if (block) throw new CampaignDeleteError(block);
    throw new Error(formatApiDetail(detail) || "Could not delete campaign");
  }
  if (!res.ok) throw new Error(await readError(res, "Could not delete campaign"));
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
