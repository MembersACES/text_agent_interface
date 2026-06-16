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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);

    const backendResponse = await fetch(`${backendUrl}/api/videos/${id}/creation-pack`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: (data as { detail?: string }).detail || "Failed to load pack links" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("creation-pack proxy error:", error);
    return NextResponse.json({ error: "Failed to load creation pack links" }, { status: 500 });
  }
}
