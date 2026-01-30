import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * API Route: Get One Month Savings Invoice History
 *
 * This endpoint fetches invoice history for a specific business
 * from the backend, which retrieves it from Google Sheets via n8n webhook.
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { business_name } = await req.json();

    if (!business_name) {
      return NextResponse.json(
        { error: "Missing required field: business_name" },
        { status: 400 }
      );
    }

    // Get backend URL from environment variable (should be set in deployment)
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
                       process.env.BACKEND_API_URL ||
                       'https://text-agent-backend-dev-672026052958.australia-southeast2.run.app'; // Fallback
    
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";

    // Use API key if token is not available (similar to send-quote-request)
    const authToken = (token && token !== "undefined" && typeof token === "string") ? token : apiKey;

    const fullUrl = `${backendUrl}/api/one-month-savings/history`;
    console.log("🔍 [One Month Savings History] Calling backend:", fullUrl);
    console.log("🔍 [One Month Savings History] Backend URL:", backendUrl);
    console.log("🔍 [One Month Savings History] NEXT_PUBLIC_API_BASE_URL:", process.env.NEXT_PUBLIC_API_BASE_URL || "NOT SET");
    console.log("🔍 [One Month Savings History] BACKEND_API_URL:", process.env.BACKEND_API_URL || "NOT SET");
    console.log("🔍 [One Month Savings History] Business name:", business_name);
    console.log("🔍 [One Month Savings History] Auth token type:", token ? "Google Token" : "API Key");

    // Forward to backend
    const backendResponse = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ 
        business_name,
        user_email: (session.user as any)?.email 
      }),
    });

    console.log("🔍 [One Month Savings History] Backend response status:", backendResponse.status);
    console.log("🔍 [One Month Savings History] Backend response ok:", backendResponse.ok);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("❌ [One Month Savings History] Backend error:", errorText);
      console.error("❌ [One Month Savings History] Status:", backendResponse.status);
      console.error("❌ [One Month Savings History] Status text:", backendResponse.statusText);
      return NextResponse.json({
        invoices: [],
        message: "Could not fetch invoice history",
      });
    }

    const result = await backendResponse.json();
    console.log("🔍 [One Month Savings History] Backend response data:", JSON.stringify(result, null, 2));
    console.log("🔍 [One Month Savings History] Invoices count:", result.invoices?.length || 0);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching invoice history:", error);
    return NextResponse.json(
      { invoices: [], error: error.message || "Failed to fetch history" },
      { status: 500 }
    );
  }
}

