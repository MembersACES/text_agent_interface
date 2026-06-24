import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * Proxy GET/PUT for the Base 2 comparison-defaults config.
 * Forwards to the SAME backend the rest of the app uses (getApiBaseUrl, which
 * resolves the dev frontend host -> text-agent-backend-dev). The backend
 * endpoint lives in main.py. Auth: session required here; the backend also
 * checks X-Base2-Admin-Key == BASE2_DEFAULTS_WRITE_SECRET.
 */
async function proxyToBackend(
  request: NextRequest,
  method: "GET" | "PUT",
  body?: unknown,
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminKey = process.env.BASE2_DEFAULTS_WRITE_SECRET;
  if (!adminKey) {
    return NextResponse.json(
      { error: "BASE2_DEFAULTS_WRITE_SECRET not configured" },
      { status: 503 },
    );
  }

  const requestHost = request.headers.get("host") ?? undefined;
  const url = `${getApiBaseUrl(requestHost)}/api/base2-comparison-defaults`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Base2-Admin-Key": adminKey,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text };
  }
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest) {
  try {
    return await proxyToBackend(request, "GET");
  } catch (err: unknown) {
    console.error("[base2-comparison-defaults] GET", err);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await getServerSession(authOptions);
    const updatedBy = session?.user?.email ?? undefined;
    return await proxyToBackend(request, "PUT", { ...body, updatedBy });
  } catch (err: unknown) {
    console.error("[base2-comparison-defaults] PUT", err);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}
