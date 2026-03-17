"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { mapUtilityKey } from "../shared/mapUtilityKey";
import { getApiBaseUrl, formatDateAustralian, formatDateDDMMYYYY, parseDateDDMMYYYYToISO } from "@/lib/utils";

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
  ];
  if (linked["Cleaning Robot"]) {
    base.push({ key: "Cleaning Robot", label: "Robot Number", tool: "robot", param: "robot_number", requestType: "robot_data", sourceKey: "Cleaning Robot" });
  } else if (linked["Robot"]) {
    base.push({ key: "Robot", label: "Robot Number", tool: "robot", param: "robot_number", requestType: "robot_data", sourceKey: "Robot" });
  }
  const smeGasItem: UtilityConfigItem | null = linked["SME Gas"]
    ? { key: "SME Gas", label: "MRIN", tool: "sme-gas", param: "mrin", requestType: "gas_sme", sourceKey: "SME Gas" }
    : linked["Small Gas"]
      ? { key: "SME Gas", label: "MRIN", tool: "sme-gas", param: "mrin", requestType: "gas_sme", sourceKey: "Small Gas" }
      : null;
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

type UtilityRowItem = {
  value: string;
  retailer: string;
  extra?: { contract_end_date?: string; data_requested?: string; data_recieved?: string | boolean };
};

/** Normalize linked[key] to rows. Handles n8n format (array of {identifier, retailer, ced, data_requested, data_received}) and legacy (array of strings + separate retailers/extra). */
function getUtilityRowsFromValue(
  value: unknown,
  retailerList: unknown,
  extraList: Array<{ contract_end_date?: string; data_requested?: string; data_recieved?: string | boolean }> | undefined,
  sourceKey: string
): UtilityRowItem[] {
  if (typeof value === "string") {
    const ids = value.split(",").map((v) => v.trim()).filter(Boolean);
    return ids.map((identifier, idx) => ({
      value: identifier,
      retailer: Array.isArray(retailerList) ? ((retailerList[idx] as string) ?? "") : typeof retailerList === "string" ? retailerList : "",
      extra: Array.isArray(extraList) && extraList[idx] ? extraList[idx] : undefined,
    }));
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (first != null && typeof first === "object" && "identifier" in first) {
      return value.map((o: Record<string, unknown>) => {
        const id = o.identifier;
        const identifierStr =
          id != null && typeof id === "string"
            ? id
            : typeof id === "object" && id != null && "identifier" in (id as object)
              ? String((id as { identifier: unknown }).identifier)
              : String(id ?? "");
        return {
          value: identifierStr,
          retailer: o.retailer != null ? String(o.retailer) : "",
          extra: {
            contract_end_date: (o.ced as string) ?? undefined,
            data_requested: (o.data_requested as string) ?? undefined,
            data_recieved: (o.data_received as string | boolean) ?? (o.data_recieved as string | boolean) ?? undefined,
          },
        };
      });
    }
    return value
      .map((v, idx) => ({
        value: typeof v === "string" || typeof v === "number" ? String(v) : "",
        retailer: getRetailerForIndex({ [sourceKey]: retailerList }, sourceKey, idx),
        extra: Array.isArray(extraList) && extraList[idx] ? extraList[idx] : undefined,
      }))
      .filter((r) => r.value.length > 0);
  }
  return [];
}

/** Count of linked utility types from businessInfo (for tab badge). */
export function getUtilitiesCountFromBusinessInfo(
  businessInfo: Record<string, unknown> | null
): number {
  if (!businessInfo) return 0;
  const linked = (businessInfo.Linked_Details as Record<string, unknown>)?.linked_utilities as Record<string, unknown> | undefined ?? {};
  const retailers = (businessInfo.Linked_Details as Record<string, unknown>)?.utility_retailers as Record<string, unknown> | undefined ?? {};
  const linkedExtra = (businessInfo.Linked_Details as Record<string, unknown>)?.linked_utility_extra as Record<string, Array<{ contract_end_date?: string; data_requested?: string; data_recieved?: string | boolean }>> | undefined;
  const config = buildUtilityConfig(linked);
  let count = 0;
  for (const item of config) {
    const sourceKey = item.sourceKey ?? item.key;
    const value = linked[sourceKey];
    const retailerList = retailers[sourceKey];
    const extraList = linkedExtra?.[sourceKey];
    const rows = getUtilityRowsFromValue(value, retailerList, extraList, sourceKey);
    if (rows.length > 0) count++;
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

type DiscrepancyRow = {
  discrepancy_type: string;
  utility_identifier: string;
  linked_business_name: string;
  invoice_period: string;
  invoice_rate: string;
  contract_period: string;
  contract_rate: string;
  rate_difference: string;
  pct_difference: string;
  annual_quantity_gj: string;
  annual_potential_overcharge: string;
  take_or_pay_invoice: string;
};

/** C&I Electricity contract (invoice vs contract) discrepancy row */
type ElectricityContractDiscrepancyRow = Record<string, string> & {
  utility_identifier: string;
  discrepancy_type?: string;
  linked_business_name?: string;
  invoice_period?: string;
  contract_period?: string;
  discrepancy_detected?: string;
  notes?: string;
  peak_rate_difference?: string;
  peak_pct_difference?: string;
  off_peak_rate_difference?: string;
  off_peak_pct_difference?: string;
  service_charge_difference?: string;
  service_charge_pct_difference?: string;
};

/** DMA discrepancy row */
type DmaDiscrepancyRow = Record<string, string> & {
  utility_identifier: string;
  discrepancy_type?: string;
  linked_business_name?: string;
  invoice_period?: string;
  expected_charge?: string;
  actual_invoice_charge?: string;
  difference?: string;
  status?: string;
};

export function UtilitiesTab({ businessInfo, setBusinessInfo, onLinkUtility }: UtilitiesTabProps) {
  const { data: session } = useSession();
  const token = (session as { id_token?: string; accessToken?: string })?.id_token
    ?? (session as { id_token?: string; accessToken?: string })?.accessToken;

  const [discrepancyRows, setDiscrepancyRows] = useState<DiscrepancyRow[]>([]);
  const [electricityContractRows, setElectricityContractRows] = useState<ElectricityContractDiscrepancyRow[]>([]);
  const [electricityDmaRows, setElectricityDmaRows] = useState<DmaDiscrepancyRow[]>([]);
  const [electricityDemandReviewFlags, setElectricityDemandReviewFlags] = useState<Record<string, boolean>>({});
  const [discrepancyLoading, setDiscrepancyLoading] = useState(false);
  const [expandedDiscrepancyId, setExpandedDiscrepancyId] = useState<string | null>(null);

  const [dataRequestSummary, setDataRequestSummary] = useState<DataRequestSummary | null>(null);
  const [dataRequestLoading, setDataRequestLoading] = useState(false);
  const [dataRequestResult, setDataRequestResult] = useState<string | null>(null);
  const [showDataRequestConfirm, setShowDataRequestConfirm] = useState(false);
  const [showDataRequestResult, setShowDataRequestResult] = useState(false);

  const [utilityEdit, setUtilityEdit] = useState<{
    displayKey: string;
    identifier: string;
    contract_end_date: string;
    data_requested: string;
    data_recieved: boolean;
  } | null>(null);
  const [utilityEditLoading, setUtilityEditLoading] = useState(false);
  const [utilityEditError, setUtilityEditError] = useState<string | null>(null);

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
    const linkedExtra = (info?.Linked_Details as Record<string, unknown>)?.linked_utility_extra as Record<string, Array<{ contract_end_date?: string; data_requested?: string; data_recieved?: string | boolean }>> | undefined;
    const config = buildUtilityConfig(linked);

    const result: Array<{
      displayKey: string;
      config: UtilityConfigItem;
      identifiers: Array<{
        value: string;
        retailer: string;
        extra?: { contract_end_date?: string; data_requested?: string; data_recieved?: string | boolean };
      }>;
    }> = [];

    for (const item of config) {
      const sourceKey = item.sourceKey ?? item.key;
      const value = linked[sourceKey];
      const retailerList = retailers[sourceKey];
      const extraList = linkedExtra?.[sourceKey];
      const rowItems = getUtilityRowsFromValue(value, retailerList, extraList, sourceKey);
      if (rowItems.length === 0) continue;
      result.push({
        displayKey: sourceKey,
        config: item,
        identifiers: rowItems,
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

  useEffect(() => {
    if (!token || !businessName.trim()) {
      setDiscrepancyRows([]);
      setElectricityContractRows([]);
      setElectricityDmaRows([]);
      setElectricityDemandReviewFlags({});
      return;
    }
    let cancelled = false;
    setDiscrepancyLoading(true);
    const params = new URLSearchParams({ business_name: businessName.trim() });
    fetch(`${getApiBaseUrl()}/api/resources/discrepancy-check?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load discrepancy data"))))
      .then((data: {
        rows?: DiscrepancyRow[];
        gas?: DiscrepancyRow[];
        electricity_contract?: ElectricityContractDiscrepancyRow[];
        electricity_dma?: DmaDiscrepancyRow[];
        electricity_demand_review_flags?: Record<string, boolean>;
      }) => {
        if (!cancelled) {
          setDiscrepancyRows(data.rows ?? data.gas ?? []);
          setElectricityContractRows(data.electricity_contract ?? []);
          setElectricityDmaRows(data.electricity_dma ?? []);
          setElectricityDemandReviewFlags(data.electricity_demand_review_flags ?? {});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDiscrepancyRows([]);
          setElectricityContractRows([]);
          setElectricityDmaRows([]);
          setElectricityDemandReviewFlags({});
        }
      })
      .finally(() => {
        if (!cancelled) setDiscrepancyLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, businessName]);

  const discrepancyByIdentifier = useMemo(() => {
    const map = new Map<string, DiscrepancyRow[]>();
    for (const r of discrepancyRows) {
      const id = (r.utility_identifier ?? "").trim();
      if (!id) continue;
      const list = map.get(id) ?? [];
      list.push(r);
      map.set(id, list);
    }
    return map;
  }, [discrepancyRows]);

  const electricityContractByIdentifier = useMemo(() => {
    const map = new Map<string, ElectricityContractDiscrepancyRow[]>();
    for (const r of electricityContractRows) {
      const id = (r.utility_identifier ?? "").trim();
      if (!id) continue;
      const list = map.get(id) ?? [];
      list.push(r);
      map.set(id, list);
    }
    return map;
  }, [electricityContractRows]);

  const electricityDmaByIdentifier = useMemo(() => {
    const map = new Map<string, DmaDiscrepancyRow[]>();
    for (const r of electricityDmaRows) {
      const id = (r.utility_identifier ?? "").trim();
      if (!id) continue;
      const list = map.get(id) ?? [];
      list.push(r);
      map.set(id, list);
    }
    return map;
  }, [electricityDmaRows]);

  const hasElectricityDiscrepancy = useCallback((identifier: string) => {
    const contractCount = electricityContractByIdentifier.get(identifier)?.length ?? 0;
    const dmaCount = electricityDmaByIdentifier.get(identifier)?.length ?? 0;
    return contractCount > 0 || dmaCount > 0;
  }, [electricityContractByIdentifier, electricityDmaByIdentifier]);

  const hasElectricityDemandReview = useCallback((identifier: string) => {
    const normalized = (identifier ?? "").trim();
    return !!electricityDemandReviewFlags[normalized];
  }, [electricityDemandReviewFlags]);

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

  async function saveUtilityRecordEdit() {
    if (!utilityEdit || !token || !setBusinessInfo) return;
    setUtilityEditError(null);
    setUtilityEditLoading(true);
    const contractEndIso = parseDateDDMMYYYYToISO(utilityEdit.contract_end_date);
    const dataRequestedIso = parseDateDDMMYYYYToISO(utilityEdit.data_requested);
    if ((utilityEdit.contract_end_date && !contractEndIso) || (utilityEdit.data_requested && !dataRequestedIso)) {
      setUtilityEditError("Invalid date format. Use dd-mm-yyyy (e.g. 31-12-2027).");
      setUtilityEditLoading(false);
      return;
    }
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/utility-record`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_name: businessName,
          utility_type: utilityEdit.displayKey,
          identifier: utilityEdit.identifier,
          data_requested: dataRequestedIso || undefined,
          data_recieved: utilityEdit.data_recieved,
          contract_end_date: contractEndIso || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? "Update failed");
      }
      setUtilityEdit(null);
      if (businessInfo && setBusinessInfo) {
        const linked = (businessInfo.Linked_Details as Record<string, unknown>) ?? {};
        const extra = (linked.linked_utility_extra as Record<string, unknown[]>) ?? {};
        const row = rows.find((r) => r.displayKey === utilityEdit.displayKey);
        const idxInRow = row?.identifiers.findIndex((id) => id.value === utilityEdit.identifier) ?? -1;
        let updatedExtra = extra;
        if (idxInRow >= 0) {
          const list = extra[utilityEdit.displayKey];
          const arr = Array.isArray(list) ? [...list] : [];
          while (arr.length <= idxInRow) arr.push({});
          arr[idxInRow] = {
            ...(arr[idxInRow] as Record<string, unknown>),
            contract_end_date: contractEndIso || undefined,
            data_requested: dataRequestedIso || undefined,
            data_recieved: utilityEdit.data_recieved,
          };
          updatedExtra = { ...extra, [utilityEdit.displayKey]: arr };
        }
        setBusinessInfo({
          ...businessInfo,
          Linked_Details: { ...linked, linked_utility_extra: updatedExtra },
        });
      }
    } catch (e) {
      setUtilityEditError(e instanceof Error ? e.message : String(e));
    } finally {
      setUtilityEditLoading(false);
    }
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
              Linked Utilities & Retailers
            </h2>
            <div className="flex flex-wrap gap-2 items-center">
              {onLinkUtility && (
                <button
                  type="button"
                  onClick={onLinkUtility}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Link Utility Invoice
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
                    {row.identifiers.map(({ value: identifier, retailer: retailerVal, extra }, idx) => (
                      <div
                        key={`${row.displayKey}-${idx}-${identifier}`}
                        className="border-l-2 border-blue-200 dark:border-blue-800 pl-3"
                      >
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 flex flex-wrap items-center gap-2">
                          {row.config.label}: {identifier}
                          {row.displayKey === "C&I Gas" && (discrepancyByIdentifier.get(identifier)?.length ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              Discrepancy
                            </span>
                          )}
                          {row.displayKey === "C&I Electricity" && hasElectricityDiscrepancy(identifier) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              Discrepancy
                            </span>
                          )}
                          {row.displayKey === "C&I Electricity" && hasElectricityDemandReview(identifier) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100 border border-blue-300 dark:border-blue-700">
                              Interval Data Included — Press “Account Info” for demand review vs invoice
                            </span>
                          )}
                        </div>
                        {row.displayKey === "C&I Gas" && (discrepancyByIdentifier.get(identifier)?.length ?? 0) > 0 && (
                          <div className="mt-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20">
                            <button
                              type="button"
                              onClick={() => setExpandedDiscrepancyId((prev) => (prev === `${row.displayKey}-${identifier}` ? null : `${row.displayKey}-${identifier}`))}
                              className="w-full px-2 py-1.5 text-left text-xs font-medium text-amber-800 dark:text-amber-200 flex items-center justify-between"
                            >
                              {expandedDiscrepancyId === `${row.displayKey}-${identifier}` ? "Hide" : "Show"} discrepancy details
                              <span className="text-amber-600 dark:text-amber-400">{expandedDiscrepancyId === `${row.displayKey}-${identifier}` ? "▼" : "▶"}</span>
                            </button>
                            {expandedDiscrepancyId === `${row.displayKey}-${identifier}` && (
                              <div className="px-2 pb-2 pt-0 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                                {discrepancyByIdentifier.get(identifier)?.map((d, i) => (
                                  <div key={i}>
                                    {d.rate_difference && <div>Rate difference: {d.rate_difference}</div>}
                                    {d.pct_difference && <div>% difference: {d.pct_difference}</div>}
                                    {d.annual_potential_overcharge && <div>Annual potential overcharge: {d.annual_potential_overcharge}</div>}
                                    {d.take_or_pay_invoice && <div className="truncate max-w-full" title={d.take_or_pay_invoice}>Take or Pay: {d.take_or_pay_invoice.slice(0, 80)}{d.take_or_pay_invoice.length > 80 ? "…" : ""}</div>}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      `/resources/discrepancy-check?business_name=${encodeURIComponent(
                                        businessName
                                      )}&identifier=${encodeURIComponent(identifier)}&type=gas`,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                  className="inline-block mt-1 text-primary font-semibold hover:underline"
                                >
                                  View full discrepancy check →
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {row.displayKey === "C&I Electricity" && hasElectricityDiscrepancy(identifier) && (
                          <div className="mt-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20">
                            <button
                              type="button"
                              onClick={() => setExpandedDiscrepancyId((prev) => (prev === `${row.displayKey}-${identifier}` ? null : `${row.displayKey}-${identifier}`))}
                              className="w-full px-2 py-1.5 text-left text-xs font-medium text-amber-800 dark:text-amber-200 flex items-center justify-between"
                            >
                              {expandedDiscrepancyId === `${row.displayKey}-${identifier}` ? "Hide" : "Show"} discrepancy details (Contract / DMA)
                              <span className="text-amber-600 dark:text-amber-400">{expandedDiscrepancyId === `${row.displayKey}-${identifier}` ? "▼" : "▶"}</span>
                            </button>
                            {expandedDiscrepancyId === `${row.displayKey}-${identifier}` && (
                              <div className="px-2 pb-2 pt-0 space-y-2 text-xs text-gray-700 dark:text-gray-300">
                                {((electricityContractByIdentifier.get(identifier)?.length ?? 0) > 0) && (
                                  <div>
                                    <div className="font-semibold text-amber-800 dark:text-amber-200">C&I Contract</div>
                                    {electricityContractByIdentifier.get(identifier)?.map((d, i) => (
                                      <div key={i} className="pl-1">
                                        {d.discrepancy_detected != null && d.discrepancy_detected !== "" && <div>Detected: {d.discrepancy_detected}</div>}
                                        {d.peak_rate_difference && <div>Peak rate diff: {d.peak_rate_difference}</div>}
                                        {d.off_peak_rate_difference && <div>Off-peak rate diff: {d.off_peak_rate_difference}</div>}
                                        {d.service_charge_difference && <div>Service charge diff: {d.service_charge_difference}</div>}
                                        {d.notes && <div className="truncate max-w-full" title={d.notes}>{d.notes.slice(0, 80)}{d.notes.length > 80 ? "…" : ""}</div>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {((electricityDmaByIdentifier.get(identifier)?.length ?? 0) > 0) && (
                                  <div>
                                    <div className="font-semibold text-amber-800 dark:text-amber-200">DMA</div>
                                    {electricityDmaByIdentifier.get(identifier)?.map((d, i) => (
                                      <div key={i} className="pl-1">
                                        {d.expected_charge && <div>Expected: {d.expected_charge}</div>}
                                        {d.actual_invoice_charge && <div>Actual: {d.actual_invoice_charge}</div>}
                                        {d.difference && <div>Difference: {d.difference}</div>}
                                        {d.status && <div>{d.status}</div>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      `/resources/discrepancy-check?business_name=${encodeURIComponent(
                                        businessName
                                      )}&identifier=${encodeURIComponent(identifier)}&type=electricity`,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                  className="inline-block mt-1 text-primary font-semibold hover:underline"
                                >
                                  View full discrepancy check →
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {retailerVal && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Retailer: {retailerVal}
                          </div>
                        )}
                        {extra && (
                          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5 mb-2">
                            {extra.contract_end_date != null && extra.contract_end_date !== "" && (
                              <div>Contract end: {formatDateAustralian(extra.contract_end_date)}</div>
                            )}
                            {extra.data_requested != null && extra.data_requested !== "" && (
                              <div>Data requested: {formatDateAustralian(extra.data_requested)}</div>
                            )}
                            <div>Data received: {extra.data_recieved === true || extra.data_recieved === "Yes" || (typeof extra.data_recieved === "string" && extra.data_recieved.length > 0) ? "Received" : "Not received"}</div>
                            {(row.displayKey === "C&I Electricity" || row.displayKey === "C&I Gas") && (extra.contract_end_date != null || extra.data_requested != null || extra.data_recieved != null) && (
                              <button
                                type="button"
                                onClick={() => setUtilityEdit({
                                  displayKey: row.displayKey,
                                  identifier,
                                  contract_end_date: formatDateDDMMYYYY(extra.contract_end_date),
                                  data_requested: formatDateDDMMYYYY(extra.data_requested),
                                  data_recieved: extra.data_recieved === true || extra.data_recieved === "Yes" || (typeof extra.data_recieved === "string" && extra.data_recieved.length > 0),
                                })}
                                className="text-xs mt-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Edit dates
                              </button>
                            )}
                            {(row.displayKey === "C&I Electricity" || row.displayKey === "C&I Gas") && extra.contract_end_date == null && extra.data_requested == null && (extra.data_recieved == null || extra.data_recieved === false || extra.data_recieved === "") && (
                              <button
                                type="button"
                                onClick={() => setUtilityEdit({
                                  displayKey: row.displayKey,
                                  identifier,
                                  contract_end_date: "",
                                  data_requested: "",
                                  data_recieved: false,
                                })}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Add contract end / data dates
                              </button>
                            )}
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

      {/* Data Request confirmation – centered modal (same as business-info page) */}
      <Modal
        open={showDataRequestConfirm && !!dataRequestSummary}
        onClose={closeDataRequestConfirm}
        title="Confirm Data Request"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDataRequestConfirm}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={dataRequestLoading}
              onClick={confirmDataRequest}
              className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {dataRequestLoading ? "Sending…" : "Confirm & Send"}
            </button>
          </div>
        }
      >
        {dataRequestSummary && (
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <span className="font-semibold">Business Name:</span>{" "}
              <span className="ml-2">{dataRequestSummary.businessName}</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Retailer:</label>
              <select
                value={dataRequestSummary.retailer || ""}
                onChange={(e) =>
                  setDataRequestSummary((s) =>
                    s ? { ...s, retailer: e.target.value } : s
                  )
                }
                className="w-full px-3 py-2 border-2 border-gray-400 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a retailer...</option>
                {(() => {
                  const requestType = dataRequestSummary.requestType;
                  const isCI =
                    requestType === "electricity_ci" || requestType === "gas_ci";
                  const isSME =
                    requestType === "electricity_sme" ||
                    requestType === "gas_sme";
                  const isWaste = requestType === "waste";
                  const isOil = requestType === "oil";
                  const ciRetailers = [
                    "Origin C&I",
                    "Momentum C&I",
                    "Shell Energy",
                    "Alinta C&I",
                    "Energy Australia",
                    "AGL",
                  ];
                  const smeRetailers = [
                    "Origin SME",
                    "Momentum SME",
                    "BlueNRG SME",
                    "CovaU SME",
                    "Next Business Energy",
                    "1st Energy",
                    "Red Energy",
                    "GloBird Energy",
                    "Powerdirect",
                    "Sumo",
                    "Tango Energy",
                    "Sun Retail",
                    "Ergon Energy",
                  ];
                  const wasteRetailers = ["Veolia"];
                  const allRetailers = [
                    ...ciRetailers,
                    ...smeRetailers,
                    ...wasteRetailers,
                  ];
                  return (
                    <>
                      {isCI && (
                        <optgroup label="C&I Electricity & Gas">
                          {ciRetailers.map((retailer) => (
                            <option key={retailer} value={retailer}>
                              {retailer}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {isSME && (
                        <optgroup label="SME Electricity & Gas">
                          {smeRetailers.map((retailer) => (
                            <option key={retailer} value={retailer}>
                              {retailer}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {isWaste && (
                        <optgroup label="Waste">
                          {wasteRetailers.map((retailer) => (
                            <option key={retailer} value={retailer}>
                              {retailer}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {(isOil || (!isCI && !isSME && !isWaste)) && (
                        <>
                          <optgroup label="C&I Electricity & Gas">
                            {ciRetailers.map((retailer) => (
                              <option key={retailer} value={retailer}>
                                {retailer}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="SME Electricity & Gas">
                            {smeRetailers.map((retailer) => (
                              <option key={retailer} value={retailer}>
                                {retailer}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Waste">
                            {wasteRetailers.map((retailer) => (
                              <option key={retailer} value={retailer}>
                                {retailer}
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                      <optgroup label="Other">
                        <option value="Other">Other Supplier</option>
                      </optgroup>
                      {dataRequestSummary.retailer &&
                        !allRetailers.includes(dataRequestSummary.retailer) &&
                        dataRequestSummary.retailer !== "Other" && (
                          <option value={dataRequestSummary.retailer}>
                            {dataRequestSummary.retailer} (Current)
                          </option>
                        )}
                    </>
                  );
                })()}
              </select>
            </div>
            <div>
              <span className="font-semibold">Identifier:</span>{" "}
              <span className="ml-2">{dataRequestSummary.identifier}</span>
            </div>
            <div>
              <span className="font-semibold">Request Type:</span>{" "}
              <span className="ml-2">{dataRequestSummary.requestType}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Data Request result – centered modal (same as business-info page) */}
      <Modal
        open={showDataRequestResult && !!dataRequestResult}
        onClose={closeDataRequestResult}
        title="Data Request Result"
        size="lg"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeDataRequestResult}
              className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none"
            >
              Close
            </button>
          </div>
        }
      >
        {dataRequestResult && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg max-h-[60vh] overflow-auto">
            <div className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-gray-200">
              {dataRequestResult.split("\n").map((line, idx) => {
                if (line.includes("✅")) {
                  return (
                    <div
                      key={idx}
                      className="text-green-700 dark:text-green-400 font-semibold mb-2"
                    >
                      {line}
                    </div>
                  );
                }
                if (line.includes("⚠️")) {
                  return (
                    <div
                      key={idx}
                      className="text-yellow-700 dark:text-yellow-400 font-semibold mb-2"
                    >
                      {line}
                    </div>
                  );
                }
                if (line.includes("❌")) {
                  return (
                    <div
                      key={idx}
                      className="text-red-700 dark:text-red-400 font-semibold mb-2"
                    >
                      {line}
                    </div>
                  );
                }
                if (line.trim().endsWith(":")) {
                  return (
                    <div key={idx} className="font-semibold mt-2 mb-1">
                      {line}
                    </div>
                  );
                }
                if (line.trim().startsWith("-")) {
                  return (
                    <div key={idx} className="ml-4">
                      {line}
                    </div>
                  );
                }
                return <div key={idx}>{line}</div>;
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit utility record – centered modal */}
      <Modal
        open={!!utilityEdit}
        onClose={() => { setUtilityEdit(null); setUtilityEditError(null); }}
        title={utilityEdit ? `Edit utility – ${utilityEdit.displayKey} (${utilityEdit.identifier})` : "Edit utility"}
        size="default"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setUtilityEdit(null); setUtilityEditError(null); }}
              className="text-xs px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={utilityEditLoading}
              onClick={saveUtilityRecordEdit}
              className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {utilityEditLoading ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        {utilityEdit && (
          <div className="space-y-3 text-sm">
            {utilityEditError && (
              <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs">
                {utilityEditError}
              </div>
            )}
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Contract end date (dd-mm-yyyy)</label>
              <input
                type="text"
                value={utilityEdit.contract_end_date}
                onChange={(e) => setUtilityEdit((p) => p ? { ...p, contract_end_date: e.target.value } : null)}
                className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="e.g. 31-12-2027"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Data requested (dd-mm-yyyy)</label>
              <input
                type="text"
                value={utilityEdit.data_requested}
                onChange={(e) => setUtilityEdit((p) => p ? { ...p, data_requested: e.target.value } : null)}
                className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="e.g. 11-03-2026"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="utility-edit-data-received"
                checked={utilityEdit.data_recieved}
                onChange={(e) => setUtilityEdit((p) => p ? { ...p, data_recieved: e.target.checked } : null)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="utility-edit-data-received" className="font-medium text-gray-700 dark:text-gray-300">
                Data received
              </label>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
