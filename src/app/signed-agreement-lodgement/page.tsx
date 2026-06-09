"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { getApiBaseUrl } from "@/lib/utils";
import { signIn } from "next-auth/react";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ContractTypes {
  contracts: string[];
  eois: string[];
}

const UTILITY_TYPES = {
  "C&I Electricity": ["Origin C&I Electricity", "Momentum C&I Electricity", "Alinta C&I Electricity", "Other"],
  "SME Electricity": ["Origin SME Electricity", "BlueNRG SME Electricity", "Other"],
  "C&I Gas": ["Origin C&I Gas", "Alinta C&I Gas", "Other"],
  "SME Gas": ["CovaU SME Gas", "Other"],
  "Waste": ["Veolia Waste", "Other"],
  "DMA": ["PowerMetric DMA", "Other"],
  "Other": ["Other"]
};

const EOI_TYPES = {
  "Energy Solutions": ["Direct Meter Agreement", "Solar Energy PPA", "Self Managed Certificates", "Large Generation Certificates Trading", "Self Managed VEECs", "Demand Response", "Other"],
  "Waste Management": ["Cooking Oil Used Oil", "Waste Organic Recycling", "Waste Grease Trap", "Baled Cardboard", "Loose Cardboard", "Used Wax Cardboard", "Vic CDS Scheme", "Other"],
  "Technology": ["Cleaning Robot", "Inbound Digital Voice Agent", "Telecommunication", "Other"],
  "Business Services": ["Referral Distribution Program", "Wood Pallet", "Wood Cut", "Other"],
  "Environmental": ["GHG Action Plan", "Government Incentives Vic G4", "Other"],
  "Templates": ["New Placeholder Template", "Other"]
};

// Contract email mappings (matching backend)
const CONTRACT_EMAIL_MAPPINGS: Record<string, { name: string; email: string }> = {
  "PowerMetric DMA": {
    name: "PowerMetric",
    email: "accountmanagement@powermetric.com.au, rmorse@powermetric.com.au, data.quote@fornrg.com"
  },
  "Origin C&I Electricity": {
    name: "Origin C&I",
    email: "MIContracts@originenergy.com.au, data.quote@fornrg.com"
  },
  "Origin SME Electricity": {
    name: "Origin SME",
    email: "MIContracts@originenergy.com.au, data.quote@fornrg.com"
  },
  "BlueNRG SME Electricity": {
    name: "BlueNRG SME",
    email: "data.quote@fornrg.com"
  },
  "Origin C&I Gas": {
    name: "Origin C&I",
    email: "MIContracts@originenergy.com.au, data.quote@fornrg.com"
  },
  "Momentum C&I Electricity": {
    name: "Momentum",
    email: "contracts.administration@momentum.com.au, data.quote@fornrg.com"
  },
  "CovaU SME Gas": {
    name: "CovaU",
    email: "corp.sales@covau.com.au, data.quote@fornrg.com"
  },
  "CovaU SME Electricity": {
    name: "CovaU",
    email: "corp.sales@covau.com.au, data.quote@fornrg.com"
  },
  "Veolia Waste": {
    name: "Veolia",
    email: "ric.luiyf@veolia.com, business@acesolutions.com.au"
  },
  "Alinta C&I Electricity": {
    name: "Alinta",
    "email": "Andrew.Barnes@alintaenergy.com.au, Lewis.Chase@alintaenergy.com.au, Cindy.Ho@alintaenergy.com.au, business@acesolutions.com.au, data.quote@fornrg.com"
  },
  "Alinta C&I Gas": {
    name: "Alinta",
    "email": "Andrew.Barnes@alintaenergy.com.au, Lewis.Chase@alintaenergy.com.au, Cindy.Ho@alintaenergy.com.au, business@acesolutions.com.au, data.quote@fornrg.com"
  },
  "Other": {
    name: "Other",
    email: "members@acesolutions.com.au, data.quote@fornrg.com, morgan.h@acesolutions.com.au"
  },
};

// EOI email mappings (matching backend)
const EOI_EMAIL_MAPPINGS: Record<string, { name: string; email: string }> = {
  "Direct Meter Agreement": {
    name: "DMA Supplier",
    email: "data.quote@fornrg.com"
  },
  "Cleaning Robot": {
    name: "Cleaning Tech",
    email: "cleantech@supplier.com"
  },
  "Inbound Digital Voice Agent": {
    name: "Voice Tech",
    email: "voicetech@supplier.com"
  },
  "Cooking Oil Used Oil": {
    name: "Oil Recycling",
    email: "oilrecycling@supplier.com"
  },
  "Referral Distribution Program": {
    name: "Distribution Partner",
    email: "distribution@partner.com"
  },
  "Solar Energy PPA": {
    name: "Solar Energy",
    email: "data.quote@fornrg.com"
  },
  "Self Managed Certificates": {
    name: "Certificate Management",
    email: "certificates@supplier.com"
  },
  "Telecommunication": {
    name: "Telecom",
    email: "telecom@supplier.com"
  },
  "Wood Pallet": {
    name: "Wood Pallet",
    email: "woodpallet@supplier.com"
  },
  "Wood Cut": {
    name: "Wood Processing",
    email: "woodprocessing@supplier.com"
  },
  "Baled Cardboard": {
    name: "Cardboard Recycling",
    email: "cardboard@recycler.com"
  },
  "Loose Cardboard": {
    name: "Cardboard Recycling",
    email: "cardboard@recycler.com"
  },
  "Large Generation Certificates Trading": {
    name: "LGC Trading",
    email: "lgc@trading.com"
  },
  "GHG Action Plan": {
    name: "Environmental",
    email: "environment@supplier.com"
  },
  "Government Incentives Vic G4": {
    name: "Government",
    email: "government@supplier.com"
  },
  "Self Managed VEECs": {
    name: "VEEC Management",
    email: "veec@management.com"
  },
  "Demand Response": {
    name: "Demand Response",
    email: "demandresponse@supplier.com"
  },
  "Waste Organic Recycling": {
    name: "Organic Waste",
    email: "organicwaste@recycler.com"
  },
  "Waste Grease Trap": {
    name: "Grease Trap",
    email: "greasetrap@supplier.com"
  },
  "Used Wax Cardboard": {
    name: "Wax Cardboard",
    email: "waxcardboard@recycler.com"
  },
  "Vic CDS Scheme": {
    name: "CDS Scheme",
    email: "cds@scheme.com"
  },
  "New Placeholder Template": {
    name: "Template",
    email: "members@acesolutions.com.au, data.quote@fornrg.com"
  },
  "Other": {
    name: "Other",
    email: "members@acesolutions.com.au, data.quote@fornrg.com, morgan.h@acesolutions.com.au"
  }
};

export default function SignedAgreementLodgementPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
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
  const [submittedBusinessName, setSubmittedBusinessName] = useState("");

  // Listen for file data from postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Received postMessage:', event.origin, event.data?.type);
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) {
        console.log('⚠️ Rejecting message from different origin:', event.origin);
        return;
      }
      
      if (event.data && event.data.type === 'LODGEMENT_FILE_TRANSFER' && event.data.fileData) {
        console.log('📥 Received file data via postMessage!', event.data.fileData);
        const fileData = event.data.fileData;
        
        try {
          // Convert base64 back to File
          const base64Data = fileData.data.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: fileData.type || 'application/pdf' });
          const restoredFile = new File([blob], fileData.name, { type: fileData.type || 'application/pdf' });
          
          console.log('✅ File restored from postMessage:', { name: restoredFile.name, size: restoredFile.size });
          
          // Create a FileList using DataTransfer
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(restoredFile);
          const fileList = dataTransfer.files;
          
          // Set the files state
          setFiles(fileList);
          
          // Update the file input
          setTimeout(() => {
            const fileInput = document.getElementById("file-input") as HTMLInputElement;
            if (fileInput) {
              const dt = new DataTransfer();
              dt.items.add(restoredFile);
              fileInput.files = dt.files;
              const changeEvent = new Event('change', { bubbles: true });
              fileInput.dispatchEvent(changeEvent);
              console.log('✅ File input updated from postMessage');
            }
          }, 200);
          
          // Show success message
          setResult("✅ File loaded from previous upload. Ready to submit!");
          setTimeout(() => setResult(""), 5000);
        } catch (error) {
          console.error('❌ Error processing file from postMessage:', error);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Load business name from URL query parameter
  useEffect(() => {
    console.log('🚀 Signed Agreement Lodgement page useEffect running');
    const urlBusinessName = searchParams.get('businessName');
    const urlUtilityType = searchParams.get('utilityType');
    const urlContractType = searchParams.get('contractType');
    const urlNmi = searchParams.get('nmi');
    const urlMirn = searchParams.get('mirn');
    const hasFile = searchParams.get('hasFile') === 'true';
    
    console.log('📋 URL params:', { urlBusinessName, urlUtilityType, urlContractType, urlNmi, urlMirn, hasFile });
    
    if (urlBusinessName) {
      setBusinessName(decodeURIComponent(urlBusinessName));
    }
    if (urlUtilityType) {
      setSelectedUtilityType(decodeURIComponent(urlUtilityType));
    }
    if (urlContractType) {
      setContractType(decodeURIComponent(urlContractType));
    }
    if (urlNmi) {
      setNmi(decodeURIComponent(urlNmi));
    }
    if (urlMirn) {
      setMirn(decodeURIComponent(urlMirn));
    }
    
    // Load file from sessionStorage if available
    if (hasFile) {
      console.log('🔍 hasFile is true, attempting to load file from sessionStorage');
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 All sessionStorage keys:', Object.keys(sessionStorage));
      
      // Immediately check if file exists
      const immediateCheck = sessionStorage.getItem('lodgementFileTransfer');
      console.log('🔍 Immediate check for file:', !!immediateCheck);
      
      if (!immediateCheck) {
        console.warn('⚠️ File not found in immediate check - this might be a timing issue');
        // Show user-friendly message
        setResult("ℹ️ Looking for file from previous upload...");
      }
      
      // Use a longer delay to ensure the file input element exists and React has rendered
      const timer = setTimeout(() => {
        try {
          // Check multiple times with increasing delays to handle timing issues
          let attempts = 0;
          const maxAttempts = 3;
          
          const tryLoadFile = () => {
            attempts++;
            // Try sessionStorage first, then localStorage as fallback
            let fileDataStr = sessionStorage.getItem('lodgementFileTransfer');
            if (!fileDataStr) {
              console.log('🔍 File not in sessionStorage, checking localStorage...');
              fileDataStr = localStorage.getItem('lodgementFileTransfer');
              if (fileDataStr) {
                console.log('✅ File found in localStorage!');
              }
            }
            
            console.log(`🔍 Attempt ${attempts}: Checking for file in sessionStorage/localStorage:`, !!fileDataStr);
            
            // Debug: Check what's actually in sessionStorage
            if (attempts === 1) {
              const allKeys = Object.keys(sessionStorage);
              console.log('🔍 All sessionStorage keys on attempt 1:', allKeys);
              console.log('🔍 Total sessionStorage size:', JSON.stringify(sessionStorage).length, 'bytes');
              
              allKeys.forEach(key => {
                const value = sessionStorage.getItem(key);
                console.log(`🔍 Key: "${key}", Value length: ${value?.length || 0}`);
                
                // Check if it looks like our file data
                if (key.includes('lodgement') || key.includes('file') || key.includes('transfer')) {
                  console.log(`✅ Found relevant key: ${key}`);
                  try {
                    const parsed = JSON.parse(value || '{}');
                    console.log(`   Parsed data keys:`, Object.keys(parsed));
                    console.log(`   Has 'data' field:`, !!parsed.data);
                    console.log(`   Has 'name' field:`, !!parsed.name);
                    console.log(`   Data length:`, parsed.data?.length || 0);
                  } catch (e) {
                    console.log(`   Not valid JSON:`, e);
                  }
                }
              });
              
              // Also check localStorage as fallback
              const localStorageKeys = Object.keys(localStorage);
              console.log('🔍 localStorage keys:', localStorageKeys);
            }
            
            if (fileDataStr) {
              console.log('✅ File found in sessionStorage!');
              const fileData = JSON.parse(fileDataStr);
              console.log('✅ File data found:', { name: fileData.name, size: fileData.size, hasData: !!fileData.data, timestamp: fileData.timestamp });
              
              // Check if file data is recent (within 5 minutes)
              const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
              console.log('⏰ Time check - now:', Date.now(), 'file timestamp:', fileData.timestamp, 'fiveMinutesAgo:', fiveMinutesAgo);
              
              if (fileData.timestamp && fileData.timestamp > fiveMinutesAgo) {
                console.log('✅ File data is recent, restoring...');
                // Convert base64 back to File
                const base64Data = fileData.data.split(',')[1]; // Remove data:type;base64, prefix
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: fileData.type || 'application/pdf' });
                const restoredFile = new File([blob], fileData.name, { type: fileData.type || 'application/pdf' });
                
                console.log('✅ File restored:', { name: restoredFile.name, size: restoredFile.size, type: restoredFile.type });
                
                // Create a FileList using DataTransfer
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(restoredFile);
                const fileList = dataTransfer.files;
                
                // Set the files state
                setFiles(fileList);
                console.log('✅ Files state set, count:', fileList.length);
                
                // Wait a bit more for React to render, then update the file input
                setTimeout(() => {
                  const fileInput = document.getElementById("file-input") as HTMLInputElement;
                  console.log('🔍 Looking for file input element:', !!fileInput);
                  
                  if (fileInput) {
                    // Create a new FileList and assign it
                    const dt = new DataTransfer();
                    dt.items.add(restoredFile);
                    fileInput.files = dt.files;
                    
                    console.log('✅ File input updated, files count:', fileInput.files.length);
                    
                    // Trigger change event so the UI updates - this will call handleFileChange
                    const changeEvent = new Event('change', { bubbles: true });
                    fileInput.dispatchEvent(changeEvent);
                    
                    console.log('✅ File change event dispatched');
                  } else {
                    console.warn('⚠️ File input element not found, retrying...');
                    // Retry after another delay
                    setTimeout(() => {
                      const retryInput = document.getElementById("file-input") as HTMLInputElement;
                      if (retryInput) {
                        const dt = new DataTransfer();
                        dt.items.add(restoredFile);
                        retryInput.files = dt.files;
                        const changeEvent = new Event('change', { bubbles: true });
                        retryInput.dispatchEvent(changeEvent);
                        console.log('✅ File input updated on retry');
                      }
                    }, 500);
                  }
                }, 200);
                
                // Clear the sessionStorage and localStorage after use (but wait a bit to ensure it's loaded)
                setTimeout(() => {
                  const stillNeeded = sessionStorage.getItem('lodgementFileTransfer') || localStorage.getItem('lodgementFileTransfer');
                  if (stillNeeded) {
                    // Only clear if we successfully loaded the file
                    sessionStorage.removeItem('lodgementFileTransfer');
                    localStorage.removeItem('lodgementFileTransfer');
                    console.log('🗑️ Cleared file from sessionStorage and localStorage after successful load');
                  }
                }, 3000); // Increased delay before clearing to 3 seconds
                
                // Show a message that the file was loaded
                setResult("✅ File loaded from previous upload. Ready to submit!");
                setTimeout(() => setResult(""), 5000);
              } else {
                // File data is too old, remove it
                console.log('⚠️ File data is too old, removing');
                sessionStorage.removeItem('lodgementFileTransfer');
              }
            } else if (attempts < maxAttempts) {
              // File not found, retry after a delay
              console.log(`⚠️ File not found on attempt ${attempts}, retrying in 200ms...`);
              setTimeout(tryLoadFile, 200);
            } else {
              console.log('⚠️ No file data found in sessionStorage after all attempts');
              // Show user-friendly message
              setResult("ℹ️ File not found. Please select the file manually.");
            }
          };
          
          // Start trying to load the file
          tryLoadFile();
        } catch (error) {
          console.error('❌ Error loading file from sessionStorage:', error);
          console.error('❌ Error details:', error);
          sessionStorage.removeItem('lodgementFileTransfer');
        }
      }, 300); // Initial delay
      
      return () => clearTimeout(timer);
    } else {
      console.log('⚠️ hasFile is false, skipping file load');
    }
  }, [searchParams]); // Remove handleFileChange from dependencies

  // Get utility types based on agreement type
  const getUtilityTypes = () => {
    return agreementType === "contract" ? UTILITY_TYPES : EOI_TYPES;
  };

  // Get suppliers for selected utility type
  const getSuppliersForUtilityType = () => {
    const utilityTypes = getUtilityTypes();
    return selectedUtilityType ? utilityTypes[selectedUtilityType as keyof typeof utilityTypes] || [] : [];
  };

  // Check if current selection typically uses NMI
  const usesNMI = () => {
    return selectedUtilityType === "C&I Electricity" || 
           selectedUtilityType === "SME Electricity" || 
           selectedUtilityType === "DMA" ||
           (agreementType === "eoi" && contractType === "Direct Meter Agreement");
  };

  // Check if current selection typically uses MIRN
  const usesMIRN = () => {
    return selectedUtilityType === "C&I Gas" || selectedUtilityType === "SME Gas";
  };
  
  // Legacy functions for backward compatibility
  const requiresNMI = () => usesNMI();
  const requiresMIRN = () => usesMIRN();

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

  // Get supplier email for selected contract type
  const getSupplierEmail = (): { name: string; email: string } | null => {
    if (!contractType) return null;
    
    const mapping = agreementType === "eoi" ? EOI_EMAIL_MAPPINGS : CONTRACT_EMAIL_MAPPINGS;
    
    // Try exact match first
    if (contractType in mapping) {
      return mapping[contractType];
    }
    
    // Try case-insensitive match
    const lowerContractType = contractType.toLowerCase();
    for (const [key, value] of Object.entries(mapping)) {
      if (key.toLowerCase() === lowerContractType) {
        return value;
      }
    }
    
    // Default for unmatched types
    return {
      name: "Unknown Supplier",
      email: "members@acesolutions.com.au"
    };
  };

  // Get the identifier label
  const getIdentifierLabel = () => {
    if (usesNMI()) return "NMI";
    if (usesMIRN()) return "MIRN";
    // For other types, show a generic identifier field
    if (selectedUtilityType) return "Identifier (Optional)";
    return "";
  };

  // Build business name with identifier for submission
  const buildBusinessNameForSubmission = () => {
    let fullBusinessName = businessName.trim();
    if (usesNMI() && nmi.trim()) {
      fullBusinessName += ` NMI: ${nmi.trim()}`;
    } else if (usesMIRN() && mirn.trim()) {
      fullBusinessName += ` MIRN: ${mirn.trim()}`;
    } else if (nmi.trim()) {
      // Generic NMI if provided but not for electricity/DMA
      fullBusinessName += ` NMI: ${nmi.trim()}`;
    } else if (mirn.trim()) {
      // Generic MIRN if provided but not for gas
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

    // Identifiers are now optional, so no validation needed

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
        const submittedName = buildBusinessNameForSubmission();
        setSubmittedBusinessName(submittedName);
        setResult(data.message || "✅ Agreement submitted successfully!");
        // Reset form on success (but keep business name if it was from URL)
        setFiles(null);
        const urlBusinessName = searchParams.get('businessName');
        if (!urlBusinessName) {
          setBusinessName("");
        }
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
    <ToolPageLayout
      pageName="Signed Agreement Lodgement"
      title="Signed agreement lodgement"
      description="Submit signed contracts or EOIs for supplier notification and filing."
      width="md"
    >
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
          {contractType && (() => {
            const supplierInfo = getSupplierEmail();
            if (supplierInfo) {
              return (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm">
                    <div className="font-medium text-blue-900 mb-1">
                      📧 Will be sent to: <span className="font-semibold">{supplierInfo.name}</span>
                    </div>
                    <div className="text-blue-700 text-xs break-all">
                      {supplierInfo.email}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Business Name */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block font-medium text-gray-700">
            Business Name *
          </label>
        </div>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Enter business name..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Identifier Field (NMI/MIRN) - Optional */}
      {selectedUtilityType && (
        <div className="mb-4">
          <label className="block font-medium mb-2 text-gray-700">
            {getIdentifierLabel()} <span className="text-gray-500 text-sm">(Optional)</span>
            <span className="text-sm text-gray-500 ml-1">
              {usesNMI() && "(National Meter Identifier - typically used for electricity/DMA)"}
              {usesMIRN() && "(Meter Installation Registration Number - typically used for gas)"}
              {!usesNMI() && !usesMIRN() && "(Enter NMI or MIRN if applicable)"}
            </span>
          </label>
          <div className="flex gap-2">
            {usesNMI() && (
              <input
                type="text"
                value={nmi}
                onChange={(e) => setNmi(e.target.value)}
                placeholder="Enter NMI (optional)..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {usesMIRN() && (
              <input
                type="text"
                value={mirn}
                onChange={(e) => setMirn(e.target.value)}
                placeholder="Enter MIRN (optional)..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {!usesNMI() && !usesMIRN() && (
              <>
                <input
                  type="text"
                  value={nmi}
                  onChange={(e) => setNmi(e.target.value)}
                  placeholder="NMI (optional)..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={mirn}
                  onChange={(e) => setMirn(e.target.value)}
                  placeholder="MIRN (optional)..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}
          </div>
          {(nmi.trim() || mirn.trim()) && (
            <p className="mt-1 text-sm text-green-600">
              ✅ Full business identifier: "{buildBusinessNameForSubmission()}"
            </p>
          )}
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

      <Button
        onClick={handleSubmit}
        disabled={
          loading || 
          !files || 
          files.length === 0 ||
          !contractType || 
          !businessName.trim()
        }
        loading={loading}
        className="w-full"
      >
        {`Submit signed ${agreementType === "contract" ? "contract" : "EOI"}${multipleAttachments ? "s" : ""}`}
      </Button>

      {result && (
        <Card className="mt-6">
          <CardContent className="pt-6">
          <div 
            className={`whitespace-pre-wrap text-sm rounded-xl p-4 ${
              result.includes("✅") ? "text-green-800 bg-green-50 border border-green-200" : "text-red-800 bg-red-50 border border-red-200"
            }`}
            dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
          />
          </CardContent>
        </Card>
      )}
    </ToolPageLayout>
  );
}