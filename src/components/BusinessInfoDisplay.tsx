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
    <div className={`flex mb-2 items-center ${indentClass}`}>
      <div className="min-w-[160px] font-semibold text-gray-700">{label}:</div>
      <div className="ml-2">{value}</div>
    </div>
  );
}
function FileLink({ label, url }: { label: string; url?: string }) {
  if (!url) return <span className="text-sm text-gray-400">Not available</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline text-sm font-medium"
    >
      {label}
    </a>
  );
}

export default function BusinessInfoDisplay({ info }: { info: any }) {
  if (!info) return null;
  const business = info.business_details || {};
  const contact = info.contact_information || {};
  const rep = info.representative_details || {};
  const docs: Record<string, any> = (info && typeof info.business_documents === 'object' && info.business_documents !== null && !Array.isArray(info.business_documents)) ? info.business_documents : {};
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
      <div className="bg-gray-50 rounded-lg p-6 mt-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Business Details</h2>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleOpenDocumentGeneration();
            }}
            className="text-blue-600 hover:underline text-sm font-medium"
            title="Generate documents for this client"
          >
            (Generate Documents)
          </a>
        </div>
        <InfoRow
          label="Business Name"
          value={
            <div className="flex items-center space-x-2">
              <span>{business.name || <span className="text-sm text-gray-400">Not available</span>}</span>
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  (Drive Folder)
                </a>
              )}
            </div>
          }
        />

      <InfoRow label="Trading As" value={business.trading_name || <span className="text-sm text-gray-400">Not available</span>} />
      <InfoRow label="ABN" value={business.abn || <span className="text-sm text-gray-400">Not available</span>} />
      <hr className="my-4 border-gray-200" />
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h2>
      <InfoRow label="Postal Address" value={contact.postal_address || <span className="text-sm text-gray-400">Not available</span>} />
      <InfoRow label="Site Address" value={contact.site_address || <span className="text-sm text-gray-400">Not available</span>} />
      <InfoRow label="Contact Number" value={contact.telephone || <span className="text-sm text-gray-400">Not available</span>} />
      <InfoRow label="Contact Email" value={contact.email || <span className="text-sm text-gray-400">Not available</span>} />
      <hr className="my-4 border-gray-200" />
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Representative Details</h2>
      <InfoRow label="Contact Name" value={rep.contact_name || <span className="text-sm text-gray-400">Not available</span>} />
      <InfoRow label="Position" value={rep.position || <span className="text-sm text-gray-400">Not available</span>} />
      <InfoRow label="LOA Sign Date" value={rep.signed_date || <span className="text-sm text-gray-400">Not available</span>} />
      <InfoRow label="LOA" value={<FileLink label="In File" url={info._processed_file_ids?.["business_LOA"]} />} />
      <hr className="my-4 border-gray-200" />
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Business Documents</h2>
      {Object.keys(docs).length === 0 && <div className="text-sm text-gray-400 mb-4">No business documents available</div>}
      <div className="space-y-2">
      {Object.entries(docs).map(([doc, status]) => {
          // Robust file key lookup with special mapping for known mismatches
          const specialKeyMap: { [key: string]: string } = {
            'Floor Plan (Exit Map)': 'business_site_map_upload'
          };
          const docKey = `business_${doc}`;
          const normalizedDocKey = `business_${doc.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
          const specialMappedKey = specialKeyMap[doc];
          
          const fileUrl = info._processed_file_ids?.[docKey] 
                      || info._processed_file_ids?.[normalizedDocKey] 
                      || (specialMappedKey ? info._processed_file_ids?.[specialMappedKey] : undefined);

          // Debug logs
          if (typeof window !== 'undefined') {
            console.log('Checking doc:', doc, 'docKey:', docKey, 'normalizedDocKey:', normalizedDocKey, 'specialMappedKey:', specialMappedKey, 'fileUrl:', fileUrl);
            console.log('All fileIds:', info._processed_file_ids);
          }
        return (
          <div key={doc} className="flex items-center mb-2">
            <InfoRow
              label={doc}
              value={fileUrl ? <FileLink label="In File" url={fileUrl} /> : <span className="text-sm text-gray-400">Not available</span>}
            />
            <button
              className="ml-2 px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 focus:outline-none"
              title="File this document in Drive"
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
              File in Drive
            </button>
            {doc === "Site Profling" && (
              <button
                className="ml-2 px-2 py-1 border border-blue-300 bg-blue-50 rounded text-xs text-blue-700 hover:bg-blue-100 focus:outline-none"
                title="Start new site profiling questionnaire"
                onClick={handleOpenSiteProfiling}
              >
                New Questionnaire
              </button>
            )}
          </div>
        );
      })}
      </div>
      <hr className="my-4 border-gray-200" />
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Signed Contracts</h2>
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
          // For display, still use the old keys to find the file URL, but for filingType use the new keys
          const mappedKey = `contract_${key.replace('C&I', 'CI').replace('SME', 'SME').replace(' ', '_')}`;
          const url = info._processed_file_ids?.[originalKey] || info._processed_file_ids?.[mappedKey];

          return (
            <div key={key} className="flex items-center mb-2">
              <InfoRow
                label={key}
                value={url ? <FileLink label="In File" url={url} /> : <span className="text-sm text-gray-400">Not available</span>}
              />
              <button
                className="ml-2 px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 focus:outline-none"
                title="File this contract in Drive"
                onClick={() => {
                  const filingType = contractKeyMap[key as keyof typeof contractKeyMap] || key.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                  setDriveModalFilingType(filingType);
                  setDriveModalBusinessName(business.name || "");
                  setShowDriveModal(true);
                }}
              >
                File in Drive
              </button>
            </div>
          );
        })}
      </div>
      <hr className="my-4 border-gray-200" />
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Linked Utilities and Retailers</h2>
      {Object.keys(linked).length === 0 && <div className="text-sm text-gray-400 mb-4">No linked utilities</div>}
      <div className="space-y-4">
      {/* Utility rows with Invoice Data buttons */}
      {[
        { key: "C&I Electricity", label: "NMI", tool: "ci-electricity", param: "nmi", requestType: "electricity_ci" },
        { key: "SME Electricity", label: "NMI", tool: "sme-electricity", param: "nmi", requestType: "electricity_sme" },
        { key: "C&I Gas", label: "MRIN", tool: "ci-gas", param: "mrin", requestType: "gas_ci" },
        // SME Gas: prefer 'SME Gas', but if not present, use 'Small Gas' as 'SME Gas'
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
        // Type guard for sourceKey
        const realKey = 'sourceKey' in item && item.sourceKey ? item.sourceKey : item.key;
        const { key, label, tool, param, requestType } = item;
        const value = linked[realKey];
        if (!value) return null;
        const identifiers = typeof value === "string"
          ? value.split(",").map((v: string) => v.trim()).filter(Boolean)
          : Array.isArray(value) ? value : [];
        // Retailer logic: match by index if array, else use string for all
        let retailerList = retailers[realKey];
        return identifiers.length > 0 ? (
          <div key={key} className="mb-3">
            <div className="font-semibold text-gray-700 text-base mb-1">{key}:</div>
            {identifiers.map((identifier: string, idx: number) => {
              let retailer = '';
              if (Array.isArray(retailerList)) {
                retailer = retailerList[idx] || '';
              } else if (typeof retailerList === 'string') {
                retailer = retailerList;
              }
              // For Oil, use identifier as business_name in query
              const isOil = key === "Oil";
              const invoiceBusinessName = isOil ? identifier : businessName;
              return (
                <div key={identifier} className="flex items-center ml-4 mb-1">
                  <span className="min-w-[120px] text-sm">{label}: {identifier}</span>
                  {retailer && (
                    <span className="ml-2 text-gray-500 text-xs">
                      Retailer: <span className="font-medium">{retailer}</span>
                    </span>
                  )}
                  <button
                    className="ml-3 px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 focus:outline-none"
                    title="View invoice data for this utility"
                    onClick={() => {
                      let url = `/utility-invoice-info/${tool}?business_name=${encodeURIComponent(invoiceBusinessName)}&autoSubmit=1`;
                      if (param !== "business_name") url += `&${param}=${encodeURIComponent(identifier)}`;
                      window.open(url, '_blank');
                    }}
                  >
                    Invoice Data
                  </button>
                  {tool !== "robot" && (
                    <button
                      className="ml-2 px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 focus:outline-none"
                      title="Request data from supplier for this utility"
                      onClick={() => {
                        // Data Request tool page (assume /data-request page exists)
                        // Instead of opening immediately, show modal
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
                </div>
              );
            })}
          </div>
        ) : null;
      })}
      </div>
      {/* Remove separate retailer rows for these utilities */}
      {Object.entries(linked).map(([util, details]) => {
        if (["C&I Electricity", "SME Electricity", "C&I Gas", "SME Gas", "Waste", "Oil"].includes(util)) return null;
        // Utility value(s)
        let utilValue = '';
        if (typeof details === 'string' || typeof details === 'number') {
          utilValue = String(details);
        } else if (Array.isArray(details)) {
          utilValue = details.join(', ');
        } else if (typeof details === 'object' && details !== null) {
          utilValue = Object.values(details).join(', ');
        }
        // Retailer value(s)
        let retailerValue = '';
        if (retailers[util]) {
          retailerValue = Array.isArray(retailers[util]) ? retailers[util].join(', ') : retailers[util];
        }
        return (
          <div key={util + "-retailer"} style={{ marginBottom: 0 }}>
            {retailerValue && (
              <div style={{ display: 'flex', fontWeight: 500, marginLeft: 16, marginTop: 2 }}>
                <span style={{ minWidth: 120 }}>Retailer:</span>
                <span style={{ fontWeight: 400 }}>{retailerValue}</span>
              </div>
            )}
          </div>
        );
      })}
      <hr className="my-4 border-gray-200" />
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
                  // Upload file to backend
                  const formData = new FormData();
                  formData.append('business_name', driveModalBusinessName);
                  formData.append('filing_type', driveModalFilingType);
                  formData.append("gdrive_url", info?.gdrive?.folder_url || "");
                  formData.append('file', driveModalFile);
                  for (const [k, v] of formData.entries()) {
                    console.log(k, v);
                  }
                  try {
                    const res = await fetch(`${getApiBaseUrl()}/api/drive-filing?token=${encodeURIComponent(token)}`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                      body: formData,
                    });
                    let data;
                    try {
                      data = await res.json();
                    } catch (jsonErr) {
                      const text = await res.text();
                      setDriveModalResult(`Error: ${res.status} ${res.statusText}\n${text}`);
                      setDriveModalLoading(false);
                      return;
                    }
                    if (data.status === 'success') {
                      setDriveModalResult('File uploaded! Updating Drive links...');
                      // Wait 4 seconds, then try fetching file IDs up to 3 times
                      let fileIds = null;
                      for (let attempt = 1; attempt <= 3; attempt++) {
                        await new Promise(r => setTimeout(r, attempt === 1 ? 4000 : 2000));
                        const fileIdRes = await fetch('https://membersaces.app.n8n.cloud/webhook/return_fileIDs', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ business_name: driveModalBusinessName }),
                        });
                        fileIds = await fileIdRes.json();
                        // Process n8n response to match UI keys
                        const n8nMap = {
                          'LOA File ID': 'business_LOA',
                          'Floor Plan': 'business_Floor Plan (Exit Map)',
                          'Site Profiling': 'business_Site Profling',
                          'Service Fee Agreement': 'business_Service Fee Agreement',
                          'SC C&I E': 'contract_C&I Electricity',
                          'SC SME E': 'contract_SME Electricity',
                          'SC C&I G': 'contract_C&I Gas',
                          'SC SME G': 'contract_SME Gas',
                          'SC Waste': 'contract_Waste',
                          'SC Oil': 'contract_Oil',
                          'SC DMA': 'contract_DMA',
                        };
                        const mappedFileIds: { [key: string]: string } = {};
                        if (Array.isArray(fileIds) && fileIds.length > 0) {
                          const idData = fileIds[0];
                          for (const key in n8nMap) {
                            if (idData[key]) {
                              mappedFileIds[n8nMap[key as keyof typeof n8nMap]] = `https://drive.google.com/file/d/${idData[key]}/view`;
                            }
                          }
                        }
                        // Check if the relevant file is now present
                        if (mappedFileIds && Object.keys(mappedFileIds).length > 0) {
                          if (info && mappedFileIds) {
                            if (!info._processed_file_ids) info._processed_file_ids = {};
                            Object.assign(info._processed_file_ids, mappedFileIds);
                          }
                          setDriveModalResult('File successfully uploaded and Drive links updated!');
                          break;
                        }
                      }
                      if (!fileIds || Object.keys(fileIds).length === 0) {
                        setDriveModalResult('File uploaded! It may take a few seconds for the Drive link to appear. Please refresh if you don\'t see it soon.');
                      }
                    } else {
                      setDriveModalResult(`Error: ${data.status || res.status} ${data.message || res.statusText}`);
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
                  // Proceed with the original logic
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
    </div>
  );
} 