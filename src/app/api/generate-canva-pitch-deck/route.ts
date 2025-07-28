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
      canva_token,
    } = body;

    const cookieStore = await cookies();
    const accessToken = canva_token || cookieStore.get("canva_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No Canva access token found. Please reconnect to Canva." },
        { status: 401 }
      );
    }

    console.log("🎨 Using Canva token for design generation");

    // ✅ Flatten the business info safely
    const businessDetails = business_info?.business_details || {};
    const representativeDetails = business_info?.representative_details || {};

    const flattenedData = {
      business_name,
      abn: businessDetails.abn,
      trading_name: businessDetails.trading_name,
      contact_name: representativeDetails.contact_name,
      ...placeholders,
    };

    const generatedUrls: string[] = [];

    for (const templateId of selected_templates) {
      console.log(`📦 Creating design from template: ${templateId}`);

      const res = await fetch(
        `https://api.canva.com/v1/data_autofill/brand_templates/${templateId}/create_design`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: flattenedData,
          }),
        }
      );

      let designData: any = {};
      try {
        designData = await res.json();
      } catch (parseErr) {
        const raw = await res.text();
        console.error("❌ Failed to parse Canva response as JSON. Raw body:", raw);
        throw new Error("Invalid response from Canva API");
      }

      if (!res.ok) {
        console.error("Design creation error", designData);

        if (res.status === 401) {
          const response = NextResponse.json(
            { error: "Canva token expired. Please reconnect to Canva." },
            { status: 401 }
          );
          response.cookies.delete("canva_access_token");
          return response;
        }

        throw new Error(designData?.error || "Failed to generate Canva design");
      }

      generatedUrls.push(designData.design_url);
    }

    return NextResponse.json({ canva_urls: generatedUrls });
  } catch (err: any) {
    console.error("Unhandled error:", err.message);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
