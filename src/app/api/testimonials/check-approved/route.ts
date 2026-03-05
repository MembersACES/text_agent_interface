import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * API Route: Check if business has an approved testimonial (for soft guard before 1st Month Savings)
 */

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business_name = req.nextUrl.searchParams.get("business_name");
    if (!business_name) {
      return NextResponse.json(
        { error: "Missing required query: business_name" },
        { status: 400 }
      );
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken = token && typeof token === "string" ? token : apiKey;

    const url = `${backendUrl}/api/testimonials/check-approved?business_name=${encodeURIComponent(business_name)}`;
    const backendResponse = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!backendResponse.ok) {
      const err = await backendResponse.text();
      return NextResponse.json(
        { has_approved: false, count: 0, error: err },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error checking testimonial approved:", error);
    return NextResponse.json(
      { has_approved: false, count: 0, error: error.message },
      { status: 500 }
    );
  }
}
