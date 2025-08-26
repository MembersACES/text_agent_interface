import React, { useState } from "react";
import { getApiBaseUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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

export default function BusinessInfoDisplay({ info, onLinkUtility }: BusinessInfoDisplayProps) {
  if (!info) return null;
  const business = info.business_details || {};
  const contact = info.contact_information || {};
  const rep = info.representative_details || {};
  const docs: Record<string, any> = (info && typeof info.business_documents === 'object' && info.business_documents !== null && !Array.isArray(info.business_documents)) ? info.business_documents : {};
  console.log('docs object:', docs);
  console.log('info.business_documents:', info.business_documents);
  const contracts = [
    { key: "C&I Electricity", url: info._processed_file_ids?.["contract_C&I Electricity"] },
    { key: "SME Electricity", url: info._processed_file_ids?.["contract_SME Electricity"] },
    { key: "C&I Gas", url: info._processed_file_ids?.["contract_C&I Gas"] },
    { key: "SME Gas", url: info._processed_file_ids?.["contract_SME Gas"] },
    { key: "Waste", url: info._processed_file_ids?.["contract_Waste"] },
    { key: "Oil", url: info._processed_file_ids?.["contract_Oil"] },
    { key: "DMA", url: info._processed_file_ids?.["contract_DMA"] },
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
  const [driveModalLoading, setDriveModalLoading] = useState(false);
  const [driveModalResult, setDriveModalResult] = useState<string | null>(null);

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
        setDriveModalResult(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [driveModalResult]);

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
            { key: 'documents', label: 'Business Documents & Signed Agreements', count: Object.keys(docs).length + contracts.filter(c => c.url).length },
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
          <h2 className="text-lg font-bold text-gray-800 mb-4">Documents</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Business Documents */}
            <div>
              <h3 className="font-semibold text-gray-800 text-base mb-4">Business Documents</h3>
              {Object.keys(docs).length === 0 && <div className="text-xs text-gray-400 mb-4">No business documents available</div>}
              <div className="space-y-2">
                {Object.entries(docs).map(([doc, status]) => {
                  const specialKeyMap: { [key: string]: string } = {
                    'Floor Plan (Exit Map)': 'business_site_map_upload'
                  };
                  const docKey = `business_${doc}`;
                  const normalizedDocKey = `business_${doc.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
                  const specialMappedKey = specialKeyMap[doc];
                  
                  const fileUrl = info._processed_file_ids?.[docKey] 
                              || info._processed_file_ids?.[normalizedDocKey] 
                              || (specialMappedKey ? info._processed_file_ids?.[specialMappedKey] : undefined);

                  return (
                    <div key={doc} className="flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{doc}</div>
                        <div className="text-xs text-gray-500">
                          {fileUrl ? <FileLink label="View File" url={fileUrl} /> : "Not available"}
                        </div>
                      </div>
                      <div className="flex gap-1">
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
                        
                        {doc === "Initial Strategy" && (
                          <button
                            className="px-2 py-1 border border-green-300 bg-green-50 rounded text-xs text-green-700 hover:bg-green-100"
                            onClick={openInitialStrategyGenerator}
                          >
                            Generate
                          </button>
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
                
                {/* WIP Document */}
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100">
                  <div className="flex-1">
                    <div className="text-sm font-medium">Work in Progress (WIP)</div>
                    <div className="text-xs text-gray-500">
                      {info._processed_file_ids?.["business_WIP"] ? 
                        <FileLink label="View File" url={info._processed_file_ids["business_WIP"]} /> : 
                        "Not available"
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Signed Contracts */}
            <div>
              <h3 className="font-semibold text-gray-800 text-base mb-4">Signed Contracts</h3>
              <div className="space-y-2">
                {contracts.map(({ key }) => {
                  const contractKeyMap: { [key: string]: string } = {
                    'C&I Electricity': 'signed_CI_E',
                    'SME Electricity': 'signed_SME_E',
                    'C&I Gas': 'signed_CI_G',
                    'SME Gas': 'signed_SME_G',
                    'Waste': 'signed_WASTE',
                    'Oil': 'signed_OIL',
                    'DMA': 'signed_DMA',
                  };
                  const originalKey = `contract_${key}`;
                  const mappedKey = `contract_${key.replace('C&I', 'CI').replace('SME', 'SME').replace(' ', '_')}`;
                  const url = info._processed_file_ids?.[originalKey] || info._processed_file_ids?.[mappedKey];

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
          </div>
        </div>

        {/* Utilities Section */}
        <div id="utilities" className="border-t pt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Linked Utilities and Retailers</h2>
          {Object.keys(linked).length === 0 && <div className="text-sm text-gray-400 mb-4">No linked utilities</div>}
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
              { key: "Cleaning", label: "Service Provider", tool: "cleaning", param: "business_name", requestType: "cleaning" },
              { key: "Telecommunication", label: "Account Number", tool: "telecommunication", param: "account_number", requestType: "telecommunication" },
            ]
            .filter(Boolean)
            .map((item) => {
                const realKey = 'sourceKey' in item && item.sourceKey ? item.sourceKey : item.key;
                const { key, label, tool, param, requestType } = item;
                const value = linked[realKey];

                // Special handling for Cleaning & Telecommunication
                if (key === "Cleaning" || key === "Telecommunication") {
                  const retailer = retailers[realKey] || '';
                  const statusLabel = value === true ? "In File" : (value ? "Available" : "Not available");
                  const filingType = key === "Cleaning" ? "cleaning_invoice_upload" : "telecommunication_invoice_upload";
                
                  return (
                    <div key={key} className="border rounded-lg p-3 bg-gray-50">
                      <div className="font-semibold text-gray-800 mb-2">{key}</div>
                      <div className="text-sm text-gray-600 mb-2">{statusLabel}</div>
                      {retailer && (
                        <div className="text-xs text-gray-500 mb-2">Provider: {retailer}</div>
                      )}
                      {info._processed_file_ids?.[`invoice_${key}`] && (
                        <div className="mb-2">
                          <FileLink label="Invoice File" url={info._processed_file_ids[`invoice_${key}`]} />
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
                        Upload Invoice
                      </button>
                    </div>
                  );
                }

                const identifiers = typeof value === "string"
                  ? value.split(",").map((v: string) => v.trim()).filter(Boolean)
                  : Array.isArray(value) ? value : [];

                // ✅ only keep robot identifiers that have data in robotData
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
        </div>
      </div>
    </div>

    {/* Drive Filing Modal */}
    {showDriveModal && (
      <div className="fixed inset-0 bg-black bg-opacity-25 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 min-w-[340px] shadow-lg focus:outline-none" tabIndex={-1}>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">File in Drive</h3>
          <div className="mb-4">
            <label className="font-semibold">Business Name:</label>
            <input type="text" value={driveModalBusinessName} readOnly className="ml-2 px-2 py-1 rounded border border-gray-300 min-w-[180px] bg-gray-50" />
          </div>
          <div className="mb-4">
            <label className="font-semibold">Filing Type:</label>
            <input type="text" value={driveModalFilingType} readOnly className="ml-2 px-2 py-1 rounded border border-gray-300 min-w-[180px] bg-gray-50" />
          </div>
          <div className="mb-6">
            <label className="font-semibold">File:</label>
            <input type="file" onChange={e => setDriveModalFile(e.target.files?.[0] || null)} className="ml-2" />
          </div>
          {driveModalResult && (
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded mb-4 font-medium text-sm">{driveModalResult}</div>
          )}
          <div className="flex justify-end space-x-2">
            <button
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-100 focus:outline-none"
              onClick={() => {
                setShowDriveModal(false);
                setDriveModalFile(null);
                setDriveModalResult(null);
              }}
              disabled={driveModalLoading}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none"
              onClick={async () => {
                if (!driveModalFile) return;
                setDriveModalLoading(true);
                setDriveModalResult(null);
                const formData = new FormData();
                formData.append('business_name', driveModalBusinessName);
                formData.append('filing_type', driveModalFilingType);
                formData.append("gdrive_url", info?.gdrive?.folder_url || "");
                formData.append('file', driveModalFile);
                try {
                  const res = await fetch(`${getApiBaseUrl()}/api/drive-filing?token=${encodeURIComponent(token)}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                  });
                  const data = await res.json();
                  if (data.status === 'success') {
                    setDriveModalResult('File successfully uploaded!');
                  } else {
                    setDriveModalResult(`Error: ${data.message}`);
                  }
                } catch (err: any) {
                  setDriveModalResult(`Error uploading file: ${err.message}`);
                } finally {
                  setDriveModalLoading(false);
                }
              }}
              disabled={!driveModalFile || driveModalLoading}
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
    </>
  );
}