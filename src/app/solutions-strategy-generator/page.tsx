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

interface SolutionOption {
  id: string;
  name: string;
  description: string;
  presentationId: string; 
  enabled: boolean;
  category: string; // 'branding' | 'service' | 'equipment'
}

interface GenerationResult {
  success: boolean;
  presentationUrl?: string;
  pdfUrl?: string;
  message: string;
}

export default function StrategyGeneratorPage() {
  const { data: session, status } = useSession();
  console.log("Session status:", status);
  console.log("Session data:", session);
  const searchParams = useSearchParams();

  const [businessQuery, setBusinessQuery] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessInfo | null>(null);
  const [editableBusinessInfo, setEditableBusinessInfo] = useState<BusinessInfo | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [result, setResult] = useState("");

  // Solution selection state
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['platform']); // Start with platform expanded
  const [generationLoading, setGenerationLoading] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  // Available solution options
  const solutionOptions: SolutionOption[] = [
    // Sustainable Platform
    {
      id: "sustainable_platforms",
      name: "Sustainable Platforms",
      description: "Comprehensive sustainable platform solutions using generic branding template",
      presentationId: "1k1X6omqY14uvU6a7O5SZ0T028N8OcTupLDbDjGht7tI",
      enabled: true,
      category: "platform"
    },
    
    // Solutions AI-Bot
    {
      id: "assisted_scrubber",
      name: "Assisted Scrubber",
      description: "AI-powered assisted scrubbing solutions for automated cleaning",
      presentationId: "1N-eSEG4nfU-D4GclpmslyvEct5bWEPqu7xWZ5ohyUPA",
      enabled: true,
      category: "ai_bot"
    },
    {
      id: "scrubber_ai_bot",
      name: "Scrubber - Assisted AI Bot",
      description: "Advanced AI bot for intelligent scrubbing operations",
      presentationId: "1N-eSEG4nfU-D4GclpmslyvEct5bWEPqu7xWZ5ohyUPA",
      enabled: true,
      category: "ai_bot"
    },
    {
      id: "vacuum_mopping_ai_bot",
      name: "Vacuum-Mopping AI Bot",
      description: "Comprehensive vacuum and mopping AI bot system",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "ai_bot"
    },
    {
      id: "engagement_bot",
      name: "Engagement Bot",
      description: "AI-powered customer engagement and interaction bot",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "ai_bot"
    },
    {
      id: "filtering_cleaning_bot",
      name: "Filtering & Cleaning Assisted Bot",
      description: "Advanced filtering and cleaning assistance through AI automation",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "ai_bot"
    },
    
    // Event Referral
    {
      id: "event_referral",
      name: "Event Referral",
      description: "Comprehensive event referral and management system",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "referral"
    },
    
    // Profile Reset
    {
      id: "electricity_ci_sme_align",
      name: "Electricity C&I & SME Align Forward",
      description: "Commercial & Industrial and SME electricity alignment solutions",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "profile_reset"
    },
    {
      id: "electricity_gas_discrepancy",
      name: "Electricity & Gas Discrepancy Review",
      description: "Comprehensive review and analysis of electricity and gas discrepancies",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "profile_reset"
    },
    {
      id: "waste_review",
      name: "Waste Review",
      description: "Complete waste management and optimization review",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "profile_reset"
    },
    
    // AI Automation
    {
      id: "phone_agent",
      name: "Phone Agent",
      description: "AI-powered phone automation and customer service agent",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "ai_automation"
    },
    {
      id: "booking_digital_receptionist",
      name: "Booking Digital Receptionist",
      description: "Automated booking and digital receptionist services",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "ai_automation"
    },
    
    // Renewable Energy
    {
      id: "solar_monitoring",
      name: "Solar Monitoring",
      description: "Advanced solar system monitoring and optimization",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "renewable_energy"
    },
    {
      id: "solar_rooftop",
      name: "Solar Rooftop",
      description: "Rooftop solar installation and management solutions",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "renewable_energy"
    },
    {
      id: "solar_car_park",
      name: "Solar Car Park",
      description: "Solar carport and parking lot energy solutions",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "renewable_energy"
    },
    {
      id: "solar_farm",
      name: "Solar Farm",
      description: "Large-scale solar farm development and management",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "renewable_energy"
    },
    {
      id: "quote_review_recommendation",
      name: "Quote Review & Recommendation",
      description: "Expert review and recommendations for renewable energy quotes",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "renewable_energy"
    },
    
    // Resource Recovery
    {
      id: "cardboard_bin_recycling",
      name: "Cardboard Bin Recycling",
      description: "Cardboard bin collection and recycling services",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "cardboard_bales_recycling",
      name: "Cardboard Bales Recycling",
      description: "Cardboard bale processing and recycling solutions",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "wax_cardboard",
      name: "Wax Cardboard Recycling",
      description: "Specialized wax cardboard recycling and processing",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "organic_waste_diversion",
      name: "Organic Waste Diversion",
      description: "Organic waste collection and diversion programs",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "glass_bottles_recycling",
      name: "Glass Bottles Recycling",
      description: "Glass bottle collection and recycling services",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "wood_offcut_recycling",
      name: "Wood Offcut Recycling",
      description: "Wood waste and offcut recycling solutions",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "baled_plastic_recycling",
      name: "Baled Plastic Recycling",
      description: "Plastic baling and recycling management",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "resource_recovery"
    },
    {
      id: "used_cooking_oil",
      name: "Used Cooking Oil Collection",
      description: "Commercial cooking oil collection and recycling services",
      presentationId: "1qppczXwSy56UkLpOsE42ASiwZ8QlbKArN8EhTMqJz6w",
      enabled: true,
      category: "resource_recovery"
    },
    
    // Asset Optimisation
    {
      id: "renewable_certificates",
      name: "Self-Managed Renewable Certificates",
      description: "Management and optimization of renewable energy certificates",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "asset_optimisation"
    },
    {
      id: "carbon_credits_offset",
      name: "Australian Carbon Credit and Carbon Offset",
      description: "Carbon credit management and offset solutions",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "asset_optimisation"
    },
    {
      id: "state_government_incentives",
      name: "State Government Incentives",
      description: "State-level government incentive programs and applications",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "asset_optimisation"
    },
    {
      id: "federal_government_incentives",
      name: "Federal Government Incentives",
      description: "Federal government incentive programs and grant applications",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "asset_optimisation"
    },
    {
      id: "electricity_demand_response",
      name: "Electricity Demand Response",
      description: "Demand response programs and grid optimization services",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "asset_optimisation"
    },
    
    // Other Solutions (will be categorized later)
    {
      id: "backup_power_generators",
      name: "Back-up Power Generators",
      description: "Emergency backup power generation solutions",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "other"
    },
    {
      id: "door_curtain_refrigerator",
      name: "Solution Door Curtain Refrigerator",
      description: "Energy-efficient refrigerator door curtain solutions",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "other"
    },
    {
      id: "greenhouse_gas_centre",
      name: "Greenhouse Gas Centre",
      description: "Greenhouse gas monitoring and management center",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true,
      category: "other"
    }
  ];

  // Templates
  const COVER_PAGE_TEMPLATE_ID = "1k1X6omqY14uvU6a7O5SZ0T028N8OcTupLDbDjGht7tI";

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
    const savedBusinessInfo = sessionStorage.getItem('selectedBusinessInfo');
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
      sessionStorage.setItem('selectedBusinessInfo', JSON.stringify(editableBusinessInfo));
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
        setEditableBusinessInfo({...businessInfo}); // Create editable copy
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

  const categoryLabels = {
    platform: "🌱 Sustainable Platform",
    ai_bot: "🤖 Solutions AI-Bot",
    referral: "📅 Event Referral",
    profile_reset: "🔄 Profile Reset",
    ai_automation: "⚡ AI Automation",
    renewable_energy: "☀️ Renewable Energy",
    resource_recovery: "♻️ Resource Recovery",
    asset_optimisation: "📈 Asset Optimisation",
    other: "🔧 Other Solutions"
  };

  const generateStrategyPresentation = async () => {
    if (!editableBusinessInfo || selectedSolutions.length === 0) {
      setGenerationResult({
        success: false,
        message: "❌ Please select at least one solution option."
      });
      return;
    }
  
    setGenerationLoading(true);
    setGenerationResult(null);
  
    try {
      // Get current date info for placeholders
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      const currentYear = currentDate.getFullYear().toString();
  
      // Build solution templates
      const selectedSolutionTemplates = selectedSolutions.map(solutionId => {
        const solution = solutionOptions.find(s => s.id === solutionId);
        if (!solution) return null;
  
        return {
          id: solution.id,
          name: solution.name,
          description: solution.description,
          presentationId: solution.presentationId,
          enabled: solution.enabled,
          category: solution.category
        };
      }).filter(Boolean);

      // Log the request payload for debugging
      const requestPayload = {
        businessInfo: {
          business_name: editableBusinessInfo.business_name,
          abn: editableBusinessInfo.abn,
          trading_as: editableBusinessInfo.trading_as,
          client_folder_url: editableBusinessInfo.client_folder_url,
        },
        selectedStrategies: selectedSolutions, // Changed from selectedSolutions
        coverPageTemplateId: COVER_PAGE_TEMPLATE_ID,
        strategyTemplates: selectedSolutionTemplates, // Changed from solutionTemplates
        placeholders: {
          BusinessName: editableBusinessInfo.business_name,
          month: currentMonth,
          year: currentYear
        },
        clientFolderUrl: editableBusinessInfo.client_folder_url
      };

      console.log("Request payload:", JSON.stringify(requestPayload, null, 2));

      const response = await fetch(`${getApiBaseUrl()}/api/generate-strategy-presentation-real`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      });
  
      if (response.status === 401) {
        dispatchReauthEvent();
        setGenerationResult({
          success: false,
          message: "Session expired. Please wait while we refresh your authentication..."
        });
        return;
      }
  
      const data = await response.json();
      
      // Log the response for debugging
      console.log("API Response:", data);
      console.log("Response status:", response.status);
  
      if (response.ok && data.success) {
        const solutionNames = selectedSolutions.map(solutionId => 
          solutionOptions.find(s => s.id === solutionId)?.name
        ).filter(Boolean).join(', ');
  
        setGenerationResult({
          success: true,
          presentationUrl: data.presentationUrl,
          pdfUrl: data.pdfUrl,
          message: `✅ ${data.message || `Strategy presentation generated successfully for ${editableBusinessInfo.business_name} with ${solutionNames}`}`
        });
      } else {
        // Log the full error response for debugging
        console.error("API Error Response:", data);
        
        let errorMessage = 'Unknown error';
        
        // Handle different error response formats
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            // Handle validation errors (array of objects)
            errorMessage = data.detail.map(err => {
              if (typeof err === 'object') {
                return `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg || JSON.stringify(err)}`;
              }
              return String(err);
            }).join('; ');
          } else if (typeof data.detail === 'object') {
            errorMessage = JSON.stringify(data.detail);
          } else {
            errorMessage = String(data.detail);
          }
        } else if (data.error) {
          errorMessage = String(data.error);
        } else if (data.message) {
          errorMessage = String(data.message);
        }
        
        if (errorMessage.includes('refresh') || errorMessage.includes('401')) {
          errorMessage = 'Authentication token expired. Please log out and log back in to refresh your credentials.';
        }
        
        setGenerationResult({
          success: false,
          message: `❌ Error generating presentation: ${errorMessage}`
        });
      }
    } catch (error: any) {
      console.error("Strategy generation error:", error);
      setGenerationResult({
        success: false,
        message: `❌ Error generating strategy presentation: ${error.message}`
      });
    }
  
    setGenerationLoading(false);
  };

  // Clear business info and start fresh
  const handleNewSearch = () => {
    setSelectedBusiness(null);
    setEditableBusinessInfo(null);
    setBusinessQuery("");
    setResult("");
    setSelectedSolutions([]);
    setGenerationResult(null);
    sessionStorage.removeItem('selectedBusinessInfo');
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
      <h1 className="text-3xl font-bold mb-8 text-gray-800">🎯 Business Strategy Generator</h1>

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

      {/* Generate Presentation Section */}
      {selectedBusiness && selectedSolutions.length > 0 && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Generate Strategy Presentation</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              This will create a custom presentation including:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Cover page with business details ({editableBusinessInfo?.business_name})</li>
              {selectedSolutions.map(solutionId => {
                const solution = solutionOptions.find(s => s.id === solutionId);
                return solution ? <li key={solutionId}>• {solution.name} slides</li> : null;
              })}
            </ul>
          </div>

          <button
            onClick={generateStrategyPresentation}
            disabled={generationLoading}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {generationLoading ? "Generating Presentation..." : "🎯 Generate Strategy Presentation"}
          </button>
        </div>
      )}

      {/* Generation Result */}
      {generationResult && (
        <div className={`mb-6 p-6 rounded-lg border ${
          generationResult.success 
            ? "bg-green-50 border-green-200" 
            : "bg-red-50 border-red-200"
        }`}>
          <h3 className={`font-semibold mb-3 ${
            generationResult.success ? "text-green-800" : "text-red-800"
          }`}>
            {generationResult.success ? "✅ Presentation Generated!" : "❌ Generation Failed"}
          </h3>
          
          <p className={`text-sm mb-4 ${
            generationResult.success ? "text-green-700" : "text-red-700"
          }`}>
            {generationResult.message}
          </p>

          {generationResult.success && (
            <div className="space-y-3">
              {generationResult.pdfUrl && (
                <div>
                  <a
                    href={generationResult.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    📄 Download PDF
                  </a>
                </div>
              )}
              
              {generationResult.presentationUrl && (
                <div>
                  <a
                    href={generationResult.presentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    📝 Edit Presentation
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!selectedBusiness && (
        <div className="mt-8 p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium text-gray-800 mb-2">How to use:</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. Search for an existing business by name</li>
            <li>2. Review and edit the business details if needed</li>
            <li>3. Select the solutions you want to include in the presentation</li>
            <li>4. Generate your custom strategy presentation</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 <strong>Note:</strong> This page is for existing clients with business information already in the system. 
              Solutions are organized by category: Branding & Visual Identity, Service Solutions, and Equipment Solutions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}