import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const token =
      (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
      (session as { id_token?: string; accessToken?: string } | null)?.accessToken;
    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;
    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);

    const backendResponse = await fetch(`${backendUrl}/api/videos/${id}/qa-html`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!backendResponse.ok) {
      const text = await backendResponse.text();
      return new NextResponse(text || "QA review not available", { status: backendResponse.status });
    }

    const html = await backendResponse.text();
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("qa-html proxy error:", error);
    return new NextResponse("Failed to load QA review", { status: 500 });
  }
}
