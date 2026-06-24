import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to the RSL voice-agent backend (mcp_server_rsl) intake.
 *
 * Holds MCP_API_TOKEN server-side so it is NEVER exposed to the browser. The
 * base-2 page calls this same-origin route after running the RSL comparison; we
 * forward the body to mcp_server_rsl's POST /api/intake/base2-followup with the
 * bearer token attached here.
 *
 * Required server env:
 *   - MCP_SERVER_RSL_URL : base URL of the mcp_server_rsl service (no trailing slash needed)
 *   - MCP_API_TOKEN      : bearer token the mcp_server_rsl auth middleware expects
 */

export const runtime = "nodejs";

function rslBaseUrl(): string | null {
  const url = process.env.MCP_SERVER_RSL_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/$/, "") : null;
}

export async function POST(req: NextRequest) {
  // Gate: only authenticated UI callers (the page always sends its bearer).
  // The MCP token itself stays server-side; this just blocks anonymous hits.
  const incomingAuth = req.headers.get("authorization");
  if (!incomingAuth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const base = rslBaseUrl();
  const token = process.env.MCP_API_TOKEN?.trim();
  if (!base) {
    return NextResponse.json(
      { error: "MCP_SERVER_RSL_URL is not configured" },
      { status: 500 },
    );
  }
  if (!token) {
    return NextResponse.json(
      { error: "MCP_API_TOKEN is not configured" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${base}/api/intake/base2-followup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "RSL intake request failed", detail: String(e) },
      { status: 502 },
    );
  }
}
