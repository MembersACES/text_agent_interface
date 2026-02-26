"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/Layouts/PageHeader";

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
  client_id?: number | null;
}

interface DocumentFormData extends BusinessInfo {
  expression_type?: string;
  engagement_form_type?: string;
}

type DocumentCategory = "business-documents" | "eoi" | "engagement-forms";
type BusinessDocumentType = "loa" | "service-agreement";
type DocumentType = BusinessDocumentType | "eoi" | "engagement-form";

const DOCUMENT_CATEGORIES = {
  "business-documents": {
    label: "📄 Business Documents",
    description: "Generate essential business documents (LOA, Service Agreements)"
  },
  eoi: {
    label: "📨 Expression of Interest",
    description: "Generate EOI documents for various services and programs"
  },
  "engagement-forms": {
    label: "📋 Engagement Forms",
    description: "Generate Engagement Form documents for various services and programs"
  }
};

const BUSINESS_DOCUMENT_TYPES = {
  loa: {
    label: "📄 Letter of Authority",
    description: "Authorizes ACES to act on behalf of the business",
    apiEndpoint: "/api/generate-loa"
  },
  "service-agreement": {
    label: "📝 Service Fee Agreement", 
    description: "Outlines the service terms and fees",
    apiEndpoint: "/api/generate-service-agreement"
  }
};

const DOCUMENT_TYPES = {
  loa: {
    label: "📄 Letter of Authority",
    description: "Generate a Letter of Authority document",
    apiEndpoint: "/api/generate-loa"
  },
  "service-agreement": {
    label: "📝 Service Fee Agreement", 
    description: "Generate a Service Fee Agreement document",
    apiEndpoint: "/api/generate-service-agreement"
  },
  eoi: {
    label: "📨 Expression of Interest",
    description: "Generate an Expression of Interest document",
    apiEndpoint: "/api/generate-eoi"
  },
  "ghg-offer": {
    label: "🌱 GHG Offer",
    description: "Generate a GHG Offer document",
    apiEndpoint: "/api/generate-ghg-offer"
  }
};

export default function DocumentGenerationPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [businessQuery, setBusinessQuery] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessInfo | null>(null);
  const [editableBusinessInfo, setEditableBusinessInfo] = useState<BusinessInfo | null>(null);
  
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
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | "">("");
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState<DocumentCategory | "">("");
  const [selectedBusinessDocumentType, setSelectedBusinessDocumentType] = useState<BusinessDocumentType | "">("");
  const [eoiTypes, setEoiTypes] = useState<string[]>([]);
  const [selectedEoiType, setSelectedEoiType] = useState("");
  const [engagementFormTypes, setEngagementFormTypes] = useState<string[]>([]);
  const [selectedEngagementFormType, setSelectedEngagementFormType] = useState("");
  const [loading, setLoading] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [result, setResult] = useState("");
  const searchParams = useSearchParams();
  
  // Get category filter from URL
  const categoryFilter = searchParams.get('categoryFilter');
  
  // Filter categories based on URL parameter
  const filteredCategories = React.useMemo(() => {
    if (categoryFilter === 'business-documents') {
      return { "business-documents": DOCUMENT_CATEGORIES["business-documents"] };
    } else if (categoryFilter === 'eoi-ef') {
      return {
        eoi: DOCUMENT_CATEGORIES.eoi,
        "engagement-forms": DOCUMENT_CATEGORIES["engagement-forms"]
      };
    }
    // No filter - show all categories
    return DOCUMENT_CATEGORIES;
  }, [categoryFilter]);

  // Fetch available EOI types when component mounts
  useEffect(() => {
    const fetchEoiTypes = async () => {
      if (!token) return;
      
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/eoi-types`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setEoiTypes(data.eoi_types || []);
        }
      } catch (error) {
        console.error("Error fetching EOI types:", error);
      }
    };

    fetchEoiTypes();
  }, [token]);

  // Fetch available Engagement Form types when component mounts
  useEffect(() => {
    const fetchEngagementFormTypes = async () => {
      if (!token) return;
      
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/engagement-form-types`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setEngagementFormTypes(data.engagement_form_types || []);
        }
      } catch (error) {
        console.error("Error fetching Engagement Form types:", error);
      }
    };

    fetchEngagementFormTypes();
  }, [token]);

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

  useEffect(() => {
    // First check for URL parameters (from Generate Documents button)
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
        // client_id is not available in URL params; it will be populated when re-fetching from the API.
      };
      
      setSelectedBusiness(businessInfoFromUrl);
      setEditableBusinessInfo({...businessInfoFromUrl});
      setResult(`✅ Business information loaded from link: ${businessInfoFromUrl.business_name}`);
      
      // Show business info section if coming from URL
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
  
  // Auto-select category if filter is applied and only one category available
  useEffect(() => {
    const categoryKeys = Object.keys(filteredCategories);
    if (categoryKeys.length === 1 && !selectedDocumentCategory) {
      setSelectedDocumentCategory(categoryKeys[0] as DocumentCategory);
    }
  }, [filteredCategories, selectedDocumentCategory]);
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
    setSelectedEoiType("");
    setSelectedEngagementFormType("");
    setSelectedBusinessDocumentType("");
    setSelectedDocumentCategory("");
    setResult("");
    sessionStorage.removeItem('selectedBusinessInfo');
  };

  // Reset document selections when category changes
  useEffect(() => {
    setSelectedEoiType("");
    setSelectedEngagementFormType("");
    setSelectedBusinessDocumentType("");
  }, [selectedDocumentCategory]);

  // Generate document
  const handleGenerateDocument = async () => {
    if (!token) {
      setResult("❌ Authentication required. Please log in.");
      return;
    }

    if (!editableBusinessInfo) {
      setResult("❌ Please search and select a business first.");
      return;
    }

    if (!selectedDocumentCategory) {
      setResult("❌ Please select a document category first.");
      return;
    }

    if (selectedDocumentCategory === "business-documents" && !selectedBusinessDocumentType) {
      setResult("❌ Please select a business document type.");
      return;
    }

    if (selectedDocumentCategory === "eoi" && !selectedEoiType) {
      setResult("❌ Please select an Expression of Interest type.");
      return;
    }

    if (selectedDocumentCategory === "engagement-forms" && !selectedEngagementFormType) {
      setResult("❌ Please select an Engagement Form type.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      let endpoint: string;
      let formData: DocumentFormData;

      if (selectedDocumentCategory === "eoi") {
        endpoint = "/api/generate-eoi";
        formData = {
          ...editableBusinessInfo,
          expression_type: selectedEoiType
        };
      } else if (selectedDocumentCategory === "engagement-forms") {
        endpoint = "/api/generate-engagement-form";
        formData = {
          ...editableBusinessInfo,
          engagement_form_type: selectedEngagementFormType
        };
      } else {
        // Business documents
        if (!selectedBusinessDocumentType) {
          setResult("❌ Please select a business document type.");
          return;
        }
        endpoint = BUSINESS_DOCUMENT_TYPES[selectedBusinessDocumentType].apiEndpoint;
        formData = { ...editableBusinessInfo };
      }

      const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setResult(`✅ ${data.message}\n\n📄 **Document Link:** ${data.document_link}\n📁 **Client Folder:** ${data.client_folder_url}`);
        
        // Reset selections but keep business info
        setSelectedEoiType("");
        setSelectedEngagementFormType("");
        setSelectedBusinessDocumentType("");
        setBusinessQuery("");
      } else {
        setResult(`❌ Generation failed: ${data.message || data.detail || response.statusText}`);
      }
    } catch (error: any) {
      console.error("Document generation error:", error);
      setResult(`❌ Error: ${error.message}`);
    }

    setLoading(false);
  };

  const canGenerate =
    editableBusinessInfo &&
    selectedDocumentCategory &&
    (selectedDocumentCategory !== "business-documents" || selectedBusinessDocumentType) &&
    (selectedDocumentCategory !== "eoi" || selectedEoiType) &&
    (selectedDocumentCategory !== "engagement-forms" || selectedEngagementFormType);

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 pb-28 bg-white dark:bg-gray-dark rounded-lg shadow-lg">
      <PageHeader pageName="Document Generation" description="Create LOA, EOI, engagement forms, and other client documents." />

      {/* Step 1: Business */}
      <section className="mb-10 pl-4 border-l-4 border-primary/30 dark:border-primary/40">
        <h2 className="text-heading-6 font-bold text-dark dark:text-white mb-1">Step 1</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select business</p>
        <div className="p-6 bg-gray-50 dark:bg-dark-2 rounded-lg">
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
            
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              💡 Review and edit the information above before generating your document. All changes will be used in the generated document.
            </div>
          </div>
        )}
        </div>
      </section>

      {/* Step 2: Document Category */}
      <section className="mb-10 pl-4 border-l-4 border-primary/30 dark:border-primary/40">
        <h2 className="text-heading-6 font-bold text-dark dark:text-white mb-1">Step 2</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select document category</p>
        <div className="mb-8">
        <div className={`grid grid-cols-1 ${Object.keys(filteredCategories).length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-md mx-auto'} gap-4`}>
          {Object.entries(filteredCategories).map(([category, config]) => (
            <div
              key={category}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedDocumentCategory === category
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedDocumentCategory(category as DocumentCategory)}
            >
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  checked={selectedDocumentCategory === category}
                  onChange={() => setSelectedDocumentCategory(category as DocumentCategory)}
                  className="mr-3"
                />
                <h3 className="font-semibold text-lg">{config.label}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{config.description}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Step 3: Document type (conditional) */}
      {selectedDocumentCategory === "business-documents" && (
        <section className="mb-10 pl-4 border-l-4 border-primary/30 dark:border-primary/40">
          <h2 className="text-heading-6 font-bold text-dark dark:text-white mb-1">Step 3</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select business document type</p>
          <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(BUSINESS_DOCUMENT_TYPES).map(([type, config]) => (
              <div
                key={type}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedBusinessDocumentType === type
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedBusinessDocumentType(type as BusinessDocumentType)}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    checked={selectedBusinessDocumentType === type}
                    onChange={() => setSelectedBusinessDocumentType(type as BusinessDocumentType)}
                    className="mr-3"
                  />
                  <h3 className="font-semibold text-lg">{config.label}</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{config.description}</p>
              </div>
            ))}
          </div>
          </div>
        </section>
      )}

      {selectedDocumentCategory === "eoi" && (
        <section className="mb-10 pl-4 border-l-4 border-primary/30 dark:border-primary/40">
          <h2 className="text-heading-6 font-bold text-dark dark:text-white mb-1">Step 3</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select EOI type</p>
          <div className="mb-8">
          <select
            value={selectedEoiType}
            onChange={(e) => setSelectedEoiType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select EOI type...</option>
            {eoiTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          </div>
        </section>
      )}

      {selectedDocumentCategory === "engagement-forms" && (
        <section className="mb-10 pl-4 border-l-4 border-primary/30 dark:border-primary/40">
          <h2 className="text-heading-6 font-bold text-dark dark:text-white mb-1">Step 3</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select engagement form type</p>
          <div className="mb-8">
          <select
            value={selectedEngagementFormType}
            onChange={(e) => setSelectedEngagementFormType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Engagement Form type...</option>
            {engagementFormTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          </div>
        </section>
      )}

      {/* Sticky primary action bar */}
      <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white dark:bg-gray-dark border-t border-stroke dark:border-dark-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleGenerateDocument}
            disabled={loading || !canGenerate}
            className="flex-1 sm:flex-none px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base font-medium"
          >
            {loading ? "Generating..." : `Generate ${
              selectedDocumentCategory === "eoi"
                ? "Expression of Interest"
                : selectedDocumentCategory === "engagement-forms"
                ? "Engagement Form"
                : selectedBusinessDocumentType
                  ? BUSINESS_DOCUMENT_TYPES[selectedBusinessDocumentType].label
                  : "Document"
            }`}
          </button>
          {selectedBusiness && (
            <button
              onClick={handleNewSearch}
              className="px-4 py-3 border border-stroke dark:border-dark-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-2 transition-colors"
            >
              New business search
            </button>
          )}
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="mt-8 p-4 rounded-md">
          <div 
            className={`whitespace-pre-wrap text-sm ${
              result.includes("✅") ? "text-green-700 bg-green-50 border border-green-200" : "text-red-700 bg-red-50 border border-red-200"
            } p-4 rounded`}
            dangerouslySetInnerHTML={{ 
              __html: result
                .replace(/\n/g, '<br/>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>')
            }}
          />
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h3 className="font-medium text-gray-800 mb-2">How to use:</h3>
        <ol className="text-sm text-gray-600 space-y-1">
          <li>1. Search for an existing business by name</li>
          <li>2. Review and edit the business details if needed</li>
          <li>3. Select document category (Business Documents, EOI, or Engagement Forms)</li>
          <li>4. Choose the specific document type or EOI type</li>
          <li>5. Click "Generate" to create your document</li>
        </ol>
        
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-700">
            💡 <strong>Note:</strong> This page is for existing clients with business information already in the system. 
            For new clients, use the "New Client Creation" page to fill out all details manually.
          </p>
        </div>
      </div>
    </div>
  );
}