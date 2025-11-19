'use client';

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

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

export default function UtilityLinkingPage() {
  const searchParams = useSearchParams();
  const businessName = searchParams.get('businessName') || '';
  const token = searchParams.get('token') || '';

  const [selectedUtility, setSelectedUtility] = useState<string>("");
  const [utilityData, setUtilityData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRecords(newExpanded);
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

  const handleUtilitySelect = async (utilityType: string) => {
    setSelectedUtility(utilityType);
    setError(null);
    setUtilityData(null);
    setLoading(true);
    setSuccessMessage(null); // Clear any previous success message

    try {
      const res = await fetch('https://membersaces.app.n8n.cloud/webhook/return_utility_info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          utility_type: utilityType,
          business_name: businessName 
        }),
      });

      // Check for 401 Unauthorized status
      if (res.status === 401) {
        console.log("🔍 401 Unauthorized - dispatching reauthentication event");
        
        // Dispatch custom event to trigger automatic reauthentication
        const apiErrorEvent = new CustomEvent('api-error', {
          detail: { 
            error: 'REAUTHENTICATION_REQUIRED',
            status: 401,
            message: 'Authentication expired'
          }
        });
        window.dispatchEvent(apiErrorEvent);
        
        setError("Session expired. Please wait while we refresh your authentication...");
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || "Unknown error");
      }

      const data = await res.json();
      setUtilityData(data);
    } catch (err: any) {
      console.log("🔍 Error caught:", err);
      
      if (err.message !== 'REAUTHENTICATION_REQUIRED') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUtility = async (confirm: boolean) => {
    if (confirm) {
      // Handle confirmation logic - send utility data to webhook
      setLoading(true);
      setError(null);
      setSuccessMessage(null); // Clear any previous success message
      
      try {
        // Prepare the data to send
        const utilityDetails = [];
        
        if (Array.isArray(utilityData) && utilityData.length > 0) {
          // Multiple records
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
          // Single record
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
          business_name: businessName,
          utility_type: selectedUtility,
          utility_details: utilityDetails
        };
  
        console.log("🔗 Sending utility confirmation:", payload);
  
        const res = await fetch('https://membersaces.app.n8n.cloud/webhook/update_airtable_utility_link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
  
        if (res.status === 401) {
          const apiErrorEvent = new CustomEvent('api-error', {
            detail: { 
              error: 'REAUTHENTICATION_REQUIRED',
              status: 401,
              message: 'Authentication expired'
            }
          });
          window.dispatchEvent(apiErrorEvent);
          
          setError("Session expired. Please wait while we refresh your authentication...");
          return;
        }
  
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || err.message || "Failed to confirm utility link");
        }
  
        const result = await res.json();
        console.log("🔗 Utility confirmation result:", result);
        
        // Set success message instead of using alert
        setSuccessMessage(`${UTILITY_OPTIONS[selectedUtility as keyof typeof UTILITY_OPTIONS]} utility successfully linked to ${businessName}!`);
        
      } catch (err: any) {
        console.log("🔍 Error confirming utility:", err);
        
        if (err.message !== 'REAUTHENTICATION_REQUIRED') {
          setError(`Failed to confirm utility link: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Refresh the data
      setRefreshing(true);
      setError(null);
      setSuccessMessage(null); // Clear any previous success message
      
      try {
        const res = await fetch('https://membersaces.app.n8n.cloud/webhook/return_utility_info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            utility_type: selectedUtility,
            business_name: businessName 
          }),
        });
  
        if (res.status === 401) {
          const apiErrorEvent = new CustomEvent('api-error', {
            detail: { 
              error: 'REAUTHENTICATION_REQUIRED',
              status: 401,
              message: 'Authentication expired'
            }
          });
          window.dispatchEvent(apiErrorEvent);
          
          setError("Session expired. Please wait while we refresh your authentication...");
          return;
        }
  
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || err.message || "Unknown error");
        }
  
        const data = await res.json();
        setUtilityData(data);
      } catch (err: any) {
        if (err.message !== 'REAUTHENTICATION_REQUIRED') {
          setError(err.message);
        }
      } finally {
        setRefreshing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Link Utility for {businessName}
            </h1>
            <p className="text-gray-600">
              Select a utility type to view and link utility information for this business.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Select Utility Type:
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(UTILITY_OPTIONS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleUtilitySelect(key)}
                  disabled={loading}
                  className={`
                    px-4 py-3 rounded-lg border-2 font-semibold transition-all duration-200
                    ${selectedUtility === key 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {loading && selectedUtility === key ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </div>
                  ) : (
                    label
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {utilityData && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Confirm {UTILITY_OPTIONS[selectedUtility as keyof typeof UTILITY_OPTIONS]} Utility Information
              </h3>
              <div className="space-y-4">
                {Array.isArray(utilityData) && utilityData.length > 0 ? (
                  utilityData.map((record: any, index: number) => {
                    const keyFields = getKeyFields(selectedUtility, record);
                    const isExpanded = expandedRecords.has(index);
                    
                    return (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                        {/* Key Information Display */}
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

                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => toggleExpanded(index)}
                          className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none"
                        >
                          <span>{isExpanded ? 'Hide' : 'Show'} Full Details</span>
                          <svg 
                            className={`ml-1 h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="font-medium text-gray-800 mb-3">Complete Information:</h4>
                            <div className="space-y-2">
                              {Object.entries(record).map(([key, value]) => {
                                // Skip row_number and empty values
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
              
              {/* Disclaimer */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> If you cannot see the correct utility after refreshing, please{' '}
                  <button
                    onClick={() => window.open('/document-lodgement', '_blank', 'noopener,noreferrer')}
                    className="text-blue-600 hover:text-blue-800 underline font-medium bg-transparent border-none cursor-pointer p-0"
                  >
                    re-upload the invoice
                  </button>
                  {' '}so it's the top row.
                </p>
              </div>

              {/* Confirmation Buttons */}
              <div className="flex gap-4 mt-4">
                <button 
                  className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 focus:outline-none disabled:opacity-50" 
                  onClick={() => handleConfirmUtility(true)}
                  disabled={refreshing}
                >
                  Confirm
                </button>
                <button 
                  className="bg-gray-400 text-white px-6 py-2 rounded font-semibold hover:bg-gray-500 focus:outline-none disabled:opacity-50 flex items-center gap-2" 
                  onClick={() => handleConfirmUtility(false)}
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

              {/* Success Message */}
              {successMessage && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Success!</h3>
                      <div className="mt-2 text-sm text-green-700">{successMessage}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedUtility && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-gray-500">Select a utility type above to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}