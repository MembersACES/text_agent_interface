'use client';
import React, { useState } from 'react';
import BusinessDetailsDisplay from '../../components/BusinessDetailsDisplay';
import IndustrySubfolderSelector from '../../components/IndustrySubfolderSelector';
import { Alert } from '../../components/ui-elements/alert';

const UTILITY_OPTIONS = [
  "LOA"
];

const API_ENDPOINTS: Record<string, string> = {
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
  const [refreshing, setRefreshing] = useState(false); // New state for refresh loading
  const [authError, setAuthError] = useState(false);

  // Step 1: Upload document
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
    
    // Add utility_type for LOA and PROFIT_SHARING endpoints
    if (utilityType === 'LOA' || utilityType === 'PROFIT_SHARING') {
      formData.append('utility_type', utilityType);
    }

    const endpoint = API_ENDPOINTS[utilityType];

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
        // Only show folder prompt for LOA documents
        if (utilityType === 'LOA') {
          setShowFolderPrompt(true);
        } else {
          setStep(99); // End flow for other document types
        }
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
      setStep(99); // End flow
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
      // Start refresh loading and fetch new business details
      setRefreshing(true);
      fetchBusinessDetailsRefresh();
    }
  };

  // New function specifically for refresh to handle loading state
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
      // Stay on step 3 to show refreshed details
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
    
    // Send to n8n webhook and Google Apps Script
    const n8nPayload = {
      'Business Name': businessDetails?.['Business Name'] || '',
      'Trading As': businessDetails?.['Trading As'] || '',
      'Industry Classification Folder': industry,
      'Industry Classification SubFolder': value,
    };
    
    try {
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
      
      // Google Apps Script
      const gasRes = await fetch('/api/trigger-gas-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: 'googleDriveRequest',
          siteName: businessDetails?.['Business Name'] || '',
          tradingas: businessDetails?.['Trading As'] || '',
          classification: industry,
          state: value,
        }),
      });

      if (!gasRes.ok) {
        setFolderResult(`❌ Folder creation failed: ${gasRes.status} ${gasRes.statusText}`);
        setLoading(false);
        return;
      }

      const gasData = await gasRes.json();

      if (gasData.message && /invalid token|token expired|expired token/i.test(gasData.message)) {
        setAuthError(true);
        setFolderResult(null);
        return;
      }
      
      setFolderResult('✅ Client folder creation details have been sent and processed! Google Drive folder creation has been triggered successfully!');
    } catch (err) {
      setFolderResult('❌ Error processing folder creation.');
    } finally {
      setLoading(false);
    }
  };

  // UI rendering by step
  if (step === 1) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h1 className="text-2xl font-bold mb-4">Document Upload</h1>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Document Type</label>
            <select
              value={utilityType}
              onChange={(e) => setUtilityType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              {UTILITY_OPTIONS.map((type) => (
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
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
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

  if (step === 99) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h2 className="text-xl font-bold mb-4">Document Lodgement Complete</h2>
        <div>✅ {utilityType === 'LOA' ? 'Client folder creation skipped. The LOA document has been successfully lodged.' : `The ${utilityType.replace(/_/g, " ")} document has been successfully lodged.`}</div>
      </div>
    );
  }

  return null;
}