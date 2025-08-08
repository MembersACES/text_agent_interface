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

interface BrandOption {
  id: string;
  name: string;
  description: string;
  presentationId: string;
}

interface StrategyOption {
  id: string;
  name: string;
  description: string;
  presentationId: string; 
  enabled: boolean;
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

  // Brand selection state
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  // Strategy selection state
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [generationLoading, setGenerationLoading] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  // Available brand options
  const brandOptions: BrandOption[] = [
    {
      id: "sustainable_supermarkets",
      name: "Sustainable Supermarkets",
      description: "Supermarket-specific branding and solutions",
      presentationId: "1k1X6omqY14uvU6a7O5SZ0T028N8OcTupLDbDjGht7tI"
    },
    {
      id: "sustainable_clubs",
      name: "Sustainable Clubs",
      description: "Club and hospitality-specific branding and solutions",
      presentationId: "1k1X6omqY14uvU6a7O5SZ0T028N8OcTupLDbDjGht7tI"
    },
    {
      id: "sustainable_hotels",
      name: "Sustainable Hotels",
      description: "Hotel and accommodation-specific branding and solutions",
      presentationId: "1k1X6omqY14uvU6a7O5SZ0T028N8OcTupLDbDjGht7tI"
    }
  ];

  // Available strategy options with brand-specific presentation IDs
  const strategyOptions: StrategyOption[] = [
    {
      id: "cooking_oil",
      name: "Cooking Oil Solution",
      description: "Cooking oil collection and recycling services for businesses",
      presentationId: "1qppczXwSy56UkLpOsE42ASiwZ8QlbKArN8EhTMqJz6w",
      enabled: true
    },
    {
      id: "cleaning_bot_scrubbing",
      name: "Cleaning Robot - Scrubber",
      description: "Cleaning robot visuals - scrubber",
      presentationId: "1N-eSEG4nfU-D4GclpmslyvEct5bWEPqu7xWZ5ohyUPA",
      enabled: true
    },
    {
      id: "cleaning_bot_vacuum",
      name: "Cleaning Robot - Vacuum",
      description: "Cleaning robot visuals - vacuum",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true
    },
    {
      id: "other",
      name: "Other",
      description: "Placeholder",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true
    },
    {
      id: "Discrepancy_Request",
      name: "Discrepancy_Request",
      description: "Discrepancy SME Reviews",
      presentationId: "1ziS3mDgvA25PzcltLnYPv_SKG-BiJV63pemL91YrPfE",
      enabled: true
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

  // Handle brand selection
  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  // Handle strategy selection
  const handleStrategyToggle = (strategyId: string) => {
    setSelectedStrategies(prev => 
      prev.includes(strategyId) 
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId]
    );
  };

  
  const generateStrategyPresentation = async () => {
    if (!editableBusinessInfo || (selectedStrategies.length === 0 && selectedBrands.length === 0)) {
      setGenerationResult({
        success: false,
        message: "❌ Please select at least one brand or strategy option."
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
  
      // Build strategy templates - combining both brands and strategies
      const allTemplates = [
        // Add brand templates
        ...selectedBrands.map(brandId => {
          const brand = brandOptions.find(b => b.id === brandId);
          if (!brand) return null;
  
          return {
            id: brand.id,
            name: brand.name,
            description: brand.description,
            presentationId: brand.presentationId,
            enabled: true,
            type: 'brand'
          };
        }),
        // Add strategy templates
        ...selectedStrategies.map(strategyId => {
          const strategy = strategyOptions.find(s => s.id === strategyId);
          if (!strategy) return null;
  
          return {
            id: strategy.id,
            name: strategy.name,
            description: strategy.description,
            presentationId: strategy.presentationId,
            enabled: strategy.enabled,
            type: 'strategy'
          };
        })
      ].filter(Boolean);
  
      const response = await fetch(`${getApiBaseUrl()}/api/generate-strategy-presentation-real`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessInfo: {
            business_name: editableBusinessInfo.business_name,
            abn: editableBusinessInfo.abn,
            trading_as: editableBusinessInfo.trading_as,
            client_folder_url: editableBusinessInfo.client_folder_url,
          },
          selectedStrategies: selectedStrategies,
          selectedBrands: selectedBrands,
          coverPageTemplateId: COVER_PAGE_TEMPLATE_ID,
          strategyTemplates: allTemplates,
          placeholders: {
            BusinessName: editableBusinessInfo.business_name,
            month: currentMonth,
            year: currentYear
          },
          clientFolderUrl: editableBusinessInfo.client_folder_url
        }),
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
  
      if (response.ok && data.success) {
        const brandNames = selectedBrands.map(brandId => 
          brandOptions.find(b => b.id === brandId)?.name
        ).filter(Boolean).join(', ');
        
        const strategyNames = selectedStrategies.map(strategyId => 
          strategyOptions.find(s => s.id === strategyId)?.name
        ).filter(Boolean).join(', ');
  
        let solutionsText = "";
        if (brandNames && strategyNames) {
          solutionsText = `${brandNames} and ${strategyNames}`;
        } else if (brandNames) {
          solutionsText = brandNames;
        } else if (strategyNames) {
          solutionsText = strategyNames;
        }
  
        setGenerationResult({
          success: true,
          presentationUrl: data.presentationUrl,
          pdfUrl: data.pdfUrl,
          message: `✅ ${data.message || `Strategy presentation generated successfully for ${editableBusinessInfo.business_name} with ${solutionsText}`}`
        });
      } else {
        let errorMessage = data.detail || data.error || 'Unknown error';
        
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
    setSelectedBrands([]);
    setSelectedStrategies([]);
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

      {/* Brand Selection Section */}
      {selectedBusiness && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Select Brand/Industry Type</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {brandOptions.map((brand) => (
              <div key={brand.id} className="flex items-start space-x-3 p-4 bg-white rounded border border-gray-200">
                <input
                  type="checkbox"
                  id={brand.id}
                  checked={selectedBrands.includes(brand.id)}
                  onChange={() => handleBrandToggle(brand.id)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor={brand.id} className="block text-sm font-medium text-gray-900 cursor-pointer">
                    {brand.name}
                  </label>
                  <p className="text-sm text-gray-600 mt-1">{brand.description}</p>
                </div>
              </div>
            ))}
          </div>

          {selectedBrands.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-700">
                ✅ {selectedBrands.length} brand{selectedBrands.length !== 1 ? 's' : ''} selected: {selectedBrands.map(brandId => 
                  brandOptions.find(b => b.id === brandId)?.name
                ).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Strategy Selection Section */}
      {selectedBusiness && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Select Strategy Solutions</h2>
          
          <div className="space-y-4">
            {strategyOptions.map((strategy) => (
              <div key={strategy.id} className="flex items-start space-x-3 p-4 bg-white rounded border border-gray-200">
                <input
                  type="checkbox"
                  id={strategy.id}
                  checked={selectedStrategies.includes(strategy.id)}
                  onChange={() => handleStrategyToggle(strategy.id)}
                  disabled={!strategy.enabled}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor={strategy.id} className="block text-sm font-medium text-gray-900 cursor-pointer">
                    {strategy.name}
                  </label>
                  <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
                  {!strategy.enabled && (
                    <p className="text-xs text-gray-400 mt-1">Coming soon...</p>
                  )}
                  {selectedBrands.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        Available for: {selectedBrands.map(brandId => 
                          brandOptions.find(b => b.id === brandId)?.name
                        ).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedStrategies.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
              <p className="text-sm text-green-700">
                ✅ {selectedStrategies.length} strategy solution{selectedStrategies.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generate Presentation Section */}
      {selectedBusiness && (selectedBrands.length > 0 || selectedStrategies.length > 0) && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">4. Generate Strategy Presentation</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              This will create a custom presentation including:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Cover page with business details ({editableBusinessInfo?.business_name})</li>
              <li>• Branded templates for: {selectedBrands.map(brandId => 
                brandOptions.find(b => b.id === brandId)?.name
              ).join(', ')}</li>
              {selectedStrategies.map(strategyId => {
                const strategy = strategyOptions.find(s => s.id === strategyId);
                return strategy ? <li key={strategyId}>• {strategy.name} slides</li> : null;
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
            <li>3. Select the brand/industry type for appropriate branding</li>
            <li>4. Select the strategy solutions you want to include</li>
            <li>5. Generate your custom strategy presentation</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 <strong>Note:</strong> This page is for existing clients with business information already in the system. 
              The brand selection determines which template designs and logos will be used for each solution.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}