import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAutonomousApiBaseUrl } from "@/lib/utils";

function resolveAutonomousBaseUrl(req: NextRequest): string {
  const host = req.headers.get("host") ?? undefined;
  return getAutonomousApiBaseUrl(host).replace(/\/$/, "");
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
    const targetUrl = `${autonomousBase}/run/run/${parsed}`;

    const upstreamRes = await fetch(targetUrl, {
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

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error: `Runner returned ${upstreamRes.status}`,
          autonomous_response: payload,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(payload ?? { ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to trigger run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
