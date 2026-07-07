'use client';
import React, { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import BusinessDetailsDisplay from '../../components/BusinessDetailsDisplay';
import IndustrySubfolderSelector from '../../components/IndustrySubfolderSelector';
import { PageHeader } from '@/components/Layouts/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/utils';
import { getUtilityKeyFields } from '@/lib/utility-key-fields';
import { notifyUtilityLinkedPostProcess } from '@/lib/utility-linked-notify';
import {
  type UtilityInvoiceUploadKey,
  postLoaDocument,
} from '@/lib/invoice-api-endpoints';
import { MemberAcesSheetPreview } from '@/components/MemberAcesSheetPreview';
import { UtilityInvoiceUploadBar } from '@/components/UtilityInvoiceUploadBar';
import {
  sheetPreviewRowToLoaDetails,
  sheetPreviewRowToUtilityRecord,
  type SheetPreviewRow,
} from '@/lib/sheet-preview-api';
import { UtilityDetailsDisplay } from '@/components/UtilityDetailsDisplay';

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

const INDUSTRY_OPTIONS = [
  '003-Clubs',
  '003-Hardware',
  '003-Health Care',
  '003-Hotels',
  '003-Others',
  '003-Supermarkets',
];

function LoaStepShell({
  title,
  description,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto space-y-6 ${wide ? "max-w-4xl" : "max-w-xl"}`}>
      <PageHeader pageName="LOA upload" title={title} description={description} />
      <Card>
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </div>
  );
}

export default function LoaUploadPage() {
  const { data: session } = useSession();
  const token = (session as { id_token?: string; accessToken?: string } | null)?.id_token
    ?? (session as { accessToken?: string } | null)?.accessToken
    ?? '';

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
  const [selectedUtility, setSelectedUtility] = useState<UtilityInvoiceUploadKey | "">("");
  const [utilityData, setUtilityData] = useState<any>(null);
  const [utilityLoading, setUtilityLoading] = useState(false);
  const [utilityRefreshing, setUtilityRefreshing] = useState(false);
  const [utilityError, setUtilityError] = useState<string | null>(null);
  const [utilitySuccessMessage, setUtilitySuccessMessage] = useState<string | null>(null);
  const [linkedUtilities, setLinkedUtilities] = useState<string[]>([]); // Track linked utilities
  const [watchSheetAfterUpload, setWatchSheetAfterUpload] = useState(false);
  const [sheetPreviewRefreshKey, setSheetPreviewRefreshKey] = useState(0);
  const [selectedSheetRowNumber, setSelectedSheetRowNumber] = useState<number | null>(null);
  const selectedSheetRowRef = useRef<number | null>(null);
  const [watchSheetForUtility, setWatchSheetForUtility] = useState(false);
  const [selectedUtilitySheetRow, setSelectedUtilitySheetRow] = useState<number | null>(null);
  const selectedUtilitySheetRef = useRef<number | null>(null);
  const [utilitySheetPreviewRefreshKey, setUtilitySheetPreviewRefreshKey] = useState(0);

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

    try {
      const { res, data: parsedData, rawText } = await postLoaDocument(() => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('utility_type', utilityType);
        return formData;
      });

      if (rawText && !parsedData) {
        setUploadResult(`❌ Error parsing JSON: ${res.status} ${res.statusText}\n${rawText}`);
        setLoading(false);
        return;
      }

      const data = parsedData ?? {};

      if (data.message && /invalid token|token expired|expired token/i.test(String(data.message))) {
        setAuthError(true);
        setUploadResult(null);
      } else if (res.ok) {
        setUploadResult(`✅ ${String(data.message || 'Document lodged successfully!')}`);
        setShowFolderPrompt(true);
      } else {
        setUploadResult(`❌ Upload failed: ${String(data.message || res.statusText)}`);
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
      setWatchSheetAfterUpload(true);
      fetchBusinessDetails();
    } else {
      setWatchSheetAfterUpload(false);
      setStep(99); // End flow if folder creation is skipped
    }
  };

  const fetchLoaBusinessDetails = async () => {
    if (!token) {
      setAuthError(true);
      setUploadResult('Authentication required. Please sign in again.');
      return null;
    }
    const res = await fetch(`${getApiBaseUrl()}/api/loa-business-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data?.message && /invalid token|token expired|expired token/i.test(String(data.message))) {
      setAuthError(true);
      setUploadResult(null);
      return null;
    }
    if (!res.ok) {
      throw new Error(typeof data?.detail === 'string' ? data.detail : 'Failed to fetch business details');
    }
    return Array.isArray(data) ? data[0] : data;
  };

  // Step 3: Fetch business details
  const fetchBusinessDetails = async () => {
    setLoading(true);
    setAuthError(false);
    try {
      const details = await fetchLoaBusinessDetails();
      if (!details) return;
      setBusinessDetails(details);
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
      void fetchBusinessDetailsRefresh();
    }
  };

  const handleSheetRowSelect = (row: SheetPreviewRow) => {
    selectedSheetRowRef.current = row.row_number;
    setSelectedSheetRowNumber(row.row_number);
    setBusinessDetails(sheetPreviewRowToLoaDetails(row));
  };

  const fetchBusinessDetailsRefresh = async () => {
    setAuthError(false);
    setSheetPreviewRefreshKey((k) => k + 1);
    setRefreshing(true);
    selectedSheetRowRef.current = 2;
    setSelectedSheetRowNumber(2);
    try {
      const details = await fetchLoaBusinessDetails();
      if (!details) return;
      setBusinessDetails(details);
    } catch (err) {
      setUploadResult('Error fetching business details.');
    } finally {
      setRefreshing(false);
    }
  };

  const syncBusinessDetailsFromSheet = async () => {
    try {
      const details = await fetchLoaBusinessDetails();
      if (details) setBusinessDetails(details);
    } catch {
      // non-fatal — preview still shows sheet rows
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
      // Ensure Trading As is never empty – use "N/A" fallback
      'Trading As': businessDetails?.['Trading As']?.trim() || 'N/A',
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
      
      setFolderResult('✅ Member folder creation details have been sent and processed! Google Drive folder creation has been triggered successfully!');
      
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
    setSelectedUtility("");
    setUtilityData(null);
    setUtilityError(null);
    setUtilitySuccessMessage(null);
    setWatchSheetForUtility(false);
    setSelectedUtilitySheetRow(null);
    selectedUtilitySheetRef.current = null;
    setStep(7);
  };

  const handleUtilityTypeContinue = () => {
    if (!selectedUtility) return;
    setWatchSheetForUtility(false);
    setSelectedUtilitySheetRow(null);
    selectedUtilitySheetRef.current = null;
    setUtilityData(null);
    setUtilityError(null);
    setStep(8);
  };

  const handleUtilityInvoiceUploadSuccess = () => {
    setWatchSheetForUtility(true);
    setSelectedUtilitySheetRow(null);
    selectedUtilitySheetRef.current = null;
    setUtilityData(null);
    setUtilityError(null);
    setUtilitySheetPreviewRefreshKey((k) => k + 1);
  };

  const handleUtilitySheetRowSelect = (row: SheetPreviewRow) => {
    selectedUtilitySheetRef.current = row.row_number;
    setSelectedUtilitySheetRow(row.row_number);
    setUtilityData(sheetPreviewRowToUtilityRecord(row));
  };

  const getKeyFields = (utilityType: string, record: any) =>
    getUtilityKeyFields(utilityType, record);

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

        try {
          await notifyUtilityLinkedPostProcess({
            business_name: businessDetails?.['Business Name'] || '',
            utility_type: selectedUtility,
            utility_details: utilityDetails,
          });
        } catch (notifyErr) {
          console.warn("utility-linked post-process notify failed (non-fatal):", notifyErr);
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
      setUtilityRefreshing(true);
      setUtilityError(null);
      setUtilitySuccessMessage(null);
      selectedUtilitySheetRef.current = 2;
      setSelectedUtilitySheetRow(2);
      setUtilitySheetPreviewRefreshKey((k) => k + 1);
      setUtilityRefreshing(false);
    }
  };

  // UI rendering by step
  if (step === 1) {
    return (
      <LoaStepShell
        title="Google Drive — New Member"
        description="Upload the LOA document to start folder creation and utility linking."
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Document Type</label>
            <select
              value={utilityType}
              onChange={(e) => setUtilityType(e.target.value)}
              className="w-full px-3 py-2 border border-stroke rounded-xl dark:border-dark-3 dark:bg-dark-2"
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
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={loading || !file} loading={loading}>
              {`Lodge ${utilityType.replace(/_/g, " ")}`}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setUploadResult(null);
                setShowFolderPrompt(true);
              }}
            >
              LOA already uploaded
            </Button>
          </div>
        </form>
        
        {uploadResult && <div className="mt-4 text-center font-medium whitespace-pre-wrap">{uploadResult}</div>}
        
        {showFolderPrompt && (
          <div className="mt-6 rounded-xl border border-stroke bg-gray/50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <p className="mb-3">Would you like to create a Google Drive member folder for this client?</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleFolderPrompt(true)}>Yes</Button>
              <Button size="sm" variant="secondary" onClick={() => handleFolderPrompt(false)}>No</Button>
            </div>
          </div>
        )}
      </LoaStepShell>
    );
  }

  if (step === 3 && businessDetails) {
    return (
      <LoaStepShell title="Confirm business details" wide>
        {token ? (
          <MemberAcesSheetPreview
            className="mb-6"
            utilityType="LOA"
            token={token}
            expectedBusinessName={String(businessDetails['Business Name'] ?? '')}
            autoPoll={watchSheetAfterUpload}
            refreshKey={sheetPreviewRefreshKey}
            selectable
            selectedRowNumber={selectedSheetRowNumber}
            onRowSelect={handleSheetRowSelect}
            onLatestRowReady={() => {
              const selected = selectedSheetRowRef.current;
              if (selected === null || selected === 2) {
                void syncBusinessDetailsFromSheet();
              }
            }}
          />
        ) : null}
        <h3 className="text-sm font-semibold text-dark dark:text-white mb-2">
          Selected business details
          {selectedSheetRowNumber != null ? (
            <span className="ml-2 font-normal text-gray-500">(row {selectedSheetRowNumber})</span>
          ) : null}
        </h3>
        <BusinessDetailsDisplay details={businessDetails} />
        <div className="flex flex-wrap gap-3 mt-4">
          <Button onClick={() => handleConfirmBusiness(true)} disabled={refreshing}>
            Confirm
          </Button>
          <Button variant="secondary" onClick={() => handleConfirmBusiness(false)} disabled={refreshing} loading={refreshing}>
            Refresh
          </Button>
        </div>
      </LoaStepShell>
    );
  }

  if (step === 4) {
    return (
      <LoaStepShell title="Select industry classification">
        <IndustrySubfolderSelector
          industry={industry}
          setIndustry={handleIndustrySelect}
          subfolder={subfolder}
          setSubfolder={() => {}}
          step={4}
        />
      </LoaStepShell>
    );
  }

  if (step === 5 && industry) {
    return (
      <LoaStepShell title="Select state/subfolder">
        <IndustrySubfolderSelector
          industry={industry}
          setIndustry={() => {}}
          subfolder={subfolder}
          setSubfolder={handleSubfolderSelect}
          step={5}
        />
      </LoaStepShell>
    );
  }

  if (step === 6) {
    return (
      <LoaStepShell title="Folder creation result">
        {loading ? <div>Processing...</div> : <div>{folderResult}</div>}
        
        {showUtilityPrompt && (
          <div className="mt-6 rounded-xl border border-stroke bg-primary/5 p-4 dark:border-dark-3">
            <p className="mb-3">Would you like to link a utility for this client?</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleUtilityPrompt(true)}>Yes</Button>
              <Button size="sm" variant="secondary" onClick={() => handleUtilityPrompt(false)}>No</Button>
            </div>
          </div>
        )}
      </LoaStepShell>
    );
  }

  if (step === 7) {
    return (
      <LoaStepShell
        title="Link a utility"
        description={`Choose a utility type to link to ${businessDetails?.['Business Name']}. You can upload the invoice on the next step.`}
      >
        <div className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Utility Type</label>
            <select
              value={selectedUtility}
              onChange={(e) =>
                setSelectedUtility(
                  e.target.value === ""
                    ? ""
                    : (e.target.value as UtilityInvoiceUploadKey),
                )
              }
              className="w-full px-3 py-2 border border-stroke rounded-xl dark:border-dark-3 dark:bg-dark-2"
            >
              <option value="">Select Utility Type</option>
              {Object.entries(UTILITY_OPTIONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleUtilityTypeContinue}
            disabled={!selectedUtility}
          >
            Continue
          </Button>
        </div>
      </LoaStepShell>
    );
  }

  if (step === 8 && selectedUtility) {
    const utilityLabel = UTILITY_OPTIONS[selectedUtility as keyof typeof UTILITY_OPTIONS];
    return (
      <LoaStepShell
        wide
        title="Confirm utility information"
        description={`Upload an invoice if needed, pick the correct ${utilityLabel} row from the sheet, then confirm.`}
      >
        {token ? (
          <MemberAcesSheetPreview
            className="mb-6"
            utilityType={selectedUtility}
            token={token}
            autoPoll={watchSheetForUtility}
            refreshKey={utilitySheetPreviewRefreshKey}
            selectable
            selectedRowNumber={selectedUtilitySheetRow}
            onRowSelect={handleUtilitySheetRowSelect}
            toolbarExtra={
              <UtilityInvoiceUploadBar
                utilityType={selectedUtility}
                disabled={utilityRefreshing || utilityLoading}
                onUploadSuccess={handleUtilityInvoiceUploadSuccess}
              />
            }
          />
        ) : null}

        <h3 className="text-sm font-semibold text-dark dark:text-white mb-2">
          Selected utility details
          {selectedUtilitySheetRow != null ? (
            <span className="ml-2 font-normal text-gray-500">(row {selectedUtilitySheetRow})</span>
          ) : null}
        </h3>
        <UtilityDetailsDisplay
          utilityType={selectedUtility}
          record={utilityData}
          rowNumber={selectedUtilitySheetRow}
        />

        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            onClick={() => handleConfirmUtility(true)}
            disabled={utilityRefreshing || utilityLoading || !utilityData}
          >
            Confirm
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleConfirmUtility(false)}
            disabled={utilityRefreshing || utilityLoading}
            loading={utilityRefreshing}
          >
            Refresh
          </Button>
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
      </LoaStepShell>
    );
  }

  if (step === 99) {
    return (
      <LoaStepShell title="Process complete">
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
            <Button className="w-full" onClick={handleLinkAnotherUtility}>
              Link another utility
            </Button>
          )}
          <Button className="w-full" variant="secondary" onClick={() => window.location.reload()}>
            Start new process
          </Button>
        </div>
      </LoaStepShell>
    );
  }

  return null;
}