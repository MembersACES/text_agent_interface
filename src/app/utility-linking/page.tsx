'use client';

import React, { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { notifyUtilityLinkedPostProcess, type UtilityLinkedNotifyDetail } from "@/lib/utility-linked-notify";
import { getUtilityKeyFields } from "@/lib/utility-key-fields";
import { buildDataRequestSummary, type DataRequestSummary } from "@/lib/data-request";
import { getApiBaseUrl } from "@/lib/utils";
import { useAuthToken } from "@/lib/use-auth-token";
import { MemberAcesSheetPreview } from "@/components/MemberAcesSheetPreview";
import { UtilityDetailsDisplay } from "@/components/UtilityDetailsDisplay";
import { UtilityInvoiceUploadBar } from "@/components/UtilityInvoiceUploadBar";
import {
  DataRequestConfirmModal,
  DataRequestResultModal,
} from "@/components/DataRequestConfirmModal";
import {
  sheetPreviewRowToUtilityRecord,
  type SheetPreviewRow,
} from "@/lib/sheet-preview-api";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const UTILITY_OPTIONS = {
  ELECTRICITY_CI: "ELECTRICITY C&I",
  ELECTRICITY_SME: "ELECTRICITY SME",
  GAS_CI: "GAS C&I",
  GAS_SME: "GAS SME",
  WASTE: "WASTE",
  COOKING_OIL: "COOKING OIL",
  GREASE_TRAP: "GREASE TRAP",
  WATER: "WATER",
  CLEANING: "CLEANING",
};

type LinkPhase = "idle" | "airtable" | "filing" | "filed" | "filing_failed";

export default function UtilityLinkingPage() {
  const searchParams = useSearchParams();
  const { token, isSessionLoading } = useAuthToken();
  const businessName = searchParams.get("businessName") || "";

  const [selectedUtility, setSelectedUtility] = useState<string>("");
  const [utilityData, setUtilityData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedUtilitySheetRow, setSelectedUtilitySheetRow] = useState<number | null>(null);
  const [utilitySheetPreviewRefreshKey, setUtilitySheetPreviewRefreshKey] = useState(0);
  const [watchSheetAfterUpload, setWatchSheetAfterUpload] = useState(false);
  const [linkPhase, setLinkPhase] = useState<LinkPhase>("idle");
  const [linkedDataRequest, setLinkedDataRequest] = useState<DataRequestSummary | null>(null);
  const [dataRequestSummary, setDataRequestSummary] = useState<DataRequestSummary | null>(null);
  const [dataRequestLoading, setDataRequestLoading] = useState(false);
  const [dataRequestResult, setDataRequestResult] = useState<string | null>(null);
  const pendingLinkRef = useRef<{
    utilityType: string;
    utilityDetails: UtilityLinkedNotifyDetail[];
    dataRequest: DataRequestSummary | null;
  } | null>(null);

  const getKeyFields = (utilityType: string, record: Record<string, unknown> | null | undefined) =>
    getUtilityKeyFields(utilityType, record);

  const handleUtilitySheetRowSelect = (row: SheetPreviewRow) => {
    setSelectedUtilitySheetRow(row.row_number);
    setUtilityData(sheetPreviewRowToUtilityRecord(row));
  };

  const resetLinkState = () => {
    setSuccessMessage(null);
    setLinkedDataRequest(null);
    setLinkPhase("idle");
    pendingLinkRef.current = null;
  };

  const handleUtilitySelect = (utilityType: string) => {
    if (isSessionLoading) return;

    setSelectedUtility(utilityType);
    setError(null);
    setUtilityData(null);
    setSelectedUtilitySheetRow(null);
    resetLinkState();
    setWatchSheetAfterUpload(false);
  };

  const handleInvoiceUploadSuccess = () => {
    setWatchSheetAfterUpload(true);
    setSelectedUtilitySheetRow(null);
    setUtilityData(null);
    setUtilitySheetPreviewRefreshKey((k) => k + 1);
    setError(null);
  };

  const runInvoiceFiling = async (opts: {
    utilityType: string;
    utilityDetails: UtilityLinkedNotifyDetail[];
    dataRequest: DataRequestSummary | null;
  }) => {
    setLinkPhase("filing");
    setError(null);
    try {
      await notifyUtilityLinkedPostProcess({
        business_name: businessName,
        utility_type: opts.utilityType,
        utility_details: opts.utilityDetails,
      });
      setLinkPhase("filed");
      setLinkedDataRequest(opts.dataRequest);
      setSuccessMessage(
        `${UTILITY_OPTIONS[opts.utilityType as keyof typeof UTILITY_OPTIONS]} utility successfully linked to ${businessName}! Invoice has been filed.`,
      );
    } catch (notifyErr) {
      console.warn("utility-linked post-process notify failed:", notifyErr);
      setLinkPhase("filing_failed");
      setLinkedDataRequest(null);
      setSuccessMessage(
        `${UTILITY_OPTIONS[opts.utilityType as keyof typeof UTILITY_OPTIONS]} utility was linked in Airtable, but invoice filing is not finished yet.`,
      );
      const detail = notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
      setError(
        `Invoice filing (utility_linked_post_process) failed, so Data Request is disabled until the file is in the member folder. ${detail}`,
      );
    }
  };

  const handleConfirmUtility = async (confirm: boolean) => {
    if (isSessionLoading) return;

    if (confirm) {
      setLoading(true);
      setError(null);
      resetLinkState();

      if (!token) {
        setError("Authentication required. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const utilityDetails: UtilityLinkedNotifyDetail[] = [];

        if (Array.isArray(utilityData) && utilityData.length > 0) {
          for (const record of utilityData) {
            const keyFields = getKeyFields(selectedUtility, record);
            utilityDetails.push({
              identifier: keyFields.identifier,
              identifier_type: keyFields.identifierLabel,
              client_name: keyFields.clientName,
              retailer: keyFields.retailer,
              site_address: keyFields.address,
            });
          }
        } else if (typeof utilityData === "object" && utilityData !== null) {
          const keyFields = getKeyFields(selectedUtility, utilityData);
          utilityDetails.push({
            identifier: keyFields.identifier,
            identifier_type: keyFields.identifierLabel,
            client_name: keyFields.clientName,
            retailer: keyFields.retailer,
            site_address: keyFields.address,
          });
        }

        const payload = {
          business_name: businessName,
          utility_type: selectedUtility,
          utility_details: utilityDetails,
        };

        console.log("🔗 Sending utility confirmation:", payload);
        setLinkPhase("airtable");

        const res = await fetch("https://membersaces.app.n8n.cloud/webhook/update_airtable_utility_link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.status === 401) {
          const apiErrorEvent = new CustomEvent("api-error", {
            detail: {
              error: "REAUTHENTICATION_REQUIRED",
              status: 401,
              message: "Authentication expired",
            },
          });
          window.dispatchEvent(apiErrorEvent);

          setError("Session expired. Please wait while we refresh your authentication...");
          setLinkPhase("idle");
          return;
        }

        if (!res.ok) {
          const errText = await res.text();
          let message = "Failed to confirm utility link";
          try {
            const err = JSON.parse(errText) as { detail?: string; message?: string };
            message = err.detail || err.message || message;
          } catch {
            if (errText) message = errText.slice(0, 200);
          }
          throw new Error(message);
        }

        const resultText = await res.text();
        let result: unknown = null;
        if (resultText) {
          try {
            result = JSON.parse(resultText);
          } catch {
            result = { raw: resultText };
          }
        }
        console.log("🔗 Utility confirmation result:", result);

        const linked = utilityDetails[0];
        const dataRequest = linked
          ? buildDataRequestSummary({
              businessName,
              utilityType: selectedUtility,
              identifier: linked.identifier || "",
              retailer: linked.retailer || "",
            })
          : null;
        pendingLinkRef.current = {
          utilityType: selectedUtility,
          utilityDetails,
          dataRequest,
        };

        await runInvoiceFiling({
          utilityType: selectedUtility,
          utilityDetails,
          dataRequest,
        });
      } catch (err: unknown) {
        console.log("🔍 Error confirming utility:", err);
        setLinkPhase("idle");
        const message = err instanceof Error ? err.message : String(err);
        if (message !== "REAUTHENTICATION_REQUIRED") {
          setError(`Failed to confirm utility link: ${message}`);
        }
      } finally {
        setLoading(false);
      }
    } else {
      setRefreshing(true);
      setError(null);
      resetLinkState();
      setSelectedUtilitySheetRow(2);
      setUtilitySheetPreviewRefreshKey((k) => k + 1);
      setRefreshing(false);
    }
  };

  const retryInvoiceFiling = async () => {
    const pending = pendingLinkRef.current;
    if (!pending) return;
    setLoading(true);
    try {
      await runInvoiceFiling(pending);
    } finally {
      setLoading(false);
    }
  };

  const openDataRequest = () => {
    if (!linkedDataRequest) return;
    setDataRequestSummary(linkedDataRequest);
  };

  const sendDataRequest = async () => {
    if (!dataRequestSummary || !token) return;
    setDataRequestLoading(true);
    try {
      const body: Record<string, unknown> = {
        business_name: dataRequestSummary.businessName,
        supplier_name: dataRequestSummary.retailer,
        request_type: dataRequestSummary.requestType,
      };
      if (dataRequestSummary.param !== "business_name") {
        body.details = dataRequestSummary.identifier;
      }
      const response = await fetch(`${getApiBaseUrl()}/api/data-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string; error?: string }).detail ??
            (err as { detail?: string; error?: string }).error ??
            "Failed to send data request",
        );
      }
      const result = await response.json();
      setDataRequestResult((result as { message?: string }).message ?? JSON.stringify(result));
      setDataRequestSummary(null);
    } catch (e) {
      setDataRequestResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
      setDataRequestSummary(null);
    } finally {
      setDataRequestLoading(false);
    }
  };

  const confirmLabel =
    linkPhase === "airtable"
      ? "Linking in Airtable…"
      : linkPhase === "filing"
        ? "Filing invoice…"
        : "Confirm";

  return (
    <ToolPageLayout
      pageName="Utility Linking"
      title={`Link utility for ${businessName}`}
      description="Select a utility type to view and link utility information for this business."
      width="2xl"
    >
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Utility Type:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(UTILITY_OPTIONS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleUtilitySelect(key)}
                disabled={loading}
                className={`
                    px-4 py-3 rounded-lg border-2 font-semibold transition-all duration-200
                    ${
                      selectedUtility === key
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white text-gray-700 border-gray-300 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
                    }
                    ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
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

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {selectedUtility && token ? (
            <div className="space-y-6">
              <MemberAcesSheetPreview
                utilityType={selectedUtility}
                token={token}
                refreshKey={utilitySheetPreviewRefreshKey}
                autoPoll={watchSheetAfterUpload}
                selectable
                selectedRowNumber={selectedUtilitySheetRow}
                onRowSelect={handleUtilitySheetRowSelect}
                toolbarExtra={
                  <UtilityInvoiceUploadBar
                    utilityType={selectedUtility}
                    disabled={loading || refreshing}
                    onUploadSuccess={handleInvoiceUploadSuccess}
                  />
                }
              />

              <div>
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
              </div>

              {(linkPhase === "airtable" || linkPhase === "filing") && (
                <p className="text-sm text-gray-600">
                  {linkPhase === "airtable"
                    ? "Step 1 of 2: matching this site in Airtable…"
                    : "Step 2 of 2: moving the invoice into the member folder…"}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleConfirmUtility(true)}
                  disabled={refreshing || loading || !utilityData}
                  loading={loading && linkPhase !== "filing_failed"}
                >
                  {confirmLabel}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleConfirmUtility(false)}
                  disabled={refreshing || loading}
                  loading={refreshing}
                >
                  Refresh
                </Button>
                {linkPhase === "filing_failed" && (
                  <Button variant="secondary" onClick={() => void retryInvoiceFiling()} disabled={loading}>
                    Retry filing
                  </Button>
                )}
                {linkedDataRequest && (
                  <Button
                    variant="secondary"
                    onClick={openDataRequest}
                    disabled={loading || dataRequestLoading}
                  >
                    Data Request
                  </Button>
                )}
              </div>

              {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Success!</h3>
                      <div className="mt-2 text-sm text-green-700">{successMessage}</div>
                      {linkedDataRequest ? (
                        <p className="mt-2 text-sm text-green-700">
                          Invoice is in the member folder. You can send a data request for{" "}
                          {linkedDataRequest.identifier} without going back to the member profile.
                        </p>
                      ) : linkPhase === "filing_failed" ? (
                        <p className="mt-2 text-sm text-green-700">
                          Data Request stays disabled until invoice filing finishes. Use Retry filing if needed.
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-green-700">
                          Data request is not available for this utility type.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DataRequestConfirmModal
            summary={dataRequestSummary}
            loading={dataRequestLoading}
            onClose={() => setDataRequestSummary(null)}
            onConfirm={() => void sendDataRequest()}
            onRetailerChange={(retailer) => setDataRequestSummary((s) => (s ? { ...s, retailer } : s))}
          />
          <DataRequestResultModal result={dataRequestResult} onClose={() => setDataRequestResult(null)} />

          {!selectedUtility && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <p className="text-gray-500">Select a utility type above to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </ToolPageLayout>
  );
}
