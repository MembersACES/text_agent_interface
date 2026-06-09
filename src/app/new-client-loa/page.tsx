"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuickLinks, WorkflowSection } from "@/components/workflow";
import { InsightCallout } from "@/components/dashboard";
import { FileText } from "lucide-react";

interface LOAFormData {
  business_name: string;
  abn: string;
  trading_as: string;
  postal_address: string;
  site_address: string;
  telephone: string;
  email: string;
  contact_name: string;
  position: string;
}

export default function BlankLOAClientCreationPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [formData, setFormData] = useState<LOAFormData>({
    business_name: "",
    abn: "",
    trading_as: "",
    postal_address: "",
    site_address: "",
    telephone: "",
    email: "",
    contact_name: "",
    position: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingBoth, setLoadingBoth] = useState(false);
  const [result, setResult] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const requiredFields = [
      "business_name", "abn", "trading_as", "postal_address", 
      "site_address", "telephone", "email", "contact_name", 
      "position"
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof LOAFormData]?.trim()) {
        return `Please fill in the ${field.replace(/_/g, " ")} field.`;
      }
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address.";
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!token) {
      setResult("❌ Authentication required. Please log in.");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setResult(`❌ ${validationError}`);
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/generate-loa-new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setResult(`✅ ${data.message}\n\n📄 **Document Link:** ${data.document_link}\}`);
        
        // Reset form on success
        setFormData({
          business_name: "",
          abn: "",
          trading_as: "",
          postal_address: "",
          site_address: "",
          telephone: "",
          email: "",
          contact_name: "",
          position: "",
        });
      } else {
        setResult(`❌ Generation failed: ${data.message || data.detail || response.statusText}`);
      }
    } catch (error: any) {
      console.error("LOA generation error:", error);
      setResult(`❌ Error: ${error.message}`);
    }

    setLoading(false);
  };

  const handleSubmitBoth = async () => {
    if (!token) {
      setResult("❌ Authentication required. Please log in.");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setResult(`❌ ${validationError}`);
      return;
    }

    setLoadingBoth(true);
    setResult("");

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/generate-loa-sfa-new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      console.log("Backend response data:", data);

      if (response.ok && data.status === "success") {
        // Check for multiple document links
        let resultMessage = `✅ ${data.message}\n\n`;
        
        if (data.loa_document_link && data.sfa_document_link) {
          // Both documents generated with separate links
          resultMessage += `📄 **LOA Link:** ${data.loa_document_link}\n\n📝 **SFA Link:** ${data.sfa_document_link}`;
        } else if (data.document_links && Array.isArray(data.document_links)) {
          // Array of document links
          data.document_links.forEach((link: string, index: number) => {
            const docType = index === 0 ? "LOA" : "SFA";
            resultMessage += `📄 **${docType} Link:** ${link}\n\n`;
          });
        } else if (data.document_link) {
          // Single document link (fallback - might only be SFA)
          resultMessage += `📄 **Document Link:** ${data.document_link}\n\n⚠️ Note: Only one document link received. Please check if both LOA and SFA were generated.`;
        } else {
          // No document link in response
          resultMessage += `⚠️ Documents generated but no links provided in response.`;
        }
        
        setResult(resultMessage);
        
        // Reset form on success
        setFormData({
          business_name: "",
          abn: "",
          trading_as: "",
          postal_address: "",
          site_address: "",
          telephone: "",
          email: "",
          contact_name: "",
          position: "",
        });
      } else {
        setResult(`❌ Generation failed: ${data.message || data.detail || response.statusText}`);
      }
    } catch (error: any) {
      console.error("LOA & SFA generation error:", error);
      setResult(`❌ Error: ${error.message}`);
    }

    setLoadingBoth(false);
  };

  const isFormValid = () => {
    const requiredFields = [
      formData.business_name, formData.abn, formData.trading_as,
      formData.postal_address, formData.site_address, formData.telephone,
      formData.email, formData.contact_name, formData.position
    ];

    return requiredFields.every(field => field?.trim());
  };

  // Auto-populate trading_as when business_name changes
  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const businessName = e.target.value;
    setFormData(prev => ({
      ...prev,
      business_name: businessName,
      // Auto-populate trading_as if it's empty
      trading_as: prev.trading_as || businessName
    }));
  };

  return (
    <ToolPageLayout
      pageName="New member LOA"
      title="New client LOA generation"
      description="Create a Letter of Authority for a new client not yet in the system."
      width="xl"
    >
      <QuickLinks
        links={[
          { label: "Google Drive folder", href: "https://drive.google.com/drive/folders/1YQR8i2BOO8CGoztPT8e56Rx-2ZmtitiK", description: "Client templates" },
          { label: "Blank LOA template (Google Doc)", href: "https://docs.google.com/document/d/14WVZD6bjBf34kKyQVy_xcPqGkbLbmimVHrcZaYJQDQ8/edit?tab=t.0" },
          { label: "Blank LOA (PDF)", href: "https://drive.google.com/file/d/1rNKhQ7__oJT-O_sxCv15BuB58xjM63oJ/view?usp=drive_link" },
        ]}
      />

      <InsightCallout title="Letter of Authority" icon={<FileText className="text-primary" />}>
        Fill in business details below to generate an LOA that authorizes Carbon Zero Australasia to act on behalf of the client.
      </InsightCallout>

      <WorkflowSection title="Business information" step={1}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-medium mb-2 text-gray-700">
            Business Name *
          </label>
          <input
            type="text"
            name="business_name"
            value={formData.business_name}
            onChange={handleBusinessNameChange}
            placeholder="Enter business name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2 text-gray-700">
            ABN *
          </label>
          <input
            type="text"
            name="abn"
            value={formData.abn}
            onChange={handleInputChange}
            placeholder="Enter ABN..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2 text-gray-700">
            Trading As *
            <span className="text-sm text-gray-500 ml-1">(Auto-populated from business name)</span>
          </label>
          <input
            type="text"
            name="trading_as"
            value={formData.trading_as}
            onChange={handleInputChange}
            placeholder="Enter trading name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2 text-gray-700">
            Telephone *
          </label>
          <input
            type="tel"
            name="telephone"
            value={formData.telephone}
            onChange={handleInputChange}
            placeholder="Enter phone number..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2 text-gray-700">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter email address..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2 text-gray-700">
            Contact Name *
          </label>
          <input
            type="text"
            name="contact_name"
            value={formData.contact_name}
            onChange={handleInputChange}
            placeholder="Enter contact person name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2 text-gray-700">
            Position *
          </label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleInputChange}
            placeholder="Enter contact person's position..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      {/* Address Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block font-medium mb-2 text-gray-700">
            Postal Address *
          </label>
          <textarea
            name="postal_address"
            value={formData.postal_address}
            onChange={handleInputChange}
            placeholder="Enter postal address..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2 text-gray-700">
            Site Address *
          </label>
          <textarea
            name="site_address"
            value={formData.site_address}
            onChange={handleInputChange}
            placeholder="Enter site address..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>
      </WorkflowSection>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Button
          onClick={handleSubmit}
          disabled={loading || loadingBoth || !isFormValid()}
          loading={loading}
          className="w-full"
          size="lg"
        >
          Generate letter of authority
        </Button>
        <Button
          onClick={handleSubmitBoth}
          disabled={loading || loadingBoth || !isFormValid()}
          loading={loadingBoth}
          variant="secondary"
          className="w-full"
          size="lg"
        >
          Generate LOA & SFA
        </Button>
      </div>

      {result && (
        <Card className="mt-4">
          <CardContent className="pt-6">
          <div
            className={`whitespace-pre-wrap text-sm rounded-xl p-4 ${
              result.includes("✅") ? "text-green-800 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:text-green-200" : "text-red-800 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:text-red-200"
            }`}
            dangerouslySetInnerHTML={{
              __html: result
                .replace(/\n/g, '<br/>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>')
            }}
          />
          </CardContent>
        </Card>
      )}

      <InsightCallout variant="warning" title="Note">
        This page is for completely new clients. If the business already exists in the system, use Document Generation instead.
      </InsightCallout>
    </ToolPageLayout>
  );
}