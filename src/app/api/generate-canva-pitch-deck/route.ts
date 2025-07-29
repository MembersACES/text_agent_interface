import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  console.log("🚨 Teams-compatible handler triggered");

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

    // ✅ Use your ACTUAL template IDs from the test results
    const actualTemplates: Record<string, string> = {
      "EAGubwPi5xA": "DAGugFDpdy0", // Cover Page Template
      "EAGubwdp7rQ": "DAGuCjhrd6Q", // Template test 1 (6 pages)
      // Add more mappings as needed
    };

    const businessDetails = business_info?.business_details || {};
    const representativeDetails = business_info?.representative_details || {};

    const flattenedData = {
      business_name,
      abn: businessDetails.abn,
      trading_name: businessDetails.trading_name,
      contact_name: representativeDetails.contact_name,
      ...placeholders,
    };

    console.log("🧾 Data to pre-fill:", flattenedData);

    // Get list of available designs first
    console.log("📋 Fetching available designs...");
    const designsResponse = await fetch("https://api.canva.com/rest/v1/designs", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    let availableDesigns: any[] = [];
    if (designsResponse.ok) {
      const designsData = await designsResponse.json();
      availableDesigns = designsData.items || [];
      console.log(`✅ Found ${availableDesigns.length} available designs`);
    } else {
      console.log("❌ Failed to fetch available designs");
    }

    const generatedUrls: string[] = [];
    const instructions: string[] = [];
    const templateInfo: any[] = [];

    for (const requestedTemplateId of selected_templates) {
      // Map to actual template ID
      const actualTemplateId = actualTemplates[requestedTemplateId] || requestedTemplateId;
      
      console.log(`🔄 Processing template: ${requestedTemplateId} -> ${actualTemplateId}`);

      // Find the design in available designs
      const design = availableDesigns.find(d => d.id === actualTemplateId);
      
      if (design) {
        console.log(`✅ Found design: ${design.title} (${design.page_count} pages)`);
        
        // Create edit URL
        const editUrl = design.urls?.edit_url;
        
        if (editUrl) {
          // For now, just use the direct edit URL
          // Canva doesn't support URL parameter pre-filling for most fields
          generatedUrls.push(editUrl);
          
          templateInfo.push({
            id: design.id,
            title: design.title,
            pages: design.page_count,
            url: editUrl
          });
          
          console.log(`📝 Generated edit URL for: ${design.title}`);
        } else {
          console.log(`❌ No edit URL found for design ${actualTemplateId}`);
        }
      } else {
        console.log(`❌ Design ${actualTemplateId} not found in available designs`);
        
        // Try to access it directly anyway
        try {
          console.log(`🔍 Attempting direct access to ${actualTemplateId}...`);
          const directResponse = await fetch(`https://api.canva.com/rest/v1/designs/${actualTemplateId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          
          if (directResponse.ok) {
            const directDesign = await directResponse.json();
            const editUrl = directDesign.urls?.edit_url;
            
            if (editUrl) {
              generatedUrls.push(editUrl);
              templateInfo.push({
                id: directDesign.id,
                title: directDesign.title || 'Unknown Template',
                pages: directDesign.page_count || 1,
                url: editUrl
              });
              console.log(`✅ Direct access successful for ${actualTemplateId}`);
            }
          } else {
            console.log(`❌ Direct access failed for ${actualTemplateId}: ${directResponse.status}`);
          }
        } catch (err) {
          console.log(`❌ Direct access error for ${actualTemplateId}:`, (err as Error).message);
        }
      }
    }

    if (generatedUrls.length === 0) {
      return NextResponse.json({
        error: "No templates could be accessed",
        available_templates: availableDesigns.slice(0, 10).map(d => ({
          id: d.id,
          title: d.title,
          pages: d.page_count
        })),
        suggestion: "Try using one of the available template IDs listed above instead",
        your_templates: Object.entries(actualTemplates).map(([requested, actual]) => ({
          requested,
          actual,
          status: availableDesigns.find(d => d.id === actual) ? "✅ Available" : "❌ Not found"
        }))
      }, { status: 400 });
    }

    // Generate instructions based on data
    instructions.push("📝 **How to complete your pitch deck:**");
    instructions.push("1. Click the template links below to open them in Canva");
    instructions.push("2. Replace placeholder text with your business information:");
    
    Object.entries(flattenedData).forEach(([key, value]) => {
      if (value) {
        instructions.push(`   • ${key}: "${value}"`);
      }
    });
    
    instructions.push("3. Review and customize the design as needed");
    instructions.push("4. Click 'Share' → 'Download' to export as PDF");
    instructions.push("5. Choose 'PDF Standard' for best quality");

    return NextResponse.json({
      success: true,
      canva_urls: generatedUrls,
      templates: templateInfo,
      instructions: instructions,
      business_data: flattenedData,
      note: "✅ Templates ready! Click the URLs to edit in Canva, then manually replace text with your business data.",
      tip: "💡 Teams accounts require manual editing - we can't auto-fill text, but we've opened the right templates for you!"
    });

  } catch (err: unknown) {
    console.error("🔥 Error in Teams workaround:", (err as Error).message);
    return NextResponse.json({ 
      error: (err as Error).message,
      note: "This is the Teams-compatible version that opens templates for manual editing"
    }, { status: 500 });
  }
}