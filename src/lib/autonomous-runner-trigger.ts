/**
 * Server-side calls to autonomous_agent_backend (POST /run, /run/run/{id}, /run/step/{id}).
 * Auth must match that service's env `BACKEND_API_KEY` (see autonomous_agent_backend _verify_token).
 */

export function getAutonomousRunnerTriggerBearer(): string | null {
  const dedicated = process.env.AUTONOMOUS_RUNNER_API_KEY?.trim();
  if (dedicated) return dedicated;
  const shared = process.env.BACKEND_API_KEY?.trim();
  if (shared) return shared;
  if (process.env.NODE_ENV === "development") return "test-key";
  return null;
}

export async function postAutonomousRunner(
  baseUrl: string,
  path: string,
  bearer: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; url: string; payload: unknown }> {
  const root = baseUrl.replace(/\/$/, "");
  const url = `${root}${path.startsWith("/") ? path : `/${path}`}`;
  const upstreamRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await upstreamRes.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  return { ok: upstreamRes.ok, status: upstreamRes.status, url, payload };
}

export function isSuccessfulWorkerDispatch(payload: unknown): boolean {
  return Array.isArray(payload) && payload.length > 0;
}

export function workerFailureMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const rec = payload as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.trim()) return rec.message;
    if (typeof rec.error === "string" && rec.error.trim()) return rec.error;
    const diag = rec.diagnostics;
    if (diag && typeof diag === "object") {
      const reason = (diag as Record<string, unknown>).reason;
      if (typeof reason === "string" && reason.trim()) return reason;
    }
  }
  return fallback;
}
