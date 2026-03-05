import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * API Route: Update testimonial (status and/or invoice_number)
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const testimonialId = parseInt(id, 10);
    if (Number.isNaN(testimonialId)) {
      return NextResponse.json({ error: "Invalid testimonial id" }, { status: 400 });
    }

    const body = await req.json();
    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken = token && typeof token === "string" ? token : apiKey;

    const backendResponse = await fetch(`${backendUrl}/api/testimonials/${testimonialId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const err = await backendResponse.text();
      return NextResponse.json(
        { error: err || "Update failed" },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error updating testimonial:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update testimonial" },
      { status: 500 }
    );
  }
}
