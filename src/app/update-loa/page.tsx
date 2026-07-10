'use client';

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthToken } from "@/lib/use-auth-token";
import { MemberAcesSheetPreview } from "@/components/MemberAcesSheetPreview";
import {
  sheetPreviewRowToLoaDetails,
  type SheetPreviewRow,
} from "@/lib/sheet-preview-api";
import { parseLoaBusinessInfoParam } from "@/lib/loa-business-info";

export default function UpdateLOAPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, isSessionLoading } = useAuthToken();

  const businessName = searchParams.get('businessName') || '';
  const businessInfoEncoded = searchParams.get('businessInfo');

  const [businessInfo, setBusinessInfo] = useState<Record<string, string> | null>(null);
  const [loaData, setLoaData] = useState<Record<string, string | number> | null>(null);
  const [selectedSheetRowNumber, setSelectedSheetRowNumber] = useState<number | null>(null);
  const selectedSheetRowRef = useRef<number | null>(null);
  const [sheetPreviewRefreshKey, setSheetPreviewRefreshKey] = useState(0);
  const [watchSheet, setWatchSheet] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setBusinessInfo(parseLoaBusinessInfoParam(businessInfoEncoded));
  }, [businessInfoEncoded]);

  const handleSheetRowSelect = (row: SheetPreviewRow) => {
    selectedSheetRowRef.current = row.row_number;
    setSelectedSheetRowNumber(row.row_number);
    setLoaData(sheetPreviewRowToLoaDetails(row));
    setWatchSheet(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setWatchSheet(true);
    setSheetPreviewRefreshKey((k) => k + 1);
  };

  const handleProceed = () => {
    if (!loaData) return;

    const nextParams = new URLSearchParams();
    nextParams.set('businessName', businessName);
    if (businessInfo) {
      nextParams.set('businessInfo', encodeURIComponent(JSON.stringify(businessInfo)));
    }
    nextParams.set('loaData', encodeURIComponent(JSON.stringify(loaData)));

    router.push(`/update-loa/confirm?${nextParams.toString()}`);
  };

  const displayBusinessName =
    businessInfo?.["Business Name"] || businessName || "Business";

  return (
    <ToolPageLayout
      pageName="Update LOA"
      title={`Update LOA for ${displayBusinessName}`}
      width="2xl"
    >
          {businessInfo ? (
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
          ) : businessName ? (
            <Card className="mb-6 border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
              <CardContent className="pt-6 text-sm text-amber-900 dark:text-amber-200">
                Showing sheet data for <strong>{businessName}</strong>. Current CRM details were not
                passed in the link — open Update LOA from Business Info or the member profile so both
                sides can be compared.
              </CardContent>
            </Card>
          ) : null}

          {!isSessionLoading && token ? (
            <MemberAcesSheetPreview
              className="mb-6"
              utilityType="LOA"
              token={token}
              expectedBusinessName={displayBusinessName}
              autoPoll={watchSheet && !loaData}
              refreshKey={sheetPreviewRefreshKey}
              selectable
              selectedRowNumber={selectedSheetRowNumber}
              onRowSelect={handleSheetRowSelect}
              onLatestRowReady={() => {
                setWatchSheet(false);
                setRefreshing(false);
              }}
            />
          ) : null}

          {loaData ? (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 dark:bg-dark-2 dark:border-dark-3">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                Selected LOA data
                {selectedSheetRowNumber != null ? (
                  <span className="ml-2 text-base font-normal text-gray-500">
                    (row {selectedSheetRowNumber})
                  </span>
                ) : null}
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
          ) : (
            <div className="text-gray-500 text-sm mt-4">
              {refreshing || watchSheet
                ? "Waiting for sheet data — select a row once it appears, or use Refresh LOA data."
                : "Click a row in the sheet preview above to load LOA data for this business."}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => router.back()}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleRefresh}
              disabled={refreshing}
              loading={refreshing}
            >
              Refresh LOA data
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={handleProceed}
              disabled={!loaData}
            >
              Proceed
            </Button>
          </div>
    </ToolPageLayout>
  );
}
