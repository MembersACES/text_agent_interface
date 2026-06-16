import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_VIDEO !== "true") {
    return NextResponse.json({ error: "Video creation is disabled" }, { status: 403 });
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as { id_token?: string; accessToken?: string }).id_token
      ?? (session as { id_token?: string; accessToken?: string }).accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken = token && typeof token === "string" ? token : apiKey;

    const backendResponse = await fetch(`${backendUrl}/api/videos/custom/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
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
        { error: err.detail || err.error || "Start failed" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Start failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
