import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const clientId = process.env.CANVA_CLIENT_ID!;
  const redirectUri = process.env.CANVA_REDIRECT_URI!;
  
  // Add this debug logging
  console.log("🚀 OAuth Start Debug:", {
    clientId: clientId || "MISSING",
    redirectUri: redirectUri || "MISSING",
    allCanvaVars: Object.keys(process.env).filter(key => key.includes('CANVA')),
    nodeEnv: process.env.NODE_ENV,
    totalEnvCount: Object.keys(process.env).length
  });

  const scopes = "";


  const codeVerifier = crypto.randomBytes(64).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const state = crypto.randomBytes(32).toString("base64url");

  const authUrl = new URL("https://www.canva.com/api/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("canva_code_verifier", codeVerifier, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV !== "development",
  });
  res.cookies.set("canva_state", state, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV !== "development",
  });

  return res;
}
