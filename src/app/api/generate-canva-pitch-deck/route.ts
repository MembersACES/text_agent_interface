import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  console.log("🚨 Handler triggered: /api/generate-canva-pitch-deck");

  try {
    console.log("🧠 Attempting to parse request body...");
    const body = await req.json();
    console.log("✅ Parsed body:", JSON.stringify(body, null, 2));

    const {
      business_name,
      business_info,
      selected_templates,
      placeholders,
      canva_token,
    } = body;

    console.log("📦 Extracted body keys:", {
      business_name,
      selected_templates,
      placeholder_keys: Object.keys(placeholders || {}),
    });

    const cookieStore = cookies(); // ❗ DO NOT use `await` here
    const accessToken = canva_token || cookieStore.get("canva_access_token")?.value;

    if (!accessToken) {
      console.log("❌ No access token found");
      return NextResponse.json(
        { error: "No Canva access token found. Please reconnect to Canva." },
        { status: 401 }
      );
    }

    console.log("🔐 Using Canva access token:", accessToken.slice(0, 10) + "...");

    // ✅ Flatten business info
    const businessDetails = business_info?.business_details || {};
    const representativeDetails = business_info?.representative_details || {};

    const flattenedData = {
      business_name,
      abn: businessDetails.abn,
      trading_name: businessDetails.trading_name,
      contact_name: representativeDetails.contact_name,
      ...placeholders,
    };

    console.log("🧾 Final flattened data to send:", JSON.stringify(flattenedData, null, 2));

    const generatedUrls: string[] = [];

    for (const templateId of selected_templates) {
      console.log(`🚀 Starting generation for template: ${templateId}`);

      const res = await fetch(
        `https://api.canva.com/v1/data_autofill/brand_templates/${templateId}/create_design`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: flattenedData }),
        }
      );

      console.log(`📬 Canva responded with status: ${res.status}`);

      let designData: any = {};
      try {
        designData = await res.json();
        console.log(`📄 Canva JSON response for template ${templateId}:`, JSON.stringify(designData, null, 2));
      } catch (parseErr) {
        const raw = await res.text();
        console.error("❌ Failed to parse Canva response as JSON. Raw body:", raw);
        throw new Error("Invalid response from Canva API");
      }

      if (!res.ok) {
        console.error("❌ Design generation failed:", designData);

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
      console.log(`✅ Successfully generated design URL: ${designData.design_url}`);
    }

    console.log("🎉 All templates processed. Returning URLs:", generatedUrls);

    return NextResponse.json({ canva_urls: generatedUrls });
  } catch (err: any) {
    console.error("🔥 Unhandled error in Canva pitch deck route:", err.message);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
