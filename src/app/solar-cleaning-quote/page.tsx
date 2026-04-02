"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { getApiBaseUrl } from "@/lib/utils";

type StaffUser = { id: number; email: string; name?: string; full_name?: string };

function todayDDMMYYYY(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatAudDisplay(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

/**
 * Google Docs API requires replaceText to be a string — never pass raw numbers from n8n.
 * Use these fields in your Replace / batchUpdate nodes (maps to $[AMT_*] row values).
 */
function formatSolarAmountForGoogleDoc(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(n);
}

/** Discount row: negative currency string (matches EasyNRG template discount line). */
function formatSolarDiscountForGoogleDoc(discountPositive: number): string {
  if (!Number.isFinite(discountPositive)) return "$0.00";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(-Math.abs(discountPositive));
}

/** Strip null/None-like tokens; merge optional second line only if real. */
function cleanSiteAddressPart(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (!s || /^none$/i.test(s) || /^null$/i.test(s)) return "";
  return s;
}

function mergeSiteAddressForForm(street: unknown, suburb: unknown): string {
  const a = cleanSiteAddressPart(street);
  const b = cleanSiteAddressPart(suburb);
  if (a && b) return `${a}, ${b}`;
  return a || b;
}

async function pdfFileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

interface AppliedFields {
  quote_number: string;
  quote_date: string;
  client_name: string;
  street_address: string;
  suburb_state_postcode: string;
  panel_qty: string;
  system_kw: string;
  site_name: string;
  contact_name: string;
  amount_cleaning_ex_gst: number;
  amount_discount: number;
  amount_subtotal_ex_gst: number;
  amount_gst: number;
  amount_total_inc_gst: number;
}

interface ExtractApiResult {
  success: boolean;
  error?: string;
  extraction_warnings?: string[];
  applied_fields?: AppliedFields;
}

interface GenerateResult {
  success?: boolean;
  quote_google_doc_id?: string;
  quote_doc_url?: string;
  quote_pdf_file_id?: string;
  quote_pdf_url?: string;
  folder_id?: string;
  tcs_master_doc_id?: string;
  vendor_quote_file_id?: string;
  extraction_warnings?: string[];
  applied_fields?: AppliedFields;
  error?: string;
}

export default function SolarCleaningQuotePage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [clientId, setClientId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [clientFolderUrl, setClientFolderUrl] = useState("");

  const [quoteNumber, setQuoteNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [quoteDate, setQuoteDate] = useState(todayDDMMYYYY);
  const [panelQty, setPanelQty] = useState("");
  const [systemKw, setSystemKw] = useState("");
  const [siteName, setSiteName] = useState("");
  const [contactName, setContactName] = useState("");

  /** Supplier quote figures (from PDF or typed). */
  const [supplierSubtotalExGst, setSupplierSubtotalExGst] = useState("");
  const [supplierGst, setSupplierGst] = useState("");
  const [supplierTotalIncGst, setSupplierTotalIncGst] = useState("");
  /** EasyNRG: sell before discount = base × multiplier; then member discount %. */
  const [markupMultiplier, setMarkupMultiplier] = useState("3");
  const [discountPercent, setDiscountPercent] = useState("33");

  const [pvNote, setPvNote] = useState("TBC — confirmed upon acceptance");
  const [vendorPdfFile, setVendorPdfFile] = useState<File | null>(null);
  /** When false, the vendor PDF is required and quote fields are read from it on the server. */
  const [manualEntry, setManualEntry] = useState(false);

  const [pdfParseLoading, setPdfParseLoading] = useState(false);
  const [pdfParseBanner, setPdfParseBanner] = useState<string | null>(null);
  const [pdfParseError, setPdfParseError] = useState<string | null>(null);
  const [vendorPdfObjectUrl, setVendorPdfObjectUrl] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendName, setSendName] = useState("");
  const [sendEmail, setSendEmail] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [ccSelected, setCcSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const bn = searchParams.get("businessName") || "";
    const em = searchParams.get("email") || "";
    const cn = searchParams.get("contactName") || "";
    const folder = searchParams.get("clientFolderUrl") || "";
    const cid = searchParams.get("clientId") || "";
    const site = searchParams.get("siteAddress") || "";

    if (bn) setBusinessName(bn);
    if (folder) setClientFolderUrl(folder);
    if (cid) setClientId(cid);

    setClientName((prev) => (prev ? prev : bn || ""));
    setSiteAddress((prev) => (prev ? prev : site.trim()));
    setSiteName((prev) => (prev ? prev : bn || ""));
    setContactName((prev) => (prev ? prev : cn));
    setSendEmail((prev) => (prev ? prev : em));
    setSendName((prev) => (prev ? prev : cn || bn || ""));
  }, [searchParams]);

  useEffect(() => {
    if (businessName && quoteNumber) {
      setSendSubject(
        `EasyNRG solar panel cleaning quote ${quoteNumber} – ${businessName}`
      );
    }
  }, [businessName, quoteNumber]);

  const parseMoney = (s: string): number => {
    const t = s.replace(/[$,\s]/g, "").trim();
    if (!t) return 0;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : 0;
  };

  const eazyNrgPricing = useMemo(() => {
    const base = parseMoney(supplierSubtotalExGst);
    const mult = Number.parseFloat(markupMultiplier.replace(",", ".").trim());
    const discPct = Number.parseFloat(discountPercent.replace(",", ".").trim());
    if (!(base > 0) || !(mult > 0) || !Number.isFinite(discPct) || discPct < 0) {
      return null;
    }
    const sellBefore = roundMoney2(base * mult);
    const discVal = roundMoney2(sellBefore * (discPct / 100));
    const sellEx = roundMoney2(sellBefore - discVal);
    const gst = roundMoney2(sellEx * 0.1);
    const total = roundMoney2(sellEx + gst);
    const markupPct = roundMoney2((mult - 1) * 100);
    return { base, mult, sellBefore, discPct, discVal, sellEx, gst, total, markupPct };
  }, [supplierSubtotalExGst, markupMultiplier, discountPercent]);

  const supplierGstLooksWrong = useMemo(() => {
    const sub = parseMoney(supplierSubtotalExGst);
    const gst = parseMoney(supplierGst);
    if (!(sub > 0) || !(gst > 0)) return false;
    const expected = roundMoney2(sub * 0.1);
    return Math.abs(gst - expected) > 0.06;
  }, [supplierSubtotalExGst, supplierGst]);

  const fetchStaff = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setStaffUsers(data as StaffUser[]);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (sendModalOpen) fetchStaff();
  }, [sendModalOpen, fetchStaff]);

  const buildEmailHtml = () => {
    const qn = quoteNumber || "—";
    const bn = businessName || clientName || "your organisation";
    return [
      `<p>Hi ${sendName || "there"},</p>`,
      `<p>Please find attached your EasyNRG solar panel cleaning quotation <strong>${qn}</strong> for <strong>${bn}</strong>.</p>`,
      `<p>Terms and conditions are provided separately and will be referenced when you accept.</p>`,
      `<p>If you have any questions, please reply to this email.</p>`,
      `<p>Kind regards,<br/>ACES / EasyNRG</p>`,
    ].join("");
  };

  const applyAppliedFieldsToForm = useCallback(
    (af: AppliedFields, opts?: { fillSupplierFromPdf?: boolean }) => {
      setQuoteNumber(af.quote_number || "");
      setQuoteDate(af.quote_date || todayDDMMYYYY());
      setClientName(af.client_name || "");
      setSiteAddress(mergeSiteAddressForForm(af.street_address, af.suburb_state_postcode));
      setPanelQty(af.panel_qty || "");
      setSystemKw(af.system_kw || "");
      setSiteName(af.site_name || "");
      setContactName(af.contact_name || "");
      if (opts?.fillSupplierFromPdf) {
        const fmt = (n: number) =>
          typeof n === "number" && Number.isFinite(n) ? String(n) : "";
        const sub = fmt(af.amount_subtotal_ex_gst) || fmt(af.amount_cleaning_ex_gst);
        if (sub) setSupplierSubtotalExGst(sub);
        const g = fmt(af.amount_gst);
        if (g) setSupplierGst(g);
        const tot = fmt(af.amount_total_inc_gst);
        if (tot) setSupplierTotalIncGst(tot);
      }
    },
    []
  );

  /** Latest CRM/merge fields for extract — ref keeps runPdfExtract stable so typing does not retrigger auto-extract. */
  const extractMergeFieldsRef = useRef({
    businessName: "",
    clientName: "",
    siteAddress: "",
    contactName: "",
    siteName: "",
    clientFolderUrl: "",
  });
  extractMergeFieldsRef.current = {
    businessName,
    clientName,
    siteAddress,
    contactName,
    siteName,
    clientFolderUrl,
  };

  const runPdfExtract = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setPdfParseError("Please choose a PDF file.");
        setPdfParseBanner(null);
        return;
      }
      setPdfParseLoading(true);
      setPdfParseError(null);
      setPdfParseBanner(null);
      try {
        const m = extractMergeFieldsRef.current;
        const source_pdf_base64 = await pdfFileToBase64(file);
        const res = await fetch("/api/solar-cleaning-quote/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_pdf_base64,
            source_pdf_filename: file.name,
            business_name: m.businessName.trim() || null,
            client_name: m.clientName.trim() || null,
            street_address: m.siteAddress.trim() || null,
            suburb_state_postcode: null,
            contact_name: m.contactName.trim() || null,
            site_name: m.siteName.trim() || null,
            client_folder_url: m.clientFolderUrl.trim() || null,
          }),
        });
        const data = (await res.json()) as ExtractApiResult & { error?: string };
        if (!res.ok) {
          setPdfParseError(data.error || "Could not parse PDF");
          return;
        }
        if (!data.success) {
          setPdfParseError(data.error || "Could not parse PDF");
          return;
        }
        if (data.applied_fields) {
          applyAppliedFieldsToForm(data.applied_fields, { fillSupplierFromPdf: true });
        }
        const warns = (data.extraction_warnings || []).filter(Boolean);
        setPdfParseBanner(
          warns.length > 0 ?
            warns.join(" ") :
            "Values loaded from the PDF. Review and edit the fields below, then click Generate."
        );
      } catch (e: unknown) {
        setPdfParseError(e instanceof Error ? e.message : "Parse failed");
      } finally {
        setPdfParseLoading(false);
      }
    },
    [applyAppliedFieldsToForm]
  );

  useEffect(() => {
    if (!vendorPdfFile) {
      setPdfParseBanner(null);
      setPdfParseError(null);
    }
  }, [vendorPdfFile]);

  useEffect(() => {
    if (!vendorPdfFile) {
      setVendorPdfObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(vendorPdfFile);
    setVendorPdfObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [vendorPdfFile]);

  useEffect(() => {
    if (manualEntry || !vendorPdfFile || vendorPdfFile.type !== "application/pdf") {
      return;
    }
    const t = window.setTimeout(() => {
      void runPdfExtract(vendorPdfFile);
    }, 450);
    return () => window.clearTimeout(t);
  }, [vendorPdfFile, manualEntry, runPdfExtract]);

  const handleGenerate = async () => {
    if (!manualEntry && !vendorPdfFile) {
      setResultMsg("Attach the vendor quote PDF to generate the offer (or enable Manual entry).");
      return;
    }
    if (manualEntry) {
      if (!quoteNumber.trim()) {
        setResultMsg("Quote number is required when using Manual entry.");
        return;
      }
      if (!clientName.trim()) {
        setResultMsg("Client name is required when using Manual entry.");
        return;
      }
    }

    const p = eazyNrgPricing;
    if (!p) {
      setResultMsg(
        "Enter supplier Subtotal ex GST and valid markup / discount so EasyNRG pricing can be calculated."
      );
      return;
    }
    if (p.sellEx < 0 || p.discPct > 100) {
      setResultMsg("Discount must be 100% or less, and must not make the sell value negative.");
      return;
    }

    setGenerating(true);
    setResultMsg(null);
    setGenerateResult(null);

    let source_pdf_base64: string | undefined;
    let source_pdf_filename: string | undefined;
    if (vendorPdfFile) {
      try {
        source_pdf_base64 = await pdfFileToBase64(vendorPdfFile);
        source_pdf_filename = vendorPdfFile.name;
      } catch {
        setResultMsg("Could not read the PDF file.");
        setGenerating(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/solar-cleaning-quote/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manual_entry: manualEntry,
          quote_number: quoteNumber.trim() || null,
          client_name: clientName.trim() || null,
          street_address: siteAddress.trim() || null,
          suburb_state_postcode: null,
          quote_date: quoteDate.trim() || null,
          panel_qty: panelQty.trim() || null,
          system_kw: systemKw.trim() || null,
          site_name: siteName.trim() || null,
          contact_name: contactName.trim() || null,
          amount_cleaning_ex_gst: p.sellBefore,
          amount_discount: p.discVal,
          amount_subtotal_ex_gst: p.sellEx,
          amount_gst: p.gst,
          amount_total_inc_gst: p.total,
          amount_cleaning_ex_gst_text: formatSolarAmountForGoogleDoc(p.sellBefore),
          amount_discount_text: formatSolarDiscountForGoogleDoc(p.discVal),
          amount_subtotal_ex_gst_text: formatSolarAmountForGoogleDoc(p.sellEx),
          amount_gst_text: formatSolarAmountForGoogleDoc(p.gst),
          amount_total_inc_gst_text: formatSolarAmountForGoogleDoc(p.total),
          business_name: businessName.trim() || clientName.trim() || null,
          client_folder_url: clientFolderUrl.trim() || null,
          pv_cleaning_note: pvNote.trim() || null,
          source_pdf_base64: source_pdf_base64 ?? null,
          source_pdf_filename: source_pdf_filename ?? null,
        }),
      });

      const data = (await res.json()) as GenerateResult & { error?: string; detail?: string };
      if (!res.ok) {
        const err =
          data.error ||
          (typeof data.detail === "string" ? data.detail : null) ||
          "Generation failed";
        setResultMsg(err);
        return;
      }
      setGenerateResult(data);
      if (data.applied_fields) {
        applyAppliedFieldsToForm(data.applied_fields, { fillSupplierFromPdf: false });
      }
      const warns =
        data.extraction_warnings?.filter(Boolean).length ?
          ` Notes: ${data.extraction_warnings!.join(" ")}` :
          "";
      setResultMsg(`Quote generated from ${manualEntry ? "manual fields" : "vendor PDF + CRM"}.${warns}`);
    } catch (e: unknown) {
      setResultMsg(e instanceof Error ? e.message : "Request failed");
    } finally {
      setGenerating(false);
    }
  };

  const openSendModal = () => {
    if (!generateResult?.quote_pdf_file_id && !generateResult?.quote_google_doc_id) {
      setResultMsg("Generate a quote first.");
      return;
    }
    setSendSubject(
      `EasyNRG solar panel cleaning quote ${quoteNumber} – ${businessName || clientName}`
    );
    setSendModalOpen(true);
  };

  const handleSend = async () => {
    if (!sendEmail.trim()) {
      setResultMsg("Client email is required to send.");
      return;
    }
    setSending(true);
    try {
      const cc_emails = Object.entries(ccSelected)
        .filter(([, v]) => v)
        .map(([email]) => email);
      const res = await fetch("/api/solar-cleaning-quote/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId ? Number(clientId) : null,
          business_name: businessName || clientName,
          client_folder_url: clientFolderUrl || null,
          quote_number: quoteNumber,
          quote_google_doc_id: generateResult?.quote_google_doc_id,
          quote_pdf_file_id: generateResult?.quote_pdf_file_id,
          tcs_master_doc_id: generateResult?.tcs_master_doc_id,
          tc_reference: null,
          recipient_name: sendName.trim(),
          recipient_email: sendEmail.trim(),
          cc_emails,
          subject: sendSubject.trim(),
          html_body: buildEmailHtml(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Send failed");
      }
      setSendModalOpen(false);
      setResultMsg(
        `Send request submitted successfully for ${sendEmail.trim()}.`
      );
    } catch (e: unknown) {
      setResultMsg(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Solar Cleaning Quote" />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Solar cleaning quote
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Attach the supplier quote PDF to auto-fill the quote fields below. You can edit any value
            before generating (e.g. missing panels/kW or line items the PDF did not parse). Enable{" "}
            <strong>Manual entry</strong> if you prefer to type everything or skip attaching a PDF.
            Send still goes through your n8n workflow.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-sm text-amber-900 dark:text-amber-100">
          <p className="font-medium">Google Doc template</p>
          <p className="mt-1">
            Address uses a single <code className="text-xs">[STREET ADDRESS]</code> line. Amount rows must
            use unique tokens (replace duplicate <code className="text-xs">$$[X,XXX.XX]</code>):{" "}
            <code className="text-xs">$$[AMT_CLEAN]</code>, <code className="text-xs">−$$[AMT_DISC]</code>,{" "}
            <code className="text-xs">$$[AMT_SUB]</code>, <code className="text-xs">$$[AMT_GST]</code>,{" "}
            <code className="text-xs">$$[AMT_TOT]</code> (Unicode minus before the discount token).
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/40 px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 rounded border-gray-300"
            checked={manualEntry}
            onChange={(e) => setManualEntry(e.target.checked)}
          />
          <div>
            <span className="font-medium text-gray-900 dark:text-gray-100">Manual entry</span>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Type all quote fields without PDF text extraction. The vendor PDF is optional (still
              useful to attach for the member folder or to run &quot;Load fields from PDF&quot;).
            </p>
          </div>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vendor quote PDF {manualEntry ? "(optional)" : "(required)"}
            </label>
            <input
              type="file"
              accept="application/pdf"
              className="block w-full text-sm text-gray-600 dark:text-gray-400"
              onChange={(e) => setVendorPdfFile(e.target.files?.[0] ?? null)}
            />
            {vendorPdfFile && vendorPdfObjectUrl && (
              <p className="mt-2 text-sm">
                <a
                  href={vendorPdfObjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Open {vendorPdfFile.name}
                </a>
                <span className="text-gray-500 dark:text-gray-400"> — view the PDF to check figures</span>
              </p>
            )}
            {!manualEntry && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                After you choose a file, we read the PDF and pre-fill the editable fields below (short
                delay). Fix any missing values before Generate. Scanned-only PDFs may fail; use Manual
                entry if needed.
              </p>
            )}
            {vendorPdfFile && (
              <button
                type="button"
                onClick={() => void runPdfExtract(vendorPdfFile)}
                disabled={pdfParseLoading}
                className="mt-2 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                {pdfParseLoading ? "Reading PDF…" : "Re-load fields from PDF"}
              </button>
            )}
          </div>

          {pdfParseLoading && (
            <div className="sm:col-span-2 text-sm text-gray-600 dark:text-gray-400">
              Reading vendor PDF and merging CRM details…
            </div>
          )}
          {pdfParseError && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-800 dark:text-red-200">
              {pdfParseError}
            </div>
          )}
          {pdfParseBanner && !pdfParseError && (
            <div className="sm:col-span-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
              {pdfParseBanner}
            </div>
          )}
          {(manualEntry || vendorPdfFile) && (
            <>
          <div className="sm:col-span-2 -mt-1 mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Quote details
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {manualEntry
                ? "All values come from these fields (PDF optional)."
                : "Values start from the PDF and CRM; edit anything the parser missed before you generate."}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quote number{manualEntry ? " *" : ""}
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              placeholder="1719"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quote date (DD/MM/YYYY)
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client name (prepared for){manualEntry ? " *" : ""}
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Site address
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="183 Cranbourne Rd, Frankston VIC 3199"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Full site address as it should appear under &quot;Prepared for&quot; (maps to{" "}
              <code className="text-[11px]">[STREET ADDRESS]</code> in the template).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Panel qty
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={panelQty}
              onChange={(e) => setPanelQty(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              System kW
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={systemKw}
              onChange={(e) => setSystemKw(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Site name (acceptance)
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Site contact
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              PV cleaning note
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={pvNote}
              onChange={(e) => setPvNote(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 border-t border-gray-200 dark:border-gray-600 pt-4 mt-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Supplier pricing
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
              From the vendor PDF (or type manually). These are the supplier&apos;s subtotal, GST, and
              total — not the EasyNRG customer line items.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subtotal ex GST ($)
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={supplierSubtotalExGst}
              onChange={(e) => setSupplierSubtotalExGst(e.target.value)}
              placeholder="1105.50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              GST ($)
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={supplierGst}
              onChange={(e) => setSupplierGst(e.target.value)}
              placeholder="110.55"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total inc GST ($)
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={supplierTotalIncGst}
              onChange={(e) => setSupplierTotalIncGst(e.target.value)}
              placeholder="1216.05"
            />
            {supplierGstLooksWrong && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                GST is not ~10% of subtotal ex GST — check figures if the PDF was misread.
              </p>
            )}
          </div>

          <div className="sm:col-span-2 border-t border-gray-200 dark:border-gray-600 pt-4 mt-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Our pricing (EasyNRG)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
              Markup is applied to supplier subtotal ex GST, then member discount %, then 10% GST on the
              sell value. These values are sent to the Google Doc (
              <code className="text-[11px]">$$[AMT_*]</code> placeholders).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Markup (× supplier base)
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={markupMultiplier}
              onChange={(e) => setMarkupMultiplier(e.target.value)}
              placeholder="3"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              e.g. 3 = charge 3× the supplier base (+200% markup).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Member discount (%)
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="33"
            />
          </div>

          <div className="sm:col-span-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/90 dark:bg-gray-800/50 px-4 py-3 text-sm space-y-2">
            <p className="font-medium text-gray-900 dark:text-gray-100">Pricing breakdown</p>
            {eazyNrgPricing ?
              <>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">Step 1 — Base (supplier subtotal ex GST):</span>{" "}
                  {formatAudDisplay(eazyNrgPricing.base)}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">Sell before discount</span> (
                  {eazyNrgPricing.mult}× base): {formatAudDisplay(eazyNrgPricing.sellBefore)}
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    (markup +{eazyNrgPricing.markupPct}% on base)
                  </span>
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">
                    Step 2 — Discount ({eazyNrgPricing.discPct}% of sell before):
                  </span>{" "}
                  {formatAudDisplay(eazyNrgPricing.discVal)}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">After discount (ex GST):</span>{" "}
                  {formatAudDisplay(eazyNrgPricing.sellEx)}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">Step 3 — GST (10%):</span>{" "}
                  {formatAudDisplay(eazyNrgPricing.gst)}
                </p>
                <p className="font-medium text-gray-900 dark:text-gray-100 pt-1 border-t border-gray-200 dark:border-gray-600">
                  Total inc GST: {formatAudDisplay(eazyNrgPricing.total)}
                </p>
              </>
            :
              <p className="text-gray-500 dark:text-gray-400">
                Enter supplier subtotal ex GST and valid markup / discount to see EasyNRG totals.
              </p>
            }
          </div>
            </>
          )}

          {!manualEntry && (
            <div className="sm:col-span-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium text-gray-900 dark:text-gray-100">From CRM / URL</p>
              <p className="mt-1">
                <span className="text-gray-500">Member / business:</span>{" "}
                {businessName || clientName || "—"}
              </p>
              {clientFolderUrl ? (
                <p className="mt-1 break-all">
                  <span className="text-gray-500">Drive folder:</span> {clientFolderUrl}
                </p>
              ) : (
                <p className="mt-1 text-amber-700 dark:text-amber-300">
                  No client folder URL — files go to the default invoice storage folder unless you paste
                  a folder link above (add one from the CRM member page for this client).
                </p>
              )}
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client Drive folder URL (optional)
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={clientFolderUrl}
              onChange={(e) => setClientFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Pre-filled from CRM when possible. If empty, files go to the default invoice storage folder.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate EasyNRG quote"}
          </button>
        </div>

        {resultMsg && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
            {resultMsg}
          </div>
        )}

        {(generateResult?.quote_doc_url || generateResult?.quote_pdf_url) && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Generated files</h2>
            <div className="flex flex-col gap-2 text-sm">
              {generateResult.quote_doc_url && (
                <a
                  href={generateResult.quote_doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open Google Doc
                </a>
              )}
              {generateResult.quote_pdf_url && (
                <a
                  href={generateResult.quote_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View quote PDF in Drive
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={openSendModal}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 w-fit"
            >
              Send to client…
            </button>
          </div>
        )}
      </div>

      {sendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-600">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Send quote to client
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                n8n will send the email and handle file moves.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client name
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    value={sendName}
                    onChange={(e) => setSendName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client email
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  value={sendSubject}
                  onChange={(e) => setSendSubject(e.target.value)}
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CC team (ACES staff)
                </span>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 p-2 space-y-2">
                  {staffUsers.length === 0 ? (
                    <span className="text-sm text-gray-500">Loading users…</span>
                  ) : (
                    staffUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!ccSelected[u.email]}
                          onChange={(e) =>
                            setCcSelected((prev) => ({
                              ...prev,
                              [u.email]: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-gray-800 dark:text-gray-200">
                          {u.full_name || u.name || u.email}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSendModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50"
                disabled={sending}
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
