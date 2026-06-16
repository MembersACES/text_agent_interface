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

    const formData = await req.formData();
    const slug = String(formData.get("slug") || "").trim();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const apiKey = process.env.BACKEND_API_KEY || "test-key";

    const outbound = new FormData();
    outbound.append("slug", slug);

    const backendResponse = await fetch(`${backendUrl}/api/videos/restart-pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outbound,
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
        { error: err.detail || err.error || "Restart failed" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Restart failed";
    console.error("restart-pipeline proxy error:", error);
    return NextResponse.json(
      { error: message.includes("fetch") ? "Backend unreachable — is uvicorn running on :8000?" : message },
      { status: 500 }
    );
  }
}
