import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  console.log("🔍 Exploring Canva capabilities with Teams account...");

  try {
    const body = await req.json();
    const { canva_token, template_ids } = body;

    const cookieStore = await cookies();
    const accessToken = canva_token || cookieStore.get("canva_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "No Canva access token found." }, { status: 401 });
    }

    const results = {
      user_info: null,
      templates_accessible: [],
      designs_creatable: false,
      export_options: [],
      errors: []
    };

    // 1. Check what user info we can get
    console.log("👤 Testing user info access...");
    try {
      const userResponse = await fetch("https://api.canva.com/rest/v1/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (userResponse.ok) {
        results.user_info = await userResponse.json();
        console.log("✅ User info accessible");
      } else {
        const error = await userResponse.json();
        results.errors.push(`User info: ${error.message}`);
      }
    } catch (err) {
      results.errors.push(`User info error: ${err.message}`);
    }

    // 2. Check if we can access designs/templates
    console.log("📋 Testing design access...");
    try {
      const designsResponse = await fetch("https://api.canva.com/rest/v1/designs", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (designsResponse.ok) {
        const designs = await designsResponse.json();
        results.templates_accessible = designs.items || [];
        console.log(`✅ Found ${results.templates_accessible.length} accessible designs`);
      } else {
        const error = await designsResponse.json();
        results.errors.push(`Designs access: ${error.message}`);
      }
    } catch (err) {
      results.errors.push(`Designs error: ${err.message}`);
    }

    // 3. Test creating a basic design
    console.log("🎨 Testing design creation...");
    try {
      const createResponse = await fetch("https://api.canva.com/rest/v1/designs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          design_type: "presentation"
        })
      });
      
      if (createResponse.ok) {
        const newDesign = await createResponse.json();
        results.designs_creatable = true;
        console.log("✅ Design creation works");
        
        // 4. Test export options on the new design
        console.log("📤 Testing export options...");
        const designId = newDesign.design?.id;
        
        if (designId) {
          // Try different export formats
          const exportFormats = ['pdf', 'png', 'jpg'];
          
          for (const format of exportFormats) {
            try {
              const exportResponse = await fetch(`https://api.canva.com/rest/v1/designs/${designId}/export`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  format: format
                })
              });
              
              if (exportResponse.ok) {
                results.export_options.push(format);
                console.log(`✅ Export format ${format} works`);
              } else {
                const exportError = await exportResponse.json();
                console.log(`❌ Export format ${format} failed: ${exportError.message}`);
              }
            } catch (exportErr) {
              console.log(`❌ Export format ${format} error: ${exportErr.message}`);
            }
          }
        }
        
      } else {
        const error = await createResponse.json();
        results.errors.push(`Design creation: ${error.message}`);
      }
    } catch (err) {
      results.errors.push(`Design creation error: ${err.message}`);
    }

    // 5. Check specific template access if IDs provided
    if (template_ids && Array.isArray(template_ids) && template_ids.length > 0) {
      console.log("🎯 Testing specific template access...");
      
      for (const templateId of template_ids) {
        try {
          console.log(`Testing template ID: ${templateId}`);
          const templateResponse = await fetch(`https://api.canva.com/rest/v1/designs/${templateId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          
          if (templateResponse.ok) {
            const templateData = await templateResponse.json();
            console.log(`✅ Template ${templateId} accessible`);
            
            // Try to export this specific template
            try {
              const exportResponse = await fetch(`https://api.canva.com/rest/v1/designs/${templateId}/export`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ format: "pdf" })
              });
              
              if (exportResponse.ok) {
                const exportData = await exportResponse.json();
                console.log(`✅ Template ${templateId} exportable as PDF`);
                results.templates_accessible.push({
                  id: templateId,
                  exportable: true,
                  export_job: exportData
                });
              } else {
                console.log(`❌ Template ${templateId} export failed`);
                results.templates_accessible.push({
                  id: templateId,
                  exportable: false,
                  error: "Export failed"
                });
              }
            } catch (exportErr) {
              console.log(`❌ Template ${templateId} export error:`, exportErr);
              results.templates_accessible.push({
                id: templateId,
                exportable: false,
                error: `Export error: ${(exportErr as Error).message}`
              });
            }
            
          } else {
            const errorData = await templateResponse.json();
            console.log(`❌ Template ${templateId} not accessible:`, errorData);
            results.errors.push(`Template ${templateId}: ${errorData.message || 'Access denied'}`);
          }
        } catch (err) {
          console.log(`❌ Template ${templateId} error:`, err);
          results.errors.push(`Template ${templateId}: ${(err as Error).message}`);
        }
      }
    } else {
      console.log("ℹ️ No template IDs provided for testing");
    }

    console.log("📊 Exploration complete!");
    console.log("Results:", results);

    return NextResponse.json({
      success: true,
      capabilities: results,
      next_steps: results.designs_creatable ? 
        "✅ You can create and export designs! We can work with this." :
        "❌ Limited API access. May need alternative approach."
    });

  } catch (err: any) {
    console.error("🔥 Exploration error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}