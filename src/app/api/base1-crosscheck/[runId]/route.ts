import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBase1AgentApiUrl } from "@/lib/base1-agent";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
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

    const { runId } = await params;
    const url = `${getBase1AgentApiUrl()}/api/base1-crosscheck/${encodeURIComponent(runId)}`;
    const res = await fetch(url, {
      headers: { "X-Base1-Admin-Key": adminKey },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || "Cross-check not found" },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${runId}-savings-crosscheck.xlsx"`,
      },
    });
  } catch (err: unknown) {
    console.error("[base1-crosscheck] GET", err);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}
