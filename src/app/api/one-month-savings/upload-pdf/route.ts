import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * API Route: Upload Invoice PDF to Google Drive
 *
 * This endpoint uploads the generated invoice PDF to the client's Google Drive folder
 * in a "1st Month Savings Invoice" subfolder.
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestData = await req.json();

    // Validate required fields
    if (!requestData.pdf_base64 || !requestData.filename) {
      return NextResponse.json(
        { error: "Missing required fields: pdf_base64 and filename" },
        { status: 400 }
      );
    }

    // Get backend URL using utility function (handles local dev correctly)
    const backendUrl = getApiBaseUrl();

    // For Drive API, we need the access token (not ID token)
    // ID token is for authentication, access token is for API calls
    const accessToken = (session as any)?.accessToken;
    const refreshToken = (session as any)?.refreshToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";

    // Use access token for Drive API, fall back to API key if not available
    const authToken = (accessToken && accessToken !== "undefined" && typeof accessToken === "string") 
      ? accessToken 
      : apiKey;
    
    console.log("🔍 [One Month Savings Upload PDF] Using access token:", !!accessToken);
    console.log("🔍 [One Month Savings Upload PDF] Has refresh token:", !!refreshToken);

    const fullUrl = `${backendUrl}/api/one-month-savings/upload-pdf`;
    console.log("🔍 [One Month Savings Upload PDF] Calling backend:", fullUrl);

    // Forward to backend
    const backendResponse = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        ...requestData,
        user_email: (session.user as any)?.email,
        refresh_token: refreshToken, // Send refresh token for credential construction
      }),
    });

    console.log("🔍 [One Month Savings Upload PDF] Backend response status:", backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("❌ [One Month Savings Upload PDF] Backend error:", errorText);
      return NextResponse.json(
        { error: "Failed to upload PDF to Google Drive" },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error uploading PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload PDF" },
      { status: 500 }
    );
  }
}

