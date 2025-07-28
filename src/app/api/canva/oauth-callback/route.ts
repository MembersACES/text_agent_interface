import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const cookieStore = await cookies(); // ✅ correct usage
  const codeVerifier = cookieStore.get("canva_code_verifier")?.value; 
  const expectedState = cookieStore.get("canva_state")?.value; 

  if (!code || !codeVerifier || returnedState !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state or code" }, { status: 400 });
  }

  const clientId = process.env.CANVA_CLIENT_ID!;
  const redirectUri = process.env.CANVA_REDIRECT_URI!;

  console.log("🔍 Debug env vars:", {
    clientId: clientId || "MISSING",
    redirectUri: redirectUri || "MISSING",
    allEnv: Object.keys(process.env).filter(key => key.includes('CANVA')),
    // Add these lines:
    allEnvKeys: Object.keys(process.env).sort(),
    nodeEnv: process.env.NODE_ENV,
    totalEnvCount: Object.keys(process.env).length
  });

  const tokenRes = await fetch("https://api.canva.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      client_id: clientId,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("❌ Token exchange failed:", {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      headers: Object.fromEntries(tokenRes.headers.entries()),
      body: errText
    });
    
    // Try to parse as JSON if possible
    try {
      const errJson = JSON.parse(errText);
      console.error("❌ Parsed error:", errJson);
    } catch {
      console.error("❌ Raw error text:", errText);
    }
    
    return NextResponse.json({ 
      error: "Failed to exchange code for token",
      details: errText,
      status: tokenRes.status 
    }, { status: 500 });
  }

  const tokenData = await tokenRes.json();
  console.log("✅ Canva tokens:", tokenData);

  // TODO: Store securely if needed

  return NextResponse.redirect("/");
}
