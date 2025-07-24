import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      code,
      code_verifier,
      business_name,
      business_info,
      selected_templates,
      placeholders,
    } = await req.json();

    if (!code || !code_verifier) {
      return NextResponse.json({ error: "Missing Canva auth code" }, { status: 400 });
    }

    const tokenRes = await fetch("https://api.canva.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: process.env.CANVA_CLIENT_ID!,
        client_secret: process.env.CANVA_CLIENT_SECRET!,
        redirect_uri: process.env.CANVA_REDIRECT_URI!,
        code_verifier,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token error", tokenData);
      throw new Error(tokenData?.error_description || "Failed to fetch Canva token");
    }

    const accessToken = tokenData.access_token;
    const templateId = selected_templates[0];

    const designRes = await fetch(
      `https://api.canva.com/v1/data_autofill/brand_templates/${templateId}/create_design`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            business_name,
            ...business_info,
            ...placeholders,
          },
          pages: selected_templates,
        }),
      }
    );

    const designData = await designRes.json();
    if (!designRes.ok) {
      console.error("Design creation error", designData);
      throw new Error(designData?.error || "Failed to generate Canva design");
    }

    return NextResponse.json({ canva_url: designData.design_url });
  } catch (err: any) {
    console.error("Unhandled error:", err.message);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
