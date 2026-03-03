import { getApiBaseUrl } from "@/lib/utils";

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
