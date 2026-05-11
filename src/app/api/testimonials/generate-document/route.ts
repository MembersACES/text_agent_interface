import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * POST: Generate testimonial document via backend (n8n webhook).
 * Body: business_name, trading_as, contact_name, position, email, telephone,
 * client_folder_url, solution_type (id e.g. ci_electricity), savings_amount, optional abn,
 * postal_address, site_address. For solar_panel_cleaning include pv_system_size (e.g. "99.6 kW");
 * backend prefixes it into key_outcome_metrics for the subtitle line—no separate template placeholder.
 */
export async function POST(req: NextRequest) {
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

    const backendResponse = await fetch(`${backendUrl}/api/testimonials/generate-document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Failed to generate testimonial" },
        { status: backendResponse.status }
      );
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error generating testimonial document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate testimonial" },
      { status: 500 }
    );
  }
}
