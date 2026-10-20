import { getApiBaseUrl, getAutonomousApiBaseUrl } from "@/lib/utils";

export interface SearchClient {
  id: number;
  business_name: string;
  stage?: string;
  owner_email?: string | null;
}

export interface SearchOffer {
  id: number;
  client_id?: number | null;
  business_name?: string | null;
  utility_type?: string | null;
  utility_type_identifier?: string | null;
  utility_display?: string | null;
  identifier?: string | null;
  status?: string;
}

export interface SearchResult {
  clients: SearchClient[];
  offers: SearchOffer[];
}

export interface TaskItem {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: string;
  assigned_to: string;
  assigned_by?: string | null;
  business_id?: number | null;
  client_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TasksSummary {
  total_tasks: number;
  by_status: Record<string, number>;
  overdue: number;
  due_today: number;
}

export interface PipelineSummary {
  total_clients: number;
  by_stage: { stage: string; count: number }[];
  won_count: number;
  lost_count: number;
}

async function fetchWithAuth<T>(
  url: string,
  authToken: string,
  requestHost?: string
): Promise<{ data: T | null; error?: string }> {
  const base = getApiBaseUrl(requestHost);
  const fullUrl = url.startsWith("http") ? url : `${base}${url}`;
  try {
    const res = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return { data: null, error: res.status === 401 ? "Unauthorized" : text || res.statusText };
    }
    const data = (await res.json()) as T;
    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return { data: null, error: message };
  }
}

export async function searchClients(
  q: string,
  authToken: string,
  limit = 10,
  requestHost?: string
): Promise<{ data: SearchResult | null; error?: string }> {
  const params = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  return fetchWithAuth<SearchResult>(
    `/api/search?${params.toString()}`,
    authToken,
    requestHost
  );
}

export async function getMyTasks(
  authToken: string,
  requestHost?: string
): Promise<{ data: TaskItem[] | null; error?: string }> {
  return fetchWithAuth<TaskItem[]>("/api/tasks/my", authToken, requestHost);
}

export async function getClientTasks(
  clientId: number,
  authToken: string,
  requestHost?: string
): Promise<{ data: TaskItem[] | null; error?: string }> {
  return fetchWithAuth<TaskItem[]>(
    `/api/clients/${clientId}/tasks`,
    authToken,
    requestHost
  );
}

export async function getTasksSummary(
  authToken: string,
  requestHost?: string
): Promise<{ data: TasksSummary | null; error?: string }> {
  return fetchWithAuth<TasksSummary>(
    "/api/reports/tasks/summary",
    authToken,
    requestHost
  );
}

export async function getPipelineSummary(
  authToken: string,
  requestHost?: string
): Promise<{ data: PipelineSummary | null; error?: string }> {
  return fetchWithAuth<PipelineSummary>(
    "/api/reports/pipeline/summary",
    authToken,
    requestHost
  );
}

export async function getClientName(
  clientId: number,
  authToken: string,
  requestHost?: string
): Promise<string | null> {
  const { data } = await fetchWithAuth<{ business_name?: string }>(
    `/api/clients/${clientId}`,
    authToken,
    requestHost
  );
  return data?.business_name ?? null;
}

export type UnsignedUtility =
  | "gas"
  | "electricity"
  | "waste"
  | "oil"
  | "water"
  | "cleaning"
  | "all";

export interface UnsignedPipelineTotals {
  utility: string;
  summary: string | null;
  site_count: number;
  quoteable_site_count: number;
  thin_site_count: number;
  invoice_count: number;
  pdf_count: number;
  missing_pdf_sites: number;
}

export async function getUnsignedPipelineSummary(
  utility: UnsignedUtility,
  authToken: string,
  requestHost?: string
): Promise<{ data: UnsignedPipelineTotals | null; error?: string }> {
  const params = new URLSearchParams({
    utility,
    unsigned_only: "true",
    pdfs: "all",
    include_base1: "true",
    segment: "all",
  });
  const { data, error } = await fetchWithAuth<{
    summary?: string;
    totals?: {
      site_count?: number;
      quoteable_site_count?: number;
      thin_site_count?: number;
      invoice_count?: number;
      pdf_count?: number;
      missing_pdf_sites?: number;
    };
  }>(`/api/unsigned-pipeline?${params.toString()}`, authToken, requestHost);
  if (error || !data) return { data: null, error };
  const totals = data.totals ?? {};
  return {
    data: {
      utility,
      summary: data.summary ?? null,
      site_count: totals.site_count ?? 0,
      quoteable_site_count: totals.quoteable_site_count ?? 0,
      thin_site_count: totals.thin_site_count ?? 0,
      invoice_count: totals.invoice_count ?? 0,
      pdf_count: totals.pdf_count ?? 0,
      missing_pdf_sites: totals.missing_pdf_sites ?? 0,
    },
  };
}

export interface AutonomousQueueSlice {
  group: string;
  total: number;
  ack_draft_pending_count: number;
  names: string[];
}

export async function getAutonomousQueueSummary(
  authToken: string,
  requestHost?: string
): Promise<{ data: AutonomousQueueSlice[] | null; error?: string }> {
  const base = getAutonomousApiBaseUrl(requestHost);
  const groups = ["running", "errored"];
  try {
    const slices = await Promise.all(
      groups.map(async (group) => {
        const params = new URLSearchParams({
          limit: "5",
          offset: "0",
          run_status_group: group,
        });
        const res = await fetch(
          `${base}/api/autonomous/sequences/runs?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(res.status === 401 ? "Unauthorized" : text || res.statusText);
        }
        const body = (await res.json()) as {
          items?: { business_name?: string | null; sequence_type?: string }[];
          total?: number;
          ack_draft_pending_count?: number;
        };
        const items = body.items ?? [];
        return {
          group,
          total: typeof body.total === "number" ? body.total : items.length,
          ack_draft_pending_count: body.ack_draft_pending_count ?? 0,
          names: items
            .map((item) => item.business_name)
            .filter((name): name is string => Boolean(name))
            .slice(0, 3),
        };
      })
    );
    return { data: slices };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return { data: null, error: message };
  }
}
