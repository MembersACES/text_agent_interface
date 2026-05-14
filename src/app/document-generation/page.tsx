"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl, getSendClientDocumentN8nWebhookUrl, parseGoogleDriveOrDocsFileId } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
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

/** Last successfully generated EOI or engagement form — used for “Send document” → n8n. */
type ClientDocSendKind = "eoi" | "engagement-form";

interface LastClientDocSendContext {
  kind: ClientDocSendKind;
  document_link: string;
  client_folder_url: string;
  business_name: string;
  google_file_id: string | null;
  expression_type: string | null;
  engagement_form_type: string | null;
}

/** Matches backend `EngagementFormType.SOLAR_PANEL_CLEANING` display name — only type with n8n send wired up for now. */
const N8N_SEND_ELIGIBLE_ENGAGEMENT_FORM_TYPE = "Solar Panel Cleaning";

function canSendClientDocViaN8n(ctx: LastClientDocSendContext | null): boolean {
  if (!ctx) return false;
  return (
    ctx.kind === "engagement-form" &&
    ctx.engagement_form_type === N8N_SEND_ELIGIBLE_ENGAGEMENT_FORM_TYPE
  );
}

type StaffUserForCc = { id: number; email: string; name?: string; full_name?: string };

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Split manual CC input on commas, semicolons, or newlines; validate each token. */
function parseManualCcInput(raw: string): { emails: string[]; invalidTokens: string[] } {
  const tokens = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const emails: string[] = [];
  const invalidTokens: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    if (!SIMPLE_EMAIL_RE.test(t)) {
      invalidTokens.push(t);
      continue;
    }
    const lower = t.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    emails.push(t);
  }
  return { emails, invalidTokens };
}

/** Team checkboxes + manual field, deduped; drops primary recipient if duplicated in CC. */
function buildCcEmailList(
  teamSelected: Record<string, boolean>,
  manualRaw: string,
  primaryRecipientEmail: string
): { cc_emails: string[]; invalidTokens: string[] } {
  const { emails: manualEmails, invalidTokens } = parseManualCcInput(manualRaw);
  const teamEmails = Object.entries(teamSelected)
    .filter(([, on]) => on)
    .map(([email]) => email.trim())
    .filter((e) => SIMPLE_EMAIL_RE.test(e));
  const recipientLower = primaryRecipientEmail.trim().toLowerCase();
  const seen = new Set<string>();
  const cc_emails: string[] = [];
  for (const e of [...teamEmails, ...manualEmails]) {
    const lo = e.toLowerCase();
    if (lo === recipientLower) continue;
    if (seen.has(lo)) continue;
    seen.add(lo);
    cc_emails.push(e);
  }
  return { cc_emails, invalidTokens };
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
  const { showToast } = useToast();
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
  const [lastClientDocSendContext, setLastClientDocSendContext] = useState<LastClientDocSendContext | null>(null);
  const [sendDocumentModalOpen, setSendDocumentModalOpen] = useState(false);
  const [sendDocumentRecipientName, setSendDocumentRecipientName] = useState("");
  const [sendDocumentRecipientEmail, setSendDocumentRecipientEmail] = useState("");
  const [sendDocumentSubmitting, setSendDocumentSubmitting] = useState(false);
  const [sendDocumentStaffUsers, setSendDocumentStaffUsers] = useState<StaffUserForCc[]>([]);
  const [sendDocumentCcTeam, setSendDocumentCcTeam] = useState<Record<string, boolean>>({});
  const [sendDocumentCcManual, setSendDocumentCcManual] = useState("");
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

  const fetchSendModalStaffUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/users`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setSendDocumentStaffUsers(data as StaffUserForCc[]);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (!sendDocumentModalOpen) return;
    setSendDocumentStaffUsers([]);
    fetchSendModalStaffUsers();
  }, [sendDocumentModalOpen, fetchSendModalStaffUsers]);

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
    setLastClientDocSendContext(null);
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
        setResult(`✅ ${data.message}\n\n📄 **Document Link:** ${data.document_link}\n📁 **Member Folder:** ${data.client_folder_url}`);

        if (selectedDocumentCategory === "eoi") {
          const docLink = typeof data.document_link === "string" ? data.document_link : "";
          setLastClientDocSendContext({
            kind: "eoi",
            document_link: docLink,
            client_folder_url:
              typeof data.client_folder_url === "string"
                ? data.client_folder_url
                : editableBusinessInfo?.client_folder_url ?? "",
            business_name: editableBusinessInfo?.business_name ?? "",
            google_file_id: parseGoogleDriveOrDocsFileId(docLink),
            expression_type: selectedEoiType,
            engagement_form_type: null,
          });
        } else if (selectedDocumentCategory === "engagement-forms") {
          const docLink = typeof data.document_link === "string" ? data.document_link : "";
          setLastClientDocSendContext({
            kind: "engagement-form",
            document_link: docLink,
            client_folder_url:
              typeof data.client_folder_url === "string"
                ? data.client_folder_url
                : editableBusinessInfo?.client_folder_url ?? "",
            business_name: editableBusinessInfo?.business_name ?? "",
            google_file_id: parseGoogleDriveOrDocsFileId(docLink),
            expression_type: null,
            engagement_form_type: selectedEngagementFormType,
          });
        } else {
          setLastClientDocSendContext(null);
        }

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

  const openSendDocumentModal = () => {
    if (!lastClientDocSendContext || !canSendClientDocViaN8n(lastClientDocSendContext)) return;
    setSendDocumentRecipientName(editableBusinessInfo?.contact_name?.trim() ?? "");
    setSendDocumentRecipientEmail(editableBusinessInfo?.email?.trim() ?? "");
    setSendDocumentCcTeam({});
    setSendDocumentCcManual("");
    setSendDocumentModalOpen(true);
  };

  const handleSendDocumentSubmit = async () => {
    if (!lastClientDocSendContext || !canSendClientDocViaN8n(lastClientDocSendContext)) return;
    const email = sendDocumentRecipientEmail.trim();
    const name = sendDocumentRecipientName.trim();
    if (!name) {
      showToast("Please enter the recipient name.", "error");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Please enter a valid recipient email.", "error");
      return;
    }
    const { cc_emails, invalidTokens } = buildCcEmailList(sendDocumentCcTeam, sendDocumentCcManual, email);
    if (invalidTokens.length > 0) {
      showToast(
        `Invalid CC ${invalidTokens.length === 1 ? "address" : "addresses"}: ${invalidTokens.slice(0, 3).join(", ")}${invalidTokens.length > 3 ? "…" : ""}`,
        "error",
      );
      return;
    }
    setSendDocumentSubmitting(true);
    try {
      const { kind, expression_type, engagement_form_type, ...rest } = lastClientDocSendContext;
      const document_kind = kind === "eoi" ? "eoi" : "engagement_form";
      const payload = {
        event: "send_client_document",
        document_kind,
        recipient_contact_name: name,
        recipient_contact_email: email,
        cc_emails,
        business_name: rest.business_name,
        expression_type,
        engagement_form_type,
        document_link: rest.document_link,
        google_file_id: rest.google_file_id,
        client_folder_url: rest.client_folder_url,
        sent_by_email: session?.user?.email ?? "",
        sent_by_name: session?.user?.name ?? "",
        timestamp: new Date().toISOString(),
      };
      const res = await fetch(getSendClientDocumentN8nWebhookUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("Document send workflow triggered.", "success");
        setSendDocumentModalOpen(false);
      } else {
        const text = await res.text().catch(() => "");
        showToast(`n8n returned ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`, "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to reach send workflow. Check the network or webhook URL.", "error");
    } finally {
      setSendDocumentSubmitting(false);
    }
  };

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
          {lastClientDocSendContext && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {canSendClientDocViaN8n(lastClientDocSendContext) && (
                <button
                  type="button"
                  onClick={openSendDocumentModal}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Send document
                </button>
              )}
              <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md">
                {canSendClientDocViaN8n(lastClientDocSendContext) ? (
                  <>
                    Email this Solar Panel Cleaning engagement form via your n8n workflow (recipient confirmed in the
                    next step).
                  </>
                ) : (
                  <>
                    Sending by email is only available for the <strong>Solar Panel Cleaning</strong> engagement form
                    for now — that is the only document type with an n8n workflow configured. EOIs and other engagement
                    forms cannot be sent from here yet.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h3 className="font-medium text-gray-800 mb-2">How to use:</h3>
        <ol className="text-sm text-gray-600 space-y-1">
          <li>1. Search for an existing business by name</li>
          <li>2. Review and edit the business details if needed</li>
          <li>3. Select document category (Business Documents, EOI, or Engagement Forms)</li>
          <li>4. Choose the specific document type, EOI type, or engagement form type</li>
          <li>5. Click &quot;Generate&quot; to create your document</li>
          <li>
            6. After a successful <strong>Solar Panel Cleaning</strong> engagement form, use &quot;Send document&quot;
            to email it via n8n (other EOIs and engagement forms do not have send wired up yet)
          </li>
        </ol>
        
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-700">
            💡 <strong>Note:</strong> This page is for existing clients with business information already in the system. 
            For new clients, use the &quot;New Client Creation&quot; page to fill out all details manually.
          </p>
        </div>
      </div>

      {/* Send document — recipient confirmation (n8n webhook) */}
      {sendDocumentModalOpen && lastClientDocSendContext && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          aria-modal="true"
          role="dialog"
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Send Solar Panel Cleaning engagement form
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Confirm or edit the client contact before triggering the email workflow.
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label htmlFor="doc-send-recipient-name" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Client name
                </label>
                <input
                  id="doc-send-recipient-name"
                  type="text"
                  value={sendDocumentRecipientName}
                  onChange={(e) => setSendDocumentRecipientName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Contact name"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="doc-send-recipient-email" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Email
                </label>
                <input
                  id="doc-send-recipient-email"
                  type="email"
                  value={sendDocumentRecipientEmail}
                  onChange={(e) => setSendDocumentRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  CC — ACES team
                </label>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 max-h-36 overflow-y-auto">
                  {sendDocumentStaffUsers.length === 0 ? (
                    <div className="px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500">Loading users…</div>
                  ) : (
                    sendDocumentStaffUsers.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-800"
                          checked={!!sendDocumentCcTeam[u.email]}
                          onChange={(e) =>
                            setSendDocumentCcTeam((prev) => ({ ...prev, [u.email]: e.target.checked }))
                          }
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {u.full_name || u.name || u.email}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="doc-send-cc-manual" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  CC — additional (optional)
                </label>
                <textarea
                  id="doc-send-cc-manual"
                  value={sendDocumentCcManual}
                  onChange={(e) => setSendDocumentCcManual(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y min-h-[2.75rem]"
                  placeholder="One per line, or comma / semicolon separated"
                  autoComplete="off"
                />
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Multiple addresses supported. Duplicates and the primary “To” address are ignored.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSendDocumentModalOpen(false)}
                disabled={sendDocumentSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors order-2 sm:order-1 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendDocumentSubmit}
                disabled={sendDocumentSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors order-1 sm:order-2 disabled:opacity-50"
              >
                {sendDocumentSubmitting ? "Sending…" : "Send document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}