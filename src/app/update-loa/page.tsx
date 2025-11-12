'use client';

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function UpdateLOAPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const businessName = searchParams.get('businessName') || '';
  const token = searchParams.get('token') || '';
  const businessInfoEncoded = searchParams.get('businessInfo');

  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [loaData, setLoaData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🧠 Decode and display business info
  useEffect(() => {
    if (businessInfoEncoded) {
      try {
        const decoded = JSON.parse(decodeURIComponent(businessInfoEncoded));

        // Standardize field names for display and passing to next page
        const formatted = {
          "Business Name": decoded["Business Name"] || decoded.name || '',
          "Business ABN": decoded["Business ABN"] || decoded.abn || '',
          "Trading As": decoded["Trading As"] || decoded.trading_name || '',
          "Postal Address": decoded["Postal Address"] || decoded.postal_address || '',
          "Site Address": decoded["Site Address"] || decoded.site_address || '',
          "Telephone": decoded["Telephone"] || decoded.telephone || '',
          "Contact Email": decoded["Contact Email"] || decoded.email || '',
          "Contact Name": decoded["Contact Name"] || decoded.contact_name || '',
          "Contact Position": decoded["Contact Position"] || decoded.position || '',
        };

        setBusinessInfo(formatted);
      } catch (err) {
        console.error("Error decoding business info:", err);
      }
    }
  }, [businessInfoEncoded]);

  // 🔄 Fetch LOA Data
  const fetchLoaData = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('https://membersaces.app.n8n.cloud/webhook/return_utility_info', {
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
      setLoaData(Array.isArray(data) && data.length > 0 ? data[0] : data);
    } catch (err: any) {
      if (err.message !== 'REAUTHENTICATION_REQUIRED') setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch LOA data on mount
  useEffect(() => {
    fetchLoaData();
  }, []);

  // ➡️ Proceed to confirm page
  const handleProceed = () => {
    if (!businessInfo || !loaData) return;

    const nextParams = new URLSearchParams();
    nextParams.set('businessName', businessName);
    nextParams.set('businessInfo', encodeURIComponent(JSON.stringify(businessInfo)));
    nextParams.set('loaData', encodeURIComponent(JSON.stringify(loaData)));

    router.push(`/update-loa/confirm?${nextParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Update LOA for {businessInfo?.["Business Name"] || businessName || "Business"}
          </h1>

          {/* --- CURRENT BUSINESS DETAILS --- */}
          {businessInfo && (
            <div className="mb-8 bg-gray-50 p-6 border border-gray-200 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Current LOA Business Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {Object.entries(businessInfo).map(([key, value]) => (
                  value ? (
                    <p key={key}>
                      <strong>{key}: </strong>{String(value)}
                    </p>
                  ) : null
                ))}
              </div>
            </div>
          )}

          {/* --- STATUS + ERRORS --- */}
          {loading && (
            <div className="flex items-center gap-3 text-gray-600 mb-6">
              <div className="animate-spin h-5 w-5 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <span>Fetching latest LOA data...</span>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* --- LATEST LOA DATA --- */}
          {loaData && !loading && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Latest LOA Data
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {Object.entries(loaData).map(([key, value]) => {
                  if (!value || key === 'row_number') return null;
                  const cleanKey = key.replace(/:/g, '').replace(/_/g, ' ');
                  return (
                    <p key={key}>
                      <strong>{cleanKey}: </strong>{String(value)}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {!loaData && !loading && (
            <div className="text-gray-500 text-sm mt-4">
              No LOA data found for this business.
            </div>
          )}

          {/* --- ACTION BUTTONS --- */}
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => router.back()}
              className="bg-gray-400 text-white py-2 px-4 rounded font-semibold hover:bg-gray-500"
            >
              Back
            </button>

            <button
              onClick={fetchLoaData}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh LOA Data'}
            </button>

            <button
              onClick={handleProceed}
              disabled={!businessInfo || !loaData}
              className="flex-1 bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
