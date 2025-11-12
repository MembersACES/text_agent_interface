'use client';

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function UpdateLOAPage() {
  const searchParams = useSearchParams();
  const businessName = searchParams.get('businessName') || '';
  const token = searchParams.get('token') || '';

  const [loaData, setLoaData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedRecords);
    newExpanded.has(index) ? newExpanded.delete(index) : newExpanded.add(index);
    setExpandedRecords(newExpanded);
  };

  const fetchLoaData = async () => {
    setError(null);
    setLoaData(null);
    setLoading(true);

    try {
      const res = await fetch('https://membersaces.app.n8n.cloud/webhook-test/return_utility_info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          utility_type: "LOA",
          business_name: businessName,
        }),
      });

      if (res.status === 401) {
        console.log("401 Unauthorized - triggering reauth event");
        const apiErrorEvent = new CustomEvent('api-error', {
          detail: { error: 'REAUTHENTICATION_REQUIRED', status: 401, message: 'Authentication expired' },
        });
        window.dispatchEvent(apiErrorEvent);
        setError("Session expired. Please wait while we refresh your authentication...");
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || "Unknown error fetching LOA data");
      }

      const data = await res.json();
      setLoaData(data);
    } catch (err: any) {
      if (err.message !== 'REAUTHENTICATION_REQUIRED') setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoaData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Latest LOA Data for {businessName || 'Business'}
            </h1>
            <p className="text-gray-600">
              This section pulls the most recent LOA information from the system.
            </p>
          </div>

          {/* Status + Errors */}
          {loading && (
            <div className="flex items-center gap-3 text-gray-600 mb-6">
              <div className="animate-spin h-5 w-5 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <span>Fetching LOA data...</span>
            </div>
          )}

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
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Data Display */}
          {loaData && !loading && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Confirm Latest LOA Information
              </h3>

              {Array.isArray(loaData) && loaData.length > 0 ? (
                loaData.map((record: any, index: number) => {
                  const isExpanded = expandedRecords.has(index);
                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="space-y-2 mb-3">
                        <div className="flex">
                          <span className="font-semibold text-gray-700 w-40 text-sm">Client Name:</span>
                          <span className="text-gray-900 text-sm">{record['Client Name'] || 'N/A'}</span>
                        </div>
                        <div className="flex">
                          <span className="font-semibold text-gray-700 w-40 text-sm">ABN:</span>
                          <span className="text-gray-900 text-sm">{record['ABN'] || 'N/A'}</span>
                        </div>
                        <div className="flex">
                          <span className="font-semibold text-gray-700 w-40 text-sm">Contact Name:</span>
                          <span className="text-gray-900 text-sm">{record['Contact Name'] || 'N/A'}</span>
                        </div>
                        <div className="flex">
                          <span className="font-semibold text-gray-700 w-40 text-sm">Email:</span>
                          <span className="text-gray-900 text-sm">{record['Email'] || 'N/A'}</span>
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
                              if (key === 'row_number' || value === '' || value === null || value === undefined)
                                return null;
                              return (
                                <div key={key} className="flex flex-col sm:flex-row">
                                  <div className="font-medium text-gray-600 sm:w-1/3 mb-1 sm:mb-0 text-xs">
                                    {key}:
                                  </div>
                                  <div className="sm:w-2/3 text-gray-800 text-xs">{String(value)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500 text-sm">No LOA data found.</div>
              )}
            </div>
          )}

          {/* Refresh Button */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={fetchLoaData}
              disabled={loading || refreshing}
              className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gray-400 text-white py-2 rounded font-semibold hover:bg-gray-500"
            >
              Restart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
