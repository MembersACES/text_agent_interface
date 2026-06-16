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
    const range = req.headers.get("range");

    const backendResponse = await fetch(`${backendUrl}/api/videos/${id}/stream`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(range ? { Range: range } : {}),
      },
      cache: "no-store",
    });

    if (!backendResponse.ok || !backendResponse.body) {
      const text = await backendResponse.text();
      return new NextResponse(text || "Video not available", { status: backendResponse.status });
    }

    const headers = new Headers();
    const passThrough = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "content-disposition",
    ];
    for (const key of passThrough) {
      const val = backendResponse.headers.get(key);
      if (val) headers.set(key, val);
    }
    headers.set("Cache-Control", "private, no-cache");

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers,
    });
  } catch (error) {
    console.error("video stream proxy error:", error);
    return new NextResponse("Failed to load video", { status: 500 });
  }
}
