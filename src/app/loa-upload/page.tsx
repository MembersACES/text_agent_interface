'use client';
import React, { useState } from 'react';
import BusinessDetailsDisplay from '../../components/BusinessDetailsDisplay';
import IndustrySubfolderSelector from '../../components/IndustrySubfolderSelector';
import { Alert } from '../../components/ui-elements/alert';

const LOA_OPTIONS = [
  "LOA"
];

const UTILITY_OPTIONS = {
  ELECTRICITY_CI: "ELECTRICITY C&I",
  ELECTRICITY_SME: "ELECTRICITY SME", 
  GAS_CI: "GAS C&I",
  GAS_SME: "GAS SME",
  WASTE: "WASTE",
  COOKING_OIL: "COOKING OIL",
  GREASE_TRAP: "GREASE TRAP",
  WATER: "WATER",
};

const UTILITY_API_ENDPOINTS: Record<string, string> = {
  WASTE: "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/waste/process-invoice",
  COOKING_OIL: "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/oil/process-invoice",
  ELECTRICITY_CI: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/electricity-ci/process-invoice",
  ELECTRICITY_SME: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/electricity-sme/process-invoice",
  GAS_CI: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/gas-ci/process-invoice",
  GAS_SME: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/gas-sme/process-invoice",
  GREASE_TRAP: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/grease-trap/process-invoice",
  WATER: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/water/process-invoice",
};

const LOA_API_ENDPOINTS: Record<string, string> = {
  LOA: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/loa/process-document",
};

const INDUSTRY_OPTIONS = [
  '003-Clubs',
  '003-Hardware',
  '003-Health Care',
  '003-Hotels',
  '003-Others',
  '003-Supermarkets',
];

export default function LoaUploadPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [utilityType, setUtilityType] = useState('LOA');
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [showFolderPrompt, setShowFolderPrompt] = useState(false);
  const [businessDetails, setBusinessDetails] = useState<any>(null);
  const [industry, setIndustry] = useState('');
  const [subfolder, setSubfolder] = useState('');
  const [folderResult, setFolderResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);
  
  // New states for utility linking
  const [showUtilityPrompt, setShowUtilityPrompt] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState<string>("");
  const [utilityFile, setUtilityFile] = useState<File | null>(null);
  const [utilityUploadResult, setUtilityUploadResult] = useState<string | null>(null);
  const [utilityData, setUtilityData] = useState<any>(null);
  const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set());
  const [utilityLoading, setUtilityLoading] = useState(false);
  const [utilityRefreshing, setUtilityRefreshing] = useState(false);
  const [utilityError, setUtilityError] = useState<string | null>(null);
  const [utilitySuccessMessage, setUtilitySuccessMessage] = useState<string | null>(null);
  const [linkedUtilities, setLinkedUtilities] = useState<string[]>([]); // Track linked utilities

  // Step 1: Upload LOA document
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadResult("No file selected.");
      return;
    }

    setLoading(true);
    setUploadResult(null);
    setAuthError(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('utility_type', utilityType);

    const endpoint = LOA_API_ENDPOINTS[utilityType];

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        const text = await res.text();
        setUploadResult(`❌ Error parsing JSON: ${res.status} ${res.statusText}\n${text}`);
        setLoading(false);
        return;
      }

      if (data.message && /invalid token|token expired|expired token/i.test(data.message)) {
        setAuthError(true);
        setUploadResult(null);
      } else if (res.ok) {
        setUploadResult(`✅ ${data.message || 'Document lodged successfully!'}`);
        setShowFolderPrompt(true);
      } else {
        setUploadResult(`❌ Upload failed: ${data.message || res.statusText}`);
      }
    } catch (error: any) {
      setUploadResult(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Prompt for folder creation
  const handleFolderPrompt = (yes: boolean) => {
    setShowFolderPrompt(false);
    if (yes) {
      fetchBusinessDetails();
    } else {
      setStep(99); // End flow if folder creation is skipped
    }
  };

  // Step 3: Fetch business details
  const fetchBusinessDetails = async () => {
    setLoading(true);
    setAuthError(false);
    try {
      const res = await fetch('https://membersaces.app.n8n.cloud/webhook/return_business_details', { method: 'POST' });
      const data = await res.json();
      if (data.message && /invalid token|token expired|expired token/i.test(data.message)) {
        setAuthError(true);
        setUploadResult(null);
        return;
      }
      setBusinessDetails(Array.isArray(data) ? data[0] : data);
      setStep(3);
    } catch (err) {
      setUploadResult('Error fetching business details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Confirm business details
  const handleConfirmBusiness = (confirm: boolean) => {
    if (confirm) {
      setStep(4);
    } else {
      setRefreshing(true);
      fetchBusinessDetailsRefresh();
    }
  };

  const fetchBusinessDetailsRefresh = async () => {
    setAuthError(false);
    try {
      const res = await fetch('https://membersaces.app.n8n.cloud/webhook/return_business_details', { method: 'POST' });
      const data = await res.json();
      if (data.message && /invalid token|token expired|expired token/i.test(data.message)) {
        setAuthError(true);
        setUploadResult(null);
        return;
      }
      setBusinessDetails(Array.isArray(data) ? data[0] : data);
    } catch (err) {
      setUploadResult('Error fetching business details.');
    } finally {
      setRefreshing(false);
    }
  };

  // Step 5: Industry selection
  const handleIndustrySelect = (value: string) => {
    setIndustry(value);
    setStep(5);
  };

  // Step 6: Subfolder selection
  const handleSubfolderSelect = async (value: string) => {
    setSubfolder(value);
    setStep(6);
    setLoading(true);
    setAuthError(false);
    
    const n8nPayload = {
      'Business Name': businessDetails?.['Business Name'] || '',
      'Trading As': businessDetails?.['Trading As'] || '',
      'Industry Classification Folder': industry,
      'Industry Classification SubFolder': value,
    };
    
    try {
      // n8n will now handle both the Airtable update AND the Google Apps Script trigger
      const n8nRes = await fetch('https://membersaces.app.n8n.cloud/webhook/update_airtable_call_script_function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
      });
      
      const n8nData = await n8nRes.json();
      if (n8nData.message && /invalid token|token expired|expired token/i.test(n8nData.message)) {
        setAuthError(true);
        setFolderResult(null);
        return;
      }
      
      if (!n8nRes.ok) {
        setFolderResult(`❌ Folder creation failed: ${n8nRes.status} ${n8nRes.statusText}`);
        setLoading(false);
        return;
      }
      
      setFolderResult('✅ Client folder creation details have been sent and processed! Google Drive folder creation has been triggered successfully!');
      
      // After successful folder creation, show utility prompt after a brief delay
      setTimeout(() => {
        setShowUtilityPrompt(true);
      }, 1500);
      
    } catch (err) {
      setFolderResult('❌ Error processing folder creation.');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Utility linking functions
  const handleUtilityPrompt = (yes: boolean) => {
    setShowUtilityPrompt(false);
    if (yes) {
      setStep(7); // Upload utility invoice
    } else {
      setStep(99); // End flow
    }
  };

  const handleLinkAnotherUtility = () => {
    // Reset utility-related states
    setSelectedUtility("");
    setUtilityFile(null);
    setUtilityUploadResult(null);
    setUtilityData(null);
    setUtilityError(null);
    setUtilitySuccessMessage(null);
    setExpandedRecords(new Set());
    
    // Go back to utility upload step
    setStep(7);
  };

  const handleUtilityFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUtilityFile(e.target.files[0]);
    }
  };

  const handleUtilityUpload = async () => {
    if (!utilityFile || !selectedUtility) {
      setUtilityUploadResult("Please select a utility type and file.");
      return;
    }

    if (!/\.pdf$/i.test(utilityFile.name)) {
      setUtilityUploadResult("Please upload a PDF file for utility invoices.");
      return;
    }

    setUtilityLoading(true);
    setUtilityUploadResult(null);

    const formData = new FormData();
    formData.append("file", utilityFile);

    const endpoint = UTILITY_API_ENDPOINTS[selectedUtility];

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        setUtilityUploadResult(`❌ Error parsing JSON: ${res.status} ${res.statusText}\n${text}`);
        return;
      }

      if (res.ok) {
        setUtilityUploadResult(`✅ Utility invoice uploaded successfully: ${data.message || "No message returned."}`);
        setStep(8); // Move to utility data retrieval
        fetchUtilityData();
      } else {
        setUtilityUploadResult(`❌ Upload failed: ${data.message || res.statusText}`);
      }
    } catch (error: any) {
      setUtilityUploadResult(`❌ Error: ${error.message}`);
    } finally {
      setUtilityLoading(false);
    }
  };

  const fetchUtilityData = async () => {
    setUtilityLoading(true);
    setUtilityError(null);
    
    try {
      const res = await fetch('https://membersaces.app.n8n.cloud/webhook/return_utility_info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          utility_type: selectedUtility,
          business_name: businessDetails?.['Business Name'] || ''
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || "Unknown error");
      }

      const data = await res.json();
      setUtilityData(data);
    } catch (err: any) {
      setUtilityError(err.message);
    } finally {
      setUtilityLoading(false);
    }
  };

  const getKeyFields = (utilityType: string, record: any) => {
    switch (utilityType) {
      case 'ELECTRICITY_CI':
      case 'ELECTRICITY_SME':
        return {
          identifier: record.NMI,
          identifierLabel: 'NMI',
          address: record['Site Address'] || record['Supply Address'],
          retailer: record.Retailer,
          clientName: record['Client Name']
        };
      case 'GAS_CI':
      case 'GAS_SME':
        return {
          identifier: record.MRIN,
          identifierLabel: 'MRIN',
          address: record['Site Address:'] || record['Site Address'] || record['Supply Address'],
          retailer: record.Retailer,
          clientName: record['Client Name']
        };
      case 'WASTE':
        return {
          identifier: record['Account Number or Customer Number'],
          identifierLabel: 'Account Number',
          address: record['Supply Address'],
          retailer: record.Provider,
          clientName: record['Client Name']
        };
      case 'COOKING_OIL':
        return {
          identifier: record['Account Number / Customer Code'],
          identifierLabel: 'Account Number / Customer Code',
          address: record['Site Address'],
          retailer: record.Retailer,
          clientName: record['Client Name']
        };
      default:
        return {
          identifier: 'N/A',
          identifierLabel: 'ID',
          address: 'N/A',
          retailer: 'N/A',
          clientName: 'N/A'
        };
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRecords(newExpanded);
  };

  const handleConfirmUtility = async (confirm: boolean) => {
    if (confirm) {
      setUtilityLoading(true);
      setUtilityError(null);
      setUtilitySuccessMessage(null);
      
      try {
        const utilityDetails = [];
        
        if (Array.isArray(utilityData) && utilityData.length > 0) {
          for (const record of utilityData) {
            const keyFields = getKeyFields(selectedUtility, record);
            utilityDetails.push({
              identifier: keyFields.identifier,
              identifier_type: keyFields.identifierLabel,
              client_name: keyFields.clientName,
              retailer: keyFields.retailer,
              site_address: keyFields.address
            });
          }
        } else if (typeof utilityData === 'object' && utilityData !== null) {
          const keyFields = getKeyFields(selectedUtility, utilityData);
          utilityDetails.push({
            identifier: keyFields.identifier,
            identifier_type: keyFields.identifierLabel,
            client_name: keyFields.clientName,
            retailer: keyFields.retailer,
            site_address: keyFields.address
          });
        }

        const payload = {
          business_name: businessDetails?.['Business Name'] || '',
          utility_type: selectedUtility,
          utility_details: utilityDetails
        };

        const res = await fetch('https://membersaces.app.n8n.cloud/webhook/update_airtable_utility_link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || err.message || "Failed to confirm utility link");
        }

        setUtilitySuccessMessage(`${UTILITY_OPTIONS[selectedUtility as keyof typeof UTILITY_OPTIONS]} utility successfully linked to ${businessDetails?.['Business Name']}!`);
        
        // Add the linked utility to the list
        setLinkedUtilities(prev => [...prev, UTILITY_OPTIONS[selectedUtility as keyof typeof UTILITY_OPTIONS]]);
        
        setTimeout(() => {
          setStep(99); // End flow after success
        }, 3000);
        
      } catch (err: any) {
        setUtilityError(`Failed to confirm utility link: ${err.message}`);
      } finally {
        setUtilityLoading(false);
      }
    } else {
      // Refresh utility data
      setUtilityRefreshing(true);
      setUtilityError(null);
      setUtilitySuccessMessage(null);
      fetchUtilityData();
      setUtilityRefreshing(false);
    }
  };

  // UI rendering by step
  if (step === 1) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h1 className="text-2xl font-bold mb-4">LOA Document Upload</h1>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Document Type</label>
            <select
              value={utilityType}
              onChange={(e) => setUtilityType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              {LOA_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Document File</label>
            <input 
              type="file" 
              onChange={handleFileChange} 
              className="w-full" 
              required 
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={loading || !file}
          >
            {loading ? 'Uploading...' : `Lodge ${utilityType.replace(/_/g, " ")}`}
          </button>
        </form>
        
        {uploadResult && <div className="mt-4 text-center font-medium whitespace-pre-wrap">{uploadResult}</div>}
        
        {showFolderPrompt && (
          <div className="mt-6 p-4 bg-gray-100 rounded">
            <p className="mb-2">Would you like to create a Google Drive client folder for this client?</p>
            <button className="bg-green-600 text-white px-3 py-1 rounded mr-2" onClick={() => handleFolderPrompt(true)}>Yes</button>
            <button className="bg-gray-400 text-white px-3 py-1 rounded" onClick={() => handleFolderPrompt(false)}>No</button>
          </div>
        )}
        
        {authError && (
          <Alert
            variant="error"
            title="Session Expired"
            description="Invalid token: Please re-authenticate. Log out and log in again."
          />
        )}
      </div>
    );
  }

  if (step === 3 && businessDetails) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h2 className="text-xl font-bold mb-4">Confirm Business Details</h2>
        <BusinessDetailsDisplay details={businessDetails} />
        <div className="flex gap-4 mt-4">
          <button 
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50" 
            onClick={() => handleConfirmBusiness(true)}
            disabled={refreshing}
          >
            Confirm
          </button>
          <button 
            className="bg-gray-400 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2" 
            onClick={() => handleConfirmBusiness(false)}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h2 className="text-xl font-bold mb-4">Select Industry Classification</h2>
        <IndustrySubfolderSelector
          industry={industry}
          setIndustry={handleIndustrySelect}
          subfolder={subfolder}
          setSubfolder={() => {}}
          step={4}
        />
      </div>
    );
  }

  if (step === 5 && industry) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h2 className="text-xl font-bold mb-4">Select State/Subfolder</h2>
        <IndustrySubfolderSelector
          industry={industry}
          setIndustry={() => {}}
          subfolder={subfolder}
          setSubfolder={handleSubfolderSelect}
          step={5}
        />
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h2 className="text-xl font-bold mb-4">Folder Creation Result</h2>
        {loading ? <div>Processing...</div> : <div>{folderResult}</div>}
        
        {showUtilityPrompt && (
          <div className="mt-6 p-4 bg-blue-100 rounded">
            <p className="mb-2">Would you like to link a utility for this client?</p>
            <button className="bg-green-600 text-white px-3 py-1 rounded mr-2" onClick={() => handleUtilityPrompt(true)}>Yes</button>
            <button className="bg-gray-400 text-white px-3 py-1 rounded" onClick={() => handleUtilityPrompt(false)}>No</button>
          </div>
        )}
        
        {authError && (
          <Alert
            variant="error"
            title="Session Expired"
            description="Invalid token: Please re-authenticate. Log out and log in again."
          />
        )}
      </div>
    );
  }

  if (step === 7) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h2 className="text-xl font-bold mb-4">Upload Utility Invoice</h2>
        <p className="text-gray-600 mb-4">Upload a utility invoice to link it to {businessDetails?.['Business Name']}.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Utility Type</label>
            <select
              value={selectedUtility}
              onChange={(e) => setSelectedUtility(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Select Utility Type</option>
              {Object.entries(UTILITY_OPTIONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block font-medium mb-1">Utility Invoice (PDF)</label>
            <input 
              type="file" 
              accept="application/pdf"
              onChange={handleUtilityFileChange} 
              className="w-full" 
            />
            <p className="text-xs text-gray-500 mt-1">Accepted: .pdf</p>
          </div>
          
          <button
            onClick={handleUtilityUpload}
            disabled={utilityLoading || !utilityFile || !selectedUtility}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {utilityLoading ? 'Uploading...' : 'Upload Utility Invoice'}
          </button>
        </div>
        
        {utilityUploadResult && (
          <div className="mt-4 whitespace-pre-wrap text-sm">{utilityUploadResult}</div>
        )}
      </div>
    );
  }

  if (step === 8 && utilityData) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h2 className="text-xl font-bold mb-4">Confirm Utility Information</h2>
        <p className="text-gray-600 mb-4">Review the utility information below and confirm if it's correct.</p>
        
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {UTILITY_OPTIONS[selectedUtility as keyof typeof UTILITY_OPTIONS]} Utility Information
          </h3>
          
          <div className="space-y-4">
            {Array.isArray(utilityData) && utilityData.length > 0 ? (
              utilityData.map((record: any, index: number) => {
                const keyFields = getKeyFields(selectedUtility, record);
                const isExpanded = expandedRecords.has(index);
                
                return (
                  <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="space-y-2 mb-3">
                      <div className="flex">
                        <span className="font-semibold text-gray-700 w-32 text-sm">{keyFields.identifierLabel}:</span>
                        <span className="text-gray-900 text-sm">{keyFields.identifier || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-gray-700 w-32 text-sm">Client Name:</span>
                        <span className="text-gray-900 text-sm">{keyFields.clientName || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-gray-700 w-32 text-sm">Retailer:</span>
                        <span className="text-gray-900 text-sm">{keyFields.retailer || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-gray-700 w-32 text-sm">Site Address:</span>
                        <span className="text-gray-900 text-sm">{keyFields.address || 'N/A'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpanded(index)}
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none"
                    >
                      <span>{isExpanded ? 'Hide' : 'Show'} Full Details</span>
                      <svg className={`ml-1 h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-800 mb-3">Complete Information:</h4>
                        <div className="space-y-2">
                          {Object.entries(record).map(([key, value]) => {
                            if (key === 'row_number' || value === '' || value === null || value === undefined) {
                              return null;
                            }
                            
                            return (
                              <div key={key} className="flex flex-col sm:flex-row">
                                <div className="font-medium text-gray-600 sm:w-1/3 mb-1 sm:mb-0 text-xs">
                                  {key}:
                                </div>
                                <div className="sm:w-2/3 text-gray-800 text-xs">
                                  {String(value)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : typeof utilityData === 'object' && utilityData !== null ? (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="space-y-3">
                  {Object.entries(utilityData).map(([key, value]) => {
                    if (key === 'row_number' || value === '' || value === null || value === undefined) {
                      return null;
                    }
                    
                    return (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-start">
                        <div className="font-semibold text-gray-700 sm:w-1/3 mb-1 sm:mb-0 text-sm">
                          {key}:
                        </div>
                        <div className="sm:w-2/3 text-gray-900 text-sm">
                          {String(value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(utilityData, null, 2)}
              </pre>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> If you cannot see the correct utility after refreshing, please{' '}
              <a 
                href="/document-lodgement" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium"
              >
                re-upload the invoice
              </a>
              {' '}so it's the top row.
            </p>
          </div>

          <div className="flex gap-4 mt-4">
            <button 
              className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 focus:outline-none disabled:opacity-50" 
              onClick={() => handleConfirmUtility(true)}
              disabled={utilityRefreshing || utilityLoading}
            >
              Confirm
            </button>
            <button 
              className="bg-gray-400 text-white px-6 py-2 rounded font-semibold hover:bg-gray-500 focus:outline-none disabled:opacity-50 flex items-center gap-2" 
              onClick={() => handleConfirmUtility(false)}
              disabled={utilityRefreshing || utilityLoading}
            >
              {utilityRefreshing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Refreshing...
                </>
              ) : (
                'Refresh'
              )}
            </button>
          </div>

          {utilitySuccessMessage && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success!</h3>
                  <div className="mt-2 text-sm text-green-700">{utilitySuccessMessage}</div>
                </div>
              </div>
            </div>
          )}

          {utilityError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{utilityError}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 99) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h2 className="text-xl font-bold mb-4">Process Complete</h2>
        <div className="space-y-3">
          <div>✅ LOA document has been successfully lodged.</div>
          {folderResult && <div>✅ Google Drive folder has been created.</div>}
          {linkedUtilities.length > 0 && (
            <div>
              <div>✅ Utilities successfully linked:</div>
              <ul className="ml-6 mt-2 space-y-1">
                {linkedUtilities.map((utility, index) => (
                  <li key={index} className="text-sm text-gray-700">• {utility}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-6 space-y-3">
          {businessDetails && (
            <button 
              onClick={handleLinkAnotherUtility}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
            >
              Link Another Utility
            </button>
          )}
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Start New Process
          </button>
        </div>
      </div>
    );
  }

  return null;
}