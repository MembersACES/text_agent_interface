"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

interface BusinessInfo {
  business_name: string;
  abn: string;
  trading_as: string;
  postal_address: string;
  site_address: string;
  telephone: string;
  email: string;
  contact_name: string;
  position: string;
  client_folder_url: string;
  industry?: string;
  website?: string;
  utilities?: string[];
  retailers?: any[];
}

type SolutionCategory =
  | "platform"
  | "ai_bots"
  | "ai_automation"
  | "referral"
  | "profile_reset"
  | "renewable_energy"
  | "resource_recovery"
  | "asset_optimisation"
  | "other_solutions"
  | "ghg";

interface SolutionOption {
  id: string;
  name: string;
  description: string;
  presentationId: string;
  enabled: boolean;
  category: SolutionCategory;
}

interface EmailResult {
  solutionId: string;
  solutionName: string;
  success: boolean;
  message: string;
}

export default function IndividualStrategyEmailPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const [businessQuery, setBusinessQuery] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessInfo | null>(null);
  const [editableBusinessInfo, setEditableBusinessInfo] = useState<BusinessInfo | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [result, setResult] = useState("");
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['platform']);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResults, setEmailResults] = useState<EmailResult[]>([]);

  // Generate email subject for a solution
  const generateEmailSubject = (businessName: string, solutionName: string): string => {
    return `Strategic Solution Proposal: ${solutionName} for ${businessName}`;
  };

  // Generate HTML email body for a solution
  const generateEmailBody = (businessInfo: BusinessInfo, solution: SolutionOption, userInfo: any): string => {
    const currentDate = new Date().toLocaleDateString('en-AU', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Strategic Solution Proposal</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; }
          .header { margin-bottom: 20px; }
          .content { margin-bottom: 20px; }
          .solution-details { margin: 20px 0; }
          .contact-info { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          h1 { color: #2c3e50; font-size: 20px; margin-bottom: 10px; }
          h2 { color: #34495e; font-size: 16px; margin-top: 20px; margin-bottom: 10px; }
          p { margin-bottom: 10px; }
          ul, ol { margin: 10px 0; padding-left: 20px; }
          li { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Strategic Solution Proposal: ${solution.name}</h1>
          <p>Dear ${businessInfo.contact_name || 'Business Owner'},</p>
          <p>I hope this email finds you well. I'm writing to present a strategic solution that could benefit ${businessInfo.business_name}.</p>
        </div>
        
        <div class="content">
          <div class="solution-details">
            <h2>${solution.name}</h2>
            <p>${solution.description}</p>
            
            <h2>Key Benefits for ${businessInfo.business_name}:</h2>
            <ul>
              <li>Customized implementation tailored to your business needs</li>
              <li>Sustainable and cost-effective solution</li>
              <li>Proven return on investment and environmental impact</li>
              <li>Comprehensive support throughout the process</li>
            </ul>

            <h2>Next Steps:</h2>
            <ol>
              <li>Review the attached strategy presentation for detailed information</li>
              <li>Consider how this solution aligns with your business goals</li>
              <li>Contact me to discuss implementation and answer any questions</li>
            </ol>
          </div>

          <p>This ${solution.name} solution has been specifically selected based on ${businessInfo.business_name}'s industry profile and potential for sustainable growth. Our analysis indicates significant opportunities for both cost savings and positive environmental impact.</p>

          <p>I would be happy to discuss this proposal further at your convenience. Please feel free to reach out with any questions or to arrange a meeting.</p>
        </div>

        <div class="contact-info">
          <p>Best regards,<br>
          ${userInfo.name}<br>
          ${userInfo.email}</p>
          
          <p><em>This proposal was prepared specifically for ${businessInfo.business_name} on ${currentDate}</em></p>
        </div>
      </body>
      </html>
    `;
  };
   // Send individual strategy emails with subject and body
   const sendIndividualStrategyEmails = async () => {
    if (!editableBusinessInfo || selectedSolutions.length === 0 || !session) {
      setEmailResults([{
        solutionId: '',
        solutionName: '',
        success: false,
        message: "❌ Please select at least one solution option."
      }]);
      return;
    }
  
    setEmailLoading(true);
    setEmailResults([]);
  
    const results: EmailResult[] = [];
    const userInfo = {
      name: (session as any)?.user?.name || "",
      email: (session as any)?.user?.email || ""
    };
  
    for (const solutionId of selectedSolutions) {
      const solution = solutionOptions.find(s => s.id === solutionId);
      if (!solution) continue;
  
      try {
        // Generate enhanced placeholders for this solution
        const placeholders = {
          // Date/Time placeholders
          year: new Date().getFullYear().toString(),
          month: new Date().toLocaleDateString('en-AU', { month: 'long' }),
          date: new Date().toLocaleDateString('en-AU', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          current_date: new Date().toLocaleDateString('en-AU'),
          
          // Business placeholders
          business_name: editableBusinessInfo.business_name,
          contact_name: editableBusinessInfo.contact_name || "Business Owner",
          company_name: editableBusinessInfo.business_name,
          abn: editableBusinessInfo.abn || "",
          trading_name: editableBusinessInfo.trading_as || editableBusinessInfo.business_name,
          business_email: editableBusinessInfo.email || "",
          business_phone: editableBusinessInfo.telephone || "",
          business_website: editableBusinessInfo.website || "",
          postal_address: editableBusinessInfo.postal_address || "",
          site_address: editableBusinessInfo.site_address || "",
          business_industry: editableBusinessInfo.industry || "",
          
          // Contact placeholders
          client_name: editableBusinessInfo.contact_name || "Valued Client",
          contact_position: editableBusinessInfo.position || "Business Owner",
          contact_title: editableBusinessInfo.position 
            ? `${editableBusinessInfo.contact_name}, ${editableBusinessInfo.position}` 
            : editableBusinessInfo.contact_name || "Business Contact",
          
          // Solution placeholders
          solution_name: solution.name,
          solution_description: solution.description,
          solution_category: categoryLabels[solution.category] || solution.category,
          
          // User/Presenter placeholders
          presenter_name: userInfo.name,
          presenter_email: userInfo.email,
          
          // Custom business-specific placeholders
          proposal_title: `${solution.name} Strategy for ${editableBusinessInfo.business_name}`,
          presentation_title: `${solution.name} - ${editableBusinessInfo.business_name}`,
        };
  
        // Payload for Google Apps Script
        const payload = {
          business_info: {
            business_name: editableBusinessInfo.business_name,
            contact_name: editableBusinessInfo.contact_name,
            email: editableBusinessInfo.email,
            industry: editableBusinessInfo.industry,
            position: editableBusinessInfo.position,
            abn: editableBusinessInfo.abn,
            trading_as: editableBusinessInfo.trading_as,
            postal_address: editableBusinessInfo.postal_address,
            site_address: editableBusinessInfo.site_address,
            telephone: editableBusinessInfo.telephone,
            website: editableBusinessInfo.website,
            client_folder_url: editableBusinessInfo.client_folder_url
          },
          solution_name: solution.name,
          solution_id: solution.id,
          presentation_id: solution.presentationId,
          placeholders: placeholders,
          user: userInfo
        };
  
        const response = await fetch("https://script.google.com/macros/s/AKfycbxyH9xOa11ZpHQ1R5MWygNOLZRof9VfELR6Zq_ByKxnIUvrJL2VMWJhoXlzg2g_nmHO/exec", {
          method: "POST",
          body: JSON.stringify(payload)
        });
  
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
  
        const scriptResult = await response.json();
  
        if (scriptResult.success) {
          // Now send the email with the generated presentation
          const emailSubject = generateEmailSubject(editableBusinessInfo.business_name, solution.name);
          const emailBody = generateEmailBody(editableBusinessInfo, solution, userInfo);
  
          const emailPayload = {
            user: userInfo,
            business_name: editableBusinessInfo.business_name,
            business_info: {
              business_name: editableBusinessInfo.business_name,
              contact_name: editableBusinessInfo.contact_name,
              email: editableBusinessInfo.email,
              industry: editableBusinessInfo.industry,
              position: editableBusinessInfo.position
            },
            solution_name: solution.name,
            solution_id: solution.id,
            presentation_id: solution.presentationId,
            email_subject: emailSubject,
            email_body: emailBody,
            // Include the generated presentation/PDF URLs
            generated_presentation_url: scriptResult.presentationUrl,
            generated_pdf_url: scriptResult.pdfUrl,
            generated_pdf_id: scriptResult.pdfId
          };
  
          // Send email via your existing n8n webhook
          const emailResponse = await fetch("https://membersaces.app.n8n.cloud/webhook/email-individual-strategy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailPayload)
          });
  
          if (!emailResponse.ok) {
            const error = await emailResponse.json();
            throw new Error(error.detail || error.message || `Email request failed: ${emailResponse.statusText}`);
          }
  
          results.push({
            solutionId: solution.id,
            solutionName: solution.name,
            success: true,
            message: `✅ Individual strategy email sent successfully for ${solution.name}. PDF generated and attached.`
          });
        } else {
          throw new Error(scriptResult.message || "Failed to generate presentation");
        }
  
      } catch (error: any) {
        results.push({
          solutionId: solution.id,
          solutionName: solution.name,
          success: false,
          message: `❌ Failed to send email for ${solution.name}: ${error.message}`
        });
      }
    }
  
    setEmailResults(results);
    setEmailLoading(false);
  };
  
  // Also add these placeholder examples to your UI for reference
  const commonPlaceholders = [
    "{year}", "{month}", "{date}", "{current_date}",
    "{business_name}", "{contact_name}", "{company_name}", 
    "{abn}", "{business_email}", "{business_phone}",
    "{solution_name}", "{presenter_name}", "{presenter_email}",
    "{proposal_title}", "{presentation_title}"
  ];

  const solutionOptions: SolutionOption[] = [
    // Sustainable Platform
    {
      id: "sustainable_platforms",
      name: "Sustainable Platforms",
      description: "Comprehensive sustainable platform solutions using generic branding template",
      presentationId: "1jedCYkRGH3jXo29eg4BLdZq_vf9g1qSlkjMstMa_xYU",
      enabled: true,
      category: "platform"
    },
    
    // AI Bots
    {
      id: "assisted_scrubber",
      name: "Assisted Scrubber",
      description: "AI-powered assisted scrubbing solutions for automated cleaning",
      presentationId: "1VqfPbIWfHwx11fXFfi8Z5qq0-AzgvMzooM1fV-FWtGs",
      enabled: true,
      category: "ai_bots"
    },
    {
      id: "scrubber_ai_bot",
      name: "Scrubber-Assisted AI Bot",
      description: "Advanced AI bot for intelligent scrubbing operations",
      presentationId: "1c0s191tvwa1ZenWPG5Ghdo5J4c0SPf3GbbjtDPO5lXE",
      enabled: true,
      category: "ai_bots"
    },
    {
      id: "vacuum_mopping_ai_bot",
      name: "Vacuum-Mopping AI Bot",
      description: "Comprehensive vacuum and mopping AI bot system",
      presentationId: "1DCNrBY1AA-B4OLuMFIXvEhkN-rTA287J1TbESkD-3ts",
      enabled: true,
      category: "ai_bots"
    },
    {
      id: "engagement_bot",
      name: "Customer Engagement Bot",
      description: "AI-powered customer engagement and interaction bot",
      presentationId: "1W3SbzwNFyIoNCCoj_SFAULVHZT1pflNE031QF9dII8U",
      enabled: true,
      category: "ai_bots"
    },
    {
      id: "filtering_cleaning_bot",
      name: "Filtering & Cleaning Assisted Bot",
      description: "Advanced filtering and cleaning assistance through AI automation",
      presentationId: "10srsHl936u9unxOE30EyGQKmsQU4XEpGbQcBhOG8_Gc",
      enabled: true,
      category: "ai_bots"
    },
    
    // AI Automation Category
    {
      id: "phone_agent",
      name: "Phone Agent",
      description: "AI-powered phone agent for automated customer service and support",
      presentationId: "13jOv5xfI-R2RYKPfjlRNLZmAiDeDl4rACikyp8NcmP8",
      enabled: true,
      category: "ai_automation"
    },
    {
      id: "booking_digital_receptionist",
      name: "Booking Digital Receptionist",
      description: "Digital receptionist system for automated booking and appointment management",
      presentationId: "1e3RfOAVz0ugegwSBUR2z8uVzqsQpFADgI1ZOgdK1sUY",
      enabled: true,
      category: "ai_automation"
    },
    
    // Event Referral
    {
      id: "event_referral",
      name: "Event Referral Program",
      description: "Comprehensive event referral and management system",
      presentationId: "1Jqi5pMRv0amYqMiPysc_hFi03vNorKio3A5fcRUluOc",
      enabled: true,
      category: "referral"
    },
    
    // Profile Reset
    {
      id: "electricity_ci_sme_align",
      name: "Electricity C&I & SME Align Forward",
      description: "Commercial & Industrial and SME electricity alignment solutions",
      presentationId: "1im1Yl0AzuzJULk4_crwV1W7nOQV9XF7CvzRpkjRQV34",
      enabled: true,
      category: "profile_reset"
    },
    {
      id: "electricity_gas_discrepancy",
      name: "Electricity & Gas Discrepancy Review",
      description: "Comprehensive review and analysis of electricity and gas discrepancies",
      presentationId: "1EC3SncEMHfaIoofzJTWKnPhEaa6w6q_1B1iIzp1SJdw",
      enabled: true,
      category: "profile_reset"
    },
    {
      id: "waste_review",
      name: "Waste Review",
      description: "Complete waste management and optimization review",
      presentationId: "1DOgFANIrqz7JuWMruM8LiHLx8OMqOrON0YchUozUpYQ",
      enabled: true,
      category: "profile_reset"
    },
    
    // Renewable Energy Category
    {
      id: "solar_quote_review",
      name: "Solar Quote Review & Recommendation",
      description: "Comprehensive solar quote analysis and tailored recommendations",
      presentationId: "1haUf3MWTvJBppJkbB6-khaGiDFhtlyAYhBD-_cvuVmQ",
      enabled: true,
      category: "renewable_energy"
    },
    {
      id: "solar_farm",
      name: "Solar Farm",
      description: "Large-scale solar farm development and implementation solutions",
      presentationId: "1AD4a5MTwnYl0_XqVULeyeoTAIfjCHuxGH_XRnN-LlLo",
      enabled: true,
      category: "renewable_energy"
    },
    {
      id: "solar_car_park",
      name: "Solar Car Park",
      description: "Solar canopy solutions for car parks and parking structures",
      presentationId: "12BixHi5UX0hZpIoAVQB79dqcFMiVTzwaa7nTHipWY1g",
      enabled: true,
      category: "renewable_energy"
    },
    {
      id: "solar_rooftop",
      name: "Solar Rooftop",
      description: "Commercial and residential rooftop solar installation solutions",
      presentationId: "1sDM8-1-XD8s_ciOUIKuIKG9WY5sbeWa8uds4ueyE0ig",
      enabled: true,
      category: "renewable_energy"
    },
    {
      id: "solar_monitoring",
      name: "Solar Monitoring",
      description: "Advanced solar system monitoring and performance optimization",
      presentationId: "1-CcTIPNfWGAB_ywWLdNUTC8oPFaiGmP3H2v8QUwAx1M",
      enabled: true,
      category: "renewable_energy"
    },
  
    // NEW Resource Recovery Category
    {
      id: "cooking_used_oil",
      name: "Cooking & Used Oil",
      description: "Sustainable cooking and used oil recovery and processing solutions",
      presentationId: "1NohfoE4Tck34V2uLWn9fvirW3peJKPUMqfmzE4CNLrg",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "baled_plastic_recycling",
      name: "Baled Plastic Recycling",
      description: "Comprehensive baled plastic recycling and processing systems",
      presentationId: "190wilKqZQFoEgsvJ6ZKYRmm-fY5rnQda7g_KFI0546I",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "wood_offcut_recycling",
      name: "Wood Offcut Recycling",
      description: "Wood offcut collection, processing and recycling solutions",
      presentationId: "1cjjlNBeFaUmhPuJo4k07shvCKch0NhtMqS4B4CLjrI0",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "glass_bottle_recycling",
      name: "Glass Bottle Recycling",
      description: "Glass bottle collection and recycling management systems",
      presentationId: "1aECRrTGsaiW6_6fYjatP6nlhNND9QvsMAPQmI7V4D7Y",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "organic_waste_diversion",
      name: "Organic Waste Diversion",
      description: "Organic waste diversion and composting solutions",
      presentationId: "1IVNC9JBlyfJ70TgduSiW2YyJ2y3opYyhstjI3FZTjqY",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "wax_cardboard",
      name: "Wax Cardboard",
      description: "Wax cardboard collection and specialized recycling processes",
      presentationId: "1WSpo6Ayr6blkQytM6Axpf59fdLXplSqt9K11epQ8gsA",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "cardboard_bin_recycling",
      name: "Cardboard Bin Recycling",
      description: "Cardboard bin collection and recycling management",
      presentationId: "1oZU7F0j3buEAA6E5Ji3NT9xLLhZCPaIOKqA1xGgZcsY",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "cardboard_bales_recycling",
      name: "Cardboard Bales Recycling",
      description: "Large-scale cardboard baling and recycling operations",
      presentationId: "1_ixppvK1AkVorOrqyu8ghnezO5Xc0BD36RBTDRFHTr8",
      enabled: true,
      category: "resource_recovery"
    },
  
    // NEW Asset Optimisation Category
    {
      id: "electricity_demand_response",
      name: "Electricity Demand Response",
      description: "Smart electricity demand response and grid optimization solutions",
      presentationId: "1qN5fqOq-1VXkwO4nV9PFzaINEyjYZy1_nNPMnKi2Rio",
      enabled: true,
      category: "asset_optimisation"
    },
    {
      id: "federal_government_incentives",
      name: "Federal Government Incentives",
      description: "Federal government sustainability and business incentive programs",
      presentationId: "1Sp8T3yOKnNxgP3BGMTtCukM7TYMAQONqXuu3Lxw6GxM",
      enabled: true,
      category: "asset_optimisation"
    },
    {
      id: "state_government_incentives",
      name: "State Government Incentives",
      description: "State-level government incentives and rebate programs",
      presentationId: "1kOVzGHbKBjj7hty_K2I6OOw3LtvAYbh6lSzKfwUo5m0",
      enabled: true,
      category: "asset_optimisation"
    },
    {
      id: "carbon_credit_offset",
      name: "Australian Carbon Credit and Carbon Offset",
      description: "Australian carbon credit generation and offset management",
      presentationId: "1J0PuIWMgly8DqD6dAk46Fm7U1IU_EU_02PrvmD2rtbc",
      enabled: true,
      category: "asset_optimisation"
    },
    {
      id: "renewable_certificates",
      name: "Self-Managed Renewable Certificates",
      description: "Self-managed renewable energy certificate trading and optimization",
      presentationId: "1TB0Jz8Lc0qb4OJsOPp-UEqvek7_qpPG1dGDaKx8Cs-o",
      enabled: true,
      category: "asset_optimisation"
    },
  
    // NEW Other Solutions Category
    {
      id: "backup_power_generators",
      name: "Back-up Power Generators",
      description: "Reliable backup power generation systems for business continuity",
      presentationId: "1NogU72GNKHqs0LNIqmblsn9I2Fa36V6dzNoqh6PACUA",
      enabled: true,
      category: "other_solutions"
    },
    {
      id: "door_curtain_refrigerator",
      name: "Door Curtain Refrigerator",
      description: "Energy-efficient door curtain refrigeration solutions",
      presentationId: "1K87ZdSdlydCib0hdw7ax7XO0vAgY8dciy1KIpF5_B3I",
      enabled: true,
      category: "other_solutions"
    },
  
    // NEW GHG Category
    {
      id: "ghg_reporting",
      name: "GHG Reporting",
      description: "Comprehensive greenhouse gas reporting and compliance solutions",
      presentationId: "1c4LRa0OB6K8Dh0tCH5dr7JWWqUl4sG8LZSZPhEnjdo4",
      enabled: true,
      category: "ghg"
    }
  ];

  const dispatchReauthEvent = () => {
    console.log("🔍 401 Unauthorized - dispatching reauthentication event");
    
    const apiErrorEvent = new CustomEvent('api-error', {
      detail: { 
        error: 'REAUTHENTICATION_REQUIRED',
        status: 401,
        message: 'Authentication expired'
      }
    });
    window.dispatchEvent(apiErrorEvent);
  };

  // Load business info from session storage on mount
  useEffect(() => {
    const savedBusinessInfo = sessionStorage.getItem('selectedBusinessInfoIndividual');
    if (savedBusinessInfo) {
      try {
        const businessData = JSON.parse(savedBusinessInfo);
        setSelectedBusiness(businessData);
        setEditableBusinessInfo({...businessData});
      } catch (error) {
        console.error('Error loading saved business info:', error);
      }
    }
  }, []);
  
  // Save business info to session storage when it changes
  useEffect(() => {
    if (editableBusinessInfo) {
      sessionStorage.setItem('selectedBusinessInfoIndividual', JSON.stringify(editableBusinessInfo));
    }
  }, [editableBusinessInfo]);

  // Check for URL parameters (from other pages)
  useEffect(() => {
    // First check for businessInfo parameter (from Business Info Display tool)
    const businessInfoParam = searchParams.get('businessInfo');
    
    if (businessInfoParam) {
      try {
        const businessInfoFromUrl = JSON.parse(decodeURIComponent(businessInfoParam));
        
        // Map the business info to our expected format
        const businessInfo: BusinessInfo = {
          business_name: businessInfoFromUrl.name || "",
          abn: businessInfoFromUrl.abn || "",
          trading_as: businessInfoFromUrl.trading_name || "",
          postal_address: businessInfoFromUrl.postal_address || "",
          site_address: businessInfoFromUrl.site_address || "",
          telephone: businessInfoFromUrl.telephone || "",
          email: businessInfoFromUrl.email || "",
          contact_name: businessInfoFromUrl.contact_name || "",
          position: businessInfoFromUrl.position || "",
          client_folder_url: businessInfoFromUrl.googleDriveLink || "",
          industry: businessInfoFromUrl.industry || "",
          website: businessInfoFromUrl.website || "",
          utilities: businessInfoFromUrl.utilities || [],
          retailers: businessInfoFromUrl.retailers || []
        };
        
        setSelectedBusiness(businessInfo);
        setEditableBusinessInfo({...businessInfo});
        setResult(`✅ Business information loaded from Business Info tool: ${businessInfo.business_name}`);
        
        return;
      } catch (error) {
        console.error('Error parsing businessInfo from URL:', error);
      }
    }
    
    // Check for individual URL parameters (from other pages)
    const businessNameFromUrl = searchParams.get('businessName');
    
    if (businessNameFromUrl) {
      // Create business info from URL parameters
      const businessInfoFromUrl: BusinessInfo = {
        business_name: businessNameFromUrl,
        abn: searchParams.get('abn') || "",
        trading_as: searchParams.get('tradingAs') || "",
        postal_address: searchParams.get('address') || "",
        site_address: searchParams.get('siteAddress') || "",
        telephone: searchParams.get('phone') || "",
        email: searchParams.get('email') || "",
        contact_name: searchParams.get('contactName') || "",
        position: searchParams.get('position') || "",
        client_folder_url: searchParams.get('clientFolderUrl') || "",
        industry: searchParams.get('industry') || "",
        website: searchParams.get('website') || "",
        utilities: searchParams.get('utilities')?.split(',') || []
      };
      
      setSelectedBusiness(businessInfoFromUrl);
      setEditableBusinessInfo({...businessInfoFromUrl});
      setResult(`✅ Business information loaded from link: ${businessInfoFromUrl.business_name}`);
      
      return;
    }
  }, [searchParams]);

  // Fetch business information
  const fetchBusinessInfo = async () => {
    if (!businessQuery.trim() || !token) {
      setResult("❌ Please enter a business name to search.");
      return;
    }

    setBusinessLoading(true);
    setResult("");

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/get-business-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ business_name: businessQuery.trim() }),
      });
      
      if (response.status === 401) {
        dispatchReauthEvent();
        setResult("Session expired. Please wait while we refresh your authentication...");
        return;
      }

      const data = await response.json();

      if (response.ok && data.business_details) {
        // Map the business info response to our expected format
        const businessInfo: BusinessInfo = {
          business_name: data.business_details?.name || "",
          abn: data.business_details?.abn || "",
          trading_as: data.business_details?.trading_name || "",
          postal_address: data.contact_information?.postal_address || "",
          site_address: data.contact_information?.site_address || "",
          telephone: data.contact_information?.telephone || "",
          email: data.contact_information?.email || "",
          contact_name: data.representative_details?.contact_name || "",
          position: data.representative_details?.position || "",
          client_folder_url: data.gdrive?.folder_url || "",
          industry: data.business_details?.industry || "",
          website: data.business_details?.website || "",
          utilities: data.utilities || []
        };
        
        setSelectedBusiness(businessInfo);
        setEditableBusinessInfo({...businessInfo});
        setResult(`✅ Business information loaded for: ${businessInfo.business_name}`);
      } else {
        setResult(`❌ Could not find business information for: ${businessQuery}`);
        setSelectedBusiness(null);
        setEditableBusinessInfo(null);
      }
    } catch (error: any) {
      console.error("Business lookup error:", error);
      setResult(`❌ Error looking up business: ${error.message}`);
      setSelectedBusiness(null);
      setEditableBusinessInfo(null);
    }

    setBusinessLoading(false);
  };

  // Handle editable business info changes
  const handleBusinessInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableBusinessInfo(prev => prev ? { ...prev, [name]: value } : null);
  };

  // Handle solution selection
  const handleSolutionToggle = (solutionId: string) => {
    setSelectedSolutions(prev => 
      prev.includes(solutionId) 
        ? prev.filter(id => id !== solutionId)
        : [...prev, solutionId]
    );
  };

  // Handle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category)
        ? prev.filter(cat => cat !== category)
        : [...prev, category]
    );
  };

  // Expand all categories
  const expandAllCategories = () => {
    setExpandedCategories(Object.keys(groupedSolutions));
  };

  // Collapse all categories
  const collapseAllCategories = () => {
    setExpandedCategories([]);
  };

  // Group solutions by category
  const groupedSolutions = solutionOptions.reduce((groups, solution) => {
    const category = solution.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(solution);
    return groups;
  }, {} as Record<string, SolutionOption[]>);

  const categoryLabels: Record<SolutionCategory, string> = {
    platform: "🌱 Sustainable Platform",
    ai_bots: "🤖 AI Bots",
    ai_automation: "⚡ AI Automation",
    referral: "📅 Event Referral",
    profile_reset: "🔄 Profile Reset",
    renewable_energy: "☀️ Renewable Energy",
    resource_recovery: "♻️ Resource Recovery",
    asset_optimisation: "📈 Asset Optimisation",
    other_solutions: "🔧 Other Solutions",
    ghg: "🌍 GHG",
  };
  // Clear business info and start fresh
  const handleNewSearch = () => {
    setSelectedBusiness(null);
    setEditableBusinessInfo(null);
    setBusinessQuery("");
    setResult("");
    setSelectedSolutions([]);
    setEmailResults([]);
    sessionStorage.removeItem('selectedBusinessInfoIndividual');
  };

  if (status === "loading") {
    return <div className="p-6">Loading...</div>;
  }
  
  if (status === "unauthenticated" || !session) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Please log in to use this feature.
        </div>
      </div>
    );
  }
  
  const token = (session as any)?.id_token || (session as any)?.accessToken;
   
  // Check for refresh token error
  if ((session as any)?.error === "RefreshAccessTokenError") {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Your authentication has expired. Please log out and log back in to refresh your credentials.
        </div>
      </div>
    );
  }
   
  if (!token) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Access token not available. Please log out and log back in.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">📧 Individual Strategy Email</h1>

      {/* Business Search Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Select Business</h2>
        
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={businessQuery}
            onChange={(e) => setBusinessQuery(e.target.value)}
            placeholder="Enter business name to search..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && fetchBusinessInfo()}
          />
          <button
            onClick={fetchBusinessInfo}
            disabled={businessLoading || !businessQuery.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {businessLoading ? "Searching..." : "Search"}
          </button>
        </div>

        {selectedBusiness && (
          <div className="mt-4 p-4 bg-white rounded border border-green-200">
            <h3 className="font-semibold text-green-800 mb-4">✅ Business Found - Review & Edit Details:</h3>
            
            {/* Editable Business Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  name="business_name"
                  value={editableBusinessInfo?.business_name || ""}
                  onChange={handleBusinessInfoChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ABN</label>
                <input
                  type="text"
                  name="abn"
                  value={editableBusinessInfo?.abn || ""}
                  onChange={handleBusinessInfoChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trading As</label>
                <input
                  type="text"
                  name="trading_as"
                  value={editableBusinessInfo?.trading_as || ""}
                  onChange={handleBusinessInfoChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={editableBusinessInfo?.email || ""}
                  onChange={handleBusinessInfoChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={editableBusinessInfo?.telephone || ""}
                  onChange={handleBusinessInfoChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  name="contact_name"
                  value={editableBusinessInfo?.contact_name || ""}
                  onChange={handleBusinessInfoChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  name="position"
                  value={editableBusinessInfo?.position || ""}
                  onChange={handleBusinessInfoChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input
                  type="text"
                  name="industry"
                  value={editableBusinessInfo?.industry || ""}
                  onChange={handleBusinessInfoChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  name="website"
                  value={editableBusinessInfo?.website || ""}
                  onChange={handleBusinessInfoChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Address Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Address</label>
                <textarea
                  name="postal_address"
                  value={editableBusinessInfo?.postal_address || ""}
                  onChange={handleBusinessInfoChange}
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Address</label>
                <textarea
                  name="site_address"
                  value={editableBusinessInfo?.site_address || ""}
                  onChange={handleBusinessInfoChange}
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* New Search Button - only show if business is selected */}
        {selectedBusiness && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleNewSearch}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              🔄 New Business Search
            </button>
          </div>
        )}
      </div>

      {/* Result Display */}
      {result && (
        <div className="mb-6 p-4 rounded-md">
          <div 
            className={`whitespace-pre-wrap text-sm ${
              result.includes("✅") ? "text-green-700 bg-green-50 border border-green-200" : "text-red-700 bg-red-50 border border-red-200"
            } p-4 rounded`}
          >
            {result}
          </div>
        </div>
      )}

      {/* Solution Selection Section */}
      {selectedBusiness && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">2. Select Solutions</h2>
            <div className="flex gap-2">
              <button
                onClick={expandAllCategories}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAllCategories}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
          
          {Object.entries(groupedSolutions).map(([category, solutions]) => {
            const isExpanded = expandedCategories.includes(category);
            const categoryCount = solutions.filter(s => selectedSolutions.includes(s.id)).length;
            
            return (
              <div key={category} className="mb-4 border border-gray-200 rounded-lg bg-white">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-medium text-gray-700">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({solutions.length} solutions)
                    </span>
                    {categoryCount > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {categoryCount} selected
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {solutions.map((solution) => (
                        <div key={solution.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            id={solution.id}
                            checked={selectedSolutions.includes(solution.id)}
                            onChange={() => handleSolutionToggle(solution.id)}
                            disabled={!solution.enabled}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <label htmlFor={solution.id} className="block text-sm font-medium text-gray-900 cursor-pointer">
                              {solution.name}
                            </label>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{solution.description}</p>
                            {!solution.enabled && (
                              <p className="text-xs text-gray-400 mt-1">Coming soon...</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {selectedSolutions.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-blue-800">Selected Solutions ({selectedSolutions.length}):</h4>
                <button
                  onClick={() => setSelectedSolutions([])}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear All
                </button>
              </div>
              <div className="text-sm text-blue-700">
                {selectedSolutions.map(solutionId => {
                  const solution = solutionOptions.find(s => s.id === solutionId);
                  return solution ? (
                    <span key={solutionId} className="inline-flex items-center bg-blue-100 px-2 py-1 rounded text-xs mr-2 mb-1">
                      {solution.name}
                      <button
                        onClick={() => handleSolutionToggle(solutionId)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send Individual Strategy Emails Section */}
      {selectedBusiness && selectedSolutions.length > 0 && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Send Individual Strategy Emails</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              This will send individual strategy emails for each selected solution to the business:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Business: {editableBusinessInfo?.business_name}</li>
              {selectedSolutions.map(solutionId => {
                const solution = solutionOptions.find(s => s.id === solutionId);
                return solution ? <li key={solutionId}>• {solution.name} strategy email</li> : null;
              })}
            </ul>
          </div>

          <button
            onClick={sendIndividualStrategyEmails}
            disabled={emailLoading}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {emailLoading ? "Sending Emails..." : "📧 Send Individual Strategy Emails"}
          </button>
        </div>
      )}

      {/* Email Results */}
      {emailResults.length > 0 && (
        <div className="mb-6 p-6 rounded-lg border bg-gray-50">
          <h3 className="font-semibold mb-4 text-gray-800">Email Results</h3>
          
          <div className="space-y-3">
            {emailResults.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                result.success 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`font-medium ${
                      result.success ? "text-green-800" : "text-red-800"
                    }`}>
                      {result.solutionName || 'General'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      result.success ? "text-green-700" : "text-red-700"
                    }`}>
                      {result.message}
                    </p>
                  </div>
                  <span className={`text-lg ${
                    result.success ? "text-green-600" : "text-red-600"
                  }`}>
                    {result.success ? "✅" : "❌"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-700">
              📊 <strong>Summary:</strong> {emailResults.filter(r => r.success).length} successful, {emailResults.filter(r => !r.success).length} failed out of {emailResults.length} total emails.
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedBusiness && (
        <div className="mt-8 p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium text-gray-800 mb-2">How to use Individual Strategy Email:</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. Search for an existing business by name</li>
            <li>2. Review and edit the business details if needed</li>
            <li>3. Select the solutions you want to send individual emails for</li>
            <li>4. Send individual strategy emails for each selected solution</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-700">
              📧 <strong>Individual Strategy Focus:</strong> This tool sends separate strategy emails for each selected solution,
              allowing you to target specific solutions to clients. Each email will contain detailed information about
              that particular solution tailored to the business.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}