import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * API Route: Get Next Sequential Invoice Number
 *
 * This endpoint forwards the request to the backend
 * which generates the next sequential invoice number.
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { business_name } = await req.json();

    // Get backend URL from environment variable (should be set in deployment)
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
                       process.env.BACKEND_API_URL ||
                       'https://text-agent-backend-dev-672026052958.australia-southeast2.run.app'; // Fallback
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";

    // Use API key if token is not available (similar to send-quote-request)
    const authToken = (token && token !== "undefined" && typeof token === "string") ? token : apiKey;

    const fullUrl = `${backendUrl}/api/one-month-savings/next-invoice-number`;
    console.log("🔍 [One Month Savings Next Invoice] Calling backend:", fullUrl);
    console.log("🔍 [One Month Savings Next Invoice] Backend URL:", backendUrl);

    // Forward to backend
    const backendResponse = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ 
        business_name: business_name || null,
        user_email: (session.user as any)?.email 
      }),
    });

    console.log("🔍 [One Month Savings Next Invoice] Backend response status:", backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("❌ [One Month Savings Next Invoice] Backend error:", errorText);
      console.error("❌ [One Month Savings Next Invoice] Status:", backendResponse.status);
      // Fallback to random number generation
      const prefix = "RA";
      const number = Math.floor(Math.random() * 9000) + 1000;
      return NextResponse.json({
        invoice_number: `${prefix}${number}`,
        fallback: true
      });
    }

    const result = await backendResponse.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error getting next invoice number:", error);
    // Fallback to random number generation
    const prefix = "RA";
    const number = Math.floor(Math.random() * 9000) + 1000;
    return NextResponse.json({
      invoice_number: `${prefix}${number}`,
      fallback: true
    });
  }
}

