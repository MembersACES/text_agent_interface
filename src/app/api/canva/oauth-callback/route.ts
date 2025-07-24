import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const storedCookies = cookies();
  const codeVerifier = storedCookies.get("canva_code_verifier")?.value;
  const expectedState = storedCookies.get("canva_state")?.value;

  if (!code || !codeVerifier || returnedState !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state or code" }, { status: 400 });
  }

  const clientId = process.env.CANVA_CLIENT_ID!;
  const clientSecret = process.env.CANVA_CLIENT_SECRET!;
  const redirectUri = process.env.CANVA_REDIRECT_URI!;

  const tokenRes = await fetch("https://api.canva.com/auth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("Token exchange failed:", errText);
    return NextResponse.json({ error: "Failed to exchange code for token" }, { status: 500 });
  }

  const tokenData = await tokenRes.json();
  console.log("Canva tokens:", tokenData);

  // Store access_token & refresh_token securely (e.g., DB or encrypted cookie)
  return NextResponse.redirect("/"); // or wherever you want the user to land
}
