import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  console.log("🚨 Canva Template Combiner triggered - Creating single PDF!");

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

    console.log("🔐 Using Canva access token:", accessToken.slice(0, 10) + "...");

    // Map requested templates to your actual Canva template IDs
    const actualTemplates: Record<string, string> = {
      "EAGubwPi5xA": "DAGugFDpdy0", // Cover Page Template
      "EAGubwdp7rQ": "DAGuCjhrd6Q", // Template test 1 (6 pages)
    };

    const businessDetails = business_info?.business_details || {};
    const representativeDetails = business_info?.representative_details || {};

    const businessData = {
      business_name,
      abn: businessDetails.abn,
      trading_name: businessDetails.trading_name,
      contact_name: representativeDetails.contact_name,
      ...placeholders,
    };

    console.log("🧾 Business data to overlay:", businessData);

    // Step 1: Export each template as PDF
    const templatePdfs: Array<{ templateId: string; title: string; exportUrl: string; pages: number }> = [];

    for (const requestedTemplateId of selected_templates) {
      const actualTemplateId = actualTemplates[requestedTemplateId] || requestedTemplateId;
      
      console.log(`📄 Exporting template: ${requestedTemplateId} -> ${actualTemplateId}`);

      try {
        // First, get template info
        const templateResponse = await fetch(`https://api.canva.com/rest/v1/designs/${actualTemplateId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!templateResponse.ok) {
          console.log(`❌ Cannot access template ${actualTemplateId}`);
          continue;
        }

        const templateData = await templateResponse.json();
        console.log(`✅ Found template: ${templateData.title || 'Untitled'} (${templateData.page_count || 1} pages)`);

        // Teams accounts can't export - skip export attempts and go straight to edit URLs
        console.log(`ℹ️ Teams account detected - using edit URLs instead of export`);
        
        const editUrl = templateData.urls?.edit_url;
        if (editUrl) {
          templatePdfs.push({
            templateId: actualTemplateId,
            title: templateData.title || 'Untitled Template',
            exportUrl: editUrl, // Use edit URL instead of export URL
            pages: templateData.page_count || 1
          });
          console.log(`📝 Added edit URL for: ${templateData.title}`);
        }

      } catch (error) {
        console.error(`❌ Error processing template ${actualTemplateId}:`, (error as Error).message);
      }
    }

    if (templatePdfs.length === 0) {
      return NextResponse.json({
        error: "Could not access any templates",
        note: "Teams accounts have limited API access",
        available_templates: await getAvailableTemplates(accessToken),
        suggestion: "Try using the template IDs from available_templates above"
      }, { status: 400 });
    }

    // Since Teams can't export, provide manual combination workflow
    return NextResponse.json({
      success: true,
      message: `✅ Found ${templatePdfs.length} templates - Manual combination workflow ready`,
      workflow: {
        step1: "Open templates in order",
        step2: "Copy content from subsequent templates into the first one",
        step3: "Replace placeholder text with your business data",
        step4: "Download final combined document"
      },
      templates: templatePdfs.map((t, index) => ({
        order: index + 1,
        title: t.title,
        pages: t.pages,
        edit_url: t.exportUrl,
        action: index === 0 ? "🎯 Main template - edit this one" : "📋 Copy content from this template"
      })),
      business_data: businessData,
      detailed_instructions: [
        `1. 🎯 Open the main template: ${templatePdfs[0]?.title}`,
        "2. 📋 Open other templates in new tabs",
        "3. 🔄 Copy pages/content from additional templates into the main one",
        "4. ✏️ Replace all placeholder text with your business information:",
        ...Object.entries(businessData).map(([key, value]) => 
          value ? `   • ${key}: "${value}"` : null
        ).filter(Boolean),
        "5. 🎨 Customize colors, fonts, and layout as needed",
        "6. 📥 Download as PDF: Share → Download → PDF Standard",
        "7. ✅ Your combined strategy document is ready!"
      ],
      tip: "💡 Since Teams accounts can't auto-export, this manual workflow combines your templates into one professional document."
    });

  } catch (error: unknown) {
    console.error("🔥 Error in template combiner:", (error as Error).message);
    return NextResponse.json({
      error: (error as Error).message,
      note: "Failed to combine templates - this requires export capabilities"
    }, { status: 500 });
  }
}

// Helper function to poll export job completion
async function pollExportJob(accessToken: string, jobId: string, maxAttempts: number = 20): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Polling export job ${jobId}, attempt ${attempt}/${maxAttempts}`);
    
    try {
      const response = await fetch(`https://api.canva.com/rest/v1/exports/${jobId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const jobData = await response.json();
        const status = jobData.job?.status;
        
        if (status === "success") {
          const downloadUrl = jobData.job.result?.url;
          console.log(`✅ Export completed: ${downloadUrl}`);
          return downloadUrl;
        } else if (status === "failed") {
          console.log(`❌ Export job failed`);
          return null;
        }
        // Still in progress, continue polling
      }
      
      // Wait before next attempt
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Error polling export job:`, (error as Error).message);
    }
  }
  
  console.log(`⏰ Export job ${jobId} timed out`);
  return null;
}

// Helper function to get edit URLs as fallback
async function getTemplateEditUrls(accessToken: string, requestedTemplates: string[], templateMapping: Record<string, string>): Promise<string[]> {
  const editUrls: string[] = [];
  
  for (const requestedId of requestedTemplates) {
    const actualId = templateMapping[requestedId] || requestedId;
    
    try {
      const response = await fetch(`https://api.canva.com/rest/v1/designs/${actualId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const design = await response.json();
        if (design.urls?.edit_url) {
          editUrls.push(design.urls.edit_url);
        }
      }
    } catch (error) {
      console.error(`Error getting edit URL for ${actualId}`);
    }
  }
  
  return editUrls;
}

// Helper function to get available templates
async function getAvailableTemplates(accessToken: string): Promise<any[]> {
  try {
    const response = await fetch("https://api.canva.com/rest/v1/designs", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      return (data.items || []).slice(0, 10).map((d: any) => ({
        id: d.id,
        title: d.title,
        pages: d.page_count
      }));
    }
  } catch (error) {
    console.error("Error fetching available templates");
  }
  return [];
}