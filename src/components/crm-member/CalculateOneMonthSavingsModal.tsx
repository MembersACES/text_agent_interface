"use client";

import React, { useEffect, useMemo, useState } from "react";

const UTILITY_SHEET_MAP: Record<string, string> = {
  "C&I Electricity": "C&I Electricity",
  "SME Electricity": "SME Electricity",
  "C&I Gas": "C&I Gas",
  "SME Gas": "SME Gas",
  "Small Gas": "SME Gas",
  Waste: "Waste",
  Oil: "Oil",
};

const SHEET_CONFIG_KEYS = ["C&I Electricity", "SME Electricity", "C&I Gas", "SME Gas", "Waste", "Oil"];

export interface CalculateResult {
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
}

export interface LinkedUtilityOption {
  value: string;
  utilityType: string;
  identifier: string;
  label: string;
}

export interface CalculateOneMonthSavingsModalProps {
  businessInfo: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called when user clicks "Generate Testimonial"; receives current result and selected option value so parent can call generate API */
  onGenerateTestimonial: (result: CalculateResult, optionValue: string) => void;
  /** When provided and calculation succeeded, show "Generate invoice" button that opens 1st Month Savings with prefilled line */
  onOpenInvoiceWithResult?: (result: CalculateResult, optionValue: string) => void;
  /** When modal opens, set utility dropdown to this value */
  initialOption?: string;
  /** When modal opens, set agreement month to this value */
  initialAgreementMonth?: string;
}

export function CalculateOneMonthSavingsModal({
  businessInfo,
  isOpen,
  onClose,
  onGenerateTestimonial,
  onOpenInvoiceWithResult,
  initialOption = "",
  initialAgreementMonth = "",
}: CalculateOneMonthSavingsModalProps) {
  const linkedUtilityOptions = useMemo(() => {
    const linked = (businessInfo as any)?.Linked_Details?.linked_utilities as Record<string, string | string[]> | undefined;
    if (!linked) return [];
    const options: LinkedUtilityOption[] = [];
    for (const [key, val] of Object.entries(linked)) {
      const sheetType = UTILITY_SHEET_MAP[key] || key;
      if (!SHEET_CONFIG_KEYS.includes(sheetType)) continue;
      const ids = typeof val === "string" ? val.split(",").map((s) => s.trim()).filter(Boolean) : Array.isArray(val) ? val : [];
      ids.forEach((id) => {
        const value = `${sheetType}::${String(id).trim()}`;
        options.push({ value, utilityType: sheetType, identifier: String(id).trim(), label: `${key} – ${id}` });
      });
    }
    return options;
  }, [businessInfo]);

  const [calculateOption, setCalculateOption] = useState("");
  const [calculateAgreementMonth, setCalculateAgreementMonth] = useState("");
  const [calculateLoading, setCalculateLoading] = useState(false);
  const [calculateResult, setCalculateResult] = useState<CalculateResult | null>(null);
  const [calculateDetailsExpanded, setCalculateDetailsExpanded] = useState(false);
  const [editedDetailValues, setEditedDetailValues] = useState<{ pre: Record<string, string>; post: Record<string, string> }>({ pre: {}, post: {} });

  useEffect(() => {
    if (isOpen) {
      setCalculateOption(initialOption);
      setCalculateAgreementMonth(initialAgreementMonth);
      setCalculateResult(null);
      setCalculateDetailsExpanded(false);
      setEditedDetailValues({ pre: {}, post: {} });
    }
  }, [isOpen, initialOption, initialAgreementMonth]);

  const businessName: string = (businessInfo as any)?.business_details?.name ?? "";

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

  const handleClose = () => {
    if (!calculateLoading) {
      setEditedDetailValues({ pre: {}, post: {} });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={handleClose}
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
            onClick={handleClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          {calculateResult?.success && (
            <button
              type="button"
              onClick={() => onGenerateTestimonial(calculateResult, calculateOption)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-white hover:opacity-90"
            >
              Generate Testimonial
            </button>
          )}
          {calculateResult?.success && onOpenInvoiceWithResult && (
            <button
              type="button"
              onClick={() => onOpenInvoiceWithResult(calculateResult, calculateOption)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:opacity-90"
            >
              Generate invoice
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
  );
}
