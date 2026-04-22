import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAutonomousApiBaseUrl } from "@/lib/utils";

function resolveAutonomousBaseUrl(req: NextRequest): string {
  const host = req.headers.get("host") ?? undefined;
  return getAutonomousApiBaseUrl(host).replace(/\/$/, "");
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
    const autonomousBase = resolveAutonomousBaseUrl(req);
    const upstream = await postWithFallback(
      autonomousBase,
      [`/run/run/${parsed}`, `/api/run/run/${parsed}`],
      apiKey,
    );

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: `Autonomous service returned ${upstream.status}`,
          upstream_url: upstream.url,
          autonomous_response: upstream.payload,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(upstream.payload ?? { ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to trigger run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
