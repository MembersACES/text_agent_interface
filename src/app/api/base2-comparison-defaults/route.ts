import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Backend base URL for the Base 2 comparison-defaults store (no trailing slash).
 * Defaults to the same Cloud Run host as the autonomous/CRM backend; override
 * with BASE2_DEFAULTS_API_URL if the store lives elsewhere.
 */
function getBase2DefaultsApiUrl(): string {
  return (
    process.env.BASE2_DEFAULTS_API_URL ||
    process.env.AUTONOMOUS_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/+$/, "");
}

async function proxyToBackend(method: "GET" | "PUT", body?: unknown) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminKey = process.env.BASE2_DEFAULTS_WRITE_SECRET;
  if (!adminKey) {
    return NextResponse.json(
      { error: "BASE2_DEFAULTS_WRITE_SECRET not configured" },
      { status: 503 }
    );
  }

  const url = `${getBase2DefaultsApiUrl()}/api/base2-comparison-defaults`;
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

export async function GET() {
  try {
    return proxyToBackend("GET");
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
    return proxyToBackend("PUT", { ...body, updatedBy });
  } catch (err: unknown) {
    console.error("[base2-comparison-defaults] PUT", err);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}
