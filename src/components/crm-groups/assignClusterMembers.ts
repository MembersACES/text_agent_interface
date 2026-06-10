import { getApiBaseUrl } from "@/lib/utils";

export interface ClusterAssignResult {
  client_id: number;
  ok: boolean;
  error?: string;
}

export async function assignClusterMembers(
  token: string,
  memberIds: number[],
  entityGroupId: number
): Promise<ClusterAssignResult[]> {
  const results: ClusterAssignResult[] = [];
  for (const clientId of memberIds) {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entity_group_id: entityGroupId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        results.push({
          client_id: clientId,
          ok: false,
          error: (data as { detail?: string }).detail || `HTTP ${res.status}`,
        });
      } else {
        results.push({ client_id: clientId, ok: true });
      }
    } catch (e: unknown) {
      results.push({
        client_id: clientId,
        ok: false,
        error: e instanceof Error ? e.message : "Request failed",
      });
    }
  }
  return results;
}

export function failedMemberIds(results: ClusterAssignResult[]): number[] {
  return results.filter((r) => !r.ok).map((r) => r.client_id);
}

export function allSucceeded(results: ClusterAssignResult[]): boolean {
  return results.length > 0 && results.every((r) => r.ok);
}
