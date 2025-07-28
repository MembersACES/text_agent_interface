import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const cookieStore = await cookies(); 
  const codeVerifier = cookieStore.get("canva_code_verifier")?.value; 
  const expectedState = cookieStore.get("canva_state")?.value; 

  if (!code || !codeVerifier || returnedState !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state or code" }, { status: 400 });
  }

  const clientId = process.env.CANVA_CLIENT_ID!;
  const clientSecret = process.env.CANVA_CLIENT_SECRET!;
  const redirectUri = process.env.CANVA_REDIRECT_URI!;

  console.log("🔍 Debug env vars:", {
    clientId: clientId || "MISSING",
    clientSecret: clientSecret ? "PRESENT" : "MISSING",
    redirectUri: redirectUri || "MISSING",
    allEnv: Object.keys(process.env).filter(key => key.includes('CANVA')),
    allEnvKeys: Object.keys(process.env).sort(),
    nodeEnv: process.env.NODE_ENV,
    totalEnvCount: Object.keys(process.env).length
  });

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  
  const tokenRes = await fetch("https://api.canva.com/oauth/token", {
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

  return NextResponse.redirect("/");
}
