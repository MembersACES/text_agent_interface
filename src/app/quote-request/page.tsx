"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";

export default function QuoteRequestPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token;

  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [utilityResult, setUtilityResult] = useState<Record<string, any>>({});
  const [businessInfo, setBusinessInfo] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Collapsible section states - start collapsed
  const [showBusinessInfo, setShowBusinessInfo] = useState(false);
  const [showUtilityInfo, setShowUtilityInfo] = useState(false);
  const [showIntervalData, setShowIntervalData] = useState(false);

  // Interval data state
  const [intervalData, setIntervalData] = useState<any>(null);
  const [intervalLoading, setIntervalLoading] = useState(false);
  const [intervalError, setIntervalError] = useState<string | null>(null);

  // grab from URL
  const businessInfoRaw = searchParams.get("businessInfo");
  const utility = searchParams.get("utility");
  const identifier = searchParams.get("identifier");

  // decode businessInfo once
  useEffect(() => {
    try {
      if (businessInfoRaw) {
        setBusinessInfo(JSON.parse(decodeURIComponent(businessInfoRaw)));
      }
    } catch (err) {
      console.error("Failed to parse business info:", err);
    }
  }, [businessInfoRaw]);

  // fetch utility info AND interval data once businessInfo is ready
  useEffect(() => {
    if (!businessInfo || !businessInfo.business_name || !utility || !identifier) {
      return;
    }

    async function fetchUtilityInfo() {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/get-utility-information`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            business_name: businessInfo.business_name,
            service_type: utility,
            identifier: identifier,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail || data)
          );
        }
        setUtilityResult(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    async function fetchIntervalDataBackground() {
      // Only fetch for CI utilities
      if (utility !== "electricity_ci" && utility !== "gas_ci") {
        return;
      }

      setIntervalLoading(true);
      setIntervalError(null);
      
      try {
        console.log('Background fetching interval data for identifier:', identifier);
        
        const response = await fetch('https://membersaces.app.n8n.cloud/webhook/return_interval_data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_identifier: identifier
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Background interval data response:', data);
        console.log('Background interval data response type:', typeof data);
        console.log('Background interval data response keys:', Object.keys(data));
        
        setIntervalData(data);
      } catch (error) {
        console.error('Error fetching background interval data:', error);
        setIntervalError(error instanceof Error ? error.message : 'Failed to fetch interval data');
      } finally {
        setIntervalLoading(false);
      }
    }

    // Fetch both utility and interval data
    fetchUtilityInfo();
    fetchIntervalDataBackground();
  }, [businessInfo, utility, identifier, token]);

  const handleBusinessChange = (key: string, value: string) => {
    setBusinessInfo({ ...businessInfo, [key]: value });
  };

  const handleUtilityChange = (key: string, value: string | object) => {
    setUtilityResult({ ...utilityResult, [key]: value });
  };

  // Helper to get utility type display name
  const getUtilityDisplayName = () => {
    const utilityMap = {
      'electricity_ci': 'NMI',
      'electricity_sme': 'NMI', 
      'gas_ci': 'MRIN',
      'gas_sme': 'MRIN',
      'waste': 'Account',
      'oil': 'Account'
    };
    return utilityMap[utility as keyof typeof utilityMap] || 'ID';
  };

  // Filter out user_email from utility results
  const filteredUtilityResult = Object.fromEntries(
    Object.entries(utilityResult).filter(([key]) => !key.toLowerCase().includes('user_email'))
  );

  // Helper to find invoice link from utility data
  const getInvoiceLink = () => {
    // Look for invoice_link in the filtered utility data
    if (filteredUtilityResult.invoice_link) {
      return filteredUtilityResult.invoice_link;
    }
    
    // Look for nested invoice link in complex objects
    for (const [key, value] of Object.entries(filteredUtilityResult)) {
      if (typeof value === 'object' && value !== null) {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          if (parsed.invoice_link) {
            return parsed.invoice_link;
          }
        } catch (e) {
          // Not JSON, skip
        }
      }
    }
    
    return null;
  };

  // Helper to get interval data file link
  const getIntervalDataLink = () => {
    if (intervalData && Array.isArray(intervalData) && intervalData.length > 0) {
      const fileId = intervalData[0]["Interval Data File ID"];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/view`;
      }
    }
    return null;
  };

  // Helper functions for formatting
  const formatCurrency = (value: string) => {
    if (!value || value === "-") return "-";
    const num = parseFloat(value);
    return isNaN(num) ? value : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: string) => {
    if (!value || value === "-") return "-";
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toLocaleString('en-US');
  };

  const formatLabel = (key: string) => {
    return key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  // Function to fetch interval data
  const fetchIntervalData = async () => {
    if (!identifier) {
      setIntervalError('No identifier available');
      return;
    }

    setIntervalLoading(true);
    setIntervalError(null);
    
    try {
      console.log('Fetching interval data for identifier:', identifier);
      
      const response = await fetch('https://membersaces.app.n8n.cloud/webhook/return_interval_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_identifier: identifier
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Interval data response:', data);
      console.log('Interval data response type:', typeof data);
      console.log('Interval data response keys:', Object.keys(data));
      
      setIntervalData(data);
    } catch (error) {
      console.error('Error fetching interval data:', error);
      setIntervalError(error instanceof Error ? error.message : 'Failed to fetch interval data');
    } finally {
      setIntervalLoading(false);
    }
  };

  // Handle interval data section toggle
  const handleIntervalDataToggle = () => {
    setShowIntervalData(!showIntervalData);
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-red-600 text-center">Error: {error}</div>;

  console.log('Debug - utility:', utility, 'identifier:', identifier, 'showUtilityInfo:', showUtilityInfo, 'showBusinessInfo:', showBusinessInfo);
  console.log('Debug - filteredUtilityResult:', filteredUtilityResult);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h1 className="text-3xl font-bold text-gray-900">Supplier Quote Request</h1>
          </div>

          {/* Business Information */}
          {businessInfo && Object.keys(businessInfo).length > 0 && (
            <div className="border-b bg-gray-50">
              <button
                onClick={() => setShowBusinessInfo(!showBusinessInfo)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  Business Information for - {businessInfo.business_name || 'Unknown Business'}
                </h2>
                <span className="text-gray-500 text-2xl font-bold">
                  {showBusinessInfo ? '−' : '+'}
                </span>
              </button>
              {showBusinessInfo && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(businessInfo)
                      .filter(([key]) => 
                        key !== "googleDriveLink" && 
                        key !== "position" && 
                        key !== "retailers" && 
                        key !== "utilities" && 
                        key !== "loaLink" &&
                        !key.toLowerCase().includes('user')
                      )
                      .map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {formatLabel(key)}
                          </label>
                          <input
                            type="text"
                            value={typeof value === "object" ? JSON.stringify(value) : value || ""}
                            onChange={(e) => handleBusinessChange(key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Utility Information */}
          {filteredUtilityResult && Object.keys(filteredUtilityResult).length > 0 && (
            <div className="border-b">
              <button
                onClick={() => setShowUtilityInfo(!showUtilityInfo)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  Utility Analysis for {getUtilityDisplayName()}: {identifier || 'Unknown'}
                </h2>
                <span className="text-gray-500 text-2xl font-bold">
                  {showUtilityInfo ? '−' : '+'}
                </span>
              </button>
              
              {showUtilityInfo && (
                <div className="px-6 pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(filteredUtilityResult).map(([key, value]) => {
                      // Handle complex objects like invoice details
                      if (typeof value === 'object' && value !== null) {
                        try {
                          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                          return (
                            <div key={key} className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg">
                              <div className="text-sm font-medium text-gray-600 mb-3">
                                {formatLabel(key)}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(parsed)
                                  .filter(([subKey]) => subKey.toLowerCase() !== 'invoice_id')
                                  .map(([subKey, subValue]) => (
                                  <div key={subKey} className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-500 mb-1">
                                      {formatLabel(subKey)}
                                    </label>
                                    {subKey.toLowerCase().includes('link') || subKey.toLowerCase().includes('url') ? (
                                      <a
                                        href={String(subValue)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-sm font-medium break-all"
                                      >
                                        View Document
                                      </a>
                                    ) : (
                                      <input
                                        type="text"
                                        value={String(subValue || "")}
                                        onChange={(e) => {
                                          const updatedObject = { ...parsed, [subKey]: e.target.value };
                                          handleUtilityChange(key, updatedObject);
                                        }}
                                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } catch (e) {
                          // If it's not parseable JSON, treat as string
                          return (
                            <div key={key} className="bg-gray-50 p-4 rounded-lg">
                              <div className="text-sm font-medium text-gray-600 mb-1">
                                {formatLabel(key)}
                              </div>
                              <textarea
                                value={String(value)}
                                onChange={(e) => handleUtilityChange(key, e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          );
                        }
                      }
                      
                      // Handle simple string/number values
                      return (
                        <div key={key} className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 mb-1">
                            {formatLabel(key)}
                          </div>
                          <div className="text-lg font-semibold text-gray-900 mb-2">
                            {String(value)}
                          </div>
                          <input
                            type="text"
                            value={String(value || "")}
                            onChange={(e) => handleUtilityChange(key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interval Data Section */}
          {(utility === "electricity_ci" || utility === "gas_ci") && identifier && (
            <div className="border-b">
              <button
                onClick={handleIntervalDataToggle}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  Interval Data for {getUtilityDisplayName()}: {identifier}
                </h2>
                <span className="text-gray-500 text-2xl font-bold">
                  {showIntervalData ? '−' : '+'}
                </span>
              </button>
              
              {showIntervalData && (
                <div className="px-6 pb-6">
                  {intervalLoading && (
                    <div className="text-center py-8">
                      <div className="text-gray-600">Loading interval data...</div>
                    </div>
                  )}
                  
                  {intervalError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="text-red-800 font-medium">Error loading interval data:</div>
                      <div className="text-red-600 text-sm mt-1">{intervalError}</div>
                      <button
                        onClick={fetchIntervalData}
                        className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  
                  {intervalData && !intervalLoading && (
                    <div>
                      {/* Check if interval data is available */}
                      {Array.isArray(intervalData) && intervalData.length > 0 && 
                       intervalData[0]["Interval Data Period"] === "" && 
                       intervalData[0]["Interval Data ID"] === "" && 
                       intervalData[0]["Interval Data Link"] === "" ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="text-yellow-800 font-medium mb-2">
                            No Interval Data Found for this {getUtilityDisplayName()}
                          </div>
                          <div className="text-yellow-700 text-sm mb-3">
                            No interval data is currently available for {identifier}. You can lodge interval data on the document lodgement page.
                          </div>
                          <button 
                            onClick={() => window.open('/document-lodgement', '_blank')}
                            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                          >
                            Go to Document Lodgement
                          </button>
                        </div>
                      ) : Array.isArray(intervalData) && intervalData.length > 0 && intervalData[0]["Total kWh"] ? (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Interval Data Analysis</h3>
                          {intervalData.map((data, index) => (
                            <div key={index} className="bg-blue-50 p-4 rounded-lg mb-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">NMI/MRIN</div>
                                  <div className="text-lg font-semibold text-gray-900">
                                    {data.NMI || data["NMI / MRIN"] || identifier}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Period</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {data.Period || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Year</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {data.Year || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Total kWh</div>
                                  <div className="text-lg font-bold text-blue-900">
                                    {data["Total kWh"] ? formatNumber(data["Total kWh"]) : 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Highest Demand (kW)</div>
                                  <div className="text-lg font-bold text-green-900">
                                    {data["Highest Demand (kW)"] || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Peak Demand Period</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {data["Peak Demand Period"] ? new Date(data["Peak Demand Period"]).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Highest Demand (kVA)</div>
                                  <div className="text-lg font-bold text-purple-900">
                                    {data["Highest Demand (kVA)"] || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Peak Demand Period kVA</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {data["Peak Demand Period kVA"] ? new Date(data["Peak Demand Period kVA"]).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded md:col-span-1 lg:col-span-1">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Data Analysis</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {data["Data Analysis"] || 'N/A'}
                                  </div>
                                </div>
                                {data["Interval Data File ID"] && (
                                  <div className="bg-white p-3 rounded">
                                    <div className="text-xs font-medium text-gray-500 mb-1">Interval Data File</div>
                                    <a
                                      href={`https://drive.google.com/file/d/${data["Interval Data File ID"]}/view`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline text-sm font-medium"
                                    >
                                      View Interval Data File
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Interval Data Results</h3>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(intervalData, null, 2)}
                            </pre>
                          </div>
                          <div className="mt-4 text-sm text-gray-600">
                            Unexpected data format - check console for detailed logs.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!intervalData && !intervalLoading && !intervalError && (
                    <div className="text-center py-8">
                      <div className="text-gray-600">Click to load interval data</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Attachments</h2>
            <div className="bg-white p-4 rounded-lg border">
              <ul className="space-y-2">
                {businessInfo.loaLink && (
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <a 
                      href={businessInfo.loaLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Letter of Authority (PDF)
                    </a>
                  </li>
                )}
                {!businessInfo.loaLink && (
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    Letter of Authority (PDF)
                  </li>
                )}
                {getInvoiceLink() && (
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <a 
                      href={getInvoiceLink()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Recent Invoice
                    </a>
                  </li>
                )}
                {getIntervalDataLink() && (
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <a 
                      href={getIntervalDataLink() || undefined} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Interval Data File
                    </a>
                  </li>
                )}
                {utility === "electricity_ci" || utility === "gas_ci" ? (
                  !getIntervalDataLink() && (
                    <li className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      Interval Data
                    </li>
                  )
                ) : !getInvoiceLink() && (
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    Recent Invoice
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Next Steps */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-4">
                Review and adjust the information above. When ready, click below to send your quote request to suppliers.
              </p>
              <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Send Quote Request
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}