"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

// EGB Company Details (from invoice template)
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

// Solution types that can have savings
const SOLUTION_TYPES = [
  { id: "ci_electricity", label: "C&I Electricity Reviews", category: "Profile Reset" },
  { id: "sme_electricity", label: "SME Electricity Reviews", category: "Profile Reset" },
  { id: "ci_gas", label: "C&I Gas Reviews", category: "Profile Reset" },
  { id: "sme_gas", label: "SME Gas Reviews", category: "Profile Reset" },
  { id: "waste", label: "Waste Reviews", category: "Profile Reset" },
  { id: "demand_response", label: "Demand Response", category: "Asset Optimisation" },
  { id: "solar_rooftop", label: "Solar Rooftop", category: "Renewable Energy" },
  { id: "solar_carpark", label: "Solar Car Park", category: "Renewable Energy" },
  { id: "resource_recovery", label: "Resource Recovery", category: "Resource Recovery" },
  { id: "robot_cleaning", label: "AI Cleaning Bot", category: "AI Bots" },
];

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
  savings_amount: number;
  gst: number;
  total: number;
}

interface InvoiceRecord {
  invoice_number: string;
  business_name: string;
  business_abn: string;
  contact_name: string;
  contact_email: string;
  invoice_date: string;
  due_date: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  total_gst: number;
  total_amount: number;
  status: string;
  created_at: string;
  pdf_url?: string;
}

export default function OneMonthSavingsPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const searchParams = useSearchParams();

  // Business info state
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [businessQuery, setBusinessQuery] = useState("");
  const [businessLoading, setBusinessLoading] = useState(false);

  // Invoice line items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [selectedSolution, setSelectedSolution] = useState("");
  const [customSolution, setCustomSolution] = useState("");
  const [useCustomSolution, setUseCustomSolution] = useState(false);
  const [savingsAmount, setSavingsAmount] = useState("");

  // Invoice tracking
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");

  // Load business info from URL params
  useEffect(() => {
    const businessName = searchParams.get("businessName");
    if (businessName) {
      const businessFromUrl: BusinessInfo = {
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
      };
      setBusinessInfo(businessFromUrl);
      setResult(`Business loaded: ${businessName}`);
    }
  }, [searchParams]);

  // Load invoice history for this business
  const fetchInvoiceHistory = useCallback(async () => {
    if (!businessInfo?.business_name) return;

    setHistoryLoading(true);
    try {
      console.log("🔍 [Frontend] Fetching invoice history for:", businessInfo.business_name);
      const res = await fetch("/api/one-month-savings/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: businessInfo.business_name }),
      });

      console.log("🔍 [Frontend] History response status:", res.status);
      console.log("🔍 [Frontend] History response ok:", res.ok);

      if (res.ok) {
        const data = await res.json();
        console.log("🔍 [Frontend] History data received:", JSON.stringify(data, null, 2));
        console.log("🔍 [Frontend] Data keys:", Object.keys(data));
        console.log("🔍 [Frontend] Invoices array:", data.invoices);
        console.log("🔍 [Frontend] Invoices length:", data.invoices?.length || 0);
        const invoices = data.invoices || [];
        console.log("🔍 [Frontend] Setting invoice history with", invoices.length, "invoices");
        setInvoiceHistory(invoices);
      } else {
        const errorText = await res.text();
        console.error("❌ [Frontend] History error:", errorText);
      }
    } catch (error) {
      console.error("❌ [Frontend] Error fetching invoice history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [businessInfo?.business_name]);

  useEffect(() => {
    if (businessInfo?.business_name) {
      fetchInvoiceHistory();
    }
  }, [businessInfo?.business_name, fetchInvoiceHistory]);

  // Search for business
  const searchBusiness = async () => {
    if (!businessQuery.trim() || !token) return;

    setBusinessLoading(true);
    setResult("");

    try {
      const backendUrl = process.env.NODE_ENV === "development"
        ? "http://localhost:8000"
        : "https://text-agent-backend-672026052958.australia-southeast2.run.app";

      const res = await fetch(`${backendUrl}/api/get-business-info`, {
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
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setBusinessLoading(false);
    }
  };

  // Add line item
  const addLineItem = () => {
    if ((!selectedSolution && !customSolution) || !savingsAmount) {
      setResult("Please select or enter a solution type and enter a savings amount");
      return;
    }

    let solutionLabel = "";
    let solutionType = "";

    if (useCustomSolution && customSolution.trim()) {
      solutionLabel = customSolution.trim();
      solutionType = "custom";
    } else {
      const solution = SOLUTION_TYPES.find((s) => s.id === selectedSolution);
      if (!solution) {
        setResult("Please select a valid solution type");
        return;
      }
      solutionLabel = solution.label;
      solutionType = solution.id;
    }

    const savings = parseFloat(savingsAmount);
    if (isNaN(savings) || savings <= 0) {
      setResult("Please enter a valid savings amount");
      return;
    }

    const gst = savings * 0.1;
    const total = savings + gst;

    const newItem: InvoiceLineItem = {
      id: `${Date.now()}`,
      solution_type: solutionType,
      solution_label: solutionLabel,
      savings_amount: savings,
      gst: gst,
      total: total,
    };

    setLineItems([...lineItems, newItem]);
    setSelectedSolution("");
    setCustomSolution("");
    setUseCustomSolution(false);
    setSavingsAmount("");
    setResult("");
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.savings_amount, 0);
  const totalGst = lineItems.reduce((sum, item) => sum + item.gst, 0);
  const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);

  // Generate sequential invoice number
  const generateInvoiceNumber = async () => {
    try {
      const backendUrl = process.env.NODE_ENV === "development"
        ? "http://localhost:8000"
        : "https://text-agent-backend-672026052958.australia-southeast2.run.app";

      // Use API route instead of calling backend directly
      const res = await fetch("/api/one-month-savings/next-invoice-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ business_name: businessInfo?.business_name || null }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.invoice_number;
      } else {
        // Fallback to random if backend fails
        const prefix = "RA";
        const number = Math.floor(Math.random() * 9000) + 1000;
        return `${prefix}${number}`;
      }
    } catch (error) {
      console.error("Error generating invoice number:", error);
      // Fallback to random if backend fails
      const prefix = "RA";
      const number = Math.floor(Math.random() * 9000) + 1000;
      return `${prefix}${number}`;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Generate PDF Invoice
  const generateInvoicePDF = async () => {
    if (!businessInfo || lineItems.length === 0) {
      setResult("Please add at least one service with savings");
      return;
    }

    setGenerating(true);
    setResult("");

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Load and embed EGB logo
      let logoImage;
      try {
        const logoResponse = await fetch("/images/logo/EGB Logo.png");
        if (logoResponse.ok) {
          const logoBytes = await logoResponse.arrayBuffer();
          logoImage = await pdfDoc.embedPng(logoBytes);
        }
      } catch (logoError) {
        console.warn("Could not load EGB logo:", logoError);
      }

      const invoiceNumber = await generateInvoiceNumber();
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 14);

      let y = height - 50;
      const leftMargin = 50;
      const rightMargin = width - 50;

      // Draw logo if loaded (top left, above company details)
      let logoHeight = 0;
      if (logoImage) {
        const scale = 0.15; // Scale down to fit nicely
        const logoWidth = logoImage.width * scale;
        logoHeight = logoImage.height * scale;
        page.drawImage(logoImage, {
          x: leftMargin,
          y: height - 50 - logoHeight,
          width: logoWidth,
          height: logoHeight,
        });
      }

      // Start company details below logo with proper spacing
      y = height - 50 - logoHeight - 30; // More spacing below logo

      // Company Details (Left)
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

      // Bill To (Right side, aligned with company details)
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

      // Header - Title (after company details and bill to)
      y -= 30; // Space before title
      page.drawText("1ST MONTH SAVINGS TAX INVOICE", {
        x: width / 2 - 130,
        y: y,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Invoice Details
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
      page.drawText(formatCurrency(totalAmount), { x: 200, y, size: 9, font: boldFont });

      // Table Header
      y -= 30;
      page.drawLine({
        start: { x: leftMargin, y: y + 10 },
        end: { x: rightMargin, y: y + 10 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });

      // Table headers
      const colServices = leftMargin;
      const colSolution = 180;
      const colSavings = 380;
      const colGST = 480;

      page.drawText("Services", { x: colServices, y, size: 9, font: boldFont });
      page.drawText("Solution", { x: colSolution, y, size: 9, font: boldFont });
      page.drawText("1st Month's Savings", { x: colSavings, y, size: 9, font: boldFont });
      page.drawText("GST", { x: colGST, y, size: 9, font: boldFont });

      y -= 5;
      page.drawLine({
        start: { x: leftMargin, y },
        end: { x: rightMargin, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      // Table rows
      for (const item of lineItems) {
        y -= 18;
        page.drawText("1st Month's Savings Achieved", { x: colServices, y, size: 9, font });
        page.drawText(`For ${item.solution_label}`, { x: colSolution, y, size: 9, font });
        page.drawText(formatCurrency(item.savings_amount), { x: colSavings, y, size: 9, font });
        page.drawText(formatCurrency(item.gst), { x: colGST, y, size: 9, font });
      }

      // Total row
      y -= 25;
      page.drawLine({
        start: { x: colSavings - 10, y: y + 10 },
        end: { x: rightMargin, y: y + 10 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
      page.drawText("Total:", { x: colSavings, y, size: 9, font: boldFont });
      page.drawText(formatCurrency(totalAmount), { x: colGST, y, size: 9, font: boldFont });

      // Amount Due summary
      y -= 30;
      page.drawLine({
        start: { x: leftMargin, y: y + 10 },
        end: { x: rightMargin, y: y + 10 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });

      y -= 5;
      page.drawText(`Amount Due (AUD):  ${formatCurrency(totalAmount)}`, {
        x: rightMargin - 180,
        y,
        size: 10,
        font: boldFont,
      });

      // Notes / Terms section
      y -= 50;
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

      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();

      // Create download link
      // Uint8Array is compatible with Blob, but TypeScript needs explicit typing
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${businessInfo.business_name} - 1st Month Savings Invoice.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      // Log to Google Sheets
      const invoiceRecord: InvoiceRecord = {
        invoice_number: invoiceNumber,
        business_name: businessInfo.business_name,
        business_abn: businessInfo.abn,
        contact_name: businessInfo.contact_name,
        contact_email: businessInfo.email,
        invoice_date: invoiceDate.toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        line_items: lineItems,
        subtotal: subtotal,
        total_gst: totalGst,
        total_amount: totalAmount,
        status: "Generated",
        created_at: new Date().toISOString(),
      };

      // Log to tracking sheet
      try {
        await fetch("/api/one-month-savings/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoiceRecord),
        });
      } catch (logError) {
        console.error("Error logging invoice:", logError);
      }

      setResult(`Invoice ${invoiceNumber} generated and downloaded successfully!`);

      // Refresh history
      fetchInvoiceHistory();

      // Clear line items after successful generation
      setLineItems([]);

    } catch (error: any) {
      console.error("Error generating PDF:", error);
      setResult(`Error generating invoice: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Clear and start fresh
  const handleNewSearch = () => {
    setBusinessInfo(null);
    setBusinessQuery("");
    setLineItems([]);
    setInvoiceHistory([]);
    setResult("");
  };

  return (
    <>
      <Breadcrumb pageName="One Month Savings Invoice" />

      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">1st Month Savings Tax Invoice</h1>
          <p className="text-gray-600">
            Generate invoices for first month savings achieved through ACES solutions and services.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Business & Line Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">1. Select Business</h2>

              {!businessInfo ? (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={businessQuery}
                    onChange={(e) => setBusinessQuery(e.target.value)}
                    placeholder="Enter business name..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    onKeyPress={(e) => e.key === "Enter" && searchBusiness()}
                  />
                  <button
                    onClick={searchBusiness}
                    disabled={businessLoading || !businessQuery.trim()}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {businessLoading ? "Searching..." : "Search"}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-emerald-800">{businessInfo.business_name}</h3>
                      {businessInfo.abn && <p className="text-sm text-gray-600">ABN: {businessInfo.abn}</p>}
                    </div>
                    <button
                      onClick={handleNewSearch}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Change
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    {businessInfo.contact_name && <p>Contact: {businessInfo.contact_name}</p>}
                    {businessInfo.email && <p>Email: {businessInfo.email}</p>}
                    {businessInfo.telephone && <p>Phone: {businessInfo.telephone}</p>}
                    {businessInfo.postal_address && <p>Address: {businessInfo.postal_address}</p>}
                  </div>
                  {businessInfo.client_folder_url && (
                    <a
                      href={businessInfo.client_folder_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-sm text-emerald-600 hover:underline"
                    >
                      Open Client Folder
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Add Line Items */}
            {businessInfo && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">2. Add Services & Savings</h2>

                <div className="space-y-3">
                  {/* Solution Type Selection */}
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="useCustomSolution"
                      checked={useCustomSolution}
                      onChange={(e) => {
                        setUseCustomSolution(e.target.checked);
                        if (e.target.checked) {
                          setSelectedSolution("");
                        } else {
                          setCustomSolution("");
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="useCustomSolution" className="text-sm text-gray-700">
                      Enter custom solution type
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {useCustomSolution ? (
                      <input
                        type="text"
                        value={customSolution}
                        onChange={(e) => setCustomSolution(e.target.value)}
                        placeholder="Enter solution type (e.g., Custom Service Name)"
                        className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    ) : (
                      <select
                        value={selectedSolution}
                        onChange={(e) => setSelectedSolution(e.target.value)}
                        className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Select solution type...</option>
                        {SOLUTION_TYPES.map((solution) => (
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
                        value={savingsAmount}
                        onChange={(e) => setSavingsAmount(e.target.value)}
                        placeholder="Savings amount"
                        min="0"
                        step="0.01"
                        className="w-40 pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <button
                      onClick={addLineItem}
                      disabled={(!selectedSolution && !customSolution) || !savingsAmount}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Line Items Table */}
                {lineItems.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Service</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Savings</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">GST</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Total</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {lineItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">{item.solution_label}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.savings_amount)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.gst)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => removeLineItem(item.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Remove"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-medium">
                        <tr>
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(subtotal)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(totalGst)}</td>
                          <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(totalAmount)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {lineItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    Add services and their savings amounts to generate an invoice
                  </div>
                )}
              </div>
            )}

            {/* Generate Button */}
            {businessInfo && lineItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">3. Generate Invoice</h2>

                <button
                  onClick={generateInvoicePDF}
                  disabled={generating}
                  className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-lg font-medium"
                >
                  {generating ? "Generating..." : `Generate Invoice (${formatCurrency(totalAmount)})`}
                </button>

                {result && (
                  <div
                    className={`mt-4 p-4 rounded-lg ${
                      result.includes("successfully") || result.includes("found") || result.includes("loaded")
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {result}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Invoice History */}
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
                    <div
                      key={invoice.invoice_number}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500">
                            {invoice.invoice_date || (invoice.due_date ? `Due: ${invoice.due_date}` : "")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-emerald-600">
                            {formatCurrency(invoice.total_amount)}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              invoice.status === "Paid"
                                ? "bg-green-100 text-green-700"
                                : invoice.status === "Sent"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        {invoice.line_items && invoice.line_items.length > 0 ? (
                          <div>
                            {invoice.line_items.map((item: any, idx: number) => (
                              <span key={idx} className="inline-block mr-2">
                                {item.solution_label || item.solution_type || "Service"}
                                {idx < invoice.line_items.length - 1 && ","}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">No services listed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Info */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="font-semibold text-blue-800 mb-2">Invoice Details</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>Invoice from: Environmental Global Benefits</li>
                <li>ABN: {EGB_DETAILS.abn}</li>
                <li>Payment terms: 14 days</li>
                <li>GST: 10% applied automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

