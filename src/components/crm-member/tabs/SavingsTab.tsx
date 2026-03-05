"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

interface LineItem {
  solution_label?: string;
  solution_type?: string;
  savings_amount?: number;
}

interface SavingsInvoiceSummary {
  invoice_number: string;
  business_name: string;
  due_date: string;
  total_amount: number;
  status: string;
  invoice_file_id?: string;
  line_items?: LineItem[];
}

export interface SavingsTabProps {
  businessInfo: Record<string, unknown> | null;
}

/** Utility type as in Member ACES Data sheet / backend */
const UTILITY_SHEET_MAP: Record<string, string> = {
  "C&I Electricity": "C&I Electricity",
  "SME Electricity": "SME Electricity",
  "C&I Gas": "C&I Gas",
  "SME Gas": "SME Gas",
  "Small Gas": "SME Gas",
  Waste: "Waste",
  Oil: "Oil",
};

/** Map to solution_type id used on one-month-savings page */
const UTILITY_TO_SOLUTION_TYPE: Record<string, string> = {
  "C&I Electricity": "ci_electricity",
  "SME Electricity": "sme_electricity",
  "C&I Gas": "ci_gas",
  "SME Gas": "sme_gas",
  Waste: "waste",
  Oil: "resource_recovery",
};

const SHEET_CONFIG_KEYS = ["C&I Electricity", "SME Electricity", "C&I Gas", "SME Gas", "Waste", "Oil"];

function IconPlus() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconCalculator() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

export function SavingsTab({ businessInfo }: SavingsTabProps) {
  const biz = (businessInfo as any)?.business_details ?? {};
  const contact = (businessInfo as any)?.contact_information ?? {};
  const rep = (businessInfo as any)?.representative_details ?? {};
  const driveUrl = (businessInfo as any)?.gdrive?.folder_url as string | undefined;

  const businessName: string = biz?.name ?? "";
  const tradingName: string = biz?.trading_name ?? "";
  const postalAddress: string | undefined = contact?.postal_address;
  const siteAddress: string | undefined = contact?.site_address;

  const [savingsLoading, setSavingsLoading] = useState(false);
  const [savingsError, setSavingsError] = useState<string | null>(null);
  const [savingsCount, setSavingsCount] = useState<number | null>(null);
  const [invoices, setInvoices] = useState<SavingsInvoiceSummary[]>([]);

  const [calculateModalOpen, setCalculateModalOpen] = useState(false);
  const [calculateOption, setCalculateOption] = useState("");
  const [calculateAgreementMonth, setCalculateAgreementMonth] = useState("");
  const [calculateLoading, setCalculateLoading] = useState(false);
  const [calculateResult, setCalculateResult] = useState<{
    success: boolean;
    savings_amount?: number;
    pre_period_total?: number;
    post_period_total?: number;
    pre_period_label?: string;
    post_period_label?: string;
    pre_rows?: { period: string; total: number }[];
    post_rows?: { period: string; total: number }[];
    pre_row_detail?: { header: string; value: unknown }[];
    post_row_detail?: { header: string; value: unknown }[];
    error?: string;
  } | null>(null);
  const [calculateDetailsExpanded, setCalculateDetailsExpanded] = useState(false);
  const [editedDetailValues, setEditedDetailValues] = useState<{ pre: Record<string, string>; post: Record<string, string> }>({ pre: {}, post: {} });

  const linkedUtilityOptions = useMemo(() => {
    const linked = (businessInfo as any)?.Linked_Details?.linked_utilities as Record<string, string | string[]> | undefined;
    if (!linked) return [];
    const options: { value: string; utilityType: string; identifier: string; label: string }[] = [];
    let idx = 0;
    for (const [key, val] of Object.entries(linked)) {
      const sheetType = UTILITY_SHEET_MAP[key] || key;
      if (!SHEET_CONFIG_KEYS.includes(sheetType)) continue;
      const ids = typeof val === "string" ? val.split(",").map((s) => s.trim()).filter(Boolean) : Array.isArray(val) ? val : [];
      ids.forEach((id) => {
        const value = `${sheetType}::${String(id).trim()}`;
        options.push({ value, utilityType: sheetType, identifier: String(id).trim(), label: `${key} – ${id}` });
        idx++;
      });
    }
    return options;
  }, [businessInfo]);

  const latestInvoice = useMemo(
    () => (invoices.length > 0 ? invoices[invoices.length - 1] : null),
    [invoices]
  );

  const formattedLatestAmount = useMemo(() => {
    if (!latestInvoice) return "";
    const value = Number(latestInvoice.total_amount || 0);
    if (!Number.isFinite(value)) return "";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(value);
  }, [latestInvoice]);

  useEffect(() => {
    if (!businessName) return;

    let cancelled = false;

    const fetchSavingsHistory = async () => {
      setSavingsLoading(true);
      setSavingsError(null);
      try {
        const res = await fetch("/api/one-month-savings/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business_name: businessName }),
        });

        if (!res.ok) {
          throw new Error("Failed to load 1st Month Savings invoices");
        }

        const data = await res.json();
        if (cancelled) return;

        const list = Array.isArray(data.invoices) ? data.invoices : [];
        setInvoices(list);
        setSavingsCount(list.length);
      } catch (error) {
        console.error("Error loading 1st Month Savings invoices", error);
        if (!cancelled) {
          setSavingsError("Could not load 1st Month Savings invoices.");
          setInvoices([]);
          setSavingsCount(null);
        }
      } finally {
        if (!cancelled) {
          setSavingsLoading(false);
        }
      }
    };

    fetchSavingsHistory();

    return () => {
      cancelled = true;
    };
  }, [businessName]);

  const handleOpenOneMonthSavings = () => {
    if (!businessName) return;

    const params = new URLSearchParams();

    if (businessName) params.set("businessName", businessName);
    if (biz.abn) params.set("abn", biz.abn);
    if (tradingName) params.set("tradingAs", tradingName);
    if (contact.email) params.set("email", contact.email);
    if (contact.telephone) params.set("phone", contact.telephone);
    if (postalAddress) params.set("address", postalAddress);
    if (siteAddress) params.set("siteAddress", siteAddress);
    if (rep.contact_name) params.set("contactName", rep.contact_name);
    if (rep.position) params.set("position", rep.position);
    if (driveUrl) params.set("clientFolderUrl", driveUrl);

    window.open(`/one-month-savings?${params.toString()}`, "_blank");
  };

  const updateStatus = async (invoiceNumber: string, newStatus: string) => {
    if (!businessName || !invoiceNumber) return;
    try {
      const res = await fetch("/api/one-month-savings/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          invoice_number: invoiceNumber,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.invoice_number === invoiceNumber ? { ...inv, status: newStatus } : inv
          )
        );
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const runCalculate = async () => {
    if (!calculateOption || !calculateAgreementMonth || !businessName) return;
    const opt = linkedUtilityOptions.find((o) => o.value === calculateOption);
    if (!opt) return;
    setCalculateLoading(true);
    setCalculateResult(null);
    setCalculateDetailsExpanded(false);
    setEditedDetailValues({ pre: {}, post: {} });
    try {
      const res = await fetch("/api/one-month-savings/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: opt.identifier,
          utility_type: opt.utilityType,
          agreement_start_month: calculateAgreementMonth,
          business_name: businessName,
        }),
      });
      const data = await res.json();
      setCalculateResult(data);
      if (data?.success && (data.pre_row_detail?.length || data.post_row_detail?.length)) {
        setCalculateDetailsExpanded(true);
      }
    } catch (e) {
      setCalculateResult({ success: false, error: "Request failed" });
    } finally {
      setCalculateLoading(false);
    }
  };

  const openOneMonthSavingsWithCalculatedLine = () => {
    if (!businessName || !calculateResult?.success || calculateResult.savings_amount == null) return;
    const opt = linkedUtilityOptions.find((o) => o.value === calculateOption);
    if (!opt) return;
    const params = new URLSearchParams();
    params.set("businessName", businessName);
    if (biz.abn) params.set("abn", biz.abn);
    if (tradingName) params.set("tradingAs", tradingName);
    if (contact.email) params.set("email", contact.email);
    if (contact.telephone) params.set("phone", contact.telephone);
    if (postalAddress) params.set("address", postalAddress);
    if (siteAddress) params.set("siteAddress", siteAddress);
    if (rep.contact_name) params.set("contactName", rep.contact_name);
    if (rep.position) params.set("position", rep.position);
    if (driveUrl) params.set("clientFolderUrl", driveUrl);
    params.set("savingsAmount", String(calculateResult.savings_amount));
    params.set("solutionType", UTILITY_TO_SOLUTION_TYPE[opt.utilityType] || opt.utilityType.replace(/\s+/g, "_").toLowerCase());
    params.set("solutionLabel", opt.utilityType + " Reviews");
    window.open(`/one-month-savings?${params.toString()}`, "_blank");
    setCalculateModalOpen(false);
    setCalculateResult(null);
  };

  const pathname = usePathname();
  const router = useRouter();

  const openTestimonialsTab = () => {
    setCalculateModalOpen(false);
    setCalculateResult(null);
    if (pathname) router.push(`${pathname}?tab=testimonials`);
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              1st Month Savings
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              View and generate 1st Month Savings invoices for this member.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCalculateModalOpen(true);
                setCalculateResult(null);
                setCalculateOption(linkedUtilityOptions[0]?.value ?? "");
                setCalculateAgreementMonth("");
              }}
              disabled={linkedUtilityOptions.length === 0}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              title={linkedUtilityOptions.length === 0 ? "Link utilities in Business Info first" : "Calculate from Member ACES Data sheet"}
            >
              <IconCalculator />
              Calculate 1 month savings
            </button>
            <button
              type="button"
              onClick={handleOpenOneMonthSavings}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <IconPlus />
              Generate invoice
            </button>
          </div>
        </div>

        {!businessName ? (
          <p className="text-sm text-gray-400">
            Business name not loaded yet. Check that Business Info has been fetched.
          </p>
        ) : savingsLoading ? (
          <p className="text-sm text-gray-400">
            Loading 1st Month Savings invoices...
          </p>
        ) : savingsError ? (
          <p className="text-sm text-red-500">{savingsError}</p>
        ) : invoices.length === 0 ? (
          <div className="text-sm text-gray-400">
            No 1st Month Savings invoices recorded yet.
            <br />
            <button
              type="button"
              onClick={handleOpenOneMonthSavings}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <IconPlus />
              Create the first invoice
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {latestInvoice && (
              <div className="p-3 border border-emerald-200/70 dark:border-emerald-700/60 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                    Latest invoice
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={
                    [
                      latestInvoice.invoice_number,
                      latestInvoice.due_date ? `Due ${latestInvoice.due_date}` : "Due date not set",
                      latestInvoice.line_items?.length
                        ? latestInvoice.line_items.map((item) => item.solution_label || item.solution_type || "Service").filter(Boolean).join(", ")
                        : "",
                    ].filter(Boolean).join(" · ")
                  }>
                    {latestInvoice.invoice_number}
                    {latestInvoice.due_date && (
                      <> · {latestInvoice.due_date}</>
                    )}
                    {latestInvoice.line_items && latestInvoice.line_items.length > 0 && (
                      <> · {latestInvoice.line_items.map((item) => item.solution_label || item.solution_type || "Service").filter(Boolean).join(", ")}</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  {formattedLatestAmount && (
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {formattedLatestAmount}
                    </p>
                  )}
                  <select
                    value={latestInvoice.status || "Generated"}
                    onChange={(e) =>
                      updateStatus(latestInvoice.invoice_number, e.target.value)
                    }
                    className="text-[11px] border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mt-0.5"
                  >
                    <option value="Generated">Generated</option>
                    <option value="Sent">Sent</option>
                    <option value="Paid">Paid</option>
                  </select>
                  {latestInvoice.invoice_file_id && (
                    <a
                      href={`https://drive.google.com/file/d/${latestInvoice.invoice_file_id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[11px] font-semibold text-primary hover:underline mt-1"
                    >
                      View invoice
                    </a>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                All invoices{typeof savingsCount === "number" ? ` (${savingsCount})` : ""}
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {invoices.map((inv) => (
                  <div
                    key={inv.invoice_number}
                    className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={
                        [
                          inv.invoice_number,
                          inv.due_date || "Due date not recorded",
                          inv.line_items?.length
                            ? inv.line_items.map((item) => item.solution_label || item.solution_type || "Service").filter(Boolean).join(", ")
                            : "",
                        ].filter(Boolean).join(" · ")
                      }>
                        {inv.invoice_number}
                        {inv.due_date && <> · {inv.due_date}</>}
                        {inv.line_items && inv.line_items.length > 0 && (
                          <> · {inv.line_items.map((item) => item.solution_label || item.solution_type || "Service").filter(Boolean).join(", ")}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-0.5">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                        {new Intl.NumberFormat("en-AU", {
                          style: "currency",
                          currency: "AUD",
                        }).format(Number(inv.total_amount || 0))}
                      </p>
                      <select
                        value={inv.status || "Generated"}
                        onChange={(e) =>
                          updateStatus(inv.invoice_number, e.target.value)
                        }
                        className="text-[11px] border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      >
                        <option value="Generated">Generated</option>
                        <option value="Sent">Sent</option>
                        <option value="Paid">Paid</option>
                      </select>
                      {inv.invoice_file_id && (
                        <a
                          href={`https://drive.google.com/file/d/${inv.invoice_file_id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          View invoice
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calculate 1 month savings modal */}
        {calculateModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
            onClick={() => !calculateLoading && (setCalculateModalOpen(false), setEditedDetailValues({ pre: {}, post: {} }))}
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-5xl max-h-[90vh] flex flex-col mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Calculate 1 month savings
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Uses Member ACES Data sheet for the selected utility and agreement start month.
                </p>
              </div>
              <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Utility (linked)
                  </label>
                  <select
                    value={calculateOption}
                    onChange={(e) => setCalculateOption(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select utility</option>
                    {linkedUtilityOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {linkedUtilityOptions.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      No linked utilities. Add them via Business Info / LOA.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Agreement start month
                  </label>
                  <input
                    type="month"
                    value={calculateAgreementMonth}
                    onChange={(e) => setCalculateAgreementMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    e.g. 2026-01 → compares Dec 2025 vs Jan 2026
                  </p>
                </div>
                {calculateResult && (
                  <div className={`rounded-lg px-3 py-2 text-sm ${calculateResult.success ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"}`}>
                    {calculateResult.success ? (
                      <>
                        {(() => {
                          const pre = calculateResult.pre_row_detail ?? [];
                          const post = calculateResult.post_row_detail ?? [];
                          const totalHeader = pre.find((x) => (x.header || "").toLowerCase().includes("total invoice cost"))?.header ?? post.find((x) => (x.header || "").toLowerCase().includes("total invoice cost"))?.header;
                          const preTotalFromEdited = totalHeader && editedDetailValues.pre[totalHeader] != null && editedDetailValues.pre[totalHeader] !== "" ? parseFloat(String(editedDetailValues.pre[totalHeader]).replace(/,/g, "")) : NaN;
                          const postTotalFromEdited = totalHeader && editedDetailValues.post[totalHeader] != null && editedDetailValues.post[totalHeader] !== "" ? parseFloat(String(editedDetailValues.post[totalHeader]).replace(/,/g, "")) : NaN;
                          const preTotal = Number.isFinite(preTotalFromEdited) ? preTotalFromEdited : (calculateResult.pre_period_total ?? 0);
                          const postTotal = Number.isFinite(postTotalFromEdited) ? postTotalFromEdited : (calculateResult.post_period_total ?? 0);
                          const savings = preTotal - postTotal;
                          return (
                            <>
                              <p className="font-semibold">
                                1 month savings: {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(savings)}
                              </p>
                              <p className="text-xs mt-0.5">
                                Pre ({calculateResult.pre_period_label}): {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(preTotal)} → Post ({calculateResult.post_period_label}): {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(postTotal)}
                              </p>
                            </>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => setCalculateDetailsExpanded((e) => !e)}
                          className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                        >
                          {calculateDetailsExpanded ? "Hide details" : "Expand details"}
                        </button>
                        {calculateDetailsExpanded && (calculateResult.pre_row_detail?.length || calculateResult.post_row_detail?.length) ? (
                          <div className="mt-3 pt-3 border-t border-emerald-200/50 dark:border-emerald-700/50 space-y-3">
                            <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                              Pre vs Post – usage, rates and charges
                            </p>
                            <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                              <table className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded">
                                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
                                  <tr>
                                    <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Field</th>
                                    <th className="text-right px-2 py-1.5 font-medium whitespace-nowrap">Pre ({calculateResult.pre_period_label})</th>
                                    <th className="text-right px-2 py-1.5 font-medium whitespace-nowrap">Post ({calculateResult.post_period_label})</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const pre = calculateResult.pre_row_detail ?? [];
                                    const post = calculateResult.post_row_detail ?? [];
                                    const len = Math.max(pre.length, post.length);
                                    const rows: { header: string; preVal: unknown; postVal: unknown }[] = [];
                                    for (let i = 0; i < len; i++) {
                                      const h = (pre[i]?.header ?? post[i]?.header ?? `Col ${i + 1}`).trim() || `Col ${i + 1}`;
                                      const pV = pre[i]?.value ?? "";
                                      const pP = post[i]?.value ?? "";
                                      rows.push({ header: h, preVal: pV, postVal: pP });
                                    }
                                    const isEmpty = (v: unknown) => v === "" || v == null || String(v).trim() === "";
                                    const filteredRows = rows.filter((r) => !isEmpty(r.preVal) || !isEmpty(r.postVal));
                                    const formatCell = (val: unknown, isNum: boolean): string => {
                                      if (isEmpty(val)) return "—";
                                      const s = String(val);
                                      if (isNum && !Number.isNaN(parseFloat(s.replace(/,/g, "")))) {
                                        const n = typeof val === "number" ? val : parseFloat(s.replace(/,/g, ""));
                                        return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 4 }).format(n);
                                      }
                                      return s;
                                    };
                                    return filteredRows.map((r, i) => {
                                      const preStr = r.preVal !== "" && r.preVal != null ? String(r.preVal) : "—";
                                      const postStr = r.postVal !== "" && r.postVal != null ? String(r.postVal) : "—";
                                      const isNum = typeof r.preVal === "number" || typeof r.postVal === "number" || /^-?[\d,.]+$/.test(preStr) || /^-?[\d,.]+$/.test(postStr);
                                      const preDisplay = editedDetailValues.pre[r.header] !== undefined ? editedDetailValues.pre[r.header] : formatCell(r.preVal, isNum);
                                      const postDisplay = editedDetailValues.post[r.header] !== undefined ? editedDetailValues.post[r.header] : formatCell(r.postVal, isNum);
                                      const diff = preDisplay !== postDisplay;
                                      return (
                                        <tr
                                          key={i}
                                          className={`border-t border-gray-200 dark:border-gray-600 ${diff ? "bg-amber-50/70 dark:bg-amber-900/20" : ""}`}
                                        >
                                          <td className="px-2 py-1 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.header}</td>
                                          <td className="px-2 py-0.5 text-right">
                                            <input
                                              type="text"
                                              value={preDisplay}
                                              onChange={(e) => setEditedDetailValues((prev) => ({ ...prev, pre: { ...prev.pre, [r.header]: e.target.value } }))}
                                              className="w-full min-w-[6rem] text-right text-xs px-1.5 py-0.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            />
                                          </td>
                                          <td className="px-2 py-0.5 text-right">
                                            <input
                                              type="text"
                                              value={postDisplay}
                                              onChange={(e) => setEditedDetailValues((prev) => ({ ...prev, post: { ...prev.post, [r.header]: e.target.value } }))}
                                              className="w-full min-w-[6rem] text-right text-xs px-1.5 py-0.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            />
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                            <p className="text-[11px] text-gray-500">
                              Rows where both Pre and Post are empty are hidden. You can edit any cell to correct the data; changing the total row updates the summary above.
                            </p>
                          </div>
                        ) : calculateDetailsExpanded && (calculateResult.pre_rows?.length || calculateResult.post_rows?.length) ? (
                          <div className="mt-3 pt-3 border-t border-emerald-200/50 dark:border-emerald-700/50 space-y-3">
                            {calculateResult.pre_rows && calculateResult.pre_rows.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                                  Pre-period invoices ({calculateResult.pre_period_label})
                                </p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded">
                                    <thead>
                                      <tr className="bg-gray-100 dark:bg-gray-800">
                                        <th className="text-left px-2 py-1 font-medium">Invoice period</th>
                                        <th className="text-right px-2 py-1 font-medium">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {calculateResult.pre_rows.map((row, i) => (
                                        <tr key={`pre-${i}`} className="border-t border-gray-200 dark:border-gray-600">
                                          <td className="px-2 py-1">{row.period}</td>
                                          <td className="px-2 py-1 text-right">{new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(row.total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {calculateResult.post_rows && calculateResult.post_rows.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                                  Post-period invoices ({calculateResult.post_period_label})
                                </p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded">
                                    <thead>
                                      <tr className="bg-gray-100 dark:bg-gray-800">
                                        <th className="text-left px-2 py-1 font-medium">Invoice period</th>
                                        <th className="text-right px-2 py-1 font-medium">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {calculateResult.post_rows.map((row, i) => (
                                        <tr key={`post-${i}`} className="border-t border-gray-200 dark:border-gray-600">
                                          <td className="px-2 py-1">{row.period}</td>
                                          <td className="px-2 py-1 text-right">{new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(row.total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : calculateDetailsExpanded ? (
                          <p className="mt-2 text-xs text-gray-500">No row-level details returned.</p>
                        ) : null}
                      </>
                    ) : (
                      <p>{calculateResult.error ?? "Calculation failed"}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => !calculateLoading && (setCalculateModalOpen(false), setEditedDetailValues({ pre: {}, post: {} }))}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                {calculateResult?.success && (
                  <button
                    type="button"
                    onClick={openTestimonialsTab}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-white hover:opacity-90"
                  >
                    Generate Testimonial
                  </button>
                )}
                <button
                  type="button"
                  onClick={runCalculate}
                  disabled={!calculateOption || !calculateAgreementMonth || calculateLoading}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50"
                >
                  {calculateLoading ? "Calculating…" : "Calculate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

