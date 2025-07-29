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

    const cookieStore = await cookies();
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

    console.log("🧾 Raw flattened data:", JSON.stringify(flattenedData, null, 2));

    // 🔍 DEBUG: Check template fields first
    console.log("🔍 Starting template debug...");
    for (const templateId of selected_templates) {
      await debugCanvaTemplate(accessToken, templateId);
    }

    // 🔧 Convert to Canva's expected format
    const canvaFormattedData: Record<string, { type: string; text: string }> = {};
    for (const [key, value] of Object.entries(flattenedData)) {
      if (value !== undefined && value !== null && value !== "") {
        canvaFormattedData[key] = {
          type: "text",
          text: String(value)
        };
      }
    }

    console.log("🧾 Canva-formatted data to send:", JSON.stringify(canvaFormattedData, null, 2));

    const generatedUrls = [];

    for (const templateId of selected_templates) {
      console.log(`🚀 Starting generation for template: ${templateId}`);

      // 🔧 Use correct endpoint and request structure
      const requestBody = {
        brand_template_id: templateId,
        data: canvaFormattedData,
        title: `${business_name} - Pitch Deck` // Optional title
      };

      console.log(`📤 Request body for template ${templateId}:`, JSON.stringify(requestBody, null, 2));

      const res = await fetch(
        "https://api.canva.com/rest/v1/autofills", // ✅ Correct endpoint
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody), // ✅ Correct structure
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

        // 🔧 Better error handling for 403 and other errors
        if (res.status === 403) {
          console.error("❌ Permission denied - check template access and Enterprise subscription");
          throw new Error(`Access denied to template ${templateId}. Ensure you have Enterprise access and template permissions.`);
        }

        throw new Error(designData?.message || designData?.error || "Failed to generate Canva design");
      }

      // 🔧 Handle asynchronous job response
      const jobId = designData.job?.id;
      const jobStatus = designData.job?.status;

      console.log(`📋 Job created with ID: ${jobId}, Status: ${jobStatus}`);

      if (jobStatus === "success" && designData.job.result) {
        // Job completed immediately
        const designUrl = designData.job.result.design.urls.view_url || designData.job.result.design.url;
        generatedUrls.push(designUrl);
        console.log(`✅ Design ready immediately: ${designUrl}`);
      } else if (jobStatus === "in_progress") {
        // Need to poll for completion
        console.log(`⏳ Job in progress, polling for completion...`);
        const finalDesignUrl = await pollJobCompletion(accessToken, jobId);
        generatedUrls.push(finalDesignUrl);
      } else if (jobStatus === "failed") {
        const errorMessage = designData.job.error?.message || "Job failed";
        console.error(`❌ Job failed: ${errorMessage}`);
        throw new Error(`Design generation failed: ${errorMessage}`);
      }
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

// 🔧 Helper function to poll job completion
async function pollJobCompletion(accessToken: string, jobId: string, maxAttempts = 30, delayMs = 2000): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Polling attempt ${attempt}/${maxAttempts} for job ${jobId}`);
      
      const response = await fetch(
        `https://api.canva.com/rest/v1/autofills/${jobId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Failed to poll job status: ${response.status}`);
        continue;
      }

      const jobData: any = await response.json();
      const status = jobData.job?.status;

      console.log(`📊 Job ${jobId} status: ${status}`);

      if (status === "success" && jobData.job.result) {
        const designUrl = jobData.job.result.design.urls.view_url || jobData.job.result.design.url;
        console.log(`✅ Job completed successfully: ${designUrl}`);
        return designUrl;
      } else if (status === "failed") {
        const errorMessage = jobData.job.error?.message || "Job failed";
        throw new Error(`Design generation failed: ${errorMessage}`);
      }

      // Still in progress, wait before next attempt
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error: unknown) {
      console.error(`❌ Error polling job ${jobId}:`, (error as Error).message);
      if (attempt === maxAttempts) throw error;
    }
  }

  throw new Error(`Job ${jobId} did not complete within ${maxAttempts} attempts`);
}

// 🔍 Debug helper to check template fields
async function debugCanvaTemplate(accessToken: string, templateId: string) {
  console.log(`🔍 Debugging template: ${templateId}`);
  
  try {
    // Check template dataset
    const datasetResponse = await fetch(
      `https://api.canva.com/rest/v1/brand-templates/${templateId}/dataset`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!datasetResponse.ok) {
      const errorData: any = await datasetResponse.json();
      console.error(`❌ Failed to get dataset for ${templateId}:`, errorData);
      return null;
    }

    const dataset: any = await datasetResponse.json();
    console.log(`📊 Dataset for template ${templateId}:`, JSON.stringify(dataset, null, 2));

    // Extract available field names
    const availableFields = dataset.dataset?.data_fields || {};
    const fieldNames = Object.keys(availableFields);
    
    console.log(`📝 Available fields in template ${templateId}:`, fieldNames);
    
    // Show field types
    for (const [fieldName, fieldInfo] of Object.entries(availableFields)) {
      const info = fieldInfo as any;
      console.log(`  - ${fieldName}: ${info.type} ${info.required ? '(required)' : '(optional)'}`);
    }

    return {
      templateId,
      availableFields: fieldNames,
      fieldDetails: availableFields
    };

  } catch (error: unknown) {
    console.error(`❌ Error debugging template ${templateId}:`, (error as Error).message);
    return null;
  }
}