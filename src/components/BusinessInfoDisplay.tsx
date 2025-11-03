import React, { useState, useCallback } from "react";
import { getApiBaseUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { combineFilesIntoPdf } from "@/lib/combineFiles";


function InfoRow({
  label,
  value,
  indent = 0,
}: {
  label: string;
  value: React.ReactNode;
  indent?: 0 | 4 | 6 | 8 | 12;
}) {
  const indentClass = {
    0: '',
    4: 'ml-4',
    6: 'ml-6',
    8: 'ml-8',
    12: 'ml-12',
  }[indent];

  return (
    <div className={`flex mb-1.5 items-center ${indentClass}`}>
      <div className="min-w-[140px] font-medium text-gray-700 text-sm">{label}:</div>
      <div className="ml-2 text-sm">{value}</div>
    </div>
  );
}

function mapUtilityKey(key: string): string {
  switch (key.toLowerCase()) {
    case "c&i electricity":
      return "electricity_ci";
    case "sme electricity":
      return "electricity_sme";
    case "c&i gas":
      return "gas_ci";
    case "sme gas":
    case "small gas":
      return "gas_sme";
    case "waste":
      return "waste";
    case "oil":
      return "oil";
    default:
      throw new Error(`Unknown utility key: ${key}`);
  }
}

interface BusinessInfoDisplayProps {
  info: any;
  onLinkUtility?: () => void;
  setInfo?: (info: any) => void;
}

function FileLink({ label, url }: { label: string; url?: string }) {
  if (!url) return <span className="text-xs text-gray-400">Not available</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline text-xs font-medium"
    >
      {label}
    </a>
  );
}

export default function BusinessInfoDisplay({ info, onLinkUtility, setInfo }: BusinessInfoDisplayProps) {
  if (!info) return null;
  const business = info.business_details || {};
  const contact = info.contact_information || {};
  const rep = info.representative_details || {};
  const docs: Record<string, any> = (info && typeof info.business_documents === 'object' && info.business_documents !== null && !Array.isArray(info.business_documents)) ? info.business_documents : {};
  console.log('docs object:', docs);
  console.log('info.business_documents:', info.business_documents);
  const getFileUrl = (key: string): string | undefined => {
    const value = info._processed_file_ids?.[key];
    return (value && typeof value === 'string') ? value : undefined;
  };
  
  const contracts: { key: string; url?: string }[] = [
    { key: "C&I Electricity", url: getFileUrl("contract_C&I Electricity") },
    { key: "SME Electricity", url: getFileUrl("contract_SME Electricity") },
    { key: "C&I Gas", url: getFileUrl("contract_C&I Gas") },
    { key: "SME Gas", url: getFileUrl("contract_SME Gas") },
    { key: "Waste", url: getFileUrl("contract_Waste") },
    { key: "Oil", url: getFileUrl("contract_Oil") },
    { key: "DMA", url: getFileUrl("contract_DMA") },
  ];
  const driveUrl = info.gdrive?.folder_url;

  // Linked Utilities
  const linked = info.Linked_Details?.linked_utilities || {};
  const retailers = info.Linked_Details?.utility_retailers || {};

  const router = useRouter();
  const businessName = business.name || "";

  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveModalFilingType, setDriveModalFilingType] = useState("");
  const [driveModalBusinessName, setDriveModalBusinessName] = useState("");
  const [driveModalFile, setDriveModalFile] = useState<File | null>(null);
  const [driveModalFiles, setDriveModalFiles] = useState<File[]>([]);
  const [driveModalMultipleFiles, setDriveModalMultipleFiles] = useState(false);
  const [driveModalLoading, setDriveModalLoading] = useState(false);
  const [driveModalResult, setDriveModalResult] = useState<string | null>(null);
  const [discrepancyLoading, setDiscrepancyLoading] = useState(false);
  const [discrepancyData, setDiscrepancyData] = useState<any>(null);
  const [advocacyLoading, setAdvocacyLoading] = useState(false);
  const [advocacyData, setAdvocacyData] = useState<any>(null);

  // Add state for Data Request modal
  const [showDataRequestModal, setShowDataRequestModal] = useState(false);
  const [dataRequestSummary, setDataRequestSummary] = useState<null | {
    businessName: string;
    retailer: string;
    email: string;
    identifier: string;
    requestType: string;
    param: string;
    tool: string;
    details: string;
  }>(null);

  const { data: session } = useSession();
  const token = (session as any)?.id_token;

  // C&I Electricity NMI logic
  const ciElectricity = linked["C&I Electricity"];
  let nmis: string[] = [];
  if (typeof ciElectricity === "string") {
    nmis = ciElectricity.split(",").map(n => n.trim()).filter(Boolean);
  } else if (Array.isArray(ciElectricity)) {
    nmis = ciElectricity;
  }

  const [showEOIModal, setShowEOIModal] = useState(false);
  const [eoiFile, setEOIFile] = useState<File | null>(null);
  const [eoiLoading, setEOILoading] = useState(false);
  const [eoiResult, setEOIResult] = useState<string | null>(null);
  // Helper to render sub-details for utilities
  function renderUtilityDetails(util: string, details: any) {
    if (typeof details === 'string' || typeof details === 'number') {
      return <InfoRow key={util} label={util} value={details} indent={12} />;
    }
    if (typeof details === 'object' && details !== null) {
      return Object.entries(details).map(([k, v]) => (
        <InfoRow key={k} label={k} value={v as string} indent={12} />
      ));
    }
    return null;
  }

  // Add this function to extract EOI files dynamically
  const getEOIFiles = () => {
    if (!info._processed_file_ids) return [];
    
    return Object.entries(info._processed_file_ids)
      .filter(([key]) => key.startsWith('eoi_'))
      .map(([key, url]) => ({
        key: key.replace('eoi_', '').replace(/_/g, ' '), // Convert eoi_C&I_Electricity to C&I Electricity
        displayName: key.replace('eoi_', '').replace(/_/g, ' ') + ' EOI',
        url
      }))
      .sort((a, b) => {
        // Sort by whether they have URLs (files with URLs first)
        if (a.url && !b.url) return -1;
        if (!a.url && b.url) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
  };

  const handleOpenSiteProfiling = () => {
    const params = new URLSearchParams();
    if (business.name) {
      params.set('businessName', business.name);
    }
    
    const businessInfoToPass = {
      name: business.name,
      address: contact.postal_address,
      siteAddress: contact.site_address,
      industry: business.industry,
      website: business.website,
      phone: contact.telephone,
      email: contact.email,
      googleDriveLink: driveUrl,
      utilities: linked,
      retailers: retailers,
      abn: business.abn,
      tradingName: business.trading_name,
      contactName: rep.contact_name,
      position: rep.position
    };
    
    params.set('businessInfo', encodeURIComponent(JSON.stringify(businessInfoToPass)));
    
    const url = `/site-profiling?${params.toString()}`;
    window.open(url, '_blank');
  };

  const handleOpenPresentationGenerator = () => {
    const params = new URLSearchParams();
    
    const businessInfoToPass = {
      name: business.name,
      abn: business.abn,
      trading_name: business.trading_name,
      email: contact.email,
      telephone: contact.telephone,
      postal_address: contact.postal_address,
      site_address: contact.site_address,
      contact_name: rep.contact_name,
      position: rep.position,
      industry: business.industry,
      website: business.website,
      googleDriveLink: driveUrl,
      utilities: linked,
      retailers: retailers
    };
    
    // Add utility information for auto-suggestions
    const linkedUtilities = [];
    if (linked["C&I Electricity"]) linkedUtilities.push("ELECTRICITY_CI");
    if (linked["SME Electricity"]) linkedUtilities.push("ELECTRICITY_SME");
    if (linked["C&I Gas"]) linkedUtilities.push("GAS_CI");
    if (linked["SME Gas"] || linked["Small Gas"]) linkedUtilities.push("GAS_SME");
    if (linked["Waste"]) linkedUtilities.push("WASTE");
    if (linked["Oil"]) linkedUtilities.push("COOKING_OIL");
    
    businessInfoToPass.utilities = linkedUtilities;
    
    params.set('businessInfo', encodeURIComponent(JSON.stringify(businessInfoToPass)));
    
    const url = `/strategy-generator?${params.toString()}`;
    window.open(url, '_blank');
  };

  const handleOpenDocumentGeneration = () => {
    const params = new URLSearchParams();
    
    if (business.name) params.set('businessName', business.name);
    if (business.abn) params.set('abn', business.abn);
    if (business.trading_name) params.set('tradingAs', business.trading_name);
    if (contact.email) params.set('email', contact.email);
    if (contact.telephone) params.set('phone', contact.telephone);
    if (contact.postal_address) params.set('address', contact.postal_address);
    if (contact.site_address) params.set('siteAddress', contact.site_address);
    if (rep.contact_name) params.set('contactName', rep.contact_name);
    if (rep.position) params.set('position', rep.position);
    if (driveUrl) params.set('clientFolderUrl', driveUrl);
    
    // Add utility information if available
    const linkedUtilities = [];
    if (linked["C&I Electricity"]) linkedUtilities.push("ELECTRICITY_CI");
    if (linked["SME Electricity"]) linkedUtilities.push("ELECTRICITY_SME");
    if (linked["C&I Gas"]) linkedUtilities.push("GAS_CI");
    if (linked["SME Gas"] || linked["Small Gas"]) linkedUtilities.push("GAS_SME");
    if (linked["Waste"]) linkedUtilities.push("WASTE");
    if (linked["Oil"]) linkedUtilities.push("COOKING_OIL");
    
    if (linkedUtilities.length > 0) {
      params.set('utilities', linkedUtilities.join(','));
    }
    
    const url = `/document-generation?${params.toString()}`;
    window.open(url, '_blank');
  };

  // Opens Initial Strategy Generator with business info
  const openInitialStrategyGenerator = () => {
    const params = new URLSearchParams();
    const businessInfoToPass: any = {
      name: business.name,
      abn: business.abn,
      trading_name: business.trading_name,
      email: contact.email,
      telephone: contact.telephone,
      postal_address: contact.postal_address,
      site_address: contact.site_address,
      contact_name: rep.contact_name,
      position: rep.position,
      industry: business.industry,
      website: business.website,
      googleDriveLink: driveUrl,
      retailers,
      utilities: [] as string[],
    };

    if (linked["C&I Electricity"]) businessInfoToPass.utilities.push("ELECTRICITY_CI");
    if (linked["SME Electricity"]) businessInfoToPass.utilities.push("ELECTRICITY_SME");
    if (linked["C&I Gas"]) businessInfoToPass.utilities.push("GAS_CI");
    if (linked["SME Gas"] || linked["Small Gas"]) businessInfoToPass.utilities.push("GAS_SME");
    if (linked["Waste"]) businessInfoToPass.utilities.push("WASTE");
    if (linked["Oil"]) businessInfoToPass.utilities.push("COOKING_OIL");

    // ❗ No encodeURIComponent here
    params.set("businessInfo", JSON.stringify(businessInfoToPass));
    window.open(`/initial-strategy-generator?${params.toString()}`, "_blank");
  };
  
  const openSolutionsStrategyGenerator = () => {
    const params = new URLSearchParams();
    const businessInfoToPass: any = {
      name: business.name,
      abn: business.abn,
      trading_name: business.trading_name,
      email: contact.email,
      telephone: contact.telephone,
      postal_address: contact.postal_address,
      site_address: contact.site_address,
      contact_name: rep.contact_name,
      position: rep.position,
      industry: business.industry,
      website: business.website,
      googleDriveLink: driveUrl,
      retailers,
      utilities: [] as string[],
    };

    if (linked["C&I Electricity"]) businessInfoToPass.utilities.push("ELECTRICITY_CI");
    if (linked["SME Electricity"]) businessInfoToPass.utilities.push("ELECTRICITY_SME");
    if (linked["C&I Gas"]) businessInfoToPass.utilities.push("GAS_CI");
    if (linked["SME Gas"] || linked["Small Gas"]) businessInfoToPass.utilities.push("GAS_SME");
    if (linked["Waste"]) businessInfoToPass.utilities.push("WASTE");
    if (linked["Oil"]) businessInfoToPass.utilities.push("COOKING_OIL");

    params.set("businessInfo", JSON.stringify(businessInfoToPass));
    window.open(`/solutions-strategy-generator?${params.toString()}`, "_blank");
  };

  React.useEffect(() => {
    if (driveModalResult === 'File successfully uploaded and Drive links updated!') {
      const timer = setTimeout(() => {
        setShowDriveModal(false);
        setDriveModalFile(null);
        setDriveModalFiles([]);
        setDriveModalMultipleFiles(false);
        setDriveModalResult(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [driveModalResult]);
  // EOI Modal auto-close effect
  React.useEffect(() => {
    if (eoiResult === 'EOI successfully processed and uploaded!') {
      const timer = setTimeout(() => {
        setShowEOIModal(false);
        setEOIFile(null);
        setEOIResult(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [eoiResult]);
  // Load EOI data on mount - Dynamic version
  const [eoiRefreshing, setEoiRefreshing] = React.useState(false);

  const fetchEOIData = async () => {
    if (!(business.name && typeof setInfo === "function")) return;
    try {
      const res = await fetch('https://membersaces.app.n8n.cloud/webhook/return_EOIIDs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_name: business.name })
      });
      const data = await res.json();
      console.log('EOI webhook response:', data);
      if (data && Array.isArray(data) && data.length > 0) {
        const businessData = data[0];
        const mappedFileIds: any = {};
        console.log('Processing EOI data:', businessData);
        // Process each row in the data array
        data.forEach((row: any, index: number) => {
          const eoiType = row['EOI Type'];
          const eoiFileId = row['EOI File ID'];
          // Only process if EOI Type and File ID exist
          if (eoiType && typeof eoiType === 'string' && eoiFileId && typeof eoiFileId === 'string') {
            console.log(`Processing EOI row ${index}: Type="${eoiType}", File ID="${eoiFileId}"`);
            // Only process if the file ID looks like a Google Drive file ID
            const googleDriveIdPattern = /^[a-zA-Z0-9_-]{10,}$/;
            if (googleDriveIdPattern.test(eoiFileId)) {
              // Use the EOI Type as the key name
              const cleanKey = eoiType.trim().replace(/\s+/g, '_');
              const mappedKey = `eoi_${cleanKey}`;
              // Create Google Drive URL
              mappedFileIds[mappedKey] = `https://drive.google.com/file/d/${eoiFileId}/view?usp=drivesdk`;
              console.log(`✅ Mapped EOI: "${eoiType}" -> "${mappedKey}" -> ${eoiFileId}`);
            } else {
              console.log(`Skipping EOI "${eoiType}" - File ID "${eoiFileId}" doesn't look like a Google Drive file ID`);
            }
          } else {
            console.log(`Skipping EOI row ${index} - missing EOI Type or File ID`);
          }
        });
        console.log('Final mapped EOI file IDs:', mappedFileIds);
        // Only update if we actually found valid EOI files
        if (Object.keys(mappedFileIds).length > 0) {
          setInfo((prevInfo: any) => ({
            ...prevInfo,
            _processed_file_ids: {
              ...prevInfo._processed_file_ids,
              ...mappedFileIds
            }
          }));
        } else {
          console.log('No valid EOI file IDs found');
        }
      } else {
        console.log('No EOI data found for business:', business.name);
      }
    } catch (err) {
      console.error('Error loading EOI data:', err);
    }
  };

  React.useEffect(() => {
    if (business.name && typeof setInfo === "function") {
      console.log('Loading EOI data for business:', business.name);
      
      // Add a small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        fetchEOIData();
      }, 100); // 100ms delay to prevent rapid successive calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [business.name]); // Removed setInfo from dependencies to prevent multiple calls
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (driveModalMultipleFiles) {
      setDriveModalFiles(files);
      setDriveModalFile(null);
    } else {
      setDriveModalFile(files[0] || null);
      setDriveModalFiles([]);
    }
  };

  const handleEOIFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEOIFile(e.target.files?.[0] || null);
  };
  
  const resetEOIModal = () => {
    setShowEOIModal(false);
    setEOIFile(null);
    setEOIResult(null);
  };
  
  // Handle EOI submission
  const handleEOISubmit = async () => {
    if (!eoiFile) {
      setEOIResult("No file selected.");
      return;
    }
  
    if (!eoiFile.name.toLowerCase().endsWith('.pdf')) {
      setEOIResult("Please upload a PDF file.");
      return;
    }
  
    setEOILoading(true);
    setEOIResult("");
  
    const formData = new FormData();
    formData.append("file", eoiFile);
  
    try {
      const res = await fetch("https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/eoi/process-eoi", {
        method: "POST",
        body: formData,
      });
  
      let data: any;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        setEOIResult(`Error parsing JSON: ${res.status} ${res.statusText}\n${text}`);
        setEOILoading(false);
        return;
      }
      
      if (res.ok) {
        // Refresh EOI data dynamically
        if (business.name && typeof setInfo === "function") {
          try {
            const response = await fetch('https://membersaces.app.n8n.cloud/webhook/return_EOIIDs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ business_name: business.name })
            });
            const data = await response.json();
            
             if (data && Array.isArray(data) && data.length > 0) {
               const mappedFileIds: any = {};
               
               console.log('Processing refresh EOI data:', data);
               
               // Process each row in the data array
               data.forEach((row, index) => {
                 const eoiType = row['EOI Type'];
                 const eoiFileId = row['EOI File ID'];
                 
                 // Only process if EOI Type and File ID exist
                 if (eoiType && typeof eoiType === 'string' && eoiFileId && typeof eoiFileId === 'string') {
                   console.log(`Processing refresh EOI row ${index}: Type="${eoiType}", File ID="${eoiFileId}"`);
                   
                   // Only process if the file ID looks like a Google Drive file ID
                   const googleDriveIdPattern = /^[a-zA-Z0-9_-]{10,}$/;
                   if (googleDriveIdPattern.test(eoiFileId)) {
                     // Use the EOI Type as the key name
                     const cleanKey = eoiType.trim().replace(/\s+/g, '_');
                     const mappedKey = `eoi_${cleanKey}`;
                     
                     // Create Google Drive URL
                     mappedFileIds[mappedKey] = `https://drive.google.com/file/d/${eoiFileId}/view?usp=drivesdk`;
                     
                     console.log(`✅ Refresh mapped EOI: "${eoiType}" -> "${mappedKey}" -> ${eoiFileId}`);
                   } else {
                     console.log(`Skipping refresh EOI "${eoiType}" - File ID "${eoiFileId}" doesn't look like a Google Drive file ID`);
                   }
                 } else {
                   console.log(`Skipping refresh EOI row ${index} - missing EOI Type or File ID`);
                 }
               });
              
              // Only update if we found valid EOI files
              if (Object.keys(mappedFileIds).length > 0) {
                setInfo((prevInfo: any) => ({
                  ...prevInfo,
                  _processed_file_ids: { 
                    ...prevInfo._processed_file_ids, 
                    ...mappedFileIds 
                  }
                }));
                
                console.log('EOI data refreshed after upload:', mappedFileIds);
              }
            }
          } catch (err) {
            console.error('Error refreshing EOI data:', err);
          }
        }
        setEOIResult("EOI successfully processed and uploaded!");
      } else {
        setEOIResult(`Upload failed: ${data.message || res.statusText}`);
      }
    } catch (error: any) {
      setEOIResult(`Error: ${error.message}`);
    } finally {
      setEOILoading(false);
    }
  };

  const resetDriveModal = () => {
    setShowDriveModal(false);
    setDriveModalFile(null);
    setDriveModalFiles([]);
    setDriveModalMultipleFiles(false);
    setDriveModalResult(null);
  };

  // Helper function to check if a document has a file
  const getDocumentFileUrl = (doc: string) => {
    const specialKeyMap: { [key: string]: string } = {
      'Floor Plan (Exit Map)': 'business_site_map_upload'
    };
    const docKey = `business_${doc}`;
    const normalizedDocKey = `business_${doc.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    const specialMappedKey = specialKeyMap[doc];
    
    return info._processed_file_ids?.[docKey] 
        || info._processed_file_ids?.[normalizedDocKey] 
        || (specialMappedKey ? info._processed_file_ids?.[specialMappedKey] : undefined);
  };

  // Helper function to check if a contract has a file
  const getContractFileUrl = (key: string) => {
    const originalKey = `contract_${key}`;
    const mappedKey = `contract_${key.replace('C&I', 'CI').replace('SME', 'SME').replace(' ', '_')}`;
    return info._processed_file_ids?.[originalKey] || info._processed_file_ids?.[mappedKey];
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border mt-6">
      {/* Header with Business Name and Key Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{business.name || 'Business Details'}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              {business.trading_name && (
                <span>Trading as: <span className="font-medium">{business.trading_name}</span></span>
              )}
              {business.abn && (
                <span>ABN: <span className="font-medium">{business.abn}</span></span>
              )}
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Drive Folder
                </a>
              )}
            </div>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleOpenDocumentGeneration}
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
            >
              Documents
            </button>
            <button
              onClick={openSolutionsStrategyGenerator}
              className="px-3 py-1.5 rounded bg-purple-600 text-white text-xs font-medium hover:bg-purple-700"
            >
              Strategy
            </button>
            
            {onLinkUtility && (
              <button
                onClick={onLinkUtility}
                className="px-3 py-1.5 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700"
              >
                Link Utility
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="border-b bg-gray-50">
        <nav className="flex px-6">
          {[
            { key: 'documents', label: 'Business Documents & Signed Agreements', count: Object.keys(docs).length + contracts.filter(c => c.url).length + Object.keys(info._processed_file_ids || {}).filter(key => key.startsWith('eoi_')).length },
            { key: 'utilities', label: 'Linked Utilities', count: Object.keys(linked).length }
          ].map((section) => (
            <button
              key={section.key}
              onClick={() => {
                const element = document.getElementById(section.key);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {section.label}
              {section.count !== null && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-200 text-xs">
                  {section.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* All Content - Single Page */}
      <div className="px-6 py-4 space-y-8">
        {/* Overview Section */}
        <div id="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 text-base mb-3">Contact Information</h3>
              <InfoRow label="Postal Address" value={contact.postal_address || <span className="text-xs text-gray-400">Not available</span>} />
              <InfoRow label="Site Address" value={contact.site_address || <span className="text-xs text-gray-400">Not available</span>} />
              <InfoRow label="Phone" value={contact.telephone || <span className="text-xs text-gray-400">Not available</span>} />
              <InfoRow label="Email" value={contact.email || <span className="text-xs text-gray-400">Not available</span>} />
            </div>

            {/* Representative Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 text-base mb-3">Representative Details</h3>
              <InfoRow label="Contact Name" value={rep.contact_name || <span className="text-xs text-gray-400">Not available</span>} />
              <InfoRow label="Position" value={rep.position || <span className="text-xs text-gray-400">Not available</span>} />
              <InfoRow label="LOA Sign Date" value={rep.signed_date || <span className="text-xs text-gray-400">Not available</span>} />
              <InfoRow label="LOA" value={<FileLink label="View File" url={info._processed_file_ids?.["business_LOA"]} />} />
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div id="documents" className="border-t pt-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Business Documents & Agreements</h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Business Documents */}
            <div>
              <h3 className="font-semibold text-gray-800 text-base mb-4">Business Documents</h3>
              {Object.keys(docs).length === 0 && <div className="text-xs text-gray-400 mb-4">No business documents available</div>}
              <div className="space-y-2">
                {/* Create array including WIP, sort by file availability */}
                {[
                  ...Object.entries(docs),
                  ['Work in Progress (WIP)', 'wip'],
                  ['Amortisation / Asset List', 'amortisation_asset_list']
                ]
                  .sort(([docA], [docB]) => {
                    const fileUrlA = docA === 'Work in Progress (WIP)' 
                      ? info._processed_file_ids?.["business_WIP"]
                      : getDocumentFileUrl(docA);
                    const fileUrlB = docB === 'Work in Progress (WIP)'
                      ? info._processed_file_ids?.["business_WIP"]
                      : getDocumentFileUrl(docB);

                    // Files with URLs first (return -1), files without URLs last (return 1)
                    if (fileUrlA && !fileUrlB) return -1;
                    if (!fileUrlA && fileUrlB) return 1;
                    return 0;
                  })
                  .map(([doc, status]) => {
                    const isWIP = doc === 'Work in Progress (WIP)';
                    const isAmortisationAssetList = doc === 'Amortisation / Asset List';
                    const fileUrl = isWIP 
                      ? info._processed_file_ids?.["business_WIP"]
                      : isAmortisationAssetList
                        ? info._processed_file_ids?.["business_amortisation_pdf"] || info._processed_file_ids?.["business_amortisation_excel"]
                        : getDocumentFileUrl(doc);

                    return (
                      <div key={doc} className="flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{doc}</div>
                          <div className="text-xs text-gray-500">
                            {isAmortisationAssetList ? (
                              <>
                                {info._processed_file_ids?.["business_amortisation_excel"] && (
                                  <>
                                    <FileLink label="Excel" url={info._processed_file_ids["business_amortisation_excel"]} />
                                    {info._processed_file_ids?.["business_amortisation_pdf"] && ' | '}
                                  </>
                                )}
                                {info._processed_file_ids?.["business_amortisation_pdf"] && (
                                  <FileLink label="PDF" url={info._processed_file_ids["business_amortisation_pdf"]} />
                                )}
                                {!info._processed_file_ids?.["business_amortisation_excel"] && !info._processed_file_ids?.["business_amortisation_pdf"] && "Not available"}
                              </>
                            ) : (
                              fileUrl ? <FileLink label="View File" url={fileUrl} /> : "Not available"
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {!isWIP && !isAmortisationAssetList && (
                            <>
                              <button
                              className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-200"
                              onClick={() => {
                                  let filingType = doc.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                  if (filingType === 'site_profling') filingType = 'site_profiling';
                                  if (filingType === 'service_fee_agreement') filingType = 'savings';
                                  if (filingType.includes('exit_map') || filingType.includes('exitmap') || filingType.includes('floor_plan_exit_map')) filingType = 'site_map_upload';
                                  setDriveModalFilingType(filingType);
                                  setDriveModalBusinessName(business.name || "");
                                  setShowDriveModal(true);
                                }}
                            >
                              File
                            </button>
                              </>
                            )}
                          {isAmortisationAssetList && (
                            <>
                              <button
                                className="px-2 py-1 border border-blue-300 bg-blue-50 rounded text-xs text-blue-700 hover:bg-blue-100"
                                onClick={() => {
                                  setDriveModalFilingType('amortisation_excel');
                                  setDriveModalBusinessName(business.name || "");
                                  setShowDriveModal(true);
                                }}
                              >
                                Excel
                              </button>
                              <button
                                className="px-2 py-1 border border-red-300 bg-red-50 rounded text-xs text-red-700 hover:bg-red-100 ml-1"
                                onClick={() => {
                                  setDriveModalFilingType('amortisation_pdf');
                                  setDriveModalBusinessName(business.name || "");
                                  setShowDriveModal(true);
                                }}
                              >
                                PDF
                              </button>
                            </>
                          )}
                          {doc === "Site Profling" && (
                            <button
                              className="px-2 py-1 border border-blue-300 bg-blue-50 rounded text-xs text-blue-700 hover:bg-blue-100"
                              onClick={handleOpenSiteProfiling}
                            >
                              New
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            {/* Signed Contracts */}
            <div>
              <h3 className="font-semibold text-gray-800 text-base mb-4">Signed Contracts</h3>
              <div className="space-y-2">
                {contracts
                  .sort((a, b) => {
                    // Sort by file availability - files with URLs first
                    const urlA = getContractFileUrl(a.key);
                    const urlB = getContractFileUrl(b.key);
                    if (urlA && !urlB) return -1;
                    if (!urlA && urlB) return 1;
                    return 0;
                  })
                  .map(({ key }) => {
                    const contractKeyMap: { [key: string]: string } = {
                      'C&I Electricity': 'signed_CI_E',
                      'SME Electricity': 'signed_SME_E',
                      'C&I Gas': 'signed_CI_G',
                      'SME Gas': 'signed_SME_G',
                      'Waste': 'signed_WASTE',
                      'Oil': 'signed_OIL',
                      'DMA': 'signed_DMA',
                    };
                    const url = getContractFileUrl(key);

                    return (
                      <div key={key} className="flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{key}</div>
                          <div className="text-xs text-gray-500">
                            {url ? <FileLink label="View File" url={url} /> : "Not available"}
                          </div>
                        </div>
                        <button
                          className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-200"
                          onClick={() => {
                            const filingType = contractKeyMap[key as keyof typeof contractKeyMap] || key.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                            setDriveModalFilingType(filingType);
                            setDriveModalBusinessName(business.name || "");
                            setShowDriveModal(true);
                          }}
                        >
                          File
                        </button>
                      </div>
                    );
                  })}
              </div>
              </div>
            {/* Signed EOIs */}
            <div>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 text-base mb-2">Signed EOIs</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (eoiRefreshing) return;
                    setEoiRefreshing(true);
                    try {
                      await fetchEOIData();
                    } finally {
                      setEoiRefreshing(false);
                    }
                  }}
                  className="px-2 py-1 rounded border border-gray-300 text-xs text-gray-700 hover:bg-gray-100"
                >
                  {eoiRefreshing ? 'Refreshing…' : 'Refresh'}
                </button>
                <button
                  onClick={() => setShowEOIModal(true)}
                  className="px-3 py-1.5 rounded bg-orange-600 text-white text-xs font-medium hover:bg-orange-700"
                >
                  Lodge EOI
                </button>
              </div>
            </div>
              <div className="space-y-2">
                {(() => {
                  // Get all EOI files dynamically from _processed_file_ids
                  const eoiFiles = Object.entries(info._processed_file_ids || {})
                    .filter(([key]) => key.startsWith('eoi_'))
                    .map(([key, url]) => {
                      // Remove eoi_ prefix and convert underscores to spaces
                      let displayName = key.replace('eoi_', '').replace(/_/g, ' ');
                      
                      // Only add "EOI" if it's not already in the name
                      if (!displayName.toLowerCase().includes('eoi') && !displayName.toLowerCase().includes('expression')) {
                        displayName += ' EOI';
                      }
                      
                      return { key, displayName, url: (url && typeof url === 'string') ? url : undefined };
                    })
                    .sort((a, b) => {
                      // Sort by file availability - files with URLs first
                      if (a.url && !b.url) return -1;
                      if (!a.url && b.url) return 1;
                      return a.displayName.localeCompare(b.displayName);
                    });

                  if (eoiFiles.length === 0) {
                    return <div className="text-xs text-gray-400 mb-4">No EOI files available</div>;
                  }

                  return eoiFiles.map(({ key, displayName, url }) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{displayName}</div>
                        <div className="text-xs text-gray-500">
                          {url ? <FileLink label="View File" url={url} /> : "Not available"}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            {/* Signed Engagement Forms */}
            <div>
              <h3 className="font-semibold text-gray-800 text-base mb-4">Signed Engagement Forms</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100">
                  <div className="flex-1">
                    <div className="text-sm font-medium">Engagement Form</div>
                    <div className="text-xs text-gray-500">
                      {getFileUrl("signed_engagement_forms") ? (
                        <FileLink label="View File" url={getFileUrl("signed_engagement_forms")} />
                      ) : (
                        "Not available"
                      )}
                    </div>
                  </div>
                  <button
                    className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-200"
                    onClick={() => {
                      setDriveModalFilingType("signed_engagement_forms");
                      setDriveModalBusinessName(businessName);
                      setDriveModalFile(null);
                      setDriveModalFiles([]);
                      setDriveModalMultipleFiles(false);
                      setDriveModalResult(null);
                      setShowDriveModal(true);
                    }}
                  >
                    File
                  </button>
                </div>
              </div>
            </div>
        </div>
        {/* Utilities Section */}
        <div id="utilities" className="border-t pt-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Linked Utilities and Retailers</h2>
          {Object.keys(linked).length === 0 && <div className="text-sm text-gray-400 mb-4">No linked utilities</div>}
          
          {/* Main Utilities Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { key: "C&I Electricity", label: "NMI", tool: "ci-electricity", param: "nmi", requestType: "electricity_ci" },
              { key: "SME Electricity", label: "NMI", tool: "sme-electricity", param: "nmi", requestType: "electricity_sme" },
              { key: "C&I Gas", label: "MRIN", tool: "ci-gas", param: "mrin", requestType: "gas_ci" },
              ...(() => {
                if (linked["SME Gas"]) {
                  return [{ key: "SME Gas", label: "MRIN", tool: "sme-gas", param: "mrin", requestType: "gas_sme", sourceKey: "SME Gas" }];
                } else if (linked["Small Gas"]) {
                  return [{ key: "SME Gas", label: "MRIN", tool: "sme-gas", param: "mrin", requestType: "gas_sme", sourceKey: "Small Gas" }];
                }
                return [];
              })(),
              { key: "Waste", label: "Account Number", tool: "waste", param: "account_number", requestType: "waste" },
              { key: "Oil", label: "Account Name", tool: "oil", param: "business_name", requestType: "oil" },
              { key: "Robot", label: "Robot Number", tool: "robot", param: "robot_number", requestType: "robot_data" },
            ]
            .filter(Boolean)
            .map((item) => {
                const realKey = 'sourceKey' in item && item.sourceKey ? item.sourceKey : item.key;
                const { key, label, tool, param, requestType } = item;
                const value = linked[realKey];

                const identifiers = typeof value === "string"
                  ? value.split(",").map((v: string) => v.trim()).filter(Boolean)
                  : Array.isArray(value) ? value : [];

                const filteredIdentifiers = identifiers;
                let retailerList = retailers[realKey];

                return identifiers.length > 0 ? (
                  <div key={key} className="border rounded-lg p-3 bg-gray-50">
                    <div className="font-semibold text-gray-800 mb-3">{key}</div>
                    <div className="space-y-2">
                      {identifiers.map((identifier: string, idx: number) => {
                        let retailer = '';
                        if (Array.isArray(retailerList)) {
                          retailer = retailerList[idx] || '';
                        } else if (typeof retailerList === 'string') {
                          retailer = retailerList;
                        }
                        
                        const isOil = key === "Oil";
                        const invoiceBusinessName = isOil ? identifier : businessName;
                        
                        return (
                          <div key={identifier} className="border-l-2 border-blue-200 pl-3">
                            <div className="text-sm font-medium">{label}: {identifier}</div>
                            {retailer && (
                              <div className="text-xs text-gray-500 mb-2">Retailer: {retailer}</div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              <button
                                className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 flex-1"
                                onClick={() => {
                                  let url = `/utility-invoice-info/${tool}?business_name=${encodeURIComponent(invoiceBusinessName)}&autoSubmit=1`;
                                  if (param !== "business_name") url += `&${param}=${encodeURIComponent(identifier)}`;
                                  
                                  // Add business information as URL parameters
                                  if (business.name) url += `&business_abn=${encodeURIComponent(business.abn || '')}`;
                                  if (business.trading_name) url += `&business_trading_name=${encodeURIComponent(business.trading_name)}`;
                                  if (business.industry) url += `&business_industry=${encodeURIComponent(business.industry)}`;
                                  if (business.website) url += `&business_website=${encodeURIComponent(business.website)}`;
                                  if (contact.postal_address) url += `&postal_address=${encodeURIComponent(contact.postal_address)}`;
                                  if (contact.telephone) url += `&contact_phone=${encodeURIComponent(contact.telephone)}`;
                                  if (contact.email) url += `&contact_email=${encodeURIComponent(contact.email)}`;
                                  if (rep.contact_name) url += `&contact_name=${encodeURIComponent(rep.contact_name)}`;
                                  if (rep.position) url += `&contact_position=${encodeURIComponent(rep.position)}`;
                                  if (rep.loa_sign_date) url += `&loa_sign_date=${encodeURIComponent(rep.loa_sign_date)}`;
                                  
                                  window.open(url, '_blank');
                                }}
                              >
                                Account Info
                              </button>
                              {tool !== "robot" && (
                                <button
                                  className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 flex-1"
                                  onClick={() => {
                                    setDataRequestSummary({
                                      businessName: invoiceBusinessName,
                                      retailer: retailer || key,
                                      email: contact.email || '',
                                      identifier,
                                      requestType,
                                      param,
                                      tool,
                                      details: param !== "business_name" ? identifier : '',
                                    });
                                    setShowDataRequestModal(true);
                                  }}
                                >
                                  Data Request
                                </button>
                              )}
                              <button
                                className="px-2 py-1 border border-yellow-300 rounded text-xs text-yellow-700 bg-yellow-50 hover:bg-yellow-100 flex-1"
                                onClick={() => {
                                  const businessInfoToPass = {
                                    business_name: business.name,
                                    abn: business.abn,
                                    trading_name: business.trading_name,
                                    email: contact.email,
                                    telephone: contact.telephone,
                                    postal_address: contact.postal_address,
                                    site_address: contact.site_address,
                                    contact_name: rep.contact_name,
                                    googleDriveLink: driveUrl,
                                    loaLink: info._processed_file_ids?.["business_LOA"],
                                  };

                                  const params = new URLSearchParams();
                                  params.set("businessInfo", encodeURIComponent(JSON.stringify(businessInfoToPass)));
                                  params.set("utility", mapUtilityKey(key)); 
                                  params.set("identifier", identifier);

                                  window.open(`/quote-request?${params.toString()}`, "_blank");
                                }}
                              >
                                Quote Request
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })}

            {/* Show other utilities that don't fit the standard pattern */}
            {Object.entries(linked).map(([util, details]) => {
              if (
                [
                  "c&i electricity",
                  "sme electricity",
                  "c&i gas",
                  "sme gas",
                  "small gas",
                  "waste",
                  "oil",
                  "cleaning",
                  "telecommunication",
                ].includes(util.toLowerCase()) ||
                util.toLowerCase().startsWith("robot")
              ) {
                return null;
              }
              let utilValue = '';
              if (typeof details === 'string' || typeof details === 'number') {
                utilValue = String(details);
              } else if (Array.isArray(details)) {
                utilValue = details.join(', ');
              } else if (typeof details === 'object' && details !== null) {
                utilValue = Object.values(details).join(', ');
              }
              
              let retailerValue = '';
              if (retailers[util]) {
                retailerValue = Array.isArray(retailers[util]) ? retailers[util].join(', ') : retailers[util];
              }
              
              return (
                <div key={util + "-other"} className="border rounded-lg p-3 bg-gray-50">
                  <div className="font-semibold text-gray-800 mb-2">{util}</div>
                  {utilValue && <div className="text-sm text-gray-600 mb-1">{utilValue}</div>}
                  {retailerValue && <div className="text-xs text-gray-500">Retailer: {retailerValue}</div>}
                </div>
              );
            })}
          </div>
          {/* Section Separator */}
          <div className="w-full border-t border-gray-300 my-8"></div>
          {/* Additional Services Section - Always show Cleaning & Telecommunication */}
          <div className="mt-8">
            {/* Visual separator */}
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Additional Utilities</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {["Cleaning", "Telecommunication", "Water"].map((serviceKey) => {
                // find the actual key in any case form (optional)
                const realKey = Object.keys(linked).find(
                  (k) => k.toLowerCase() === serviceKey.toLowerCase()
                ) || serviceKey;

                const value = linked[realKey];
                const retailer = retailers[realKey] || "";
                const filingType =
                  serviceKey === "Cleaning"
                    ? "cleaning_invoice_upload"
                    : serviceKey === "Telecommunication"
                    ? "telecommunication_invoice_upload"
                    : "water_invoice_upload";

                // Check for invoice file
                const invoiceFileKey = `invoice_${serviceKey}`;
                const hasInvoiceFile = info._processed_file_ids?.[invoiceFileKey];

                // Determine status
                let statusLabel = "Not available";
                if (hasInvoiceFile) statusLabel = "Invoice Available";
                else if (value === true) statusLabel = "In File";
                else if (value) statusLabel = "Available";

                return (
                  <div key={serviceKey} className="border rounded-lg p-3 bg-gray-50">
                    <div className="font-semibold text-gray-800 mb-2">{serviceKey}</div>
                    <div
                      className={`text-sm mb-2 ${
                        hasInvoiceFile ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {statusLabel}
                    </div>
                    {retailer && (
                      <div className="text-xs text-gray-500 mb-2">
                        Provider: {retailer}
                      </div>
                    )}
                    {hasInvoiceFile && (
                      <div className="mb-2">
                        <FileLink label="View Invoice" url={hasInvoiceFile} />
                      </div>
                    )}
                    <button
                      className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 w-full"
                      onClick={() => {
                        setDriveModalFilingType(filingType);
                        setDriveModalBusinessName(business.name || "");
                        setShowDriveModal(true);
                      }}
                    >
                      {hasInvoiceFile ? "Replace Invoice" : "Upload Invoice"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
       {/* Section Separator */}
      <div className="w-full border-t border-gray-300 my-8"></div>

      {/* Discrepancy Adjustments Section */}
      <div className="mt-8">
        <div className="flex items-center justify-center mb-4 gap-3">
          <h2 className="text-2xl font-bold text-gray-800 text-center">
            Discrepancy Adjustments
          </h2>
          {/* Refresh Button */}
          <button
            onClick={async () => {
              try {
                setDiscrepancyLoading(true);
                
                const wipUrl = info._processed_file_ids?.["business_WIP"];
                let wipDocId = null;
                
                if (wipUrl) {
                  const match = wipUrl.match(/\/d\/([^\/]+)/);
                  if (match) {
                    wipDocId = match[1];
                  }
                }

                const payload = {
                  business_name: business.name,
                  sheet_name: "Discrepancy Adjustments",
                  ...(wipDocId && { wip_document_id: wipDocId })
                };

                console.log('Sending discrepancy payload:', payload);

                const response = await fetch('https://membersaces.app.n8n.cloud/webhook/pull_descrepancy_advocacy_WIP', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                console.log('Discrepancy webhook response:', data);
                
                if (response.ok && data) {
                  setDiscrepancyData(data);
                } else {
                  alert('No data found or error occurred');
                }
              } catch (error) {
                console.error('Error calling webhook:', error);
                alert('Error fetching data');
              } finally {
                setDiscrepancyLoading(false);
              }
            }}
            disabled={discrepancyLoading}
            className="px-2 py-1 rounded border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {discrepancyLoading ? 'Loading...' : 'Refresh'}
          </button>
          
          {/* Go to Sheet Button - SEPARATE BUTTON */}
          <button
            onClick={() => {
              const wipUrl = info._processed_file_ids?.["business_WIP"];
              if (wipUrl) {
                const match = wipUrl.match(/\/d\/([^\/]+)/);
                if (match) {
                  const docId = match[1];
                  window.open(`https://docs.google.com/spreadsheets/d/${docId}/edit#gid=1576370139`, '_blank');
                }
              } else {
                alert('WIP document not available');
              }
            }}
            className="px-2 py-1 rounded border border-green-300 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Go to sheet
          </button>
        </div>
        
        <div className="border rounded-lg p-4 bg-gray-50">
          {discrepancyData && Array.isArray(discrepancyData) && discrepancyData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {discrepancyData.map((item: any, idx: number) => (
                <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  {Object.entries(item)
                    .filter(([key]) => key !== 'row_number')
                    .map(([key, value]) => {
                      // Format currency for discrepancy_amount field
                      let displayValue = String(value) || 'N/A';
                      if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('discrepancy_amount')) {
                        const numValue = parseFloat(String(value));
                        if (!isNaN(numValue)) {
                          displayValue = new Intl.NumberFormat('en-AU', {
                            style: 'currency',
                            currency: 'AUD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(numValue);
                        }
                      }
                      
                      return (
                        <div key={key} className="mb-2 last:mb-0">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {displayValue}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              {discrepancyLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  Loading...
                </div>
              ) : (
                'No data available - Click "Refresh" to fetch'
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section Separator */}
      <div className="w-full border-t border-gray-300 my-8"></div>

      {/* Advocacy Members Section */}
      <div className="mt-8">
        <div className="flex items-center justify-center mb-4 gap-3">
          <h2 className="text-2xl font-bold text-gray-800 text-center">
            Advocacy Members
          </h2>
          {/* Refresh Button */}
          <button
            onClick={async () => {
              try {
                setAdvocacyLoading(true);
                
                const wipUrl = info._processed_file_ids?.["business_WIP"];
                let wipDocId = null;
                
                if (wipUrl) {
                  const match = wipUrl.match(/\/d\/([^\/]+)/);
                  if (match) {
                    wipDocId = match[1];
                  }
                }

                const payload = {
                  business_name: business.name,
                  sheet_name: "Advocacy Members",
                  ...(wipDocId && { wip_document_id: wipDocId })
                };

                console.log('Sending advocacy payload:', payload);

                const response = await fetch('https://membersaces.app.n8n.cloud/webhook/pull_descrepancy_advocacy_WIP', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                console.log('Advocacy webhook response:', data);
                
                if (response.ok && data) {
                  setAdvocacyData(data);
                } else {
                  alert('No data found or error occurred');
                }
              } catch (error) {
                console.error('Error calling webhook:', error);
                alert('Error fetching data');
              } finally {
                setAdvocacyLoading(false);
              }
            }}
            disabled={advocacyLoading}
            className="px-2 py-1 rounded border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 hover:border-purple-400 hover:text-purple-600 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {advocacyLoading ? 'Loading...' : 'Refresh'}
          </button>
          
          {/* Go to Sheet Button - SEPARATE BUTTON */}
          <button
            onClick={() => {
              const wipUrl = info._processed_file_ids?.["business_WIP"];
              if (wipUrl) {
                const match = wipUrl.match(/\/d\/([^\/]+)/);
                if (match) {
                  const docId = match[1];
                  // Replace with the actual gid for "Advocacy Members" sheet
                  window.open(`https://docs.google.com/spreadsheets/d/${docId}/edit#gid=46241003`, '_blank');
                }
              } else {
                alert('WIP document not available');
              }
            }}
            className="px-2 py-1 rounded border border-green-300 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Go to sheet
          </button>
        </div>
        <div className="border rounded-lg p-4 bg-gray-50">
          {advocacyData && Array.isArray(advocacyData) && advocacyData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {advocacyData.map((item: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    // Extract the business name from the advocacy member data
                    const businessName = item.advocacy_member || item.ADVOCACY_MEMBER || item['Advocacy Member'] || '';
                    if (businessName) {
                      // Open business info page in new tab with pre-filled business name
                      window.open(`/business-info?businessName=${encodeURIComponent(businessName)}`, '_blank');
                    }
                  }}
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400 text-left"
                >
                  {Object.entries(item)
                    .filter(([key]) => key !== 'row_number')
                    .map(([key, value]) => (
                      <div key={key} className="mb-2 last:mb-0">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {String(value) || 'N/A'}
                        </div>
                      </div>
                    ))}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              {advocacyLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                  Loading...
                </div>
              ) : (
                'No data available - Click "Refresh" to fetch'
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>

    {/* Drive Filing Modal */}
    {showDriveModal && (
      <div className="fixed inset-0 bg-black bg-opacity-25 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 min-w-[400px] shadow-lg focus:outline-none" tabIndex={-1}>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">File in Drive</h3>
          
          <div className="mb-4">
            <label className="font-semibold">Business Name:</label>
            <input 
              type="text" 
              value={driveModalBusinessName} 
              readOnly 
              className="ml-2 px-2 py-1 rounded border border-gray-300 min-w-[180px] bg-gray-50" 
            />
          </div>
          
          <div className="mb-4">
            <label className="font-semibold">Filing Type:</label>
            <input 
              type="text" 
              value={driveModalFilingType} 
              readOnly 
              className="ml-2 px-2 py-1 rounded border border-gray-300 min-w-[180px] bg-gray-50" 
            />
          </div>

          {/* Multiple Files Checkbox - only show for floor plan related files */}
          {(driveModalFilingType.includes('site_map') || driveModalFilingType.includes('floor') || driveModalFilingType.includes('exit')) && (
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={driveModalMultipleFiles}
                  onChange={(e) => {
                    setDriveModalMultipleFiles(e.target.checked);
                    // Clear existing files when toggling
                    setDriveModalFile(null);
                    setDriveModalFiles([]);
                  }}
                  className="mr-2"
                />
                <span className="font-semibold">Multiple Files?</span>
                <span className="ml-2 text-sm text-gray-600">(for multiple exit plans)</span>
              </label>
            </div>
          )}
          
          <div className="mb-6">
            <label className="font-semibold">
              {driveModalMultipleFiles ? 'Files:' : 'File:'}
            </label>
            <input 
              type="file" 
              multiple={driveModalMultipleFiles}
              onChange={handleFileChange}
              className="ml-2" 
            />
            {driveModalMultipleFiles && driveModalFiles.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                Selected files: {driveModalFiles.map(f => f.name).join(', ')}
              </div>
            )}
            {!driveModalMultipleFiles && driveModalFile && (
              <div className="mt-2 text-sm text-gray-600">
                Selected file: {driveModalFile.name}
              </div>
            )}
          </div>
          
          {driveModalResult && (
            <div className={`px-4 py-2 rounded mb-4 font-medium text-sm ${
              driveModalResult.includes('success') || driveModalResult.includes('successfully')
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {driveModalResult}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-100 focus:outline-none"
              onClick={resetDriveModal}
              disabled={driveModalLoading}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none"
              onClick={async () => {
                const filesToUpload = driveModalMultipleFiles ? driveModalFiles : (driveModalFile ? [driveModalFile] : []);
                
                if (filesToUpload.length === 0) return;
                
                setDriveModalLoading(true);
                setDriveModalResult(null);
                
                try {
                  const formData = new FormData();
                  formData.append('business_name', driveModalBusinessName);
                  formData.append('filing_type', driveModalFilingType);
                  formData.append("gdrive_url", info?.gdrive?.folder_url || "");
                  
                  if (driveModalMultipleFiles && filesToUpload.length > 1) {
                    // 🔹 Merge into one PDF
                    const combined = await combineFilesIntoPdf(filesToUpload);
                    formData.append("file", combined);
                  } else {
                    // Single file upload
                    formData.append("file", filesToUpload[0]);
                  }
                  
                  const res = await fetch(`${getApiBaseUrl()}/api/drive-filing?token=${encodeURIComponent(token)}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                  });
                  
                  const data = await res.json();
                  if (data.status === 'success') {
                    // 🔹 Call n8n webhook to get updated file IDs
                    if (business.name && typeof setInfo === "function") {
                      try {
                        const webhookResponse = await fetch('https://membersaces.app.n8n.cloud/webhook/return_fileIDs', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            business_name: business.name
                          })
                        });
                        
                        const updatedData = await webhookResponse.json();
                        console.log('Updated data from n8n:', updatedData);
                        
                        // Check if we got valid data back
                        if (updatedData && Array.isArray(updatedData) && updatedData.length > 0) {
                          const businessData = updatedData[0];
                          console.log('Raw business data from n8n:', businessData);
                          
                          // Map the flat n8n structure to your expected _processed_file_ids structure
                          const mappedFileIds: any = {};
                          
                          // Map LOA
                          if (businessData['LOA File ID']) {
                            mappedFileIds['business_LOA'] = `https://drive.google.com/file/d/${businessData['LOA File ID']}/view?usp=drivesdk`;
                          }
                          
                          // Map WIP
                          if (businessData['WIP']) {
                            mappedFileIds['business_WIP'] = `https://drive.google.com/file/d/${businessData['WIP']}/view?usp=drivesdk`;
                          }
                          
                          // Map contracts
                          if (businessData['SC C&I E']) {
                            mappedFileIds['contract_C&I Electricity'] = `https://drive.google.com/file/d/${businessData['SC C&I E']}/view?usp=drivesdk`;
                          }
                          if (businessData['SC SME E']) {
                            mappedFileIds['contract_SME Electricity'] = `https://drive.google.com/file/d/${businessData['SC SME E']}/view?usp=drivesdk`;
                          }
                          if (businessData['SC C&I G']) {
                            mappedFileIds['contract_C&I Gas'] = `https://drive.google.com/file/d/${businessData['SC C&I G']}/view?usp=drivesdk`;
                          }
                          if (businessData['SC SME G']) {
                            mappedFileIds['contract_SME Gas'] = `https://drive.google.com/file/d/${businessData['SC SME G']}/view?usp=drivesdk`;
                          }
                          if (businessData['SC Waste']) {
                            mappedFileIds['contract_Waste'] = `https://drive.google.com/file/d/${businessData['SC Waste']}/view?usp=drivesdk`;
                          }
                          if (businessData['SC Oil']) {
                            mappedFileIds['contract_Oil'] = `https://drive.google.com/file/d/${businessData['SC Oil']}/view?usp=drivesdk`;
                          }
                          if (businessData['SC DMA']) {
                            mappedFileIds['contract_DMA'] = `https://drive.google.com/file/d/${businessData['SC DMA']}/view?usp=drivesdk`;
                          }
                          
                          // Map other documents
                          if (businessData['Floor Plan']) {
                            mappedFileIds['business_site_map_upload'] = `https://drive.google.com/file/d/${businessData['Floor Plan']}/view?usp=drivesdk`;
                          }
                          if (businessData['Site Profiling']) {
                            mappedFileIds['business_site_profiling'] = `https://drive.google.com/file/d/${businessData['Site Profiling']}/view?usp=drivesdk`;
                          }
                          if (businessData['Service Fee Agreement']) {
                            mappedFileIds['business_service_fee_agreement'] = `https://drive.google.com/file/d/${businessData['Service Fee Agreement']}/view?usp=drivesdk`;
                          }
                          if (businessData['Initial Strategy']) {
                            mappedFileIds['business_initial_strategy'] = `https://drive.google.com/file/d/${businessData['Initial Strategy']}/view?usp=drivesdk`;
                          }
                          if (businessData['Amortisation Excel']) {
                            mappedFileIds['business_amortisation_excel'] = `https://drive.google.com/file/d/${businessData['Amortisation Excel']}/view?usp=drivesdk`;
                          }
                          if (businessData['Amortisation PDF']) {
                            mappedFileIds['business_amortisation_pdf'] = `https://drive.google.com/file/d/${businessData['Amortisation PDF']}/view?usp=drivesdk`;
                          }
                          // Map invoices
                          if (businessData['Cleaning Invoice']) {
                            mappedFileIds['invoice_Cleaning'] = `https://drive.google.com/file/d/${businessData['Cleaning Invoice']}/view?usp=drivesdk`;
                          }
                          if (businessData['Oil Invoice']) {
                            mappedFileIds['invoice_Oil'] = `https://drive.google.com/file/d/${businessData['Oil Invoice']}/view?usp=drivesdk`;
                          }
                          if (businessData['Water Invoice']) {
                            mappedFileIds['invoice_Water'] = `https://drive.google.com/file/d/${businessData['Water Invoice']}/view?usp=drivesdk`;
                          }
                          
                          console.log('Mapped file IDs:', mappedFileIds);

                          if (businessData['Amortisation Excel']) {
                            mappedFileIds['business_amortisation_excel'] = `https://drive.google.com/file/d/${businessData['Amortisation Excel']}/view?usp=drivesdk`;
                          }
                          if (businessData['Amortisation PDF']) {
                            mappedFileIds['business_amortisation_pdf'] = `https://drive.google.com/file/d/${businessData['Amortisation PDF']}/view?usp=drivesdk`;
                          }
                          // Update only the file IDs, keep everything else the same
                          setInfo((prevInfo: any) => ({
                            ...prevInfo,
                            _processed_file_ids: {
                              ...prevInfo._processed_file_ids,
                              ...mappedFileIds
                            }
                          }));
                        }
                        
                        // Set the exact message that triggers modal close
                        setDriveModalResult('File successfully uploaded and Drive links updated!');
                        
                      } catch (webhookErr) {
                        console.error("Error calling n8n webhook:", webhookErr);
                        // Still close modal even if webhook fails
                        setDriveModalResult('File successfully uploaded and Drive links updated!');
                      }
                    } else {
                      // Fallback if no setInfo function
                      setDriveModalResult('File successfully uploaded and Drive links updated!');
                    }
                  } else {
                    setDriveModalResult(`Error: ${data.message}`);
                  }
                } catch (err: any) {
                  setDriveModalResult(`Error uploading file(s): ${err.message}`);
                } finally {
                  setDriveModalLoading(false);
                }
              }}
              disabled={(driveModalMultipleFiles ? driveModalFiles.length === 0 : !driveModalFile) || driveModalLoading}
            >
              {driveModalLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Data Request Confirmation Modal */}
    {showDataRequestModal && dataRequestSummary && (
      <div className="fixed inset-0 bg-black bg-opacity-25 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 min-w-[340px] shadow-lg focus:outline-none" tabIndex={-1}>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Data Request</h3>
          <div className="mb-3"><span className="font-semibold">Business Name:</span> <span className="ml-2">{dataRequestSummary.businessName}</span></div>
          <div className="mb-3"><span className="font-semibold">Retailer:</span> <span className="ml-2">{dataRequestSummary.retailer}</span></div>
          <div className="mb-3"><span className="font-semibold">Identifier:</span> <span className="ml-2">{dataRequestSummary.identifier}</span></div>
          <div className="mb-3"><span className="font-semibold">Request Type:</span> <span className="ml-2">{dataRequestSummary.requestType}</span></div>
          <div className="flex justify-end space-x-2 mt-6">
            <button
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-100 focus:outline-none"
              onClick={() => {
                setShowDataRequestModal(false);
                setDataRequestSummary(null);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none"
              onClick={() => {
                let url = `/data-request?business_name=${encodeURIComponent(dataRequestSummary.businessName)}&supplier_name=${encodeURIComponent(dataRequestSummary.retailer)}&request_type=${encodeURIComponent(dataRequestSummary.requestType)}`;
                if (dataRequestSummary.param !== "business_name") url += `&details=${encodeURIComponent(dataRequestSummary.identifier)}`;
                url += `&autoSubmit=1`;
                window.open(url, '_blank');
                setShowDataRequestModal(false);
                setDataRequestSummary(null);
              }}
            >
              Confirm & Send
            </button>
          </div>
        </div>
      </div>
        )}
  {/* EOI Modal */}
  {showEOIModal && (
    <div className="fixed inset-0 bg-black bg-opacity-25 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 min-w-[400px] shadow-lg focus:outline-none" tabIndex={-1}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Lodge EOI</h3>
        
        <div className="mb-6">
          <label className="font-semibold">EOI File:</label>
          <input 
            type="file" 
            accept="application/pdf"
            onChange={handleEOIFileChange}
            className="ml-2" 
          />
          <p className="text-xs text-gray-500 mt-1">Accepted: PDF files only</p>
          {eoiFile && (
            <div className="mt-2 text-sm text-gray-600">
              Selected file: {eoiFile.name}
            </div>
          )}
        </div>
        
        {eoiResult && (
          <div className={`px-4 py-2 rounded mb-4 font-medium text-sm ${
            eoiResult.includes('success') || eoiResult.includes('successfully')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {eoiResult}
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-100 focus:outline-none"
            onClick={resetEOIModal}
            disabled={eoiLoading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-orange-600 text-white font-semibold hover:bg-orange-700 focus:outline-none"
            onClick={handleEOISubmit}
            disabled={!eoiFile || eoiLoading}
          >
            {eoiLoading ? 'Uploading...' : 'Submit EOI'}
          </button>
        </div>
      </div>
    </div>
  )}
      </div>
      </>
    );
  }