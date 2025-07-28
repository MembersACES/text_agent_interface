import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      business_name,
      business_info,
      selected_templates,
      placeholders,
      canva_token, // <-- from frontend
    } = body;

    // ✅ Prefer token from request body; fallback to cookie
    const cookieStore = await cookies();
    const accessToken = canva_token || cookieStore.get("canva_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No Canva access token found. Please reconnect to Canva." },
        { status: 401 }
      );
    }

    console.log("🎨 Using Canva token for design generation");

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

    let designData: any = {};
    try {
      designData = await designRes.json();
    } catch (parseErr) {
      const raw = await designRes.text();
      console.error("❌ Failed to parse Canva response as JSON. Raw body:", raw);
      throw new Error("Invalid response from Canva API");
    }

    if (!designRes.ok) {
      console.error("Design creation error", designData);

      if (designRes.status === 401) {
        const response = NextResponse.json(
          { error: "Canva token expired. Please reconnect to Canva." },
          { status: 401 }
        );
        response.cookies.delete("canva_access_token");
        return response;
      }

      throw new Error(designData?.error || "Failed to generate Canva design");
    }

    return NextResponse.json({ canva_url: designData.design_url });
  } catch (err: any) {
    console.error("Unhandled error:", err.message);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
