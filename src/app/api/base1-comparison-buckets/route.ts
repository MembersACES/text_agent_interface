import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBase1AgentApiUrl } from "@/lib/base1-agent";

async function proxyToTemplate(
  request: NextRequest,
  method: "GET" | "PUT",
  body?: unknown
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminKey = process.env.BASE1_BUCKETS_WRITE_SECRET;
  if (!adminKey) {
    return NextResponse.json(
      { error: "BASE1_BUCKETS_WRITE_SECRET not configured" },
      { status: 503 }
    );
  }

  const url = `${getBase1AgentApiUrl()}/api/base1-comparison-buckets`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Base1-Admin-Key": adminKey,
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
    return proxyToTemplate({} as NextRequest, "GET");
  } catch (err: unknown) {
    console.error("[base1-comparison-buckets] GET", err);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await getServerSession(authOptions);
    const updatedBy = session?.user?.email ?? undefined;
    return proxyToTemplate(request, "PUT", { ...body, updatedBy });
  } catch (err: unknown) {
    console.error("[base1-comparison-buckets] PUT", err);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}
