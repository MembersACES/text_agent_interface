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
): Promise<{ ok: boolean; status: number; url: string; payload: unknown }> {
  const root = baseUrl.replace(/\/$/, "");
  const url = `${root}${path.startsWith("/") ? path : `/${path}`}`;
  const upstreamRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
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
