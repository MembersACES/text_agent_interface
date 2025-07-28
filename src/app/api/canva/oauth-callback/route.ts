import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const cookieStore = await cookies(); 
  const codeVerifier = cookieStore.get("canva_code_verifier")?.value; 
  const expectedState = cookieStore.get("canva_state")?.value; 

  // ⭐ Add this debugging
  console.log("🔍 Cookie/State Debug:", {
    code: code ? "PRESENT" : "MISSING",
    codeVerifier: codeVerifier ? "PRESENT" : "MISSING", 
    returnedState: returnedState || "MISSING",
    expectedState: expectedState || "MISSING",
    stateMatch: returnedState === expectedState
  });

  if (!code || !codeVerifier || returnedState !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state or code" }, { status: 400 });
  }

  const clientId = process.env.CANVA_CLIENT_ID!;
  const clientSecret = process.env.CANVA_CLIENT_SECRET!;
  const redirectUri = process.env.CANVA_REDIRECT_URI!;

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  // ⭐ Log the exact request
  console.log("📤 Exact token request:", {
    url: "https://api.canva.com/rest/v1/oauth/token",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    bodyParams: {
      grant_type: "authorization_code",
      code: code.substring(0, 50) + "...", // Only log first 50 chars
      code_verifier: codeVerifier.substring(0, 20) + "...",
      client_id: clientId,
      client_secret: clientSecret.substring(0, 5) + "...", // Only first 5 chars
      redirect_uri: redirectUri,
    }
  });

  const tokenRes = await fetch("https://api.canva.com/rest/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenBody,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    const cleanError = errText.replace(/^.*?{/, '{');
    
    console.error("❌ Token exchange failed:", {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      responseHeaders: Object.fromEntries(tokenRes.headers.entries()),
      body: cleanError
    });
    
    return NextResponse.json({ 
      error: "Failed to exchange code for token",
      details: cleanError,
      status: tokenRes.status 
    }, { status: 500 });
  }

  const tokenData = await tokenRes.json();
  console.log("✅ Canva tokens:", tokenData);

  const baseUrl = new URL(req.url).origin;
  return NextResponse.redirect(`${baseUrl}/`);
}