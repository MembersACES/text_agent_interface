import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const apiKey = process.env.BACKEND_API_KEY || "test-key";

    const backendResponse = await fetch(`${backendUrl}/api/videos/dev/regenerate-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const text = await backendResponse.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }

    if (!backendResponse.ok) {
      const err = data as { detail?: string; error?: string };
      return NextResponse.json(
        { error: err.detail || err.error || "Regenerate-all failed" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Regenerate-all failed";
    console.error("dev/regenerate-all proxy error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
