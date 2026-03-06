import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";
import { DEFAULT_TESTIMONIAL_SOLUTION_CONTENT } from "@/lib/testimonial-solution-content";

/**
 * GET: List testimonial solution content (merged defaults + overrides from backend).
 * Falls back to frontend defaults if backend fails.
 * Query: solution_type (optional) to get one solution type.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const solutionType = req.nextUrl.searchParams.get("solution_type");
    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken =
      token && token !== "undefined" && typeof token === "string" ? token : apiKey;

    const url = solutionType
      ? `${backendUrl}/api/testimonials/solution-content?solution_type=${encodeURIComponent(solutionType)}`
      : `${backendUrl}/api/testimonials/solution-content`;
    const backendResponse = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (backendResponse.ok) {
      const data = await backendResponse.json();
      return NextResponse.json(data);
    }

    // Fallback to frontend defaults (e.g. backend down or 404)
    if (solutionType) {
      const one = DEFAULT_TESTIMONIAL_SOLUTION_CONTENT.find(
        (c) => c.solution_type === solutionType
      );
      return NextResponse.json(one ? [one] : DEFAULT_TESTIMONIAL_SOLUTION_CONTENT);
    }
    return NextResponse.json(DEFAULT_TESTIMONIAL_SOLUTION_CONTENT);
  } catch (error: any) {
    console.error("Error fetching testimonial solution content:", error);
    return NextResponse.json(DEFAULT_TESTIMONIAL_SOLUTION_CONTENT);
  }
}

/**
 * PUT: Save overrides for one solution type. Body: { solution_type, ...fields }.
 * Proxies to backend.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken =
      token && token !== "undefined" && typeof token === "string" ? token : apiKey;

    const backendResponse = await fetch(`${backendUrl}/api/testimonials/solution-content`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Failed to save" },
        { status: backendResponse.status }
      );
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error saving testimonial solution content:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save" },
      { status: 500 }
    );
  }
}
