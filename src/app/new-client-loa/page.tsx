"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";

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
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">New Client Creation - LOA Generation</h1>
      
       {/* Links Section */}
      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">🔗 Quick Access</h2>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            <span className="font-medium">Folder Link:</span>{' '}
            <a
              href="https://drive.google.com/drive/folders/1YQR8i2BOO8CGoztPT8e56Rx-2ZmtitiK"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Google Drive Folder
            </a>
          </li>
          <li>
            <span className="font-medium">Google Doc:</span>{' '}
            <a
              href="https://docs.google.com/document/d/14WVZD6bjBf34kKyQVy_xcPqGkbLbmimVHrcZaYJQDQ8/edit?tab=t.0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Blank LOA Template
            </a>
          </li>
          <li>
            <span className="font-medium">PDF:</span>{' '}
            <a
              href="https://drive.google.com/file/d/10Fk9Vbhnud8XYrbw9IL6QvQrAQXif9UO/view?usp=drive_link" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Downloadable Blank LOA (PDF)
            </a>
          </li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          Use these if client details are unavailable and you need a blank LOA to send.
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">
          📄 Letter of Authority
        </h2>
        <p className="text-blue-700 text-sm">
          Create a Letter of Authority for a new client by filling out all their business
          information below. This document authorizes ACES to act on behalf of the business.
        </p>
      </div>

      {/* Business Information Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !isFormValid()}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
      >
        {loading ? "Generating LOA..." : "Generate Letter of Authority"}
      </button>

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
        <h3 className="font-medium text-gray-800 mb-2">Instructions:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>1. Fill in all required business information fields</li>
          <li>2. The "Trading As" field will auto-populate with the business name</li>
          <li>3. Ensure email and Google Drive folder URL are valid</li>
          <li>4. Click "Generate" to create the Letter of Authority</li>
          <li>5. The LOA will be saved to the specified Google Drive folder</li>
          <li>6. Use this for new clients who aren't in the system yet</li>
        </ul>

        <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-sm text-yellow-700">
            ⚠️ <strong>Note:</strong> This page is for creating LOAs for completely new clients. 
            If the business information already exists in the system, use the main "Document Generation" page instead.
          </p>
        </div>
      </div>
    </div>
  );
}