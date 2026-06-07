"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";
import { BusinessSearchBar, WorkflowSection } from "@/components/workflow";
import { Button } from "@/components/ui/button";
import { InsightCallout } from "@/components/dashboard";

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
  client_id?: number | null;
}

interface SolutionOption {
  id: string;
  name: string;
  description: string;
  presentationId: string; 
  enabled: boolean;
}

interface GenerationResult {
  success: boolean;
  presentationUrl?: string;
  presentationId?: string;
  pdfUrl?: string;
  pdfId?: string;
  message: string;
  totalSlidesAdded?: number;
}

export default function InitialStrategyGeneratorPage() {
  const { data: session, status } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  useEffect(() => {
    console.log("=== SESSION DEBUG ===");
    console.log("Session status:", status);
    console.log("Raw session object:", JSON.stringify(session, null, 2));
    if (session) {
      console.log("Session keys:", Object.keys(session));
      console.log("User object:", (session as any)?.user);
      console.log("AccessToken:", (session as any)?.accessToken);
      console.log("ID Token:", (session as any)?.id_token);
      console.log("Account:", (session as any)?.account);
    }
    console.log("Final token being used:", token);
    console.log("====================");
  }, [session, status, token]);

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
  const [generationLoading, setGenerationLoading] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Available solution options for Initial Strategy
  const solutionOptions: SolutionOption[] = [
    {
      id: "profile_reset",
      name: "Profile Reset",
      description: "Comprehensive profile analysis and optimization strategies",
      presentationId: "1f75XSEKIdg-DVsuEAfutondUJKvvpEZLSh5AHxbkbyw",
      enabled: true
    },
    {
      id: "asset_optimisation",
      name: "Asset Optimisation",
      description: "Strategic asset management and optimization solutions",
      presentationId: "1810plJK5xtGqyJRq6hTaoT8RPrlh20yTTlD0OVhkD5Y",
      enabled: true
    },
    {
      id: "resource_recovery_initial",
      name: "Resource Recovery Initial Strategy",
      description: "Initial resource recovery and waste management strategies",
      presentationId: "1MtfW1A8zsoZILpgjonZMJNYFJgXGR3dYPXQgnAWyo0Q",
      enabled: true
    },
    {
      id: "ai_agents_knowledge",
      name: "AI Agents & Knowledge",
      description: "AI-powered agents and knowledge management systems",
      presentationId: "1gVbJs-BEFJJgmnn6K6cKiPbKb0dyggv6Lc1yn4ZT834",
      enabled: true
    },
    {
      id: "renewable_energy_initial",
      name: "Renewable Energy Solutions Initial Strategy",
      description: "Initial renewable energy assessment and strategy development",
      presentationId: "1gNNKqgASuRZz6_02cwt7ZgLvlHQwNZ9c2FvN23mnA2c",
      enabled: true
    },
    {
      id: "behaviour_modification",
      name: "Behaviour Modification",
      description: "Behavioral change strategies and implementation frameworks",
      presentationId: "1ZUNt8V55RNTcM3OCdtLLdaJEuh32Pm--SdQaXGWEzFc",
      enabled: true
    },
    {
      id: "material_range_initial",
      name: "Material Range Initial Strategy",
      description: "Initial material sourcing and range optimization strategies",
      presentationId: "1CUuNPYlZV5DpvbAjXQ4Kn4RI_90kt_ZW1aRWFnDS2Tg",
      enabled: true
    },
    {
      id: "automation_initial",
      name: "Automation Initial Strategy",
      description: "Initial automation assessment and implementation roadmap",
      presentationId: "1CHF41iyiBKqG8maUKsGddrEhH1vA2rCm8Lx6SAmmC8c",
      enabled: true
    },
    {
      id: "carbon_credit_offset_initial",
      name: "Australian Carbon Credit & Offset Initial Strategy",
      description: "Initial carbon credit and offset strategy development",
      presentationId: "1lbbiRFEd9Ho6--vIEL7EQXyn4b8UoL71aOJkrneZfkM",
      enabled: true
    }
  ];

  // Templates
  const COVER_PAGE_TEMPLATE_ID = "1vS7fu4PW18LR5-9vcLkkTN5c4Jro-Ko-DrAomdAMASM";

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
    const savedBusinessInfo = sessionStorage.getItem('selectedBusinessInfoInitial');
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
      sessionStorage.setItem('selectedBusinessInfoInitial', JSON.stringify(editableBusinessInfo));
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
        utilities: searchParams.get('utilities')?.split(',') || [],
        // client_id is not available in URL params; it will be populated when re-fetching from the API.
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
          utilities: data.utilities || [],
          client_id: typeof data.client_id === "number" ? data.client_id : null,
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

  const sendPresentation = async () => {
    setSending(true);
    setSuccessMessage(null);
    setErrorMessage(null);
  
    if (!generationResult?.pdfId || !editableBusinessInfo?.business_name || !session) {
      setErrorMessage("Missing required information to send presentation.");
      setSending(false);
      return;
    }
  
    try {
      const payload = {
        user: {
          name: (session as any)?.user?.name || "",
          email: (session as any)?.user?.email || ""
        },
        business_name: editableBusinessInfo.business_name,
        pdf_id: generationResult.pdfId
      };
  
      console.log("Sending presentation to n8n webhook:", payload);
  
      const res = await fetch("https://membersaces.app.n8n.cloud/webhook/email-bdm-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
  
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || `Request failed: ${res.statusText}`);
      }
  
      setSuccessMessage(`Presentation for "${editableBusinessInfo.business_name}" sent successfully!`);
    } catch (err: any) {
      console.error("Error sending presentation:", err);
      setErrorMessage(`Failed to send presentation: ${err.message}`);
    } finally {
      setSending(false);
    }
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

  // Select all solutions
  const selectAllSolutions = () => {
    const enabledSolutionIds = solutionOptions.filter(s => s.enabled).map(s => s.id);
    setSelectedSolutions(enabledSolutionIds);
  };

  // Clear all solutions
  const clearAllSolutions = () => {
    setSelectedSolutions([]);
  };

  const generateInitialStrategyPresentation = async () => {
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
  
      // Build solution templates - match the exact structure from your original
      const selectedSolutionTemplates = selectedSolutions.map(solutionId => {
        const solution = solutionOptions.find(s => s.id === solutionId);
        if (!solution) return null;
  
        return {
          id: solution.id,
          name: solution.name,
          description: solution.description,
          presentationId: solution.presentationId,
          enabled: solution.enabled,
          category: "initial_strategy" // Add category field that might be expected
        };
      }).filter(Boolean);

      const requestPayload = {
        businessInfo: {
          business_name: editableBusinessInfo.business_name,
          abn: editableBusinessInfo.abn,
          trading_as: editableBusinessInfo.trading_as,
          contact_name: editableBusinessInfo.contact_name,
          email: editableBusinessInfo.email,
          client_folder_url: editableBusinessInfo.client_folder_url,
        },
        selectedStrategies: selectedSolutions,
        coverPageTemplateId: COVER_PAGE_TEMPLATE_ID,
        strategyTemplates: selectedSolutionTemplates,
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
      
      console.log("API Response:", data);
      console.log("Response status:", response.status);
  
      if (response.ok && data.success) {
        const solutionNames = selectedSolutions.map(solutionId => 
          solutionOptions.find(s => s.id === solutionId)?.name
        ).filter(Boolean).join(', ');
  
        setGenerationResult({
          success: true,
          presentationUrl: data.presentationUrl,
          presentationId: data.presentationId,
          pdfUrl: data.pdfUrl,
          pdfId: data.pdfId,
          totalSlidesAdded: data.totalSlidesAdded,
          message: `✅ ${data.message || `Initial strategy presentation and PDF generated successfully for ${editableBusinessInfo.business_name} with ${solutionNames}`}`
        });
      } else {
        console.error("API Error Response:", data);
        
        let errorMessage = 'Unknown error';
        
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map((err: any) => {
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
      console.error("Initial strategy generation error:", error);
      setGenerationResult({
        success: false,
        message: `❌ Error generating initial strategy presentation: ${error.message}`
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
    sessionStorage.removeItem('selectedBusinessInfoInitial');
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
    <ToolPageLayout
      pageName="Initial Strategy Generator"
      title="Initial strategy generator"
      description="Generate initial strategy and proposals for a business."
      width="2xl"
    >
      <WorkflowSection title="Select business" step={1}>
        <BusinessSearchBar
          value={businessQuery}
          onChange={setBusinessQuery}
          onSearch={fetchBusinessInfo}
          loading={businessLoading}
        />

        {selectedBusiness && (
          <div className="mt-4 rounded-xl border border-green-200 bg-white p-4 dark:border-green-800/40 dark:bg-gray-dark">
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
            <Button variant="secondary" size="sm" onClick={handleNewSearch}>
              New business search
            </Button>
          </div>
        )}
      </WorkflowSection>

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
        <WorkflowSection title="Select initial strategy solutions" step={2}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={selectAllSolutions}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllSolutions}>
                Clear all
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {solutionOptions.map((solution) => (
              <div 
                key={solution.id} 
                className="bg-white dark:bg-gray-dark p-4 rounded-2xl border border-stroke hover:border-primary/40 transition-all duration-200 hover:shadow-sm dark:border-dark-3"
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id={solution.id}
                    checked={selectedSolutions.includes(solution.id)}
                    onChange={() => handleSolutionToggle(solution.id)}
                    disabled={!solution.enabled}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <label 
                      htmlFor={solution.id} 
                      className="block text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-700 transition-colors"
                    >
                      {solution.name}
                    </label>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{solution.description}</p>
                    {!solution.enabled && (
                      <p className="text-xs text-gray-400 mt-1 italic">Coming soon...</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedSolutions.length > 0 && (
            <div className="mt-6 p-4 rounded-2xl border border-primary/20 bg-primary/5">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-primary">
                  Selected solutions ({selectedSolutions.length} of {solutionOptions.length})
                </h4>
                <button
                  onClick={clearAllSolutions}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSolutions.map(solutionId => {
                  const solution = solutionOptions.find(s => s.id === solutionId);
                  return solution ? (
                    <span 
                      key={solutionId} 
                      className="inline-flex items-center bg-primary/10 px-2 py-1 rounded-full text-xs text-primary"
                    >
                      {solution.name}
                      <button
                        onClick={() => handleSolutionToggle(solutionId)}
                        className="ml-1 text-primary hover:text-primary/80 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </WorkflowSection>
      )}

      {selectedBusiness && selectedSolutions.length > 0 && (
        <WorkflowSection title="Generate initial strategy presentation" step={3}>
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              This will create a custom initial strategy presentation including:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
              <li>Cover page with business details ({editableBusinessInfo?.business_name})</li>
              {selectedSolutions.map(solutionId => {
                const solution = solutionOptions.find(s => s.id === solutionId);
                return solution ? <li key={solutionId}>{solution.name} strategy slides</li> : null;
              })}
            </ul>
          </div>

          <Button
            onClick={generateInitialStrategyPresentation}
            disabled={generationLoading}
            loading={generationLoading}
            size="lg"
          >
            Generate initial strategy presentation
          </Button>
        </WorkflowSection>
      )}
      {generationResult && (
        <div className={`mb-6 p-6 rounded-lg border ${
          generationResult.success 
            ? "bg-green-50 border-green-200" 
            : "bg-red-50 border-red-200"
        }`}>
          <h3 className={`font-semibold mb-3 ${
            generationResult.success ? "text-green-800" : "text-red-800"
          }`}>
            {generationResult.success ? "✅ Initial Strategy Presentation Generated!" : "❌ Generation Failed"}
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
                    className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    📝 Edit Presentation
                  </a>
                </div>
              )}

              <div>
              <button
                onClick={sendPresentation}
                disabled={sending}
                className={`px-4 py-2 rounded-md text-white text-sm font-medium transition-colors
                  ${sending ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
              >
                {sending ? "Sending Presentation..." : "📤 Send Presentation"}
              </button>
              </div>

              {/* ✅ Success/Error messages go here */}
              {successMessage && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3 text-sm text-green-700">{successMessage}</div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10A8 8 0 11.001 10 8 8 0 0118 10zm-7-4a1 1 0 10-2 0v3a1 1 0 002 0V6zm-1 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3 text-sm text-red-700">{errorMessage}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Instructions */}
      {!selectedBusiness && (
        <InsightCallout title="How to use">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Search for an existing business by name</li>
            <li>Review and edit the business details if needed</li>
            <li>Select the initial strategy solutions you want to include</li>
            <li>Generate your custom initial strategy presentation</li>
          </ol>
          <p className="mt-3">
            <strong>Initial strategy focus:</strong> foundational presentations with Profile Reset, Asset Optimisation,
            Resource Recovery, AI Agents, Renewable Energy, and related solutions.
          </p>
        </InsightCallout>
      )}
    </ToolPageLayout>
  );
}