import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * GET: Recent testimonials for a given testimonial solution type.
 * Query: solution_type (required), limit? (default 5)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const solutionType = req.nextUrl.searchParams.get("solution_type");
    const limit = req.nextUrl.searchParams.get("limit") || "5";
    if (!solutionType) {
      return NextResponse.json({ error: "solution_type is required" }, { status: 400 });
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken =
      token && token !== "undefined" && typeof token === "string" ? token : apiKey;

    const url = `${backendUrl}/api/testimonials/examples?solution_type=${encodeURIComponent(
      solutionType
    )}&limit=${encodeURIComponent(limit)}`;
    const backendResponse = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Failed to load examples" },
        { status: backendResponse.status }
      );
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching testimonial examples:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load examples" },
      { status: 500 }
    );
  }
}

