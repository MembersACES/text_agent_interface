"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import GooglePresentationTool from "@/components/GooglePresentationTool";

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

export default function StrategyGeneratorPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const searchParams = useSearchParams();

  const [businessQuery, setBusinessQuery] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessInfo | null>(null);
  const [editableBusinessInfo, setEditableBusinessInfo] = useState<BusinessInfo | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [result, setResult] = useState("");

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
    
    // If no URL params, check session storage as before
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

  // Clear business info and start fresh
  const handleNewSearch = () => {
    setSelectedBusiness(null);
    setEditableBusinessInfo(null);
    setBusinessQuery("");
    setResult("");
    sessionStorage.removeItem('selectedBusinessInfo');
  };

  if (!token) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Please log in to use this feature.
        </div>
      </div>
    );
  }

  // Convert business info to the format expected by GooglePresentationTool
  const getBusinessInfoForPresentation = () => {
    if (!editableBusinessInfo) return {};
    
    return {
      name: editableBusinessInfo.business_name,
      abn: editableBusinessInfo.abn,
      trading_name: editableBusinessInfo.trading_as,
      email: editableBusinessInfo.email,
      telephone: editableBusinessInfo.telephone,
      postal_address: editableBusinessInfo.postal_address,
      site_address: editableBusinessInfo.site_address,
      contact_name: editableBusinessInfo.contact_name,
      position: editableBusinessInfo.position,
      industry: editableBusinessInfo.industry,
      website: editableBusinessInfo.website,
      googleDriveLink: editableBusinessInfo.client_folder_url,
      utilities: editableBusinessInfo.utilities,
      // Additional data that might come from Business Info tool
      retailers: editableBusinessInfo.retailers || []
    };
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">🎯 Business Solutions Presentation Generator</h1>

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

            {/* Utilities Display */}
            {editableBusinessInfo?.utilities && editableBusinessInfo.utilities.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Linked Utilities:</h4>
                <div className="flex flex-wrap gap-2">
                  {editableBusinessInfo.utilities.map((utility, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {utility}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 Solutions will be auto-suggested based on these utilities
                </p>
              </div>
            )}
            
            <div className="mt-3 text-xs text-gray-600">
              💡 Review and edit the information above before generating your presentation. All changes will be used in the generated presentation.
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

      {/* Strategy Generator Tool */}
      {selectedBusiness && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Generate Strategy Presentation</h2>
          <GooglePresentationTool 
            token={token} 
            initialBusinessInfo={getBusinessInfoForPresentation()}
          />
        </div>
      )}

      {/* Instructions */}
      {!selectedBusiness && (
        <div className="mt-8 p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium text-gray-800 mb-2">How to use:</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. Search for an existing business by name</li>
            <li>2. Review and edit the business details if needed</li>
            <li>3. Select the business solutions you want to include</li>
            <li>4. Generate your custom strategy presentation</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 <strong>Note:</strong> This page is for existing clients with business information already in the system. 
              For new clients, use the "New Client Creation" page to fill out all details manually.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}