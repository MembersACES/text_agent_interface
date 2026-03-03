import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

const ALLOWED_STATUSES = ["Generated", "Sent", "Paid"] as const;

/**
 * API Route: Update 1st Month Savings invoice status (Generated / Sent / Paid).
 * Forwards to backend which updates the Google Sheet.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { business_name, invoice_number, status } = body;

    if (!business_name || !invoice_number || !status) {
      return NextResponse.json(
        { error: "business_name, invoice_number and status are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const backendUrl = getApiBaseUrl();
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken =
      token && token !== "undefined" && typeof token === "string" ? token : apiKey;

    const fullUrl = `${backendUrl}/api/one-month-savings/status`;
    const backendResponse = await fetch(fullUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        business_name,
        invoice_number,
        status,
        user_email: (session.user as any)?.email,
      }),
    });

    if (!backendResponse.ok) {
      const errText = await backendResponse.text();
      return NextResponse.json(
        { error: errText || "Failed to update status" },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error updating invoice status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update status" },
      { status: 500 }
    );
  }
}
