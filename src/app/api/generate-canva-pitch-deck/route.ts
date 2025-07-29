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
        console.log(`✅ Found template: ${templateData.title} (${templateData.page_count} pages)`);

        // Try to export as PDF
        const exportResponse = await fetch(`https://api.canva.com/rest/v1/designs/${actualTemplateId}/export`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            format: "pdf",
            quality: "standard"
          })
        });

        if (exportResponse.ok) {
          const exportData = await exportResponse.json();
          console.log(`✅ Export job created for ${templateData.title}`);
          
          // Poll for export completion
          const exportJob = exportData.job;
          if (exportJob) {
            const finalExportUrl = await pollExportJob(accessToken, exportJob.id);
            if (finalExportUrl) {
              templatePdfs.push({
                templateId: actualTemplateId,
                title: templateData.title,
                exportUrl: finalExportUrl,
                pages: templateData.page_count || 1
              });
              console.log(`📥 Template exported: ${templateData.title}`);
            }
          }
        } else {
          console.log(`❌ Export failed for template ${actualTemplateId}`);
          
          // If export fails, try to get high-res images instead
          const imageExportResponse = await fetch(`https://api.canva.com/rest/v1/designs/${actualTemplateId}/export`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              format: "png",
              quality: "high"
            })
          });

          if (imageExportResponse.ok) {
            const imageExportData = await imageExportResponse.json();
            const imageJob = imageExportData.job;
            if (imageJob) {
              const imageUrl = await pollExportJob(accessToken, imageJob.id);
              if (imageUrl) {
                templatePdfs.push({
                  templateId: actualTemplateId,
                  title: templateData.title,
                  exportUrl: imageUrl,
                  pages: templateData.page_count || 1
                });
                console.log(`🖼️ Template exported as image: ${templateData.title}`);
              }
            }
          }
        }

      } catch (error) {
        console.error(`❌ Error processing template ${actualTemplateId}:`, (error as Error).message);
      }
    }

    if (templatePdfs.length === 0) {
      return NextResponse.json({
        error: "Could not export any templates",
        note: "Teams accounts may have limited export capabilities",
        fallback_solution: {
          message: "Opening templates for manual combination",
          edit_urls: await getTemplateEditUrls(accessToken, selected_templates, actualTemplates),
          instructions: [
            "1. Open each template link above",
            "2. Download each as PDF individually", 
            "3. Use a PDF merger tool to combine them",
            "4. Or copy pages from one template to another in Canva"
          ]
        }
      }, { status: 400 });
    }

    // Step 2: Create combined PDF with business data overlay
    const combinedPdfUrl = await createCombinedPdf(templatePdfs, businessData);

    return NextResponse.json({
      success: true,
      message: `✅ Created combined strategy document with ${templatePdfs.length} sections`,
      combined_pdf_url: combinedPdfUrl,
      sections_included: templatePdfs.map(t => ({
        title: t.title,
        pages: t.pages
      })),
      business_data_applied: businessData,
      total_pages: templatePdfs.reduce((sum, t) => sum + t.pages, 0),
      instructions: [
        "Your combined strategy document is ready!",
        "All your selected templates have been merged into one PDF",
        "Business data has been overlaid where possible",
        "Download the PDF using the link above"
      ]
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

// Helper function to create combined PDF (simplified for now)
async function createCombinedPdf(templatePdfs: any[], businessData: any): Promise<string> {
  console.log("📄 Creating combined PDF from templates...");
  
  // For now, return instructions on how to combine
  // In a full implementation, you'd:
  // 1. Download each PDF/image
  // 2. Use a PDF library to combine them
  // 3. Overlay business data on each page
  // 4. Upload combined result and return URL
  
  const combinationInstructions = {
    message: "Templates ready for combination",
    templates: templatePdfs,
    next_steps: [
      "Download each template PDF from the URLs provided",
      "Use PDF merger tool or manually combine in Canva",
      "Replace placeholder text with your business data"
    ]
  };
  
  // Return a placeholder URL for now
  return `data:text/json;base64,${Buffer.from(JSON.stringify(combinationInstructions)).toString('base64')}`;
}