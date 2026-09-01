"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { useToast } from "@/components/ui/toast";
import { getApiBaseUrl } from "@/lib/utils";
import {
  DEFAULT_FEE_PERCENT,
  NEW_REVENUE_TYPES,
  calcNewRevenueFee,
  formatAud,
  toExGst,
} from "@/lib/new-revenue";

const EGB_DETAILS = {
  name: "Environmental Global Benefits",
  abn: "23 156 583 863",
  address: "470 St Kilda Road",
  city: "Melbourne, Victoria 3004",
  phone: "1300 938 638",
  email: "business@acesolutions.com.au",
  bank: {
    name: "Commonwealth Bank",
    accountName: "ENVIRONMENTAL GLOBAL BENEFITS",
    bsb: "063 144",
    accountNo: "1057 8739",
  },
};

interface BusinessInfo {
  business_name: string;
  abn: string;
  trading_as: string;
  postal_address: string;
  site_address: string;
  telephone: string;
  email: string;
  contact_name: string;
  position: string;
  client_folder_url: string;
}

interface InvoiceLineItem {
  id: string;
  solution_type: string;
  solution_label: string;
  gross_amount: number;
  fee_percent: number;
  fee_amount: number;
  gst: number;
  total: number;
}

interface InvoiceRecord {
  invoice_number: string;
  due_date?: string;
  invoice_date?: string;
  total_amount: number | string;
  status: string;
  invoice_file_id?: string;
  line_items?: InvoiceLineItem[];
}

interface SendInvoiceRequest {
  invoice_number: string;
  business_name: string;
  client_name: string;
  client_email: string;
  subject: string;
  html_body: string;
  attachment_filename: string;
  pdf_base64: string;
  invoice_file_id?: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  total_gst: number;
  total_amount: number;
  line_items: InvoiceLineItem[];
}

type InvoiceUploadMetadata = {
  invoiceNumber: string;
  businessName: string;
  dueDate: string;
  invoiceDate: string;
  status?: string;
  subtotal: number;
  totalGst: number;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
};

type DriveUploadResult = {
  fileId: string;
  errorDetail: string;
};

function canSendInvoicePayload(payload: SendInvoiceRequest): boolean {
  return !!payload.invoice_file_id?.trim();
}

function buildInvoiceUploadBody(
  pdfBase64: string,
  filename: string,
  metadata: InvoiceUploadMetadata
): Record<string, string | number> {
  const first = metadata.lineItems[0];
  const solutionSummary = metadata.lineItems
    .map((item) => item.solution_label)
    .filter(Boolean)
    .join(", ");
  const feeAmount = first?.fee_amount ?? metadata.subtotal;

  return {
    pdf_base64: pdfBase64,
    filename,
    invoice_number: metadata.invoiceNumber,
    business_name: metadata.businessName,
    due_date: metadata.dueDate,
    invoice_date: metadata.invoiceDate,
    status: metadata.status ?? "Generated",
    subtotal: metadata.subtotal,
    total_gst: metadata.totalGst,
    total_amount: metadata.totalAmount,
    solution: first?.solution_label ?? solutionSummary,
    savings_amount: feeAmount,
    gst: first?.gst ?? metadata.totalGst,
    total_invoice: first?.total ?? metadata.totalAmount,
    gross_amount: first?.gross_amount ?? 0,
    fee_percent: first?.fee_percent ?? DEFAULT_FEE_PERCENT,
    fee_amount: feeAmount,
    line_items: JSON.stringify(metadata.lineItems),
  };
}

async function uploadInvoicePdfToDrive(params: {
  pdfBytes: Uint8Array;
  filename: string;
  metadata: InvoiceUploadMetadata;
}): Promise<DriveUploadResult> {
  const { pdfBytes, filename, metadata } = params;
  const { invoiceNumber, businessName } = metadata;
  let fileId = "";
  let errorDetail = "";

  try {
    const uploadResponse = await fetch("/api/new-revenue/upload-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildInvoiceUploadBody(pdfBytesToBase64(pdfBytes), filename, metadata)),
    });

    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      fileId = uploadData.file_id || uploadData.fileId || "";
      if (!fileId) {
        errorDetail =
          "Drive upload returned OK but no file ID. Check the n8n file-upload workflow returns file_id.";
      }
    } else {
      let errBody: { error_code?: string; message?: string; remediation?: string; request_id?: string } = {};
      try {
        errBody = await uploadResponse.json();
      } catch {
        errBody = { message: await uploadResponse.text() };
      }
      const errMsg = errBody.message || `HTTP ${uploadResponse.status}`;
      errorDetail = errBody.remediation
        ? `${errMsg} ${errBody.remediation}${errBody.request_id ? ` (ref: ${errBody.request_id})` : ""}`
        : `${errMsg}${errBody.request_id ? ` (ref: ${errBody.request_id})` : ""}`;
    }
  } catch (uploadError: unknown) {
    errorDetail = uploadError instanceof Error ? uploadError.message : "Drive upload error";
  }

  console.info(
    `[NR_UPLOAD] invoice=${invoiceNumber} business=${businessName} fileId=${fileId || "(none)"} error=${errorDetail || "ok"}`
  );
  return { fileId, errorDetail };
}

function lineItemFromGross(
  solutionType: string,
  solutionLabel: string,
  grossExGst: number,
  feePercent: number,
  id?: string
): InvoiceLineItem {
  const calc = calcNewRevenueFee(grossExGst, feePercent);
  return {
    id: id || `line-${Date.now()}`,
    solution_type: solutionType,
    solution_label: solutionLabel,
    gross_amount: calc.gross,
    fee_percent: calc.feePercent,
    fee_amount: calc.fee,
    gst: calc.gst,
    total: calc.total,
  };
}

function pdfBytesToBase64(pdfBytes: Uint8Array): string {
  const uint8Array = new Uint8Array(pdfBytes);
  let binaryString = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binaryString);
}

function NewRevenueInvoicePage() {
  const { showToast } = useToast();
  const { data: session } = useSession();
  const token = (session as { id_token?: string; accessToken?: string } | null)?.id_token
    || (session as { accessToken?: string } | null)?.accessToken;
  const searchParams = useSearchParams();

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [businessQuery, setBusinessQuery] = useState("");
  const [businessLoading, setBusinessLoading] = useState(false);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [selectedSolution, setSelectedSolution] = useState("");
  const [customSolution, setCustomSolution] = useState("");
  const [useCustomSolution, setUseCustomSolution] = useState(false);
  const [grossAmount, setGrossAmount] = useState("");
  const [amountIncludesGst, setAmountIncludesGst] = useState(true);
  const [feePercent, setFeePercent] = useState(String(DEFAULT_FEE_PERCENT));
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendingToClient, setSendingToClient] = useState(false);
  const [sendClientName, setSendClientName] = useState("");
  const [sendClientEmail, setSendClientEmail] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendRequestPayload, setSendRequestPayload] = useState<SendInvoiceRequest | null>(null);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [lastGeneratedBanner, setLastGeneratedBanner] = useState<{
    invoice_number: string;
    filename: string;
    drive_file_id: string | null;
  } | null>(null);
  const lastGeneratedPdfRef = useRef<{ bytes: Uint8Array; filename: string } | null>(null);
  const lastUploadMetadataRef = useRef<InvoiceUploadMetadata | null>(null);
  const prefillFromUrlDone = useRef(false);

  const preview = useMemo(() => {
    const entered = parseFloat(grossAmount);
    const pct = parseFloat(feePercent);
    if (!Number.isFinite(entered) || entered <= 0) return null;
    const grossExGst = toExGst(entered, amountIncludesGst);
    return calcNewRevenueFee(grossExGst, Number.isFinite(pct) ? pct : DEFAULT_FEE_PERCENT);
  }, [grossAmount, feePercent, amountIncludesGst]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.fee_amount, 0);
  const totalGst = lineItems.reduce((sum, item) => sum + item.gst, 0);
  const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);

  useEffect(() => {
    const businessName = searchParams.get("businessName");
    if (!businessName) return;
    setBusinessInfo({
      business_name: businessName,
      abn: searchParams.get("abn") || "",
      trading_as: searchParams.get("tradingAs") || "",
      postal_address: searchParams.get("address") || "",
      site_address: searchParams.get("siteAddress") || "",
      telephone: searchParams.get("phone") || "",
      email: searchParams.get("email") || "",
      contact_name: searchParams.get("contactName") || "",
      position: searchParams.get("position") || "",
      client_folder_url: searchParams.get("clientFolderUrl") || "",
    });
    setResult(`Business loaded: ${businessName}`);
  }, [searchParams]);

  useEffect(() => {
    if (prefillFromUrlDone.current) return;
    const amount = searchParams.get("grossAmount");
    const solutionType = searchParams.get("solutionType");
    const solutionLabel = searchParams.get("solutionLabel");
    if (!amount || (!solutionType && !solutionLabel)) return;
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    prefillFromUrlDone.current = true;
    const pct = parseFloat(searchParams.get("feePercent") || "") || DEFAULT_FEE_PERCENT;
    setLineItems((prev) => [
      ...prev,
      lineItemFromGross(
        solutionType || "other_rebate",
        solutionLabel || solutionType || "New Revenue",
        num,
        pct,
        `prefill-${Date.now()}`
      ),
    ]);
  }, [searchParams]);

  const fetchInvoiceHistory = useCallback(async () => {
    if (!businessInfo?.business_name) return;
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/new-revenue/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: businessInfo.business_name }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvoiceHistory(Array.isArray(data.invoices) ? data.invoices : []);
      }
    } catch (error) {
      console.error("Error fetching new revenue history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [businessInfo?.business_name]);

  useEffect(() => {
    if (businessInfo?.business_name) fetchInvoiceHistory();
  }, [businessInfo?.business_name, fetchInvoiceHistory]);

  const searchBusiness = async () => {
    if (!businessQuery.trim() || !token) return;
    setBusinessLoading(true);
    setResult("");
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/get-business-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ business_name: businessQuery.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.business_details) {
        const info: BusinessInfo = {
          business_name: data.business_details?.name || "",
          abn: data.business_details?.abn || "",
          trading_as: data.business_details?.trading_name || "",
          postal_address: data.contact_information?.postal_address || "",
          site_address: data.contact_information?.site_address || "",
          telephone: data.contact_information?.telephone || "",
          email: data.contact_information?.email || "",
          contact_name: data.representative_details?.contact_name || "",
          position: data.representative_details?.position || "",
          client_folder_url: data.gdrive?.folder_url || "",
        };
        setBusinessInfo(info);
        setResult(`Business found: ${info.business_name}`);
      } else {
        setResult(`Business not found: ${businessQuery}`);
      }
    } catch (error: unknown) {
      setResult(`Error: ${error instanceof Error ? error.message : "Search failed"}`);
    } finally {
      setBusinessLoading(false);
    }
  };

  const addLineItem = () => {
    const entered = parseFloat(grossAmount);
    const pct = parseFloat(feePercent);
    if ((!selectedSolution && !customSolution) || !Number.isFinite(entered) || entered <= 0) {
      setResult("Please select a type and enter the full outcome amount");
      return;
    }
    const gross = toExGst(entered, amountIncludesGst);
    let solutionLabel = "";
    let solutionType = "";
    if (useCustomSolution && customSolution.trim()) {
      solutionLabel = customSolution.trim();
      solutionType = "custom";
    } else {
      const solution = NEW_REVENUE_TYPES.find((s) => s.id === selectedSolution);
      if (!solution) {
        setResult("Please select a valid type");
        return;
      }
      solutionLabel = solution.label;
      solutionType = solution.id;
    }
    setLineItems((prev) => [
      ...prev,
      lineItemFromGross(solutionType, solutionLabel, gross, Number.isFinite(pct) ? pct : DEFAULT_FEE_PERCENT),
    ]);
    setSelectedSolution("");
    setCustomSolution("");
    setUseCustomSolution(false);
    setGrossAmount("");
    setFeePercent(String(DEFAULT_FEE_PERCENT));
    setResult("");
  };

  const generateInvoiceNumber = async () => {
    try {
      const res = await fetch("/api/new-revenue/next-invoice-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: businessInfo?.business_name || null }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.invoice_number) return data.invoice_number as string;
      }
    } catch (error) {
      console.error("Error generating invoice number:", error);
    }
    return `RA${String(Math.floor(Math.random() * 9000) + 1000)}`;
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" });

  const formatDateForEmail = (date: Date) =>
    date.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });

  const formatIsoDateForEmail = (isoDate: string) => {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return isoDate;
    return formatDateForEmail(parsed);
  };

  const buildInvoiceEmailHtml = ({
    clientName,
    businessName,
    solutionSummary,
    invoiceNumber,
    invoiceDate,
    dueDate,
    totalAmountValue,
  }: {
    clientName: string;
    businessName: string;
    solutionSummary: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    totalAmountValue: number;
  }) => {
    const safeClientName = clientName || "Client";
    const safeSolutionSummary = solutionSummary || "the selected solution";
    return [
      `<p>Hi ${safeClientName},</p>`,
      `<p>Your discrepancy / new revenue invoice has been generated for ${businessName} for ${safeSolutionSummary}.</p>`,
      `<p><strong>Key details:</strong><br/>Invoice number: ${invoiceNumber}<br/>Invoice date: ${invoiceDate}<br/>Due date: ${dueDate}<br/>Total amount due: ${formatAud(totalAmountValue)} (incl. GST)<br/>The full invoice is attached as a PDF for your records.</p>`,
      `<p>If you have any questions, please reply to this email.</p>`,
      `<p>Best Regards,</p>`,
      `<p>Amelia Williams<br/>Customer Success Manager (CSM) - Implementation: Connects onboarding directly to future success.</p>`,
      `<p>Carbon Zero Australasia<br/>Australian Circular Economy Solutions Division<br/>Direct: Ph: 1300 938 638<br/>Email: business@acesolutions.com.au<br/>470 St Kilda Road, Melbourne VIC 3004<br/>Ph: 1300 849 908 | Website: acesolutions.com.au</p>`,
    ].join("");
  };

  const persistInvoiceFileId = async (
    invoiceNumber: string,
    businessName: string,
    fileId: string
  ) => {
    try {
      const res = await fetch("/api/new-revenue/file-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          invoice_number: invoiceNumber,
          file_id: fileId,
        }),
      });
      if (res.ok) {
        fetchInvoiceHistory();
      }
    } catch (err) {
      console.warn("Failed to persist invoice file_id to sheet:", err);
    }
  };

  const applyDriveFileId = (invoiceNumber: string, businessName: string, fileId: string) => {
    setSendRequestPayload((prev) =>
      prev && prev.invoice_number === invoiceNumber ? { ...prev, invoice_file_id: fileId } : prev
    );
    setLastGeneratedBanner((prev) =>
      prev && prev.invoice_number === invoiceNumber ? { ...prev, drive_file_id: fileId } : prev
    );
    void persistInvoiceFileId(invoiceNumber, businessName, fileId);
  };

  const handleRetryDriveUpload = async () => {
    const ref = lastGeneratedPdfRef.current;
    const banner = lastGeneratedBanner;
    if (!ref?.bytes?.length || !banner || !businessInfo) {
      setResult("No generated PDF in this session — generate the invoice again first.");
      return;
    }
    const metadata =
      lastUploadMetadataRef.current ??
      (sendRequestPayload
        ? {
            invoiceNumber: sendRequestPayload.invoice_number,
            businessName: sendRequestPayload.business_name,
            dueDate: sendRequestPayload.due_date,
            invoiceDate: sendRequestPayload.invoice_date,
            status: "Generated",
            subtotal: sendRequestPayload.subtotal,
            totalGst: sendRequestPayload.total_gst,
            totalAmount: sendRequestPayload.total_amount,
            lineItems: sendRequestPayload.line_items,
          }
        : null);
    if (!metadata) {
      setResult("Invoice metadata missing — generate the invoice again first.");
      return;
    }
    setUploadingToDrive(true);
    try {
      const upload = await uploadInvoicePdfToDrive({
        pdfBytes: ref.bytes,
        filename: ref.filename,
        metadata,
      });
      if (upload.fileId) {
        applyDriveFileId(banner.invoice_number, businessInfo.business_name, upload.fileId);
        setResult(`Invoice ${banner.invoice_number} uploaded to Google Drive. You can send to the client when ready.`);
        showToast("Drive upload succeeded", "success");
      } else {
        setResult(
          `Drive upload still failed for ${banner.invoice_number}. ${upload.errorDetail || "Check n8n file-upload workflow."}`
        );
      }
    } finally {
      setUploadingToDrive(false);
    }
  };

  const handleSendToClient = async () => {
    if (!sendRequestPayload) return;
    if (!canSendInvoicePayload(sendRequestPayload)) {
      setResult("Cannot send: Google Drive file ID is missing. Retry Drive upload first — n8n downloads the PDF from Drive, same as 1st Month Savings.");
      return;
    }
    if (!sendClientEmail.trim()) {
      setResult("Please provide a client email address before sending.");
      return;
    }
    setSendingToClient(true);
    try {
      const finalClientName = sendClientName.trim() || sendRequestPayload.business_name;
      const finalClientEmail = sendClientEmail.trim();
      const solutionSummary = Array.from(
        new Set((sendRequestPayload.line_items || []).map((item) => item.solution_label).filter(Boolean))
      ).join(", ");
      const finalHtmlBody = buildInvoiceEmailHtml({
        clientName: finalClientName,
        businessName: sendRequestPayload.business_name,
        solutionSummary,
        invoiceNumber: sendRequestPayload.invoice_number,
        invoiceDate: formatIsoDateForEmail(sendRequestPayload.invoice_date),
        dueDate: formatIsoDateForEmail(sendRequestPayload.due_date),
        totalAmountValue: sendRequestPayload.total_amount,
      });
      const res = await fetch("/api/new-revenue/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sendRequestPayload,
          client_name: finalClientName,
          client_email: finalClientEmail,
          subject: sendSubject.trim(),
          html_body: finalHtmlBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string })?.error || "Failed to send invoice to client");
      }
      showToast(
        `Send workflow triggered for ${finalClientEmail}. Webhook returned OK — n8n should process the email next.`,
        "success"
      );
      const statusRes = await fetch("/api/new-revenue/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: sendRequestPayload.business_name,
          invoice_number: sendRequestPayload.invoice_number,
          status: "Sent",
        }),
      });
      if (statusRes.ok) {
        setInvoiceHistory((prev) =>
          prev.map((inv) =>
            inv.invoice_number === sendRequestPayload.invoice_number ? { ...inv, status: "Sent" } : inv
          )
        );
      }
      setSendModalOpen(false);
      setResult(
        `Invoice ${sendRequestPayload.invoice_number} generated and sent request submitted for ${finalClientEmail}.`
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Send failed";
      setResult(`Send failed: ${msg}`);
      showToast(msg, "error");
    } finally {
      setSendingToClient(false);
    }
  };

  const generateInvoicePDF = async () => {
    if (!businessInfo || lineItems.length === 0) {
      setResult("Please add at least one discrepancy or new revenue line");
      return;
    }
    setGenerating(true);
    setResult("");
    setLastGeneratedBanner(null);
    lastGeneratedPdfRef.current = null;

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let logoImage = null;
      try {
        const logoResponse = await fetch("/images/logo/EGB Logo.png");
        if (logoResponse.ok) {
          logoImage = await pdfDoc.embedPng(await logoResponse.arrayBuffer());
        }
      } catch (logoError) {
        console.warn("Could not load EGB logo:", logoError);
      }

      const invoiceNumber = await generateInvoiceNumber();
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 14);

      const leftMargin = 50;
      const rightMargin = width - 50;
      let logoHeight = 0;
      if (logoImage) {
        const scale = 0.15;
        logoHeight = logoImage.height * scale;
        page.drawImage(logoImage, {
          x: leftMargin,
          y: height - 50 - logoHeight,
          width: logoImage.width * scale,
          height: logoHeight,
        });
      }

      let y = height - 50 - logoHeight - 30;
      page.drawText(EGB_DETAILS.name, { x: leftMargin, y, size: 10, font: boldFont });
      const companyDetailsStartY = y;
      y -= 14;
      page.drawText(`ABN - ${EGB_DETAILS.abn}`, { x: leftMargin, y, size: 9, font });
      y -= 12;
      page.drawText(EGB_DETAILS.address, { x: leftMargin, y, size: 9, font });
      y -= 12;
      page.drawText(EGB_DETAILS.city, { x: leftMargin, y, size: 9, font });
      y -= 12;
      page.drawText(EGB_DETAILS.phone, { x: leftMargin, y, size: 9, font });
      y -= 12;
      page.drawText(EGB_DETAILS.email, { x: leftMargin, y, size: 9, font });

      let billToY = companyDetailsStartY;
      const billToX = 320;
      page.drawText("BILL TO", { x: billToX, y: billToY, size: 10, font: boldFont });
      billToY -= 14;
      page.drawText(businessInfo.business_name, { x: billToX, y: billToY, size: 9, font });
      billToY -= 12;
      if (businessInfo.contact_name) {
        page.drawText(businessInfo.contact_name, { x: billToX, y: billToY, size: 9, font });
        billToY -= 12;
      }
      if (businessInfo.postal_address) {
        const addressLines = businessInfo.postal_address.match(/.{1,45}/g) || [businessInfo.postal_address];
        for (const line of addressLines) {
          page.drawText(line, { x: billToX, y: billToY, size: 9, font });
          billToY -= 12;
        }
      }
      if (businessInfo.telephone) {
        page.drawText(businessInfo.telephone, { x: billToX, y: billToY, size: 9, font });
        billToY -= 12;
      }
      if (businessInfo.email) {
        page.drawText(businessInfo.email, { x: billToX, y: billToY, size: 9, font });
      }

      y -= 30;
      page.drawText("NEW REVENUE / DISCREPANCY TAX INVOICE", {
        x: width / 2 - 175,
        y,
        size: 14,
        font: boldFont,
      });

      y -= 40;
      page.drawLine({
        start: { x: leftMargin, y: y + 10 },
        end: { x: rightMargin, y: y + 10 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });
      y -= 5;
      page.drawText("Invoice Number:", { x: leftMargin, y, size: 9, font });
      page.drawText(invoiceNumber, { x: 200, y, size: 9, font });
      y -= 14;
      page.drawText("Invoice Date:", { x: leftMargin, y, size: 9, font });
      page.drawText(formatDate(invoiceDate), { x: 200, y, size: 9, font });
      y -= 14;
      page.drawText("Payment Due:", { x: leftMargin, y, size: 9, font });
      page.drawText(formatDate(dueDate), { x: 200, y, size: 9, font });
      y -= 14;
      page.drawText("Amount Due (AUD):", { x: leftMargin, y, size: 9, font });
      page.drawText(formatAud(totalAmount), { x: 200, y, size: 9, font: boldFont });

      y -= 30;
      const colType = leftMargin;
      const colGross = 250;
      const colFee = 360;
      const colGst = 460;
      page.drawText("Type", { x: colType, y, size: 9, font: boldFont });
      page.drawText("Gross outcome", { x: colGross, y, size: 9, font: boldFont });
      page.drawText("Fee (20%)", { x: colFee, y, size: 9, font: boldFont });
      page.drawText("GST", { x: colGst, y, size: 9, font: boldFont });
      y -= 5;
      page.drawLine({
        start: { x: leftMargin, y },
        end: { x: rightMargin, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      for (const item of lineItems) {
        y -= 18;
        const label = item.solution_label.length > 32 ? `${item.solution_label.slice(0, 32)}…` : item.solution_label;
        page.drawText(label, { x: colType, y, size: 8, font });
        page.drawText(formatAud(item.gross_amount), { x: colGross, y, size: 9, font });
        page.drawText(formatAud(item.fee_amount), { x: colFee, y, size: 9, font });
        page.drawText(formatAud(item.gst), { x: colGst, y, size: 9, font });
      }

      y -= 25;
      page.drawText("Total:", { x: colFee, y, size: 9, font: boldFont });
      page.drawText(formatAud(totalAmount), { x: colGst, y, size: 9, font: boldFont });

      y -= 30;
      page.drawText("Fee is 20% of the new revenue stream or rebate achieved, billed after the outcome was created.", {
        x: leftMargin,
        y,
        size: 8,
        font,
      });

      y -= 40;
      page.drawText("Notes / Terms", { x: leftMargin, y, size: 10, font: boldFont });
      y -= 16;
      page.drawText("Bank Details", { x: leftMargin, y, size: 9, font: boldFont });
      y -= 12;
      page.drawText(EGB_DETAILS.bank.name, { x: leftMargin, y, size: 9, font });
      y -= 12;
      page.drawText(`Account Name - ${EGB_DETAILS.bank.accountName}`, { x: leftMargin, y, size: 9, font });
      y -= 12;
      page.drawText(`BSB - ${EGB_DETAILS.bank.bsb}`, { x: leftMargin, y, size: 9, font });
      y -= 12;
      page.drawText(`Account No - ${EGB_DETAILS.bank.accountNo}`, { x: leftMargin, y, size: 9, font });
      y -= 16;
      page.drawText("Reference - PLEASE QUOTE YOUR INVOICE NUMBER", { x: leftMargin, y, size: 9, font: boldFont });
      y -= 12;
      page.drawText("Terms of sale: 14 Days Net of Invoice Date", { x: leftMargin, y, size: 9, font });

      const pdfBytes = await pdfDoc.save();
      const filename = `${businessInfo.business_name} - ${invoiceNumber}.pdf`;
      lastGeneratedPdfRef.current = { bytes: pdfBytes, filename };

      const dueDateStr = dueDate.toISOString().split("T")[0];
      const invoiceDateStr = invoiceDate.toISOString().split("T")[0];
      const uploadMetadata: InvoiceUploadMetadata = {
        invoiceNumber,
        businessName: businessInfo.business_name,
        dueDate: dueDateStr,
        invoiceDate: invoiceDateStr,
        status: "Generated",
        subtotal,
        totalGst,
        totalAmount,
        lineItems,
      };
      lastUploadMetadataRef.current = uploadMetadata;
      const upload = await uploadInvoicePdfToDrive({
        pdfBytes,
        filename,
        metadata: uploadMetadata,
      });
      const invoiceFileId = upload.fileId;

      try {
        await fetch("/api/new-revenue/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_number: invoiceNumber,
            business_name: businessInfo.business_name,
            business_abn: businessInfo.abn,
            contact_name: businessInfo.contact_name,
            contact_email: businessInfo.email,
            invoice_date: invoiceDateStr,
            due_date: dueDateStr,
            line_items: lineItems,
            subtotal,
            total_gst: totalGst,
            total_amount: totalAmount,
            status: "Generated",
            created_at: new Date().toISOString(),
            invoice_file_id: invoiceFileId,
          }),
        });
      } catch (logError) {
        console.warn("Invoice log failed:", logError);
      }

      const pdfBase64 = pdfBytesToBase64(pdfBytes);
      const solutionSummary = Array.from(
        new Set(lineItems.map((item) => item.solution_label).filter(Boolean))
      ).join(", ");
      const defaultClientName = businessInfo.contact_name || businessInfo.business_name;
      const defaultClientEmail = businessInfo.email || "";
      const defaultSubject = `Discrepancy / New Revenue Invoice ${invoiceNumber} – ${solutionSummary} - ${businessInfo.business_name}`;
      const defaultHtml = buildInvoiceEmailHtml({
        clientName: defaultClientName,
        businessName: businessInfo.business_name,
        solutionSummary,
        invoiceNumber,
        invoiceDate: formatDateForEmail(invoiceDate),
        dueDate: formatDateForEmail(dueDate),
        totalAmountValue: totalAmount,
      });

      setSendClientName(defaultClientName);
      setSendClientEmail(defaultClientEmail);
      setSendSubject(defaultSubject);
      setSendRequestPayload({
        invoice_number: invoiceNumber,
        business_name: businessInfo.business_name,
        client_name: defaultClientName,
        client_email: defaultClientEmail,
        subject: defaultSubject,
        html_body: defaultHtml,
        attachment_filename: filename,
        pdf_base64: pdfBase64,
        invoice_file_id: invoiceFileId,
        invoice_date: invoiceDateStr,
        due_date: dueDateStr,
        subtotal,
        total_gst: totalGst,
        total_amount: totalAmount,
        line_items: lineItems,
      });
      setSendModalOpen(true);

      setLastGeneratedBanner({
        invoice_number: invoiceNumber,
        filename,
        drive_file_id: invoiceFileId.trim() || null,
      });
      setResult(
        invoiceFileId.trim()
          ? `Invoice ${invoiceNumber} generated and uploaded to Drive. Send to the client when ready.`
          : `Invoice ${invoiceNumber} generated but Drive upload failed. ${upload.errorDetail || "Retry Drive upload before sending — n8n needs the file ID."}`
      );
      showToast(
        invoiceFileId.trim()
          ? `Invoice ${invoiceNumber} generated`
          : `Invoice generated but Drive upload failed`,
        invoiceFileId.trim() ? "success" : "error"
      );
      fetchInvoiceHistory();
      setLineItems([]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setResult(`Error generating invoice: ${message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadLastGeneratedPdf = () => {
    const ref = lastGeneratedPdfRef.current;
    if (!ref?.bytes?.length) return;
    const blob = new Blob([ref.bytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ref.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleNewSearch = () => {
    setBusinessInfo(null);
    setBusinessQuery("");
    setLineItems([]);
    setInvoiceHistory([]);
    setResult("");
    setLastGeneratedBanner(null);
    lastGeneratedPdfRef.current = null;
  };

  return (
    <>
      <PageHeader
        pageName="Discrepancy / New Revenue"
        title="New revenue / discrepancy tax invoice"
        description="Bill 20% of a recovered discrepancy, rebate, or new revenue stream after the outcome has been created."
      />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">1. Select Business</h2>
              {!businessInfo ? (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={businessQuery}
                    onChange={(e) => setBusinessQuery(e.target.value)}
                    placeholder="Enter business name..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    onKeyDown={(e) => e.key === "Enter" && searchBusiness()}
                  />
                  <button
                    onClick={searchBusiness}
                    disabled={businessLoading || !businessQuery.trim()}
                    className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {businessLoading ? "Searching..." : "Search"}
                  </button>
                </div>
              ) : (
                <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-cyan-800">{businessInfo.business_name}</h3>
                      {businessInfo.abn && <p className="text-sm text-gray-600">ABN: {businessInfo.abn}</p>}
                    </div>
                    <button onClick={handleNewSearch} className="text-sm text-gray-500 underline">
                      Change
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    {businessInfo.contact_name && <p>Contact: {businessInfo.contact_name}</p>}
                    {businessInfo.email && <p>Email: {businessInfo.email}</p>}
                    {businessInfo.telephone && <p>Phone: {businessInfo.telephone}</p>}
                    {businessInfo.postal_address && <p>Address: {businessInfo.postal_address}</p>}
                  </div>
                </div>
              )}
            </div>

            {businessInfo && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-1">2. Add outcome</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Enter the full recovered / new-revenue amount. The invoice bills 20% of that (plus GST on the fee).
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="useCustomSolution"
                    checked={useCustomSolution}
                    onChange={(e) => {
                      setUseCustomSolution(e.target.checked);
                      if (e.target.checked) setSelectedSolution("");
                      else setCustomSolution("");
                    }}
                    className="w-4 h-4"
                  />
                  <label htmlFor="useCustomSolution" className="text-sm text-gray-700">
                    Enter custom type
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  {useCustomSolution ? (
                    <input
                      type="text"
                      value={customSolution}
                      onChange={(e) => setCustomSolution(e.target.value)}
                      placeholder="Custom type"
                      className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <select
                      value={selectedSolution}
                      onChange={(e) => setSelectedSolution(e.target.value)}
                      className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select type...</option>
                      {NEW_REVENUE_TYPES.map((solution) => (
                        <option key={solution.id} value={solution.id}>
                          {solution.label} ({solution.category})
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={grossAmount}
                      onChange={(e) => setGrossAmount(e.target.value)}
                      placeholder={amountIncludesGst ? "Full amount (incl. GST)" : "Full amount (ex GST)"}
                      min="0"
                      step="0.01"
                      className="w-48 pl-7 pr-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-sm text-gray-700 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={amountIncludesGst}
                      onChange={(e) => setAmountIncludesGst(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    Incl. GST
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={feePercent}
                      onChange={(e) => setFeePercent(e.target.value)}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-24 pr-8 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                  <button
                    onClick={addLineItem}
                    disabled={(!selectedSolution && !customSolution) || !grossAmount}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    Add Item
                  </button>
                </div>

                {preview && (
                  <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                    {amountIncludesGst ? (
                      <>
                        Entered {formatAud(parseFloat(grossAmount))} incl. GST → ex GST {formatAud(preview.gross)} →{" "}
                      </>
                    ) : (
                      <>Gross {formatAud(preview.gross)} → </>
                    )}
                    fee {preview.feePercent}% = <strong>{formatAud(preview.fee)}</strong> + GST {formatAud(preview.gst)}{" "}
                    = <strong>{formatAud(preview.total)} due</strong>
                  </div>
                )}

                {lineItems.length > 0 ? (
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Gross</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Fee</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">GST</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Total</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {lineItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">{item.solution_label}</td>
                            <td className="px-4 py-3 text-right">{formatAud(item.gross_amount)}</td>
                            <td className="px-4 py-3 text-right">{formatAud(item.fee_amount)}</td>
                            <td className="px-4 py-3 text-right">{formatAud(item.gst)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatAud(item.total)}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setLineItems((prev) => prev.filter((row) => row.id !== item.id))}
                                className="text-red-500 hover:text-red-700"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-medium">
                        <tr>
                          <td className="px-4 py-3" colSpan={2}>Total</td>
                          <td className="px-4 py-3 text-right">{formatAud(subtotal)}</td>
                          <td className="px-4 py-3 text-right">{formatAud(totalGst)}</td>
                          <td className="px-4 py-3 text-right text-cyan-700">{formatAud(totalAmount)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="mt-4 text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    Add a discrepancy or new revenue amount to generate an invoice
                  </div>
                )}
              </div>
            )}

            {businessInfo && lineItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">3. Generate Invoice</h2>
                <button
                  onClick={generateInvoicePDF}
                  disabled={generating}
                  className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 text-lg font-medium"
                >
                  {generating ? "Generating..." : `Generate Invoice (${formatAud(totalAmount)})`}
                </button>
                {result && (
                  <div className="mt-4 p-4 rounded-lg border bg-cyan-50 text-cyan-800 border-cyan-200">{result}</div>
                )}
                {lastGeneratedBanner && (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-800">Invoice {lastGeneratedBanner.invoice_number}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadLastGeneratedPdf}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium"
                      >
                        Download PDF
                      </button>
                      {lastGeneratedBanner.drive_file_id ? (
                        <a
                          href={`https://drive.google.com/file/d/${lastGeneratedBanner.drive_file_id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white"
                        >
                          Open in Google Drive
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRetryDriveUpload}
                          disabled={uploadingToDrive}
                          className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          {uploadingToDrive ? "Uploading…" : "Retry Drive upload"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice History</h2>
              {!businessInfo ? (
                <p className="text-gray-500 text-sm">Select a business to view invoice history</p>
              ) : historyLoading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : invoiceHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">No invoices generated yet for this business</p>
              ) : (
                <div className="space-y-3">
                  {invoiceHistory.map((invoice) => (
                    <div key={invoice.invoice_number} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500">{invoice.due_date || ""}</p>
                        </div>
                        <p className="font-semibold text-cyan-700">{formatAud(Number(invoice.total_amount || 0))}</p>
                      </div>
                      {invoice.invoice_file_id && (
                        <a
                          href={`https://drive.google.com/file/d/${invoice.invoice_file_id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-blue-600 hover:underline"
                        >
                          View Invoice PDF
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-cyan-50 rounded-xl border border-cyan-200 p-6">
              <h3 className="font-semibold text-cyan-800 mb-2">Fee model</h3>
              <ul className="text-sm text-cyan-800 space-y-1">
                <li>Enter the full rebate / recovered amount</li>
                <li>Invoice = 20% of that amount (ex GST)</li>
                <li>GST 10% is added on the fee</li>
                <li>Ongoing monthly savings still use 1st Month Savings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {sendModalOpen && sendRequestPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Send invoice to client?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Invoice <strong>{sendRequestPayload.invoice_number}</strong> is ready. Review details below and send via webhook.
              </p>
            </div>

            {sendRequestPayload.invoice_file_id?.trim() ? (
              <div className="mx-6 mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                <a
                  href={`https://drive.google.com/file/d/${sendRequestPayload.invoice_file_id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-cyan-800 underline hover:text-cyan-950"
                >
                  Open invoice in Google Drive
                </a>
                <p className="mt-1 text-xs text-cyan-800/90">
                  n8n will download this file and attach it as binary, same as 1st Month Savings.
                </p>
              </div>
            ) : (
              <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <strong>Google Drive file ID is missing.</strong> Upload must succeed before send — n8n downloads the PDF from Drive.
                <button
                  type="button"
                  onClick={handleRetryDriveUpload}
                  disabled={uploadingToDrive}
                  className="mt-2 block rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {uploadingToDrive ? "Uploading…" : "Retry Drive upload"}
                </button>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={sendClientName}
                    onChange={(e) => setSendClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                  <input
                    type="email"
                    value={sendClientEmail}
                    onChange={(e) => setSendClientEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="client@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                <input
                  type="text"
                  value={sendSubject}
                  onChange={(e) => setSendSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSendModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={sendingToClient}
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleSendToClient}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={sendingToClient || !canSendInvoicePayload(sendRequestPayload)}
              >
                {sendingToClient ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function NewRevenuePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading invoice…</div>}>
      <NewRevenueInvoicePage />
    </Suspense>
  );
}
