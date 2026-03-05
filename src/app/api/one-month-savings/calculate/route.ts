import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * API Route: Calculate 1-month savings from Member ACES Data sheet.
 * Forwards to backend with identifier, utility_type, agreement_start_month.
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { identifier, utility_type, agreement_start_month, business_name } = body;

    if (!identifier || !utility_type || !agreement_start_month) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: identifier, utility_type, agreement_start_month" },
        { status: 400 }
      );
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken =
      token && token !== "undefined" && typeof token === "string" ? token : apiKey;

    const fullUrl = `${backendUrl}/api/one-month-savings/calculate`;
    const backendResponse = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        identifier,
        utility_type,
        agreement_start_month,
        business_name: business_name || undefined,
      }),
    });

    const result = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      return NextResponse.json(
        { success: false, error: result.detail || result.error || "Calculation failed" },
        { status: backendResponse.status }
      );
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("One month savings calculate error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate" },
      { status: 500 }
    );
  }
}
