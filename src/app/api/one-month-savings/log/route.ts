import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * API Route: Log One Month Savings Invoice to Google Sheets
 *
 * This endpoint receives invoice data and forwards it to the backend
 * which logs it to Google Sheets via n8n webhook.
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoiceData = await req.json();

    // Validate required fields
    if (!invoiceData.invoice_number || !invoiceData.business_name) {
      return NextResponse.json(
        { error: "Missing required fields: invoice_number and business_name" },
        { status: 400 }
      );
    }

    // Get backend URL
    const backendUrl = getApiBaseUrl();
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";

    // Use API key if token is not available (similar to send-quote-request)
    const authToken = (token && token !== "undefined" && typeof token === "string") ? token : apiKey;

    const fullUrl = `${backendUrl}/api/one-month-savings/log`;
    console.log("🔍 [One Month Savings Log] Calling backend:", fullUrl);
    console.log("🔍 [One Month Savings Log] Backend URL:", backendUrl);
    console.log("🔍 [One Month Savings Log] Invoice number:", invoiceData.invoice_number);

    // Forward to backend
    const backendResponse = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        ...invoiceData,
        user_email: (session.user as any)?.email
      }),
    });

    console.log("🔍 [One Month Savings Log] Backend response status:", backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("❌ [One Month Savings Log] Backend error:", errorText);
      console.error("❌ [One Month Savings Log] Status:", backendResponse.status);
      return NextResponse.json(
        { error: "Failed to log invoice to backend" },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error logging invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log invoice" },
      { status: 500 }
    );
  }
}
