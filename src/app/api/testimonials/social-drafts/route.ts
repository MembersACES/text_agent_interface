import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * GET: LinkedIn draft posts from the shared Drive folder, matched to testimonials.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken =
      token && token !== "undefined" && typeof token === "string" ? token : apiKey;

    const backendResponse = await fetch(`${backendUrl}/api/testimonials/social-drafts`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Failed to load LinkedIn drafts" },
        { status: backendResponse.status }
      );
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching LinkedIn drafts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load LinkedIn drafts" },
      { status: 500 }
    );
  }
}
