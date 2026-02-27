"use client";

import { useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { mapUtilityKey } from "../shared/mapUtilityKey";
import { SlideOverPanel } from "../shared/SlideOverPanel";
import { getApiBaseUrl } from "@/lib/utils";

export interface UtilitiesTabProps {
  businessInfo: Record<string, unknown> | null;
  setBusinessInfo: (info: Record<string, unknown> | null) => void;
  onLinkUtility?: () => void;
}

type UtilityConfigItem = {
  key: string;
  label: string;
  tool: string;
  param: string;
  requestType: string;
  sourceKey?: string;
};

function buildUtilityConfig(linked: Record<string, unknown>): UtilityConfigItem[] {
  const base: UtilityConfigItem[] = [
    { key: "C&I Electricity", label: "NMI", tool: "ci-electricity", param: "nmi", requestType: "electricity_ci" },
    { key: "SME Electricity", label: "NMI", tool: "sme-electricity", param: "nmi", requestType: "electricity_sme" },
    { key: "C&I Gas", label: "MRIN", tool: "ci-gas", param: "mrin", requestType: "gas_ci" },
    { key: "Waste", label: "Account Number", tool: "waste", param: "account_number", requestType: "waste" },
    { key: "Oil", label: "Account Name", tool: "oil", param: "business_name", requestType: "oil" },
    { key: "Cleaning", label: "Member Name", tool: "cleaning", param: "client_name", requestType: "cleaning" },
    { key: "Robot", label: "Robot Number", tool: "robot", param: "robot_number", requestType: "robot_data" },
  ];
  const smeGasItem: UtilityConfigItem = linked["SME Gas"]
    ? { key: "SME Gas", label: "MRIN", tool: "sme-gas", param: "mrin", requestType: "gas_sme", sourceKey: "SME Gas" }
    : linked["Small Gas"]
      ? { key: "SME Gas", label: "MRIN", tool: "sme-gas", param: "mrin", requestType: "gas_sme", sourceKey: "Small Gas" }
      : (null as unknown as UtilityConfigItem);
  const config: UtilityConfigItem[] = [];
  for (const item of base) {
    if (item.key === "C&I Gas") {
      config.push(item);
      if (smeGasItem) config.push(smeGasItem);
    } else {
      config.push(item);
    }
  }
  return config;
}

function normalizeIdentifiers(value: unknown): string[] {
  if (typeof value === "string") {
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : "")).filter(Boolean);
  }
  if (typeof value === "number") return [String(value)];
  return [];
}

/** Count of linked utility types from businessInfo (for tab badge). */
export function getUtilitiesCountFromBusinessInfo(
  businessInfo: Record<string, unknown> | null
): number {
  if (!businessInfo) return 0;
  const linked = (businessInfo.Linked_Details as Record<string, unknown>)?.linked_utilities as Record<string, unknown> | undefined ?? {};
  const config = buildUtilityConfig(linked);
  let count = 0;
  for (const item of config) {
    const sourceKey = item.sourceKey ?? item.key;
    const value = linked[sourceKey];
    const identifiers = normalizeIdentifiers(value);
    if (identifiers.length > 0) count++;
  }
  return count;
}

function getRetailerForIndex(retailers: unknown, key: string, index: number): string {
  const r = (retailers as Record<string, unknown>)?.[key];
  if (Array.isArray(r)) return (r[index] as string) ?? "";
  if (typeof r === "string") return r;
  return "";
}

interface DataRequestSummary {
  businessName: string;
  retailer: string;
  identifier: string;
  requestType: string;
  param: string;
  details: string;
}

export function UtilitiesTab({ businessInfo, onLinkUtility }: UtilitiesTabProps) {
  const { data: session } = useSession();
  const token = (session as { id_token?: string; accessToken?: string })?.id_token
    ?? (session as { id_token?: string; accessToken?: string })?.accessToken;

  const [dataRequestSummary, setDataRequestSummary] = useState<DataRequestSummary | null>(null);
  const [dataRequestLoading, setDataRequestLoading] = useState(false);
  const [dataRequestResult, setDataRequestResult] = useState<string | null>(null);
  const [showDataRequestConfirm, setShowDataRequestConfirm] = useState(false);
  const [showDataRequestResult, setShowDataRequestResult] = useState(false);

  const closeDataRequestConfirm = useCallback(() => {
    setShowDataRequestConfirm(false);
    setDataRequestSummary(null);
  }, []);

  const closeDataRequestResult = useCallback(() => {
    setShowDataRequestResult(false);
    setDataRequestResult(null);
  }, []);

  const rows = useMemo(() => {
    const info = businessInfo as Record<string, unknown> | null | undefined;
    const linked = (info?.Linked_Details as Record<string, unknown>)?.linked_utilities as Record<string, unknown> | undefined ?? {};
    const retailers = (info?.Linked_Details as Record<string, unknown>)?.utility_retailers as Record<string, unknown> | undefined ?? {};
    const config = buildUtilityConfig(linked);

    const result: Array<{
      displayKey: string;
      config: UtilityConfigItem;
      identifiers: Array<{ value: string; retailer: string }>;
    }> = [];

    for (const item of config) {
      const sourceKey = item.sourceKey ?? item.key;
      const value = linked[sourceKey];
      const identifiers = normalizeIdentifiers(value);
      if (identifiers.length === 0) continue;
      result.push({
        displayKey: sourceKey,
        config: item,
        identifiers: identifiers.map((value, idx) => ({
          value,
          retailer: getRetailerForIndex(retailers, sourceKey, idx),
        })),
      });
    }
    return result;
  }, [businessInfo]);

  const business = (businessInfo as Record<string, unknown>)?.business_details as Record<string, unknown> | undefined ?? {};
  const contact = (businessInfo as Record<string, unknown>)?.contact_information as Record<string, unknown> | undefined ?? {};
  const rep = (businessInfo as Record<string, unknown>)?.representative_details as Record<string, unknown> | undefined ?? {};
  const businessName = (business.name as string) ?? "";
  const infoWithFiles = businessInfo as Record<string, unknown> | undefined;
  const processedFileIds = infoWithFiles?._processed_file_ids as Record<string, unknown> | undefined;
  const loaLink = processedFileIds?.business_LOA as string | undefined;
  const driveUrl = (infoWithFiles?.gdrive as Record<string, unknown>)?.folder_url as string | undefined;

  function buildAccountInfoUrl(
    tool: string,
    param: string,
    identifier: string,
    invoiceBusinessName: string,
    addDma = false
  ): string {
    let url = `/utility-invoice-info/${tool}?business_name=${encodeURIComponent(invoiceBusinessName)}&autoSubmit=1`;
    if (addDma) url += "&autoOpenDMA=1";
    if (param !== "business_name" && param !== "client_name") {
      url += `&${param}=${encodeURIComponent(identifier)}`;
    }
    if (param === "client_name") {
      url += `&client_name=${encodeURIComponent(identifier)}`;
    }
    if (businessName) url += `&business_abn=${encodeURIComponent(String(business.abn ?? ""))}`;
    if (business.trading_name) url += `&business_trading_name=${encodeURIComponent(String(business.trading_name))}`;
    if (business.industry) url += `&business_industry=${encodeURIComponent(String(business.industry))}`;
    if (business.website) url += `&business_website=${encodeURIComponent(String(business.website))}`;
    if (contact.postal_address) url += `&postal_address=${encodeURIComponent(String(contact.postal_address))}`;
    if (contact.telephone) url += `&contact_phone=${encodeURIComponent(String(contact.telephone))}`;
    if (contact.email) url += `&contact_email=${encodeURIComponent(String(contact.email))}`;
    if (rep.contact_name) url += `&contact_name=${encodeURIComponent(String(rep.contact_name))}`;
    if (rep.position) url += `&contact_position=${encodeURIComponent(String(rep.position))}`;
    if (rep.loa_sign_date) url += `&loa_sign_date=${encodeURIComponent(String(rep.loa_sign_date))}`;
    return url;
  }

  function handleAccountInfo(config: UtilityConfigItem, identifier: string) {
    const isOil = config.key === "Oil";
    const invoiceBusinessName = isOil ? identifier : businessName;
    const url = buildAccountInfoUrl(config.tool, config.param, identifier, invoiceBusinessName, false);
    window.open(url, "_blank");
  }

  function handleDataRequest(config: UtilityConfigItem, identifier: string, retailer: string) {
    const isOil = config.key === "Oil";
    const invoiceBusinessName = isOil ? identifier : businessName;
    setDataRequestSummary({
      businessName: invoiceBusinessName,
      retailer: retailer || config.key,
      identifier,
      requestType: config.requestType,
      param: config.param,
      details: config.param !== "business_name" ? identifier : "",
    });
    setShowDataRequestConfirm(true);
  }

  async function confirmDataRequest() {
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
        throw new Error((err as { detail?: string; error?: string }).detail ?? (err as { detail?: string; error?: string }).error ?? "Failed to send data request");
      }
      const result = await response.json();
      setDataRequestResult((result as { message?: string }).message ?? JSON.stringify(result));
      setShowDataRequestConfirm(false);
      setDataRequestSummary(null);
      setShowDataRequestResult(true);
    } catch (e) {
      setDataRequestResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
      setShowDataRequestConfirm(false);
      setDataRequestSummary(null);
      setShowDataRequestResult(true);
    } finally {
      setDataRequestLoading(false);
    }
  }

  function handleQuoteRequest(config: UtilityConfigItem, identifier: string) {
    const businessInfoToPass = {
      business_name: businessName,
      abn: business.abn,
      trading_name: business.trading_name,
      email: contact.email,
      telephone: contact.telephone,
      postal_address: contact.postal_address,
      site_address: contact.site_address,
      contact_name: rep.contact_name,
      googleDriveLink: driveUrl,
      loaLink,
    };
    const utility = mapUtilityKey(config.key);
    const params = new URLSearchParams();
    params.set("businessInfo", encodeURIComponent(JSON.stringify(businessInfoToPass)));
    params.set("utility", utility);
    params.set("identifier", identifier);
    window.open(`/quote-request?${params.toString()}`, "_blank");
  }

  function handleDma(config: UtilityConfigItem, identifier: string) {
    const invoiceBusinessName = businessName;
    const url = buildAccountInfoUrl(config.tool, config.param, identifier, invoiceBusinessName, true);
    window.open(url, "_blank");
  }

  if (!businessInfo) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No business information loaded. Load the member&apos;s business details to see linked utilities.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Linked utilities & retailers
            </h2>
            <div className="flex flex-wrap gap-2">
              {onLinkUtility && (
                <button
                  type="button"
                  onClick={onLinkUtility}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Link utility
                </button>
              )}
              <button
                type="button"
                onClick={() => window.open("/document-lodgement", "_blank")}
                className="text-xs px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Upload invoice or data
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No utilities have been linked for this member yet.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((row) => (
                <div
                  key={row.displayKey}
                  className="border rounded-lg p-3 bg-gray-50/60 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700"
                >
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    {row.displayKey}
                  </div>
                  <div className="space-y-3">
                    {row.identifiers.map(({ value: identifier, retailer: retailerVal }) => (
                      <div
                        key={identifier}
                        className="border-l-2 border-blue-200 dark:border-blue-800 pl-3"
                      >
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {row.config.label}: {identifier}
                        </div>
                        {retailerVal && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Retailer: {retailerVal}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          <button
                            type="button"
                            onClick={() => handleAccountInfo(row.config, identifier)}
                            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Account Info
                          </button>
                          {row.config.tool !== "robot" && row.config.tool !== "cleaning" && (
                            <button
                              type="button"
                              onClick={() => handleDataRequest(row.config, identifier, retailerVal)}
                              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Data Request
                            </button>
                          )}
                          {row.config.tool !== "cleaning" && (
                            <button
                              type="button"
                              onClick={() => handleQuoteRequest(row.config, identifier)}
                              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Quote Request
                            </button>
                          )}
                          {row.config.key === "C&I Electricity" && row.config.tool === "ci-electricity" && (
                            <button
                              type="button"
                              onClick={() => handleDma(row.config, identifier)}
                              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              DMA
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Request confirmation */}
      <SlideOverPanel
        open={showDataRequestConfirm && !!dataRequestSummary}
        onClose={closeDataRequestConfirm}
        title="Confirm Data Request"
        description="Review and send the data request."
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDataRequestConfirm}
              className="text-xs px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={dataRequestLoading}
              onClick={confirmDataRequest}
              className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {dataRequestLoading ? "Sending…" : "Confirm & Send"}
            </button>
          </div>
        }
      >
        {dataRequestSummary && (
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p><span className="font-semibold">Business:</span> {dataRequestSummary.businessName}</p>
            <p><span className="font-semibold">Retailer:</span> {dataRequestSummary.retailer}</p>
            <p><span className="font-semibold">Identifier:</span> {dataRequestSummary.identifier}</p>
            <p><span className="font-semibold">Request type:</span> {dataRequestSummary.requestType}</p>
          </div>
        )}
      </SlideOverPanel>

      {/* Data Request result */}
      <SlideOverPanel
        open={showDataRequestResult && !!dataRequestResult}
        onClose={closeDataRequestResult}
        title="Data Request Result"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeDataRequestResult}
              className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        }
      >
        {dataRequestResult && (
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg max-h-[60vh] overflow-auto">
            <div className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-gray-200">
              {dataRequestResult.split("\n").map((line, idx) => {
                if (line.includes("✅")) {
                  return <div key={idx} className="text-green-700 dark:text-green-400 font-semibold mb-2">{line}</div>;
                }
                if (line.includes("⚠️")) {
                  return <div key={idx} className="text-yellow-700 dark:text-yellow-400 font-semibold mb-2">{line}</div>;
                }
                if (line.includes("❌")) {
                  return <div key={idx} className="text-red-700 dark:text-red-400 font-semibold mb-2">{line}</div>;
                }
                if (line.trim().endsWith(":")) {
                  return <div key={idx} className="font-semibold mt-2 mb-1">{line}</div>;
                }
                if (line.trim().startsWith("-")) {
                  return <div key={idx} className="ml-4">{line}</div>;
                }
                return <div key={idx}>{line}</div>;
              })}
            </div>
          </div>
        )}
      </SlideOverPanel>
    </>
  );
}
