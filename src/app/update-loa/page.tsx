'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchReturnUtilityInfo } from "@/lib/utility-info-api";
import { useAuthToken } from "@/lib/use-auth-token";

export default function UpdateLOAPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, isSessionLoading } = useAuthToken();

  const businessName = searchParams.get('businessName') || '';
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
  const fetchLoaData = useCallback(async () => {
    if (!token) {
      setError("Authentication required. Please sign in again.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await fetchReturnUtilityInfo(
        { utility_type: "LOA", business_name: businessName },
        token,
      );
      setLoaData(Array.isArray(data) && data.length > 0 ? data[0] : data);
    } catch (err: any) {
      if (err.message === 'REAUTHENTICATION_REQUIRED') {
        const apiErrorEvent = new CustomEvent('api-error', {
          detail: { error: 'REAUTHENTICATION_REQUIRED', status: 401, message: 'Authentication expired' },
        });
        window.dispatchEvent(apiErrorEvent);
        setError("Session expired. Please wait while we refresh your authentication...");
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [businessName, token]);

  // Fetch LOA data once session (and token) is ready
  useEffect(() => {
    if (isSessionLoading) return;
    fetchLoaData();
  }, [isSessionLoading, fetchLoaData]);

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
    <ToolPageLayout
      pageName="Update LOA"
      title={`Update LOA for ${businessInfo?.["Business Name"] || businessName || "Business"}`}
      width="2xl"
    >
          {businessInfo && (
            <Card className="mb-6">
              <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Current LOA business details
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
              </CardContent>
            </Card>
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

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => router.back()}>
              Back
            </Button>
            <Button className="flex-1" onClick={fetchLoaData} disabled={loading} loading={loading}>
              Refresh LOA data
            </Button>
            <Button className="flex-1" variant="secondary" onClick={handleProceed} disabled={!businessInfo || !loaData}>
              Proceed
            </Button>
          </div>
    </ToolPageLayout>
  );
}
