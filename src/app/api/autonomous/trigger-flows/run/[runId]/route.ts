import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAutonomousRunnerApiBaseUrl } from "@/lib/utils";

function resolveRunnerBaseUrl(): string | null {
  return getAutonomousRunnerApiBaseUrl();
}

async function postWithFallback(
  baseUrl: string,
  paths: string[],
  apiKey: string,
): Promise<{ ok: boolean; status: number; url: string; payload: unknown }> {
  let last: { ok: boolean; status: number; url: string; payload: unknown } | null = null;
  for (const p of paths) {
    const url = `${baseUrl}${p}`;
    const upstreamRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    const result = { ok: upstreamRes.ok, status: upstreamRes.status, url, payload };
    if (upstreamRes.ok) return result;
    last = result;
  }
  return last ?? { ok: false, status: 500, url: `${baseUrl}${paths[0] ?? ""}`, payload: null };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ runId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runId } = await ctx.params;
    const parsed = Number(runId);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
    }

    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const runnerBase = resolveRunnerBaseUrl();
    if (!runnerBase) {
      return NextResponse.json(
        {
          error:
            "Autonomous runner base URL is not configured. Set AUTONOMOUS_RUNNER_API_URL (recommended), AUTONOMOUS_API_URL, or NEXT_PUBLIC_AUTONOMOUS_API_BASE_URL to the service that exposes POST /run/run/{id} (this must not be the CRM monolith).",
        },
        { status: 503 },
      );
    }
    const upstream = await postWithFallback(runnerBase, [`/run/run/${parsed}`, `/api/run/run/${parsed}`], apiKey);

    if (!upstream.ok) {
      console.error("[autonomous-trigger-run] upstream failure", {
        run_id: parsed,
        runner_base: runnerBase,
        upstream_url: upstream.url,
        status: upstream.status,
        payload: upstream.payload,
      });
      return NextResponse.json(
        {
          error: `Upstream returned ${upstream.status}`,
          upstream_url: upstream.url,
          autonomous_response: upstream.payload,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(upstream.payload ?? { ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to trigger run";
    console.error("[autonomous-trigger-run] unexpected error", {
      message,
      error,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
