"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { signIn } from "next-auth/react";

interface ContractTypes {
  contracts: string[];
  eois: string[];
}

const UTILITY_TYPES = {
  "C&I Electricity": ["Origin C&I Electricity", "Momentum C&I Electricity", "Alinta C&I Electricity", "Other"],
  "SME Electricity": ["Origin SME Electricity", "BlueNRG SME Electricity"],
  "C&I Gas": ["Origin C&I Gas", "Alinta C&I Gas"],
  "SME Gas": ["CovaU SME Gas"],
  "Waste": ["Veolia Waste"],
  "DMA": ["PowerMetric DMA"],
  "Other": ["Other"]
};

const EOI_TYPES = {
  "Energy Solutions": ["Direct Meter Agreement", "Solar Energy PPA", "Self Managed Certificates", "Large Generation Certificates Trading", "Self Managed VEECs", "Demand Response"],
  "Waste Management": ["Cooking Oil Used Oil", "Waste Organic Recycling", "Waste Grease Trap", "Baled Cardboard", "Loose Cardboard", "Used Wax Cardboard", "Vic CDS Scheme"],
  "Technology": ["Cleaning Robot", "Inbound Digital Voice Agent", "Telecommunication"],
  "Business Services": ["Referral Distribution Program", "Wood Pallet", "Wood Cut"],
  "Environmental": ["GHG Action Plan", "Government Incentives Vic G4"],
  "Templates": ["New Placeholder Template"]
};

export default function SignedAgreementLodgementPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const [agreementType, setAgreementType] = useState<"contract" | "eoi">("contract");
  const [selectedUtilityType, setSelectedUtilityType] = useState("");
  const [contractType, setContractType] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [nmi, setNmi] = useState("");
  const [mirn, setMirn] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [multipleAttachments, setMultipleAttachments] = useState(false);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableContracts, setAvailableContracts] = useState<ContractTypes>({ contracts: [], eois: [] });

  // Get utility types based on agreement type
  const getUtilityTypes = () => {
    return agreementType === "contract" ? UTILITY_TYPES : EOI_TYPES;
  };

  // Get suppliers for selected utility type
  const getSuppliersForUtilityType = () => {
    const utilityTypes = getUtilityTypes();
    return selectedUtilityType ? utilityTypes[selectedUtilityType as keyof typeof utilityTypes] || [] : [];
  };

  // Check if current selection requires NMI
  const requiresNMI = () => {
    return selectedUtilityType === "C&I Electricity" || 
           selectedUtilityType === "SME Electricity" || 
           selectedUtilityType === "DMA" ||
           (agreementType === "eoi" && contractType === "Direct Meter Agreement");
  };

  // Check if current selection requires MIRN
  const requiresMIRN = () => {
    return selectedUtilityType === "C&I Gas" || selectedUtilityType === "SME Gas";
  };

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

  // Get the identifier label
  const getIdentifierLabel = () => {
    if (requiresNMI()) return "NMI";
    if (requiresMIRN()) return "MIRN";
    return "";
  };

  // Build business name with identifier for submission
  const buildBusinessNameForSubmission = () => {
    let fullBusinessName = businessName.trim();
    if (requiresNMI() && nmi.trim()) {
      fullBusinessName += ` NMI: ${nmi.trim()}`;
    } else if (requiresMIRN() && mirn.trim()) {
      fullBusinessName += ` MIRN: ${mirn.trim()}`;
    }
    return fullBusinessName;
  };

  // Reset selections when agreement type changes
  useEffect(() => {
    setSelectedUtilityType("");
    setContractType("");
    setNmi("");
    setMirn("");
    setMultipleAttachments(false);
  }, [agreementType]);

  // Reset contract type when utility type changes
  useEffect(() => {
    setContractType("");
    setNmi("");
    setMirn("");
  }, [selectedUtilityType]);

  // Reset multiple attachments when switching to EOI
  useEffect(() => {
    if (agreementType === "eoi") {
      setMultipleAttachments(false);
    }
  }, [agreementType]);

  // Add this useEffect for auto-reauth
useEffect(() => {
  const handleApiError = async (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.error === 'REAUTHENTICATION_REQUIRED') {
      console.log('Reauthentication required - automatically triggering...');
      try {
        await signIn('google', { 
          callbackUrl: window.location.href,
          prompt: 'consent'
        });
      } catch (error) {
        console.error('Reauthentication failed:', error);
      }
    }
  };

  window.addEventListener('api-error', handleApiError);
  
  return () => {
    window.removeEventListener('api-error', handleApiError);
  };
}, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = e.target.files;
      
      // Validate all files are PDFs
      const invalidFiles = Array.from(selectedFiles).filter(file => 
        !file.name.toLowerCase().endsWith('.pdf')
      );
      
      if (invalidFiles.length > 0) {
        setResult("❌ Please select PDF files only.");
        return;
      }

      // If multiple attachments is off, only allow one file
      if (!multipleAttachments && selectedFiles.length > 1) {
        setResult("❌ Please select only one file or enable multiple attachments.");
        return;
      }

      setFiles(selectedFiles);
      setResult(""); // Clear any previous error
    }
  };

  const handleMultipleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setMultipleAttachments(isChecked);
    
    // If unchecking and we have multiple files, clear files
    if (!isChecked && files && files.length > 1) {
      setFiles(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!files || files.length === 0) {
      setResult("❌ No file selected.");
      return;
    }

    if (!contractType) {
      setResult("❌ Please select a contract type.");
      return;
    }

    if (!businessName.trim()) {
      setResult("❌ Please enter a business name.");
      return;
    }

    // Check for required identifiers
    if (requiresNMI() && !nmi.trim()) {
      setResult("❌ NMI is required for electricity and DMA agreements.");
      return;
    }

    if (requiresMIRN() && !mirn.trim()) {
      setResult("❌ MIRN is required for gas agreements.");
      return;
    }

    setLoading(true);
    setResult("");

    const formData = new FormData();
    
    // Add all files to form data
    Array.from(files).forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });
    
    formData.append("business_name", buildBusinessNameForSubmission());
    formData.append("contract_type", contractType);
    
    // Set agreement type based on multiple attachments
    const finalAgreementType = multipleAttachments ? "contract_multiple_attachments" : agreementType;
    formData.append("agreement_type", finalAgreementType);
    formData.append("file_count", files.length.toString());

    try {
      if (!token) {
        setResult("❌ Authentication required. Please log in.");
        setLoading(false);
        return;
      }

      const apiUrl = `${getApiBaseUrl()}/api/signed-agreement-lodgement`;
      console.log("Making request to:", apiUrl);
      console.log("Token exists:", !!token);
      console.log("Agreement type:", finalAgreementType);
      console.log("Contract type:", contractType);
      console.log("File count:", files.length);

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      console.log("Response status:", res.status);
      console.log("Response headers:", res.headers);

      if (res.status === 401) {
        dispatchReauthEvent();
        setResult("Session expired. Please wait while we refresh your authentication...");
        setLoading(false);
        return;
      }

      let data;
      try {
        data = await res.json();
        console.log("Response data:", data);
      } catch (jsonErr) {
        const text = await res.text();
        console.error("JSON parse error:", jsonErr);
        console.error("Response text:", text);
        setResult(`❌ Error parsing response: ${res.status} ${res.statusText}\n${text}`);
        setLoading(false);
        return;
      }

      if (res.ok) {
        setResult(data.message || "✅ Agreement submitted successfully!");
        // Reset form on success
        setFiles(null);
        setBusinessName("");
        setNmi("");
        setMirn("");
        setContractType("");
        setSelectedUtilityType("");
        setMultipleAttachments(false);
        // Reset file input
        const fileInput = document.getElementById("file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        setResult(`❌ Submission failed: ${data.message || data.detail || res.statusText}`);
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      setResult(`❌ Error: ${error.message}`);
    }

    setLoading(false);
  };

  const getFileDisplayText = () => {
    if (!files || files.length === 0) return "";
    if (files.length === 1) return `✅ Selected: ${files[0].name}`;
    return `✅ Selected ${files.length} files: ${Array.from(files).map(f => f.name).join(", ")}`;
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Signed Agreement Lodgement</h1>

      {/* Agreement Type Selection */}
      <div className="mb-6">
        <label className="block font-medium mb-2 text-gray-700">Agreement Type</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="contract"
              checked={agreementType === "contract"}
              onChange={(e) => setAgreementType(e.target.value as "contract" | "eoi")}
              className="mr-2"
            />
            Contract
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="eoi"
              checked={agreementType === "eoi"}
              onChange={(e) => setAgreementType(e.target.value as "contract" | "eoi")}
              className="mr-2"
            />
            EOI (Expression of Interest)
          </label>
        </div>
      </div>

      {/* Multiple Attachments Checkbox - Only show for contracts */}
      {agreementType === "contract" && (
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={multipleAttachments}
              onChange={handleMultipleAttachmentsChange}
              className="mr-2"
            />
            <span className="font-medium text-gray-700">Multiple Attachments</span>
            <span className="text-sm text-gray-500 ml-2">(Enable to upload multiple signed agreements at once)</span>
          </label>
        </div>
      )}

      {/* Utility Type Selection */}
      <div className="mb-4">
        <label className="block font-medium mb-2 text-gray-700">
          {agreementType === "contract" ? "Utility Type & Size" : "Service Category"}
        </label>
        <select
          value={selectedUtilityType}
          onChange={(e) => setSelectedUtilityType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">
            {agreementType === "contract" 
              ? "Select utility type and size..." 
              : "Select service category..."
            }
          </option>
          {Object.keys(getUtilityTypes()).map((utilityType) => (
            <option key={utilityType} value={utilityType}>
              {utilityType}
            </option>
          ))}
        </select>
      </div>

      {/* Supplier/Contract Type Selection */}
      {selectedUtilityType && (
        <div className="mb-4">
          <label className="block font-medium mb-2 text-gray-700">
            {agreementType === "contract" ? "Supplier" : "Specific Service"}
          </label>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              {agreementType === "contract" 
                ? "Select supplier..." 
                : "Select specific service..."
              }
            </option>
            {getSuppliersForUtilityType().map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Business Name */}
      <div className="mb-4">
        <label className="block font-medium mb-2 text-gray-700">
          Business Name *
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Enter business name..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* NMI/MIRN Field */}
      {(requiresNMI() || requiresMIRN()) && (
        <div className="mb-4">
          <label className="block font-medium mb-2 text-gray-700">
            {getIdentifierLabel()} *
            <span className="text-sm text-gray-500 ml-1">
              {requiresNMI() && "(National Meter Identifier - required for electricity/DMA)"}
              {requiresMIRN() && "(Meter Installation Registration Number - required for gas)"}
            </span>
          </label>
          <input
            type="text"
            value={requiresNMI() ? nmi : mirn}
            onChange={(e) => {
              if (requiresNMI()) {
                setNmi(e.target.value);
              } else if (requiresMIRN()) {
                setMirn(e.target.value);
              }
            }}
            placeholder={`Enter ${getIdentifierLabel()}...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {(requiresNMI() && nmi.trim()) || (requiresMIRN() && mirn.trim()) ? (
            <p className="mt-1 text-sm text-green-600">
              ✅ Full business identifier: "{buildBusinessNameForSubmission()}"
            </p>
          ) : null}
        </div>
      )}

      {/* Show helper text for utilities that don't need identifiers */}
      {selectedUtilityType && !requiresNMI() && !requiresMIRN() && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 italic">
            ℹ️ No additional identifier required for {selectedUtilityType.toLowerCase()} agreements.
          </p>
        </div>
      )}

      {/* File Upload */}
      <div className="mb-6">
        <label className="block font-medium mb-2 text-gray-700">
          Upload Signed Agreement{multipleAttachments ? "s" : ""} (PDF only)
        </label>
        <input
          id="file-input"
          type="file"
          accept="application/pdf,.pdf"
          multiple={multipleAttachments}
          onChange={handleFileChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {files && files.length > 0 && (
          <p className="mt-2 text-sm text-green-600">
            {getFileDisplayText()}
          </p>
        )}
        {multipleAttachments && (
          <p className="mt-1 text-sm text-blue-600">
            ℹ️ You can select multiple PDF files at once
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={
          loading || 
          !files || 
          files.length === 0 ||
          !contractType || 
          !businessName.trim() ||
          (requiresNMI() && !nmi.trim()) ||
          (requiresMIRN() && !mirn.trim())
        }
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Submitting..." : `Submit Signed ${agreementType === "contract" ? "Contract" : "EOI"}${multipleAttachments ? "s" : ""}`}
      </button>

      {/* Result Display */}
      {result && (
        <div className="mt-6 p-4 rounded-md">
          <div 
            className={`whitespace-pre-wrap text-sm ${
              result.includes("✅") ? "text-green-700 bg-green-50 border border-green-200" : "text-red-700 bg-red-50 border border-red-200"
            } p-3 rounded`}
            dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
          />
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="font-medium text-gray-800 mb-2">Instructions:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>1. Select whether you're submitting a Contract or EOI</li>
          <li>2. {agreementType === "contract" && "For contracts, optionally enable 'Multiple Attachments' to upload several agreements at once"}</li>
          <li>{agreementType === "contract" ? "3" : "2"}. Choose the utility type/size (e.g., "C&I Electricity") or service category</li>
          <li>{agreementType === "contract" ? "4" : "3"}. Select the specific supplier or service</li>
          <li>{agreementType === "contract" ? "5" : "4"}. Enter the business name</li>
          <li>{agreementType === "contract" ? "6" : "5"}. If required, enter the NMI (electricity/DMA) or MIRN (gas)</li>
          <li>{agreementType === "contract" ? "7" : "6"}. Upload the signed PDF agreement{multipleAttachments ? "s" : ""}</li>
          <li>{agreementType === "contract" ? "8" : "7"}. The system will automatically email the supplier and file the document{multipleAttachments ? "s" : ""}</li>
        </ul>
      </div>
    </div>
  );
}