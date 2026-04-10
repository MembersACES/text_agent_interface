"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getApiBaseUrl, getAutonomousApiBaseUrl } from "@/lib/utils";

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

function formatSolarAmountForGoogleDoc(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

function formatSolarDiscountForGoogleDoc(discountPositive: number): string {
  if (!Number.isFinite(discountPositive)) return "$0.00";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(-Math.abs(discountPositive));
}

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

function normalizeDocumentLink(link: string | undefined): string | undefined {
  if (!link || typeof link !== "string") return undefined;
  let s = link.trim();
  if (s.startsWith("=")) s = s.slice(1).trim();
  if (s.startsWith("https:/") && !s.startsWith("https://")) s = `https://${s.slice(7)}`;
  if (s.startsWith("http:/") && !s.startsWith("http://")) s = `http://${s.slice(6)}`;
  return s.startsWith("http://") || s.startsWith("https://") ? s : undefined;
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

function extractEmailIdFromWebhookResponse(webhookResponse: unknown): string | null {
  const readFromObject = (obj: Record<string, unknown>): string | null => {
    const direct =
      (typeof obj.email_id === "string" && obj.email_id.trim()) ||
      (typeof obj.email_ID === "string" && obj.email_ID.trim()) ||
      null;
    if (direct) return direct;

    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object") {
            const nested = readFromObject(item as Record<string, unknown>);
            if (nested) return nested;
          }
        }
      } else if (value && typeof value === "object") {
        const nested = readFromObject(value as Record<string, unknown>);
        if (nested) return nested;
      }
    }
    return null;
  };

  if (Array.isArray(webhookResponse)) {
    for (const item of webhookResponse) {
      if (item && typeof item === "object") {
        const found = readFromObject(item as Record<string, unknown>);
        if (found) return found;
      }
    }
    return null;
  }
  if (webhookResponse && typeof webhookResponse === "object") {
    return readFromObject(webhookResponse as Record<string, unknown>);
  }
  return null;
}

// ─── Shared input style ────────────────────────────────────────────────────
const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 " +
  "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm " +
  "placeholder:text-gray-400 dark:placeholder:text-gray-600 " +
  "focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 " +
  "transition-colors duration-150";

const labelCls = "block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5";

// ─── Section card wrapper ──────────────────────────────────────────────────
function Section({ title, subtitle, children, icon }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30 text-base">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ─── Pill badge ────────────────────────────────────────────────────────────
function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "warn" | "success" | "error" }) {
  const cls = {
    default: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
    warn: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    success: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    error: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  }[variant];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

// ─── Pricing row ───────────────────────────────────────────────────────────
function PriceRow({ label, value, sub, dimmed, bold, accent }: {
  label: string; value: string; sub?: string; dimmed?: boolean; bold?: boolean; accent?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-2 py-1.5 ${bold ? "border-t border-gray-200 dark:border-gray-700 mt-1 pt-2.5" : ""}`}>
      <span className={`text-sm ${dimmed ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"}`}>
        {label}{sub && <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{sub}</span>}
      </span>
      <span className={`text-sm font-mono tabular-nums ${bold ? "font-semibold text-gray-900 dark:text-gray-100 text-base" : accent ? "text-amber-700 dark:text-amber-300" : "text-gray-800 dark:text-gray-200"}`}>
        {value}
      </span>
    </div>
  );
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

  const [supplierSubtotalExGst, setSupplierSubtotalExGst] = useState("");
  const [supplierGst, setSupplierGst] = useState("");
  const [supplierTotalIncGst, setSupplierTotalIncGst] = useState("");
  const [markupMultiplier, setMarkupMultiplier] = useState("3");
  const [discountPercent, setDiscountPercent] = useState("33");

  const [pvNote, setPvNote] = useState("TBC — confirmed upon acceptance");
  const [vendorPdfFile, setVendorPdfFile] = useState<File | null>(null);
  const [manualEntry, setManualEntry] = useState(false);

  const [pdfParseLoading, setPdfParseLoading] = useState(false);
  const [pdfParseBanner, setPdfParseBanner] = useState<string | null>(null);
  const [pdfParseError, setPdfParseError] = useState<string | null>(null);
  const [vendorPdfObjectUrl, setVendorPdfObjectUrl] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);

  // If a user uploads the vendor quote PDF here, also file it under the CRM "Additional Documents"
  // via the same n8n webhook used by the Documents tab.
  const [additionalDocUploadLoading, setAdditionalDocUploadLoading] =
    useState(false);
  const [additionalDocUploadResult, setAdditionalDocUploadResult] = useState<
    string | null
  >(null);
  const additionalDocUploadKeyRef = useRef<string | null>(null);

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendName, setSendName] = useState("");
  const [sendEmail, setSendEmail] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [ccSelected, setCcSelected] = useState<Record<string, boolean>>({});
  const crmOfferIdRef = useRef<number | null>(null);

  useEffect(() => {
    const bn = searchParams.get("businessName") || "";
    const em = searchParams.get("email") || "";
    const cn = searchParams.get("contactName") || "";
    const folder = searchParams.get("clientFolderUrl") || "";
    const cid = searchParams.get("clientId") || "";
    const site = searchParams.get("siteAddress") || "";
    const oidRaw = searchParams.get("offerId");

    crmOfferIdRef.current = null;
    if (oidRaw) {
      const n = Number(oidRaw);
      if (Number.isFinite(n) && n > 0) crmOfferIdRef.current = n;
    }

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
    const bn = (businessName || clientName).trim();
    if (bn && quoteNumber.trim()) {
      setSendSubject(`Solar panel cleaning quote ${quoteNumber.trim()} – ${bn}`);
    }
  }, [businessName, clientName, quoteNumber]);

  const parseMoney = (s: string): number => {
    const t = s.replace(/[$,\s]/g, "").trim();
    if (!t) return 0;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : 0;
  };

  const quotePricing = useMemo(() => {
    const base = parseMoney(supplierSubtotalExGst);
    const mult = Number.parseFloat(markupMultiplier.replace(",", ".").trim());
    const discPct = Number.parseFloat(discountPercent.replace(",", ".").trim());
    if (!(base > 0) || !(mult > 0) || !Number.isFinite(discPct) || discPct < 0) return null;
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setStaffUsers(data as StaffUser[]);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { if (sendModalOpen) fetchStaff(); }, [sendModalOpen, fetchStaff]);

  const buildEmailHtml = () => {
    const qn = quoteNumber || "—";
    const bn = businessName || clientName || "your organisation";
    return [
      `<p>Hi ${sendName || "there"},</p>`,
      `<p>Your solar panel cleaning quote has been prepared for <strong>${bn}</strong> (quote <strong>${qn}</strong>).</p>`,
      `<p>Please review the attached quotation. Terms and conditions are provided separately and will be referenced when you accept.</p>`,
      `<p>If you have any questions, please reply to this email.</p>`,
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

  const extractMergeFieldsRef = useRef({
    businessName: "", clientName: "", siteAddress: "",
    contactName: "", siteName: "", clientFolderUrl: "",
  });
  extractMergeFieldsRef.current = { businessName, clientName, siteAddress, contactName, siteName, clientFolderUrl };

  const runPdfExtract = useCallback(async (file: File) => {
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
      if (!res.ok) { setPdfParseError(data.error || "Could not parse PDF"); return; }
      if (!data.success) { setPdfParseError(data.error || "Could not parse PDF"); return; }
      if (data.applied_fields) applyAppliedFieldsToForm(data.applied_fields, { fillSupplierFromPdf: true });
      const warns = (data.extraction_warnings || []).filter(Boolean);
      setPdfParseBanner(
        warns.length > 0 ? warns.join(" ") : "Values loaded from the PDF. Review and edit the fields below, then click Generate."
      );
    } catch (e: unknown) {
      setPdfParseError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setPdfParseLoading(false);
    }
  }, [applyAppliedFieldsToForm]);

  useEffect(() => {
    if (!vendorPdfFile) { setPdfParseBanner(null); setPdfParseError(null); }
  }, [vendorPdfFile]);

  useEffect(() => {
    if (!vendorPdfFile) { setVendorPdfObjectUrl(null); return; }
    const url = URL.createObjectURL(vendorPdfFile);
    setVendorPdfObjectUrl(url);
    return () => { URL.revokeObjectURL(url); };
  }, [vendorPdfFile]);

  useEffect(() => {
    if (!vendorPdfFile) {
      setAdditionalDocUploadResult(null);
      additionalDocUploadKeyRef.current = null;
      return;
    }

    const businessForFiling = (businessName || clientName).trim();
    const gdriveUrlForFiling = clientFolderUrl.trim();
    if (!businessForFiling) return;

    const ext =
      vendorPdfFile.name && vendorPdfFile.name.includes(".")
        ? vendorPdfFile.name.slice(vendorPdfFile.name.lastIndexOf("."))
        : ".pdf";
    const addDocType = "Solar panel cleaning quote";
    const newFilename = `${businessForFiling} - ${addDocType}${ext}`;
    const uploadKey = `${vendorPdfFile.name}|${vendorPdfFile.size}|${vendorPdfFile.lastModified}|${newFilename}|${gdriveUrlForFiling}`;
    if (additionalDocUploadKeyRef.current === uploadKey) return;
    additionalDocUploadKeyRef.current = uploadKey;

    const uploadAdditionalDocument = async () => {
      setAdditionalDocUploadLoading(true);
      setAdditionalDocUploadResult(null);

      try {
        const formData = new FormData();
        formData.append("file", vendorPdfFile);
        formData.append("business_name", businessForFiling);
        formData.append("gdrive_url", gdriveUrlForFiling);
        formData.append("timestamp", new Date().toISOString());
        formData.append("new_filename", newFilename);

        const webhookRes = await fetch(
          "https://membersaces.app.n8n.cloud/webhook/additional_document_upload",
          { method: "POST", body: formData }
        );

        const contentType =
          webhookRes.headers.get("content-type") || "";
        const responseText = await webhookRes.text();

        let webhookMsg = responseText;
        if (contentType.includes("application/json") && responseText) {
          try {
            const parsed = JSON.parse(responseText) as { message?: string };
            webhookMsg = parsed?.message || responseText;
          } catch {
            webhookMsg = responseText;
          }
        }

        if (webhookRes.ok) {
          setAdditionalDocUploadResult("✅ Added to Additional Documents");
        } else {
          setAdditionalDocUploadResult(
            `❌ Failed to file in Additional Documents: ${webhookMsg}`
          );
        }
      } catch (e: unknown) {
        setAdditionalDocUploadResult(
          `❌ Failed to file in Additional Documents: ${
            e instanceof Error ? e.message : "Unknown error"
          }`
        );
      } finally {
        setAdditionalDocUploadLoading(false);
      }
    };

    void uploadAdditionalDocument();
  }, [vendorPdfFile, businessName, clientName, clientFolderUrl]);

  useEffect(() => {
    if (manualEntry || !vendorPdfFile || vendorPdfFile.type !== "application/pdf") return;
    const t = window.setTimeout(() => { void runPdfExtract(vendorPdfFile); }, 450);
    return () => window.clearTimeout(t);
  }, [vendorPdfFile, manualEntry, runPdfExtract]);

  const ensureSolarCleaningCrmOfferId = async (): Promise<number | null> => {
    if (crmOfferIdRef.current != null) return crmOfferIdRef.current;
    const clientNum = clientId ? Number(clientId) : NaN;
    if (!Number.isFinite(clientNum) || clientNum <= 0) return null;
    const email = session?.user?.email;
    if (!token || !email) return null;
    const baseUrl = getApiBaseUrl();
    try {
      const createRes = await fetch(`${baseUrl}/api/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          client_id: clientNum,
          status: "requested",
          business_name: (businessName.trim() || clientName.trim()) || undefined,
          utility_type: "Solar panel cleaning",
        }),
      });
      if (!createRes.ok) { console.warn("[Solar quote CRM] create offer failed:", await createRes.text()); return null; }
      const created = (await createRes.json()) as { id?: number };
      const id = typeof created?.id === "number" ? created.id : null;
      if (id != null) crmOfferIdRef.current = id;
      return id;
    } catch (e) { console.warn("[Solar quote CRM] create offer error:", e); return null; }
  };

  const recordSolarQuoteGeneratedInCrm = async (result: GenerateResult, totalIncGst: number, isManualEntry: boolean) => {
    const email = session?.user?.email;
    if (!email || !token) return;
    const oid = await ensureSolarCleaningCrmOfferId();
    if (oid == null) return;
    const docLink = normalizeDocumentLink(result.quote_pdf_url) ?? normalizeDocumentLink(result.quote_doc_url);
    const metadata: Record<string, unknown> = { source: "solar_cleaning_quote_page", manual_entry: isManualEntry, amount_total_inc_gst: totalIncGst };
    const qn = quoteNumber.trim();
    if (qn) metadata.quote_number = qn;
    if (result.quote_google_doc_id) metadata.quote_google_doc_id = result.quote_google_doc_id;
    if (result.quote_pdf_file_id) metadata.quote_pdf_file_id = result.quote_pdf_file_id;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/offers/${oid}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activity_type: "solar_cleaning_quote_generated", document_link: docLink, metadata, created_by: email }),
      });
      if (!res.ok) console.warn("[Solar quote CRM] generated activity:", res.status, await res.text());
    } catch (e) { console.warn("[Solar quote CRM] generated activity error:", e); }
  };

  const recordSolarQuoteSentInCrm = async (recipientEmail: string, subjectLine: string, result: GenerateResult | null) => {
    const email = session?.user?.email;
    if (!email || !token) return;
    const oid = await ensureSolarCleaningCrmOfferId();
    if (oid == null) return;
    const docLink = result ? (normalizeDocumentLink(result.quote_pdf_url) ?? normalizeDocumentLink(result.quote_doc_url)) : undefined;
    const metadata: Record<string, unknown> = { source: "solar_cleaning_quote_page", recipient_email: recipientEmail.trim(), email_subject: subjectLine.trim() };
    const qn = quoteNumber.trim();
    if (qn) metadata.quote_number = qn;
    if (result?.quote_google_doc_id) metadata.quote_google_doc_id = result.quote_google_doc_id;
    if (result?.quote_pdf_file_id) metadata.quote_pdf_file_id = result.quote_pdf_file_id;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/offers/${oid}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activity_type: "solar_cleaning_quote_sent", document_link: docLink, metadata, created_by: email }),
      });
      if (!res.ok) console.warn("[Solar quote CRM] sent activity:", res.status, await res.text());
    } catch (e) { console.warn("[Solar quote CRM] sent activity error:", e); }
  };

  const startSolarAutonomousSequence = async (emailId?: string | null) => {
    if (!token) return;
    const oid = await ensureSolarCleaningCrmOfferId();
    if (oid == null) return;
    const clientNum = clientId ? Number(clientId) : NaN;
    const normalizedEmailId = (emailId || "").trim() || null;
    const context: Record<string, unknown> = {
      source: "solar_cleaning_quote_page",
      contact_name: sendName.trim() || null,
      contact_email: sendEmail.trim() || null,
      business_name: (businessName || clientName).trim() || null,
      quote_number: quoteNumber.trim() || null,
      site_name: siteName.trim() || null,
      site_contact: contactName.trim() || null,
    };
    if (normalizedEmailId) {
      context.email_id = normalizedEmailId;
      context.email_ID = normalizedEmailId;
    }
    const p = quotePricing;
    if (p) {
      context.member_pricing = {
        markup_multiplier: p.mult,
        member_discount_percent: p.discPct,
        sell_before_discount_ex_gst: p.sellBefore,
        member_discount_amount: p.discVal,
        after_discount_ex_gst: p.sellEx,
        gst: p.gst,
        total_inc_gst: p.total,
      };
      context.member_pricing_display = {
        sell_before_discount: formatAudDisplay(p.sellBefore),
        member_discount: formatAudDisplay(p.discVal),
        after_discount_ex_gst: formatAudDisplay(p.sellEx),
        gst: formatAudDisplay(p.gst),
        total_inc_gst: formatAudDisplay(p.total),
      };
    }
    const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        sequence_type: "solar_panel_cleaning_followup_v1",
        offer_id: oid,
        client_id: Number.isFinite(clientNum) && clientNum > 0 ? clientNum : null,
        crm_activity_id: null,
        anchor_at: new Date().toISOString(),
        timezone: "Australia/Brisbane",
        email_id: normalizedEmailId,
        context,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { detail?: string }).detail || "Email sent, but failed to start autonomous sequence",
      );
    }
  };

  const handleGenerate = async () => {
    if (!manualEntry && !vendorPdfFile) {
      setResultMsg("Attach the vendor quote PDF to generate the offer (or enable Manual entry).");
      return;
    }
    if (manualEntry) {
      if (!quoteNumber.trim()) { setResultMsg("Quote number is required when using Manual entry."); return; }
      if (!clientName.trim()) { setResultMsg("Client name is required when using Manual entry."); return; }
    }
    const p = quotePricing;
    if (!p) {
      setResultMsg(
        "Enter supplier Subtotal ex GST and valid markup / discount so quote totals can be calculated."
      );
      return;
    }
    if (p.sellEx < 0 || p.discPct > 100) { setResultMsg("Discount must be 100% or less, and must not make the sell value negative."); return; }

    setGenerating(true);
    setResultMsg(null);
    setGenerateResult(null);

    let source_pdf_base64: string | undefined;
    let source_pdf_filename: string | undefined;
    if (vendorPdfFile) {
      try {
        source_pdf_base64 = await pdfFileToBase64(vendorPdfFile);
        source_pdf_filename = vendorPdfFile.name;
      } catch { setResultMsg("Could not read the PDF file."); setGenerating(false); return; }
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
        const err = data.error || (typeof data.detail === "string" ? data.detail : null) || "Generation failed";
        setResultMsg(err);
        return;
      }
      setGenerateResult(data);
      if (data.applied_fields) applyAppliedFieldsToForm(data.applied_fields, { fillSupplierFromPdf: false });
      const warns = data.extraction_warnings?.filter(Boolean).length ? ` Notes: ${data.extraction_warnings!.join(" ")}` : "";
      setResultMsg(`Quote generated from ${manualEntry ? "manual fields" : "vendor PDF + CRM"}.${warns}`);
      void recordSolarQuoteGeneratedInCrm(data, p.total, manualEntry);
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
      `Solar panel cleaning quote ${quoteNumber} – ${(businessName || clientName).trim() || "Client"}`
    );
    setSendModalOpen(true);
  };

  const handleSend = async () => {
    if (!sendEmail.trim()) { setResultMsg("Client email is required to send."); return; }
    setSending(true);
    try {
      const cc_emails = Object.entries(ccSelected).filter(([, v]) => v).map(([email]) => email);
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
      if (!res.ok) throw new Error((data as { error?: string }).error || "Send failed");
      setSendModalOpen(false);
      await recordSolarQuoteSentInCrm(sendEmail.trim(), sendSubject.trim(), generateResult);
      let msg = `Send request submitted successfully for ${sendEmail.trim()}.`;
      try {
        const webhookResponse = (data as { webhook_response?: unknown }).webhook_response;
        const emailId = extractEmailIdFromWebhookResponse(webhookResponse);
        await startSolarAutonomousSequence(emailId);
        msg += " Autonomous follow-up sequence started.";
      } catch (seqErr) {
        msg += ` Note: ${seqErr instanceof Error ? seqErr.message : "Could not start follow-up sequence."}`;
      }
      setResultMsg(msg);
    } catch (e: unknown) {
      setResultMsg(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Solar panel cleaning quote
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Build ACES-branded solar panel cleaning quotations from the supplier PDF, with member
            pricing and CRM filing — same document workflow style as the 1st Month Savings invoice.
          </p>
        </header>

        {/* ── Manual entry toggle ── */}
        <label className="flex items-start gap-3.5 cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-4 py-3.5 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={manualEntry}
              onChange={(e) => setManualEntry(e.target.checked)}
            />
            <div className="h-5 w-9 rounded-full bg-gray-200 dark:bg-gray-700 peer-checked:bg-amber-500 transition-colors duration-200" />
            <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-4" />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Manual entry</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Type all fields without PDF extraction. Attach a PDF anyway to store it in the member folder.
            </p>
          </div>
        </label>

        {/* ── PDF upload ── */}
        <Section title="Vendor Quote PDF" subtitle={manualEntry ? "Optional — used for member folder storage" : "Required — fields are read from this file"} icon="📎">
          <div
            className={`relative rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors ${
              vendorPdfFile
                ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
                : "border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700"
            }`}
          >
            <input
              type="file"
              accept="application/pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setVendorPdfFile(e.target.files?.[0] ?? null)}
            />
            {vendorPdfFile ? (
              <div className="space-y-1">
                <div className="text-2xl">📄</div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{vendorPdfFile.name}</p>
                <p className="text-xs text-gray-500">Click to replace</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-2xl text-gray-300 dark:text-gray-600">📄</div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Drop a PDF or click to browse</p>
                <p className="text-xs text-gray-400">Scanned-only PDFs may not extract — use Manual entry if needed</p>
              </div>
            )}
          </div>

          {vendorPdfFile && vendorPdfObjectUrl && (
            <div className="mt-3 flex items-center justify-between">
              <a
                href={vendorPdfObjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
              >
                <span>↗</span> Open PDF to verify figures
              </a>
              <button
                type="button"
                onClick={() => void runPdfExtract(vendorPdfFile)}
                disabled={pdfParseLoading}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {pdfParseLoading ? "Reading…" : "Re-read PDF"}
              </button>
            </div>
          )}

          {pdfParseLoading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Reading vendor PDF and merging CRM details…
            </div>
          )}
          {pdfParseError && (
            <div className="mt-3 flex gap-2 items-start rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
              <span className="shrink-0">✕</span>{pdfParseError}
            </div>
          )}
          {pdfParseBanner && !pdfParseError && (
            <div className="mt-3 flex gap-2 items-start rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <span className="shrink-0">✓</span>{pdfParseBanner}
            </div>
          )}

          {additionalDocUploadLoading && (
            <div className="mt-3 flex gap-2 items-start rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">
              <span className="shrink-0">↗</span> Filing vendor PDF in Additional Documents…
            </div>
          )}

          {additionalDocUploadResult && !additionalDocUploadLoading && (
            <div className="mt-3 flex gap-2 items-start rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200">
              <span className="shrink-0">📄</span>
              {additionalDocUploadResult}
            </div>
          )}
        </Section>

        {/* ── Two-column layout: Quote Details (left) + Pricing (right) ── */}
        {(manualEntry || vendorPdfFile) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

            {/* LEFT: Quote Details */}
            <Section
              title="Quote Details"
              subtitle={manualEntry ? "All values come from these fields" : "Pre-filled from PDF — edit anything the parser missed"}
              icon="📋"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Quote Number{manualEntry ? " *" : ""}</label>
                  <input className={inputCls} value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} placeholder="1719" />
                </div>
                <div>
                  <label className={labelCls}>Quote Date</label>
                  <input className={inputCls} value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Client Name{manualEntry ? " *" : ""}</label>
                  <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Site Address</label>
                  <input className={inputCls} value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="183 Cranbourne Rd, Frankston VIC 3199" />
                </div>
                <div>
                  <label className={labelCls}>Panel Qty</label>
                  <input className={inputCls} value={panelQty} onChange={(e) => setPanelQty(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>System kW</label>
                  <input className={inputCls} value={systemKw} onChange={(e) => setSystemKw(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Site Name</label>
                  <input className={inputCls} value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Site Contact</label>
                  <input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>PV Cleaning Note</label>
                  <input className={inputCls} value={pvNote} onChange={(e) => setPvNote(e.target.value)} />
                </div>

                {/* Drive folder inside the left card, below the fields */}
                <div className="sm:col-span-2 pt-1 border-t border-gray-100 dark:border-gray-800 mt-1">
                  <label className={labelCls}>Client Drive Folder URL</label>
                  <input
                    className={inputCls}
                    value={clientFolderUrl}
                    onChange={(e) => setClientFolderUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/…"
                  />
                  {!clientFolderUrl && (
                    <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                      No folder URL — files go to the default storage folder.
                    </p>
                  )}
                </div>

                {/* CRM member info inline */}
                {!manualEntry && (businessName || clientName) && (
                  <div className="sm:col-span-2 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <span>🗂️</span>
                    <span>CRM member: <span className="font-medium text-gray-600 dark:text-gray-300">{businessName || clientName}</span></span>
                  </div>
                )}
              </div>
            </Section>

            {/* RIGHT: Supplier + member quote pricing */}
            <div className="space-y-5">
              <Section
                title="Supplier Pricing"
                subtitle="Raw figures from the vendor PDF"
                icon="🏷️"
              >
                <div className="grid gap-3 grid-cols-3">
                  <div>
                    <label className={labelCls}>Subtotal ex GST</label>
                    <input className={inputCls} value={supplierSubtotalExGst} onChange={(e) => setSupplierSubtotalExGst(e.target.value)} placeholder="1105.50" />
                  </div>
                  <div>
                    <label className={labelCls}>GST</label>
                    <input className={`${inputCls} ${supplierGstLooksWrong ? "border-amber-400 focus:border-amber-500" : ""}`} value={supplierGst} onChange={(e) => setSupplierGst(e.target.value)} placeholder="110.55" />
                    {supplierGstLooksWrong && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Not ~10% of subtotal</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Total inc GST</label>
                    <input className={inputCls} value={supplierTotalIncGst} onChange={(e) => setSupplierTotalIncGst(e.target.value)} placeholder="1216.05" />
                  </div>
                </div>
              </Section>

              <Section
                title="Member quote pricing"
                subtitle="Markup → discount → GST"
                icon="💰"
              >
                <div className="grid gap-3 grid-cols-2 mb-4">
                  <div>
                    <label className={labelCls}>Markup (× base)</label>
                    <input className={inputCls} value={markupMultiplier} onChange={(e) => setMarkupMultiplier(e.target.value)} placeholder="3" />
                    <p className="mt-1 text-xs text-gray-400">3 = 3× supplier base</p>
                  </div>
                  <div>
                    <label className={labelCls}>Member Discount (%)</label>
                    <input className={inputCls} value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="33" />
                  </div>
                </div>

                {quotePricing ? (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-0.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Breakdown</p>
                    <PriceRow label="Supplier base" value={formatAudDisplay(quotePricing.base)} dimmed />
                    <PriceRow label="Sell before discount" sub={`${quotePricing.mult}×`} value={formatAudDisplay(quotePricing.sellBefore)} />
                    <PriceRow label="Member discount" sub={`${quotePricing.discPct}%`} value={`− ${formatAudDisplay(quotePricing.discVal)}`} accent />
                    <PriceRow label="After discount (ex GST)" value={formatAudDisplay(quotePricing.sellEx)} />
                    <PriceRow label="GST" sub="10%" value={formatAudDisplay(quotePricing.gst)} dimmed />
                    <PriceRow label="Total inc GST" value={formatAudDisplay(quotePricing.total)} bold />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                    Enter supplier subtotal and markup / discount to see totals
                  </div>
                )}
              </Section>

            </div>
          </div>
        )}

        {/* ── Full-width action footer ── */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating…
              </>
            ) : <>☀️ Generate quote</>}
          </button>

          {resultMsg && (
            <div className={`flex gap-2 items-start rounded-xl border px-4 py-3 text-sm ${
              resultMsg.toLowerCase().includes("fail") || resultMsg.toLowerCase().includes("error") || resultMsg.toLowerCase().includes("required") || resultMsg.toLowerCase().includes("attach")
                ? "border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300"
                : "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
            }`}>
              <span className="shrink-0 mt-0.5">
                {resultMsg.toLowerCase().includes("fail") || resultMsg.toLowerCase().includes("error") || resultMsg.toLowerCase().includes("required") ? "✕" : "✓"}
              </span>
              {resultMsg}
            </div>
          )}

          {(generateResult?.quote_doc_url || generateResult?.quote_pdf_url) && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-xs shrink-0">✓</span>
                <h2 className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">Quote generated</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {generateResult.quote_doc_url && (
                  <a href={generateResult.quote_doc_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-900 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                    ↗ Google Doc
                  </a>
                )}
                {generateResult.quote_pdf_url && (
                  <a href={generateResult.quote_pdf_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-900 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                    ↗ PDF in Drive
                  </a>
                )}
                <button type="button" onClick={openSendModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                  ✉ Send to client…
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Send modal ── */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Send quote to client</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">n8n handles the email and file moves</p>
              </div>
              <button
                type="button"
                onClick={() => setSendModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Client Name</label>
                  <input className={inputCls} value={sendName} onChange={(e) => setSendName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Client Email</label>
                  <input type="email" className={inputCls} value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Subject</label>
                <input className={inputCls} value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>CC (ACES Staff)</label>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 max-h-36 overflow-y-auto">
                  {staffUsers.length === 0 ? (
                    <div className="px-3 py-2.5 text-xs text-gray-400">Loading users…</div>
                  ) : (
                    staffUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                          checked={!!ccSelected[u.email]}
                          onChange={(e) => setCcSelected((prev) => ({ ...prev, [u.email]: e.target.checked }))}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{u.full_name || u.name || u.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSendModalOpen(false)}
                disabled={sending}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {sending ? (
                  <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Sending…</>
                ) : "✉ Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}