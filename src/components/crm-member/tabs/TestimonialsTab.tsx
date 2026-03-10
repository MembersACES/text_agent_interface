"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  CalculateOneMonthSavingsModal,
  type CalculateResult,
} from "@/components/crm-member/CalculateOneMonthSavingsModal";
import { SOLUTION_TYPE_LABELS } from "@/lib/testimonial-solution-content";

export interface TestimonialItem {
  id: number;
  business_name: string;
  file_name: string;
  file_id: string;
  invoice_number: string | null;
  status: string;
   testimonial_type?: string | null;
   testimonial_solution_type_id?: string | null;
   testimonial_savings?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsInvoiceSummary {
  invoice_number: string;
  business_name: string;
  due_date?: string;
  total_amount?: number;
  status?: string;
}

export interface TestimonialsTabProps {
  businessInfo: Record<string, unknown> | null;
}

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

const UTILITY_SHEET_MAP: Record<string, string> = {
  "C&I Electricity": "C&I Electricity",
  "SME Electricity": "SME Electricity",
  "C&I Gas": "C&I Gas",
  "SME Gas": "SME Gas",
  "Small Gas": "SME Gas",
  Waste: "Waste",
  Oil: "Oil",
};

const UTILITY_TO_SOLUTION_TYPE: Record<string, string> = {
  "C&I Electricity": "ci_electricity",
  "SME Electricity": "sme_electricity",
  "C&I Gas": "ci_gas",
  "SME Gas": "sme_gas",
  Waste: "waste",
  Oil: "resource_recovery",
};

const SHEET_CONFIG_KEYS = ["C&I Electricity", "SME Electricity", "C&I Gas", "SME Gas", "Waste", "Oil"];

const openBtn =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium " +
  "text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 " +
  "transition-colors shrink-0";

export function TestimonialsTab({ businessInfo }: TestimonialsTabProps) {
  const biz = (businessInfo as any)?.business_details ?? {};
  const contact = (businessInfo as any)?.contact_information ?? {};
  const rep = (businessInfo as any)?.representative_details ?? {};
  const driveUrl = (businessInfo as any)?.gdrive?.folder_url as string | undefined;
  const businessName: string = biz?.name ?? "";
  const tradingName: string = biz?.trading_name ?? "";
  const postalAddress: string | undefined = contact?.postal_address;
  const siteAddress: string | undefined = contact?.site_address;

  const linkedUtilityOptions = useMemo(() => {
    const linked = (businessInfo as any)?.Linked_Details?.linked_utilities as Record<string, string | string[]> | undefined;
    if (!linked) return [];
    const options: { value: string; utilityType: string; identifier: string; label: string }[] = [];
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

  const [calculateModalOpen, setCalculateModalOpen] = useState(false);
  const [list, setList] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadInvoiceNumber, setUploadInvoiceNumber] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<string>("Draft");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>("");
  const [invoices, setInvoices] = useState<SavingsInvoiceSummary[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [uploadSolutionTypeId, setUploadSolutionTypeId] = useState<string>("");
  const [uploadCustomType, setUploadCustomType] = useState<string>("");
  const [uploadSavingsText, setUploadSavingsText] = useState<string>("");
  const [showQuickGenerate, setShowQuickGenerate] = useState(false);
  const [quickSolutionTypeId, setQuickSolutionTypeId] = useState<string>("");
  const [quickSavingsText, setQuickSavingsText] = useState<string>("");
  const [quickGenerating, setQuickGenerating] = useState(false);
  const { showToast } = useToast();

  const fetchTestimonials = useCallback(async () => {
    if (!businessName) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/testimonials?business_name=${encodeURIComponent(businessName)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load testimonials");
      }
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Could not load testimonials.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [businessName]);

  useEffect(() => {
    if (!businessName) return;
    fetchTestimonials();
  }, [businessName, fetchTestimonials]);

  useEffect(() => {
    if (!businessName || !showModal) return;
    setInvoicesLoading(true);
    fetch("/api/one-month-savings/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_name: businessName }),
    })
      .then((r) => r.ok ? r.json() : { invoices: [] })
      .then((data) => setInvoices(Array.isArray(data?.invoices) ? data.invoices : []))
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false));
  }, [businessName, showModal]);

  const handleUpload = async () => {
    const file = uploadFile ?? uploadFileInputRef.current?.files?.[0] ?? null;
    if (!file || !businessName) {
      setUploadResult("Please select a file.");
      return;
    }
    const fn = file.name.toLowerCase();
    if (![".pdf", ".docx", ".doc"].some((e) => fn.endsWith(e))) {
      setUploadResult("Please upload a PDF or Word file.");
      return;
    }
    setUploading(true);
    setUploadResult("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("business_name", businessName);
      form.append("status", uploadStatus);
      if (uploadInvoiceNumber.trim()) form.append("invoice_number", uploadInvoiceNumber.trim());
      if (driveUrl?.trim()) form.append("gdrive_folder_url", driveUrl.trim());
      if (uploadSolutionTypeId && uploadSolutionTypeId !== "custom") {
        form.append("testimonial_solution_type_id", uploadSolutionTypeId);
        const label = SOLUTION_TYPE_LABELS[uploadSolutionTypeId] ?? uploadSolutionTypeId;
        form.append("testimonial_type", label);
      } else if (uploadSolutionTypeId === "custom" && uploadCustomType.trim()) {
        form.append("testimonial_type", uploadCustomType.trim());
      }
      if (uploadSavingsText.trim()) {
        form.append("testimonial_savings", uploadSavingsText.trim());
      }
      const res = await fetch("/api/testimonials/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadResult(data.error || "Upload failed");
        showToast(data.error || "Upload failed", "error");
        return;
      }
      setUploadResult("Testimonial uploaded successfully.");
      showToast("Testimonial uploaded successfully.", "success");
      fetchTestimonials();
      setTimeout(() => {
        setShowModal(false);
        setUploadFile(null);
        setUploadInvoiceNumber("");
        setUploadStatus("Draft");
        setUploadResult("");
        setUploadSolutionTypeId("");
        setUploadCustomType("");
        setUploadSavingsText("");
      }, 1500);
    } catch (e: any) {
      setUploadResult(e.message || "Upload failed");
      showToast(e.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setList((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
        showToast("Status updated.", "success");
      }
    } catch {
      showToast("Failed to update status.", "error");
    }
  };

  const driveFileUrl = (fileId: string) => `https://drive.google.com/file/d/${fileId}/view`;

  const openOneMonthSavingsWithCalculatedLine = (result: CalculateResult, optionValue: string) => {
    if (!businessName || !result?.success || result.savings_amount == null) return;
    const opt = linkedUtilityOptions.find((o) => o.value === optionValue);
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
    params.set("savingsAmount", String(result.savings_amount));
    params.set("solutionType", UTILITY_TO_SOLUTION_TYPE[opt.utilityType] || opt.utilityType.replace(/\s+/g, "_").toLowerCase());
    params.set("solutionLabel", opt.utilityType + " Reviews");
    window.open(`/one-month-savings?${params.toString()}`, "_blank");
    setCalculateModalOpen(false);
  };

  const handleGenerateTestimonial = async (result: CalculateResult, optionValue: string) => {
    const opt = linkedUtilityOptions.find((o) => o.value === optionValue);
    if (!opt || !result?.success || result.savings_amount == null) return;
    const solutionTypeId = UTILITY_TO_SOLUTION_TYPE[opt.utilityType] ?? opt.utilityType.replace(/\s+/g, "_").toLowerCase();
    try {
      const res = await fetch("/api/testimonials/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          trading_as: tradingName || undefined,
          contact_name: rep.contact_name || undefined,
          position: rep.position || undefined,
          email: contact.email || undefined,
          telephone: contact.telephone || undefined,
          client_folder_url: driveUrl || undefined,
          solution_type: solutionTypeId,
          savings_amount: result.savings_amount,
          abn: biz.abn || undefined,
          postal_address: postalAddress || undefined,
          site_address: siteAddress || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to generate testimonial", "error");
        return;
      }
      if (data.document_link) window.open(data.document_link, "_blank");
      showToast(data.message || "Testimonial generated.", "success");
      setCalculateModalOpen(false);
      fetchTestimonials();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to generate testimonial", "error");
    }
  };

  const handleQuickGenerate = async () => {
    if (!businessName || !quickSolutionTypeId) return;
    const savingsVal = quickSavingsText.trim()
      ? Number.parseFloat(quickSavingsText.trim().replace(/[^0-9.-]+/g, ""))
      : 0;
    setQuickGenerating(true);
    try {
      const res = await fetch("/api/testimonials/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          trading_as: tradingName || undefined,
          contact_name: rep.contact_name || undefined,
          position: rep.position || undefined,
          email: contact.email || undefined,
          telephone: contact.telephone || undefined,
          client_folder_url: driveUrl || undefined,
          solution_type: quickSolutionTypeId,
          savings_amount: Number.isFinite(savingsVal) ? savingsVal : 0,
          abn: biz.abn || undefined,
          postal_address: postalAddress || undefined,
          site_address: siteAddress || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to generate testimonial", "error");
        return;
      }
      if (data.document_link) window.open(data.document_link, "_blank");
      showToast(data.message || "Testimonial generated.", "success");
      setShowQuickGenerate(false);
      setQuickSolutionTypeId("");
      setQuickSavingsText("");
      fetchTestimonials();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to generate testimonial", "error");
    } finally {
      setQuickGenerating(false);
    }
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Testimonials
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Member testimonials (e.g. 1-page savings confirmation). Optionally link to a 1st Month Savings invoice.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCalculateModalOpen(true)}
              disabled={linkedUtilityOptions.length === 0}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              title={linkedUtilityOptions.length === 0 ? "Link utilities in Business Info first" : "Calculate from Member ACES Data sheet, then generate testimonial"}
            >
              <IconCalculator />
              Calculate 1 month savings
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuickGenerate(true);
                setQuickSolutionTypeId("");
                setQuickSavingsText("");
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <IconPlus />
              Generate testimonial (no calc)
            </button>
            <button
              type="button"
              onClick={() => {
                setShowModal(true);
                setUploadFile(null);
                setUploadInvoiceNumber("");
                setUploadStatus("Draft");
                setUploadResult("");
                setUploadSolutionTypeId("");
                setUploadCustomType("");
                setUploadSavingsText("");
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <IconPlus />
              Upload testimonial
            </button>
          </div>
        </div>

        {!businessName ? (
          <p className="text-sm text-gray-400">
            Business name not loaded yet. Check that Business Info has been fetched.
          </p>
        ) : loading ? (
          <p className="text-sm text-gray-400">Loading testimonials...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-400">
            No testimonials yet. Upload one to record member approval of savings before invoicing.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {list.map((t) => (
              <div
                key={t.id}
                className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate" title={t.file_name}>
                    {t.file_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.created_at
                      ? new Date(t.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" })
                      : ""}
                    {t.invoice_number ? ` · Linked invoice: ${t.invoice_number}` : ""}
                    {t.testimonial_type ? ` · ${t.testimonial_type}` : ""}
                    {t.testimonial_savings ? ` · Savings: ${t.testimonial_savings}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value)}
                    className="text-[11px] border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent for approval">Sent for approval</option>
                    <option value="Approved">Approved</option>
                  </select>
                  <a
                    href={driveFileUrl(t.file_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={openBtn}
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Quick generate testimonial modal (no 1st Month Savings calc) */}
      {showQuickGenerate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
          onClick={() => {
            if (!quickGenerating) {
              setShowQuickGenerate(false);
              setQuickSolutionTypeId("");
              setQuickSavingsText("");
            }
          }}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Generate testimonial
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Choose a testimonial type and optional savings amount to generate a testimonial
                without running the 1st Month Savings calculator.
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Testimonial type
                </p>
                <select
                  value={quickSolutionTypeId}
                  onChange={(e) => setQuickSolutionTypeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select testimonial type</option>
                  {Object.entries(SOLUTION_TYPE_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Any savings (optional)
                </p>
                <input
                  type="text"
                  value={quickSavingsText}
                  onChange={(e) => setQuickSavingsText(e.target.value)}
                  placeholder="e.g. 1200 or $1,200 per month"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!quickGenerating) {
                    setShowQuickGenerate(false);
                    setQuickSolutionTypeId("");
                    setQuickSavingsText("");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickGenerate}
                disabled={!quickSolutionTypeId || quickGenerating}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-40"
              >
                {quickGenerating ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
          onClick={() => {
            if (!uploading) {
              setShowModal(false);
              setUploadFile(null);
              setUploadInvoiceNumber("");
              setUploadStatus("Draft");
              setUploadResult("");
              setUploadSolutionTypeId("");
              setUploadCustomType("");
              setUploadSavingsText("");
            }
          }}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Upload testimonial</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">File (PDF or Word)</p>
                <input
                  ref={uploadFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0];
                    setUploadFile(chosen ?? null);
                  }}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200"
                />
                {uploadFile && <p className="mt-1 text-[11px] text-gray-400 truncate">{uploadFile.name}</p>}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Link to 1st Month Savings invoice (optional)</p>
                <select
                  value={uploadInvoiceNumber}
                  onChange={(e) => setUploadInvoiceNumber(e.target.value)}
                  disabled={invoicesLoading}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="">None</option>
                  {invoices.map((inv) => (
                    <option key={inv.invoice_number} value={inv.invoice_number}>
                      {inv.invoice_number}
                      {inv.due_date ? ` · ${inv.due_date}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
                <select
                  value={uploadStatus}
                  onChange={(e) => setUploadStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent for approval">Sent for approval</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Testimonial type
                </p>
                <select
                  value={uploadSolutionTypeId}
                  onChange={(e) => setUploadSolutionTypeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select testimonial type (optional)</option>
                  {Object.entries(SOLUTION_TYPE_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                  <option value="custom">Other / non-match testimonial (custom)</option>
                </select>
                {uploadSolutionTypeId === "custom" && (
                  <input
                    type="text"
                    value={uploadCustomType}
                    onChange={(e) => setUploadCustomType(e.target.value)}
                    placeholder="Describe the testimonial type (e.g. LED upgrade case study)"
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                  />
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Any savings (optional)
                </p>
                <input
                  type="text"
                  value={uploadSavingsText}
                  onChange={(e) => setUploadSavingsText(e.target.value)}
                  placeholder="e.g. $3,200 per month, 18% reduction"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                />
              </div>
              {uploadResult && (
                <p
                  className={`text-xs rounded-lg px-3 py-2 ${
                    uploadResult.includes("success")
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  }`}
                >
                  {uploadResult}
                </p>
              )}
              {!driveUrl?.trim() && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No client Drive folder set. Set TESTIMONIAL_STORAGE_FOLDER_ID on the backend or add a Drive folder to this member.
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!uploading) {
                    setShowModal(false);
                    setUploadFile(null);
                    setUploadInvoiceNumber("");
                    setUploadStatus("Draft");
                    setUploadResult("");
                    setUploadSolutionTypeId("");
                    setUploadCustomType("");
                    setUploadSavingsText("");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-40"
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CalculateOneMonthSavingsModal
        businessInfo={businessInfo}
        isOpen={calculateModalOpen}
        onClose={() => setCalculateModalOpen(false)}
        onGenerateTestimonial={handleGenerateTestimonial}
        onOpenInvoiceWithResult={openOneMonthSavingsWithCalculatedLine}
        initialOption={linkedUtilityOptions[0]?.value ?? ""}
        initialAgreementMonth=""
      />
    </Card>
  );
}
