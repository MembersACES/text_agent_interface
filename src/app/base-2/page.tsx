"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getApiBaseUrl, getAutonomousApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";

/** SME Gas → C&I comparison: how current SME bill is interpreted in the UI */
type SmeGasComparisonMode = "invoice_blocks" | "ci_offer" | "sme_benchmark_stub";

interface BusinessInfo {
  name?: string;
  abn?: string;
  trading_name?: string;
  postal_address?: string;
  site_address?: string;
  telephone?: string;
  email?: string;
  contact_name?: string;
  position?: string;
  industry?: string;
  website?: string;
  googleDriveLink?: string;
  utilities?: any;
  retailers?: any;
}

interface UtilityComparison {
  utilityType: string;
  identifier: string;
  identifierLabel: string;
  invoiceData: any;
  loading: boolean;
  error: string | null;
  currentMeteringDaily?: number;
  currentMeteringAnnual?: number;
  currentMeterDaily?: number;
  currentMeterAnnual?: number;
  currentVasDaily?: number;
  currentVasAnnual?: number;
  currentPeakRate?: number;
  currentOffPeakRate?: number;
  currentShoulderRate?: number;
  currentGasRate?: number;
  currentDailySupply?: number;
  currentDemandCharge?: number;
  currentOilRate?: number;
  currentWasteRate?: number;
  currentCleaningRate?: number;
  monthlyUsage?: number;
  peakUsage?: number;
  offPeakUsage?: number;
  gasUsage?: number;
  oilUsage?: number;
  wasteUsage?: number;
  cleaningUsage?: number;
  demandQuantity?: number;
  estimatedAnnualUsage?: number;
  smeGasComparisonMode?: SmeGasComparisonMode;
  smeGasPostcode?: string;
  smeGasTotalExGst?: number;
  smeGasInvoiceTotalIncludesGst?: boolean;
  smeGasInvoicePeriodGJ?: number;
  smeGasBundledRatePerGJ?: number;
  smeGasInvoiceReviewDays?: number;
  smeGasAnnualConsumptionGJ?: number;
  smeCiEnergyShareOfInvoice?: number;
  smeCiReferenceSampleCount?: number;
  smeCiReferenceLoading?: boolean;
  smeCiReferenceError?: string | null;
  smeCiReferenceMatchStrategy?: string | null;
  smeCiReferenceMatchedPostcodes?: string[];
  smeCiReferenceConfidence?: string | null;
  smeCiReferenceFetchedTag?: string;
  ciGasInvoiceReviewDays?: number;
  ciGasAnnualConsumptionGJ?: number;
  oilFrequency?: string;
  wasteFrequency?: string;
  cleaningFrequency?: string;
  comparisonMeteringDaily?: number;
  comparisonMeteringAnnual?: number;
  comparisonMeterDaily?: number;
  comparisonMeterAnnual?: number;
  comparisonVasDaily?: number;
  comparisonVasAnnual?: number;
  comparisonPeakRate?: number;
  comparisonOffPeakRate?: number;
  comparisonShoulderRate?: number;
  comparisonGasRate?: number;
  comparisonDailySupply?: number;
  comparisonDemandCharge?: number;
  comparisonOilRate?: number;
  comparisonWasteRate?: number;
  comparisonCleaningRate?: number;
  savings?: {
    peakAnnualSavings?: number;
    peakSavingsPercent?: number;
    offPeakAnnualSavings?: number;
    offPeakSavingsPercent?: number;
    meteringSavings?: number;
    supplySavings?: number;
    demandSavings?: number;
    totalAnnualSavings?: number;
    totalAnnualSavingsPercent?: number;
    gasUsageSavingsAnnual?: number;
  };
}

// ─── Visual helpers ────────────────────────────────────────────────────────────

const UTILITY_CONFIG: Record<string, { color: string; bg: string; text: string; icon: string; label: string }> = {
  "C&I Electricity": { color: "#1696CF", bg: "#EFF8FD", text: "#0E6FA0", icon: "⚡", label: "C&I Electricity" },
  "SME Electricity": { color: "#4F46E5", bg: "#EEF2FF", text: "#3730A3", icon: "⚡", label: "SME Electricity" },
  "C&I Gas":         { color: "#F97316", bg: "#FFF7ED", text: "#C2410C", icon: "🔥", label: "C&I Gas" },
  "SME Gas":         { color: "#0D9488", bg: "#F0FDFA", text: "#0F766E", icon: "🔥", label: "SME Gas" },
  "Oil":             { color: "#CA8A04", bg: "#FEFCE8", text: "#92400E", icon: "🛢️", label: "Oil" },
  "Waste":           { color: "#61B140", bg: "#F0FDF4", text: "#166534", icon: "♻️", label: "Waste" },
  "Cleaning":        { color: "#7C3AED", bg: "#F5F3FF", text: "#5B21B6", icon: "🧹", label: "Cleaning" },
};

function getUtilityConfig(type: string) {
  return UTILITY_CONFIG[type] ?? { color: "#6B7280", bg: "#F9FAFB", text: "#374151", icon: "📋", label: type };
}

/** Skeleton shimmer row */
const SkeletonRow = ({ width = "w-full" }: { width?: string }) => (
  <div className={`h-3 rounded-full bg-gray-200 animate-pulse ${width}`} />
);

/** Skeleton loading card body */
const SkeletonCardBody = () => (
  <div className="space-y-4 py-2">
    <div className="flex items-center gap-3">
      <SkeletonRow width="w-24" />
      <SkeletonRow width="w-32" />
      <SkeletonRow width="w-20" />
    </div>
    <div className="flex items-center gap-3">
      <SkeletonRow width="w-28" />
      <SkeletonRow width="w-40" />
      <SkeletonRow width="w-16" />
    </div>
    <div className="flex items-center gap-3">
      <SkeletonRow width="w-20" />
      <SkeletonRow width="w-36" />
      <SkeletonRow width="w-24" />
    </div>
    <div className="mt-2 h-8 w-40 rounded-lg bg-gray-200 animate-pulse" />
  </div>
);

// ─── All original helper functions (unchanged) ─────────────────────────────────

function ciGasBillPeriodUsageFromAnnual(
  annualGJ: number | undefined,
  invoiceDays: number | undefined
): number | undefined {
  if (annualGJ == null || annualGJ <= 0 || invoiceDays == null || invoiceDays <= 0) return undefined;
  return (annualGJ / 365) * invoiceDays;
}

function getCiGasEffectiveUsageGJ(comparison: UtilityComparison): number {
  if (comparison.utilityType !== "C&I Gas") {
    return comparison.gasUsage || comparison.monthlyUsage || 0;
  }
  const derived = ciGasBillPeriodUsageFromAnnual(
    comparison.ciGasAnnualConsumptionGJ,
    comparison.ciGasInvoiceReviewDays
  );
  if (derived != null && derived > 0) return derived;
  return comparison.gasUsage || comparison.monthlyUsage || 0;
}

function extractAustralianPostcode(text: string | undefined): string | undefined {
  if (!text || typeof text !== "string") return undefined;
  const matches = text.match(/\b\d{4}\b/g);
  if (!matches?.length) return undefined;
  return matches[matches.length - 1];
}

function normalizeAustralianPostcodeInput(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  return "";
}

function formatAud(value: number | undefined, empty = "—"): string {
  if (value == null || !Number.isFinite(value)) return empty;
  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

const AU_GST_DIVISOR = 1.1;
const DEFAULT_CI_GAS_COMPARISON_RATE_PER_GJ = 14.8;

function getSmeGasEffectiveTotalExGst(c: UtilityComparison): number | undefined {
  const raw = c.smeGasTotalExGst;
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return undefined;
  return c.smeGasInvoiceTotalIncludesGst ? raw / AU_GST_DIVISOR : raw;
}

function getSmeGasBundledRatePerGJFromState(c: UtilityComparison): number | undefined {
  const ex = getSmeGasEffectiveTotalExGst(c);
  const gj = c.smeGasInvoicePeriodGJ;
  if (ex == null || gj == null || !Number.isFinite(gj) || gj <= 0) return undefined;
  return ex / gj;
}

function withSmeGasCiDerivedRates(u: UtilityComparison): UtilityComparison {
  if (u.utilityType !== "SME Gas") return u;
  const bundled = getSmeGasBundledRatePerGJFromState(u);
  const next: UtilityComparison = { ...u, smeGasBundledRatePerGJ: bundled };
  const mode = next.smeGasComparisonMode ?? "invoice_blocks";
  if (mode === "ci_offer" && bundled != null && bundled > 0) {
    const share = next.smeCiEnergyShareOfInvoice ?? 0.72;
    next.currentGasRate = parseFloat((bundled * share).toFixed(4));
    if (next.currentGasRate > 0) {
      next.comparisonGasRate = DEFAULT_CI_GAS_COMPARISON_RATE_PER_GJ;
    }
  }
  return next;
}

function getSmeCiGasEffectiveUsageGJ(comparison: UtilityComparison): number {
  const period = comparison.smeGasInvoicePeriodGJ;
  if (period != null && period > 0 && Number.isFinite(period)) {
    return period;
  }
  const derived = ciGasBillPeriodUsageFromAnnual(
    comparison.smeGasAnnualConsumptionGJ,
    comparison.smeGasInvoiceReviewDays
  );
  if (derived != null && derived > 0) return derived;
  return comparison.gasUsage || comparison.monthlyUsage || 0;
}

function normalizeDocumentLink(link: string | undefined): string | undefined {
  if (!link || typeof link !== "string") return undefined;
  let s = link.trim();
  if (s.startsWith("=")) s = s.slice(1).trim();
  if (s.startsWith("https:/") && !s.startsWith("https://")) s = "https://" + s.slice(7);
  if (s.startsWith("http:/") && !s.startsWith("http://")) s = "http://" + s.slice(6);
  return (s.startsWith("http://") || s.startsWith("https://")) ? s : undefined;
}

function normalizeMoneyToNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    if (!cleaned) return undefined;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
}

interface GenerateChoiceModalState {
  open: boolean;
  comparison: UtilityComparison | null;
  action: 'comparison' | 'dma';
  matchingUtilities: UtilityComparison[];
}

interface GenerateResultItem {
  identifier: string;
  utilityType: string;
  pdfUrl?: string;
  spreadsheetUrl?: string;
}

interface GenerateResultModalState {
  open: boolean;
  actionName: string;
  results: GenerateResultItem[];
  errors: string[];
}

interface RecipientConfirmModalState {
  open: boolean;
  comparison: UtilityComparison | null;
  action: "comparison" | "dma";
  generateAll: boolean;
  contactName: string;
  contactEmail: string;
}

function defaultWebhookRecipient(
  businessInfo: BusinessInfo | null,
  businessInfoData: unknown
): { contactName: string; contactEmail: string } {
  const d = businessInfoData && typeof businessInfoData === "object" ? (businessInfoData as Record<string, unknown>) : {};
  const name =
    businessInfo?.contact_name ||
    (typeof d.contact_name === "string" ? d.contact_name : "") ||
    (typeof d.contactName === "string" ? d.contactName : "") ||
    "";
  const email =
    businessInfo?.email ||
    (typeof d.email === "string" ? d.email : "") ||
    (typeof d.contact_email === "string" ? d.contact_email : "") ||
    "";
  return { contactName: name, contactEmail: email };
}

function offerComparisonKindLabel(c: UtilityComparison): string {
  if (c.utilityType === "C&I Electricity") return "C&I E Offer Comparison";
  if (c.utilityType === "C&I Gas") return "C&I G Offer Comparison";
  if (c.utilityType === "SME Gas" && (c.smeGasComparisonMode ?? "invoice_blocks") === "ci_offer") {
    return "SME G Offer Comparison";
  }
  return "Comparison";
}

function offerComparisonButtonLabel(c: UtilityComparison): string {
  return `Generate ${offerComparisonKindLabel(c)}`;
}

const AUTONOMOUS_SEQUENCE_CI_GAS = 'gas_base2_followup_v1';
const AUTONOMOUS_SEQUENCE_CI_ELECTRICITY = 'ci_electricity_base2_followup_v1';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Base2Page() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const urlBusinessName = searchParams.get('businessName') || "";
  const urlBusinessInfo = searchParams.get('businessInfo');
  const urlOfferId = searchParams.get('offerId');
  const urlClientId = searchParams.get('clientId');

  const [businessName, setBusinessName] = useState<string>(urlBusinessName);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(
    urlBusinessInfo ? JSON.parse(decodeURIComponent(urlBusinessInfo)) : null
  );

  const [utilityComparisons, setUtilityComparisons] = useState<UtilityComparison[]>([]);
  const utilityComparisonsRef = useRef<UtilityComparison[]>([]);
  utilityComparisonsRef.current = utilityComparisons;
  const [sending, setSending] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessInfoData, setBusinessInfoData] = useState<any>(null);
  const [businessInfoFetchDone, setBusinessInfoFetchDone] = useState(false);

  const [generateChoiceModal, setGenerateChoiceModal] = useState<GenerateChoiceModalState>({
    open: false,
    comparison: null,
    action: 'comparison',
    matchingUtilities: [],
  });
  const [generateResultModal, setGenerateResultModal] = useState<GenerateResultModalState>({
    open: false,
    actionName: '',
    results: [],
    errors: [],
  });
  const [recipientConfirmModal, setRecipientConfirmModal] = useState<RecipientConfirmModalState>({
    open: false,
    comparison: null,
    action: "comparison",
    generateAll: false,
    contactName: "",
    contactEmail: "",
  });

  const token = (session as any)?.id_token;

  const smeCiGasReferenceKey = useMemo(
    () =>
      utilityComparisons
        .filter((c) => c.utilityType === "SME Gas" && c.smeGasComparisonMode === "ci_offer")
        .map((c) => `${c.identifier}|${normalizeAustralianPostcodeInput(c.smeGasPostcode || "")}`)
        .join(";"),
    [utilityComparisons]
  );

  useEffect(() => {
    if (!token || !smeCiGasReferenceKey) return;
    const list = utilityComparisonsRef.current;
    const run = async () => {
      for (const c of list) {
        if (c.utilityType !== "SME Gas" || c.smeGasComparisonMode !== "ci_offer") continue;
        const pc = normalizeAustralianPostcodeInput(c.smeGasPostcode || "");
        if (pc.length !== 4) continue;
        const tag = `${c.identifier}|${pc}`;
        if (c.smeCiReferenceFetchedTag === tag) continue;

        setUtilityComparisons((prev) =>
          prev.map((u) =>
            u.utilityType === "SME Gas" && u.identifier === c.identifier
              ? { ...u, smeCiReferenceLoading: true, smeCiReferenceError: null }
              : u
          )
        );
        try {
          const debugQs =
            typeof process !== "undefined" && process.env.NODE_ENV === "development"
              ? "&debug=true"
              : "";
          const url = `${getApiBaseUrl()}/api/base2/ci-gas-energy-reference?postcode=${encodeURIComponent(pc)}&relax_postcode=true${debugQs}`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          const data = (await res.json()) as Record<string, unknown>;
          if (data.diagnostics != null && typeof data.diagnostics === "object") {
            console.info("[Base2 ci-gas-ref diagnostics]", data.diagnostics);
          }
          if (!res.ok) {
            throw new Error(typeof data.detail === "string" ? data.detail : "Reference fetch failed");
          }
          const med = typeof data.median_energy_share === "number" ? data.median_energy_share : 0.72;
          const sampleCount = typeof data.sample_count === "number" ? data.sample_count : 0;
          const usedFallback = data.used_fallback === true;
          const msg = typeof data.message === "string" ? data.message : null;
          const matchStrategy = typeof data.match_strategy === "string" ? data.match_strategy : null;
          const confidence = typeof data.confidence === "string" ? data.confidence : null;
          const matchedPostcodes = Array.isArray(data.matched_postcodes)
            ? (data.matched_postcodes as unknown[]).filter((x): x is string => typeof x === "string")
            : [];

          setUtilityComparisons((prev) =>
            prev.map((u) => {
              if (u.utilityType !== "SME Gas" || u.identifier !== c.identifier) return u;
              const nextShare = Math.max(0.01, Math.min(1, med));
              return withSmeGasCiDerivedRates({
                ...u,
                smeCiReferenceLoading: false,
                smeCiEnergyShareOfInvoice: nextShare,
                smeCiReferenceSampleCount: sampleCount,
                smeCiReferenceError: usedFallback && msg ? msg : null,
                smeCiReferenceMatchStrategy: matchStrategy,
                smeCiReferenceMatchedPostcodes: matchedPostcodes.length > 0 ? matchedPostcodes : undefined,
                smeCiReferenceConfidence: confidence,
                smeCiReferenceFetchedTag: tag,
              });
            })
          );
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Reference fetch failed";
          setUtilityComparisons((prev) =>
            prev.map((u) =>
              u.utilityType === "SME Gas" && u.identifier === c.identifier
                ? { ...u, smeCiReferenceLoading: false, smeCiReferenceError: message, smeCiReferenceMatchStrategy: undefined, smeCiReferenceMatchedPostcodes: undefined, smeCiReferenceConfidence: undefined }
                : u
            )
          );
        }
      }
    };
    void run();
  }, [token, smeCiGasReferenceKey]);

  const extractFileIdFromUrl = (url: string | undefined): string | null => {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    if (!token) return;
    if (!businessName) {
      setBusinessInfoFetchDone(true);
      return;
    }
    let cancelled = false;
    const fetchBusinessInfo = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/get-business-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ business_name: businessName })
        });
        if (cancelled) return;
        if (response.ok) {
          const data = await response.json();
          setBusinessInfoData(data);
          console.log('Business info fetched:', data);
          console.log('File IDs:', data._processed_file_ids);
        } else {
          console.error('Failed to fetch business info');
        }
      } catch (err) {
        if (!cancelled) console.error('Error fetching business info:', err);
      } finally {
        if (!cancelled) setBusinessInfoFetchDone(true);
      }
    };
    fetchBusinessInfo();
    return () => { cancelled = true; };
  }, [businessName, token]);

  useEffect(() => {
    if (businessInfo && token && businessInfoFetchDone) {
      fetchUtilityInvoices();
    }
  }, [businessInfo, token, businessInfoFetchDone]);

  const extractCurrentRates = (invoiceData: any, utilityType: string): Partial<UtilityComparison> => {
    const rates: Partial<UtilityComparison> = {};

    if (utilityType.includes('Electricity')) {
      const details = invoiceData?.electricity_ci_invoice_details || invoiceData?.electricity_sme_invoice_details || {};
      const fullData = details?.full_invoice_data || invoiceData?.full_invoice_data || {};
      rates.currentPeakRate = parseFloat(details?.peak_rate || fullData['Retail Rate Peak (c/kWh)'] || '0') || undefined;
      rates.currentOffPeakRate = parseFloat(details?.offpeak_rate || fullData['Retail Rate Off-Peak (c/kWh)'] || '0') || undefined;
      const shoulderRate = parseFloat(details?.shoulder_rate || fullData['Retail Rate Shoulder (c/kWh)'] || '0');
      rates.currentShoulderRate = shoulderRate > 0 ? shoulderRate : undefined;
      rates.monthlyUsage = parseFloat(details?.monthly_usage || fullData['Monthly Consumption'] || '0');
      rates.peakUsage = parseFloat(fullData['Retail Quantity Peak (kWh)'] || details?.peak_usage || '0') || undefined;
      rates.offPeakUsage = parseFloat(fullData['Retail Quantity Off-Peak (kWh)'] || details?.offpeak_usage || '0') || undefined;
      rates.demandQuantity = parseFloat(fullData['DUOS - Network Demand Charge Quantity (KVA)'] || details?.demand_quantity || '0') || undefined;
      const meterRate = parseFloat(fullData['Meter Rate'] || '0');
      const vasRate = parseFloat(fullData['Value Added Service rater in $/Meter/Day'] || '0');
      if (meterRate > 0 || vasRate > 0) {
        rates.currentMeteringDaily = meterRate + vasRate;
        rates.currentMeteringAnnual = (meterRate + vasRate) * 365;
        rates.currentMeterDaily = meterRate;
        rates.currentMeterAnnual = meterRate * 365;
        rates.currentVasDaily = vasRate;
        rates.currentVasAnnual = vasRate * 365;
      }
      rates.currentDailySupply = parseFloat(fullData['Daily Supply Charge'] || details?.daily_supply || '0');
      const demandRateStr = fullData['DUOS - Network Demand Charge Rate ($/KVA)'] || fullData['DUOS - Network Demand Charge Rate'] || details?.demand_charge_rate || '0';
      rates.currentDemandCharge = parseFloat(String(demandRateStr)) || undefined;
      console.log('Demand charge extraction:', { utilityType, demandRateStr, parsed: rates.currentDemandCharge, fullDataKey: fullData['DUOS - Network Demand Charge Rate ($/KVA)'], demandQuantity: rates.demandQuantity });
      rates.comparisonPeakRate = (rates.currentPeakRate && rates.currentPeakRate > 0) ? parseFloat((rates.currentPeakRate * 0.95).toFixed(2)) : 24.50;
      rates.comparisonOffPeakRate = (rates.currentOffPeakRate && rates.currentOffPeakRate > 0) ? parseFloat((rates.currentOffPeakRate * 0.95).toFixed(2)) : 18.00;
      rates.comparisonShoulderRate = (rates.currentShoulderRate && rates.currentShoulderRate > 0) ? parseFloat((rates.currentShoulderRate * 0.95).toFixed(2)) : 20.00;
      if (utilityType === 'C&I Electricity') {
        rates.comparisonMeterAnnual = 600;
        rates.comparisonVasAnnual = 300;
        rates.comparisonMeteringAnnual = 900;
        rates.comparisonMeteringDaily = parseFloat((900 / 365).toFixed(4));
        rates.comparisonMeterDaily = parseFloat((600 / 365).toFixed(4));
        rates.comparisonVasDaily = parseFloat((300 / 365).toFixed(4));
      } else {
        rates.comparisonMeteringAnnual = 700.00;
        rates.comparisonMeteringDaily = parseFloat((700.00 / 365).toFixed(2));
      }
      rates.comparisonDailySupply = rates.currentDailySupply > 0 ? parseFloat((rates.currentDailySupply * 0.95).toFixed(2)) : 1.50;
      rates.comparisonDemandCharge = (rates.currentDemandCharge && rates.currentDemandCharge > 0) ? parseFloat((rates.currentDemandCharge * 0.95).toFixed(2)) : 12.00;
    } else if (utilityType.includes('Gas')) {
      if (invoiceData?.gas_sme_invoicedetails) {
        const smeDetails = invoiceData.gas_sme_invoicedetails;
        const usage = smeDetails.supply_charge || {};
        const supplyCharge = smeDetails.supply_charge || {};
        const usageData = smeDetails.usage || {};
        const generalUsageMJ = parseFloat(usageData.general_usage_quantity || '0');
        const gasQuantityGJ = generalUsageMJ > 0 ? generalUsageMJ / 1000 : 0;
        let weightedRate = 0;
        let totalConsumption = 0;
        if (usageData.block_1 && usageData.block_1.consumption && usageData.block_1.rate) {
          const block1Consumption = parseFloat(usageData.block_1.consumption);
          const block1Rate = parseFloat(usageData.block_1.rate);
          weightedRate += (block1Consumption * block1Rate);
          totalConsumption += block1Consumption;
        }
        if (usageData.block_2 && usageData.block_2.consumption && usageData.block_2.rate) {
          const block2Consumption = parseFloat(usageData.block_2.consumption);
          const block2Rate = parseFloat(usageData.block_2.rate);
          weightedRate += (block2Consumption * block2Rate);
          totalConsumption += block2Consumption;
        }
        const avgRateCperMJ = totalConsumption > 0 ? (weightedRate / totalConsumption) : 0;
        const gasRate = avgRateCperMJ * 10;
        const supplyRate = parseFloat(supplyCharge.rate || '0');
        const supplyDays = parseFloat(supplyCharge.quantity_days || smeDetails.invoice_review_days || '0');
        const dailySupply = supplyDays > 0 ? (supplyRate / supplyDays) : supplyRate;
        const invoiceDays = parseFloat(smeDetails.invoice_review_days || supplyDays || '0');
        const estimatedAnnualUsageGJ = invoiceDays > 0 && gasQuantityGJ > 0 ? (gasQuantityGJ / invoiceDays) * 365 : undefined;
        rates.currentGasRate = gasRate > 0 ? gasRate : undefined;
        rates.gasUsage = gasQuantityGJ > 0 ? gasQuantityGJ : undefined;
        rates.monthlyUsage = gasQuantityGJ > 0 ? gasQuantityGJ : undefined;
        rates.currentDailySupply = dailySupply > 0 ? dailySupply : undefined;
        rates.estimatedAnnualUsage = estimatedAnnualUsageGJ;
        const totalEx = normalizeMoneyToNumber(smeDetails.total_invoice_cost ?? smeDetails.total_amount);
        rates.smeGasTotalExGst = totalEx ?? undefined;
        rates.smeGasInvoiceReviewDays = invoiceDays > 0 ? invoiceDays : undefined;
        if (gasQuantityGJ > 0) rates.smeGasInvoicePeriodGJ = gasQuantityGJ;
        const siteAddr = typeof smeDetails.site_address === "string" ? smeDetails.site_address : "";
        const pc = extractAustralianPostcode(siteAddr);
        if (pc) rates.smeGasPostcode = pc;
        rates.comparisonGasRate = rates.currentGasRate && rates.currentGasRate > 0 ? parseFloat((rates.currentGasRate * 0.95).toFixed(4)) : DEFAULT_CI_GAS_COMPARISON_RATE_PER_GJ;
        rates.comparisonDailySupply = rates.currentDailySupply && rates.currentDailySupply > 0 ? parseFloat((rates.currentDailySupply * 0.95).toFixed(2)) : 1.20;
        console.log('SME Gas extraction result:', { generalUsageMJ, gasQuantityGJ, avgRateCperMJ, gasRate, dailySupply, supplyRate, supplyDays, currentGasRate: rates.currentGasRate, currentDailySupply: rates.currentDailySupply });
      } else {
        console.log('Gas extraction - Full invoiceData keys:', Object.keys(invoiceData || {}));
        const gci = invoiceData?.gas_ci_invoice_details;
        const ginv = invoiceData?.gas_invoice_details;
        const details = { ...(typeof ginv === "object" && ginv ? ginv : {}), ...(typeof gci === "object" && gci ? gci : {}) };
        const fullCi = typeof gci?.full_invoice_data === "object" && gci.full_invoice_data ? gci.full_invoice_data : {};
        const fullInv = typeof ginv?.full_invoice_data === "object" && ginv.full_invoice_data ? ginv.full_invoice_data : {};
        const mergedFull = { ...fullInv, ...fullCi };
        const fullData = Object.keys(mergedFull).length > 0 ? mergedFull : invoiceData?.full_invoice_data && typeof invoiceData.full_invoice_data === "object" ? invoiceData.full_invoice_data : invoiceData || {};
        let gasQuantity = 0;
        if (details?.energy_charge_quantity !== undefined && details?.energy_charge_quantity !== null && details?.energy_charge_quantity !== '') {
          const qtyValue = typeof details.energy_charge_quantity === 'string' ? parseFloat(details.energy_charge_quantity) : parseFloat(String(details.energy_charge_quantity));
          if (!isNaN(qtyValue) && qtyValue > 0) gasQuantity = qtyValue;
        }
        if (gasQuantity === 0 && fullData['Energy Charge Quantity in GJ']) gasQuantity = parseFloat(fullData['Energy Charge Quantity in GJ']);
        if (gasQuantity === 0 && fullData['Energy Charge Quantity']) gasQuantity = parseFloat(fullData['Energy Charge Quantity']);
        if (gasQuantity === 0 && details?.gas_usage) gasQuantity = parseFloat(details.gas_usage);
        if (gasQuantity === 0 && fullData['Quantity']) gasQuantity = parseFloat(fullData['Quantity']);
        if (gasQuantity === 0 && fullData['Gas Usage']) gasQuantity = parseFloat(fullData['Gas Usage']);
        if (gasQuantity === 0 && fullData['quantity']) gasQuantity = parseFloat(fullData['quantity']);
        if (gasQuantity === 0 && details?.quantity) gasQuantity = parseFloat(details.quantity);
        let gasCost = 0;
        if (fullData['Energy Charges in $']) gasCost = parseFloat(fullData['Energy Charges in $']);
        else if (fullData['Energy Charge Cost']) gasCost = parseFloat(fullData['Energy Charge Cost']);
        else if (details?.energy_charge_cost) gasCost = parseFloat(details.energy_charge_cost);
        else if (details?.gas_cost) gasCost = parseFloat(details.gas_cost);
        else if (fullData['Cost']) gasCost = parseFloat(fullData['Cost']);
        else if (fullData['cost']) gasCost = parseFloat(fullData['cost']);
        else if (details?.cost) gasCost = parseFloat(details.cost);
        let gasRate = 0;
        if (details?.energy_charge_rate !== undefined && details?.energy_charge_rate !== null && details?.energy_charge_rate !== '') {
          const rateStr = String(details.energy_charge_rate).trim();
          const rateValue = parseFloat(rateStr);
          if (!isNaN(rateValue) && rateValue > 0) gasRate = rateValue;
        }
        if (gasRate === 0 && fullData['Energy Charge Rate in $/GJ']) gasRate = parseFloat(fullData['Energy Charge Rate in $/GJ']);
        if (gasRate === 0 && fullData['Energy Charge Rate ($/GJ)']) gasRate = parseFloat(fullData['Energy Charge Rate ($/GJ)']);
        if (gasRate === 0 && fullData['Energy Charge Rate']) gasRate = parseFloat(fullData['Energy Charge Rate']);
        if (gasRate === 0 && details?.gas_rate) gasRate = parseFloat(String(details.gas_rate));
        if (gasRate === 0 && fullData['Gas Rate']) gasRate = parseFloat(fullData['Gas Rate']);
        if (gasRate === 0 && fullData['energy_charge_rate']) gasRate = parseFloat(fullData['energy_charge_rate']);
        if (gasRate === 0 && gasCost > 0 && gasQuantity > 0) gasRate = gasCost / gasQuantity;
        rates.currentGasRate = gasRate > 0 ? gasRate : undefined;
        rates.monthlyUsage = gasQuantity > 0 ? gasQuantity : undefined;
        rates.gasUsage = gasQuantity > 0 ? gasQuantity : undefined;
        const dailySupply = parseFloat(fullData['Daily Supply Charge'] || '0') || parseFloat(details?.daily_supply || '0') || 0;
        rates.currentDailySupply = dailySupply > 0 ? dailySupply : undefined;
        rates.comparisonGasRate = DEFAULT_CI_GAS_COMPARISON_RATE_PER_GJ;
        rates.comparisonDailySupply = rates.currentDailySupply && rates.currentDailySupply > 0 ? parseFloat((rates.currentDailySupply * 0.95).toFixed(2)) : 1.20;
        const daysRaw = fullData["Invoice Review Number of Days"] ?? details.invoice_review_days ?? fullData["invoice_review_days"] ?? details.invoice_period_days;
        const ciInvoiceDays = parseFloat(String(daysRaw ?? "").replace(/[^\d.]/g, "") || "");
        if (Number.isFinite(ciInvoiceDays) && ciInvoiceDays > 0) rates.ciGasInvoiceReviewDays = ciInvoiceDays;
      }
    } else if (utilityType === 'Oil') {
      const details = invoiceData?.oil_invoice_details || invoiceData || {};
      console.log('Oil extraction - Full invoiceData keys:', Object.keys(invoiceData || {}));
      console.log('Oil extraction - details keys:', Object.keys(details));
      let weightedRate = 0;
      let totalQuantity = 0;
      if (details.quantity_1 && details.rate_1) {
        const qty1 = parseFloat(String(details.quantity_1));
        const rate1 = parseFloat(String(details.rate_1));
        if (!isNaN(qty1) && !isNaN(rate1) && qty1 > 0 && rate1 > 0) { weightedRate += (qty1 * rate1); totalQuantity += qty1; }
      }
      if (details.quantity_2 && details.rate_3) {
        const qty2 = parseFloat(String(details.quantity_2));
        const rate3 = parseFloat(String(details.rate_3));
        if (!isNaN(qty2) && !isNaN(rate3) && qty2 > 0 && rate3 > 0) { weightedRate += (qty2 * rate3); totalQuantity += qty2; }
      }
      const avgOilRate = totalQuantity > 0 ? (weightedRate / totalQuantity) : 0;
      rates.currentOilRate = avgOilRate > 0 ? avgOilRate : undefined;
      rates.oilUsage = totalQuantity > 0 ? totalQuantity : undefined;
      rates.monthlyUsage = totalQuantity > 0 ? totalQuantity : undefined;
      rates.comparisonOilRate = rates.currentOilRate && rates.currentOilRate > 0 ? parseFloat((rates.currentOilRate * 0.95).toFixed(4)) : undefined;
      console.log('Oil extraction result:', { avgOilRate, totalQuantity, currentOilRate: rates.currentOilRate });
    } else if (utilityType === 'Waste') {
      const details = invoiceData?.waste_invoice_details || invoiceData || {};
      const fullData = details?.full_invoice_data || details || {};
      const wasteRate = parseFloat(fullData['Service Charge'] || fullData['Rate'] || details?.rate || '0');
      rates.currentWasteRate = wasteRate > 0 ? wasteRate : undefined;
      const wasteUsage = parseFloat(fullData['Frequency'] || fullData['Bins'] || details?.frequency || '0');
      rates.wasteUsage = wasteUsage > 0 ? wasteUsage : undefined;
      rates.monthlyUsage = wasteUsage > 0 ? wasteUsage : undefined;
      rates.comparisonWasteRate = rates.currentWasteRate && rates.currentWasteRate > 0 ? parseFloat((rates.currentWasteRate * 0.95).toFixed(2)) : undefined;
    } else if (utilityType === 'Cleaning') {
      const details = invoiceData?.cleaning_invoice_details || invoiceData || {};
      const fullData = details?.full_invoice_data || details || {};
      const cleaningRate = parseFloat(fullData['Service Charge'] || fullData['Rate'] || details?.rate || '0');
      rates.currentCleaningRate = cleaningRate > 0 ? cleaningRate : undefined;
      const cleaningUsage = parseFloat(fullData['Frequency'] || fullData['Visits'] || details?.frequency || '0');
      rates.cleaningUsage = cleaningUsage > 0 ? cleaningUsage : undefined;
      rates.monthlyUsage = cleaningUsage > 0 ? cleaningUsage : undefined;
      rates.comparisonCleaningRate = rates.currentCleaningRate && rates.currentCleaningRate > 0 ? parseFloat((rates.currentCleaningRate * 0.95).toFixed(2)) : undefined;
    }
    return rates;
  };

  const fetchUtilityInvoices = async () => {
    if (!token) return;
    const utilities = businessInfo?.utilities || {};
    let hasCleaningDocuments = false;
    if (businessInfoData?._processed_file_ids) {
      const fileIds = businessInfoData._processed_file_ids;
      const floorPlanUrl = fileIds.business_site_map_upload || fileIds['Floor Plan'];
      const cleaningInvoiceUrl = fileIds.invoice_Cleaning || fileIds['Cleaning Invoice'];
      const floorPlanFileId = extractFileIdFromUrl(floorPlanUrl) || floorPlanUrl;
      const cleaningInvoiceFileId = extractFileIdFromUrl(cleaningInvoiceUrl) || cleaningInvoiceUrl;
      hasCleaningDocuments = !!(floorPlanFileId && cleaningInvoiceFileId);
    }
    if (Object.keys(utilities).length === 0 && !hasCleaningDocuments) { setUtilityComparisons([]); return; }
    const getIdentifiers = (utilityData: any): string[] => {
      if (typeof utilityData === 'string') return utilityData.split(',').map((id: string) => id.trim()).filter(Boolean);
      if (Array.isArray(utilityData) && utilityData.length > 0) {
        const first = utilityData[0];
        if (first != null && typeof first === 'object' && 'identifier' in first) return utilityData.map((o: { identifier?: unknown }) => o.identifier != null && typeof o.identifier === 'string' ? o.identifier : String(o.identifier ?? '')).filter(Boolean);
        if (first != null && typeof first === 'object' && 'value' in first) return utilityData.map((o: { value?: unknown }) => o.value != null && typeof o.value === 'string' ? o.value : String(o.value ?? '')).filter(Boolean);
        return utilityData.map((v: unknown) => typeof v === 'string' || typeof v === 'number' ? String(v) : '').filter(Boolean);
      }
      return [];
    };
    const comparisons: UtilityComparison[] = [];
    if (utilities["C&I Electricity"]) getIdentifiers(utilities["C&I Electricity"]).forEach(nmi => comparisons.push({ utilityType: "C&I Electricity", identifier: nmi, identifierLabel: "NMI", invoiceData: null, loading: true, error: null }));
    if (utilities["SME Electricity"]) getIdentifiers(utilities["SME Electricity"]).forEach(nmi => comparisons.push({ utilityType: "SME Electricity", identifier: nmi, identifierLabel: "NMI", invoiceData: null, loading: true, error: null }));
    if (utilities["C&I Gas"]) getIdentifiers(utilities["C&I Gas"]).forEach(mrin => comparisons.push({ utilityType: "C&I Gas", identifier: mrin, identifierLabel: "MRIN", invoiceData: null, loading: true, error: null }));
    if (utilities["SME Gas"] || utilities["Small Gas"]) getIdentifiers(utilities["SME Gas"] || utilities["Small Gas"]).forEach(mrin => comparisons.push({ utilityType: "SME Gas", identifier: mrin, identifierLabel: "MRIN", invoiceData: null, loading: true, error: null }));
    if (utilities["Oil"] || utilities["COOKING_OIL"]) getIdentifiers(utilities["Oil"] || utilities["COOKING_OIL"]).forEach(accountName => comparisons.push({ utilityType: "Oil", identifier: accountName, identifierLabel: "Account Name", invoiceData: null, loading: true, error: null }));
    if (utilities["Waste"] || utilities["WASTE"]) getIdentifiers(utilities["Waste"] || utilities["WASTE"]).forEach(customerNumber => comparisons.push({ utilityType: "Waste", identifier: customerNumber, identifierLabel: "Customer Number", invoiceData: null, loading: true, error: null }));
    if (businessInfoData?._processed_file_ids) {
      const fileIds = businessInfoData._processed_file_ids;
      const floorPlanUrl = fileIds.business_site_map_upload || fileIds['Floor Plan'];
      const cleaningInvoiceUrl = fileIds.invoice_Cleaning || fileIds['Cleaning Invoice'];
      const floorPlanFileId = extractFileIdFromUrl(floorPlanUrl) || floorPlanUrl;
      const cleaningInvoiceFileId = extractFileIdFromUrl(cleaningInvoiceUrl) || cleaningInvoiceUrl;
      console.log('Cleaning eligibility check:', { hasFloorPlan: !!floorPlanFileId, hasCleaningInvoice: !!cleaningInvoiceFileId });
      if (floorPlanFileId && cleaningInvoiceFileId) {
        const cleaningIdentifier = businessName || businessInfo?.name || 'Cleaning Service';
        comparisons.push({ utilityType: "Cleaning", identifier: cleaningIdentifier, identifierLabel: "Business", invoiceData: null, loading: true, error: null });
      }
    }
    setUtilityComparisons(comparisons);
    const results = await Promise.all(
      comparisons.map(async (comparison): Promise<{ index: number; update: Partial<UtilityComparison> & { invoiceData?: any; loading: boolean; error?: string | null } }> => {
        const index = comparisons.findIndex(c => c.utilityType === comparison.utilityType && c.identifier === comparison.identifier);
        try {
          let endpoint = '';
          let body: any = { business_name: businessName || businessInfo?.name || '' };
          if (comparison.utilityType === 'C&I Electricity') { endpoint = `${getApiBaseUrl()}/api/get-electricity-ci-info`; body.nmi = comparison.identifier; }
          else if (comparison.utilityType === 'SME Electricity') { endpoint = `${getApiBaseUrl()}/api/get-electricity-sme-info`; body.nmi = comparison.identifier; }
          else if (comparison.utilityType === 'C&I Gas') { endpoint = `${getApiBaseUrl()}/api/get-gas-ci-info`; body.mrin = comparison.identifier; }
          else if (comparison.utilityType === 'SME Gas') { endpoint = `${getApiBaseUrl()}/api/get-gas-sme-info`; body.mrin = comparison.identifier; }
          else if (comparison.utilityType === 'Oil') { endpoint = `${getApiBaseUrl()}/api/get-oil-info`; body.business_name = comparison.identifier; }
          else if (comparison.utilityType === 'Waste') { endpoint = `${getApiBaseUrl()}/api/get-waste-info`; body.customer_number = comparison.identifier; }
          else if (comparison.utilityType === 'Cleaning') return { index, update: { loading: false, error: 'Cleaning API endpoint not yet available' } };
          if (!endpoint) { console.log(`No endpoint for utility type: ${comparison.utilityType}`); return { index, update: { loading: false, error: `No API endpoint available for ${comparison.utilityType}` } }; }
          const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
          if (response.ok) {
            const data = await response.json();
            console.log(`Full API response for ${comparison.utilityType} ${comparison.identifier}:`, JSON.stringify(data, null, 2));
            const extractedRates = extractCurrentRates(data, comparison.utilityType);
            return { index, update: { ...extractedRates, invoiceData: data, loading: false, error: null } };
          }
          throw new Error('Failed to fetch invoice data');
        } catch (err: any) {
          return { index, update: { loading: false, error: err.message } };
        }
      })
    );
    setUtilityComparisons(prev => {
      const next = [...prev];
      for (const { index, update } of results) {
        if (index >= 0 && index < next.length) {
          const merged = { ...next[index], ...update };
          next[index] = merged.utilityType === "SME Gas" ? withSmeGasCiDerivedRates(merged) : merged;
        }
      }
      return next;
    });
  };

  const updateComparisonRate = (utilityType: string, identifier: string, field: keyof UtilityComparison, value: string) => {
    setUtilityComparisons(prev => prev.map(u => {
      if (u.utilityType !== utilityType || u.identifier !== identifier) return u;
      const num = parseFloat(value) || 0;
      const next = { ...u, [field]: num };
      if (field === 'comparisonMeterAnnual' || field === 'comparisonVasAnnual') {
        const meterAnnual = field === 'comparisonMeterAnnual' ? num : (u.comparisonMeterAnnual ?? 600);
        const vasAnnual = field === 'comparisonVasAnnual' ? num : (u.comparisonVasAnnual ?? 300);
        next.comparisonMeterAnnual = meterAnnual; next.comparisonVasAnnual = vasAnnual;
        next.comparisonMeteringAnnual = meterAnnual + vasAnnual;
        next.comparisonMeteringDaily = parseFloat(((meterAnnual + vasAnnual) / 365).toFixed(4));
        next.comparisonMeterDaily = parseFloat((meterAnnual / 365).toFixed(4));
        next.comparisonVasDaily = parseFloat((vasAnnual / 365).toFixed(4));
      }
      return next;
    }));
  };

  const updateCurrentRate = (utilityType: string, identifier: string, field: keyof UtilityComparison, value: string) => {
    setUtilityComparisons(prev => prev.map(u => {
      if (u.utilityType !== utilityType || u.identifier !== identifier) return u;
      const parsedValue = value === '' ? undefined : (parseFloat(value) || 0);
      const next = { ...u, [field]: parsedValue };
      if (field === 'currentMeterDaily' || field === 'currentMeterAnnual' || field === 'currentVasDaily' || field === 'currentVasAnnual') {
        const meterDaily = field === 'currentMeterDaily' ? (parsedValue ?? 0) : (u.currentMeterDaily ?? 0);
        const vasDaily = field === 'currentVasDaily' ? (parsedValue ?? 0) : (u.currentVasDaily ?? 0);
        const meterAnnual = field === 'currentMeterAnnual' ? (parsedValue ?? 0) : (u.currentMeterAnnual ?? 0);
        const vasAnnual = field === 'currentVasAnnual' ? (parsedValue ?? 0) : (u.currentVasAnnual ?? 0);
        if (field === 'currentMeterDaily' || field === 'currentVasDaily') {
          next.currentMeterAnnual = meterDaily * 365; next.currentVasAnnual = vasDaily * 365;
          next.currentMeteringDaily = meterDaily + vasDaily; next.currentMeteringAnnual = next.currentMeterAnnual + next.currentVasAnnual;
        } else {
          next.currentMeterAnnual = meterAnnual; next.currentVasAnnual = vasAnnual;
          next.currentMeteringAnnual = meterAnnual + vasAnnual; next.currentMeteringDaily = (meterAnnual + vasAnnual) / 365;
          next.currentMeterDaily = meterAnnual / 365; next.currentVasDaily = vasAnnual / 365;
        }
      }
      return next;
    }));
  };

  const updateUsage = (utilityType: string, identifier: string, field: keyof UtilityComparison, value: string) => {
    setUtilityComparisons(prev => prev.map(u => {
      if (u.utilityType === utilityType && u.identifier === identifier) {
        const parsedValue = value === '' ? undefined : (parseFloat(value) || 0);
        if (utilityType === "SME Gas" && field === "smeCiEnergyShareOfInvoice" && parsedValue != null) {
          const share = Math.max(0.01, Math.min(1, parsedValue));
          return withSmeGasCiDerivedRates({ ...u, smeCiEnergyShareOfInvoice: share });
        }
        if (utilityType === "SME Gas" && field === "gasUsage" && (u.smeGasComparisonMode ?? "invoice_blocks") === "ci_offer") {
          const gj = parsedValue != null && parsedValue > 0 ? parsedValue : undefined;
          return withSmeGasCiDerivedRates({ ...u, gasUsage: gj, monthlyUsage: gj, smeGasInvoicePeriodGJ: gj });
        }
        return { ...u, [field]: parsedValue };
      }
      return u;
    }));
  };

  const setSmeGasComparisonModeFor = (identifier: string, mode: SmeGasComparisonMode) => {
    setUtilityComparisons((prev) => prev.map((u) => {
      if (u.utilityType !== "SME Gas" || u.identifier !== identifier) return u;
      let next: UtilityComparison = { ...u, smeGasComparisonMode: mode, smeCiReferenceFetchedTag: undefined };
      if (mode === "ci_offer") { next.comparisonGasRate = u.comparisonGasRate ?? DEFAULT_CI_GAS_COMPARISON_RATE_PER_GJ; next = withSmeGasCiDerivedRates(next); }
      return next;
    }));
  };

  const updateSmeGasBillModeling = (identifier: string, patch: Partial<Pick<UtilityComparison, "smeGasTotalExGst" | "smeGasInvoicePeriodGJ" | "smeGasInvoiceTotalIncludesGst">>) => {
    setUtilityComparisons((prev) => prev.map((u) => {
      if (u.utilityType !== "SME Gas" || u.identifier !== identifier) return u;
      let next: UtilityComparison = { ...u, ...patch };
      if ("smeGasInvoicePeriodGJ" in patch) {
        const raw = patch.smeGasInvoicePeriodGJ;
        const gj = raw != null && raw > 0 && Number.isFinite(raw) ? raw : undefined;
        next.gasUsage = gj; next.monthlyUsage = gj; next.smeGasInvoicePeriodGJ = gj;
      }
      return withSmeGasCiDerivedRates(next);
    }));
  };

  const updateSmeGasPostcode = (identifier: string, value: string) => {
    setUtilityComparisons((prev) => prev.map((u) => {
      if (u.utilityType !== "SME Gas" || u.identifier !== identifier) return u;
      return { ...u, smeGasPostcode: value, smeCiReferenceFetchedTag: undefined, smeCiReferenceMatchStrategy: undefined, smeCiReferenceMatchedPostcodes: undefined, smeCiReferenceConfidence: undefined, smeCiReferenceError: null, smeCiReferenceSampleCount: undefined };
    }));
  };

  const calculateSavings = (comparison: UtilityComparison) => {
    const savings: any = {};
    if (comparison.utilityType.includes('Electricity')) {
      const peakUsage = comparison.peakUsage || (comparison.monthlyUsage ? comparison.monthlyUsage * 0.4 : 0);
      const offPeakUsage = comparison.offPeakUsage || (comparison.monthlyUsage ? comparison.monthlyUsage * 0.3 : 0);
      const totalUsage = peakUsage + offPeakUsage;
      const shoulderUsage = comparison.monthlyUsage && totalUsage < comparison.monthlyUsage ? (comparison.monthlyUsage - totalUsage) : (comparison.monthlyUsage ? comparison.monthlyUsage * 0.3 : 0);
      const currentPeak = comparison.currentPeakRate || 0; const currentOffPeak = comparison.currentOffPeakRate || 0; const currentShoulder = comparison.currentShoulderRate || 0;
      const compPeak = comparison.comparisonPeakRate || 0; const compOffPeak = comparison.comparisonOffPeakRate || 0; const compShoulder = comparison.comparisonShoulderRate || 0;
      if (currentPeak > 0 && compPeak > 0 && peakUsage > 0) { const c = (peakUsage * currentPeak / 100); const cp = (peakUsage * compPeak / 100); savings.peakSavings = c - cp; savings.peakSavingsPercent = c > 0 ? ((savings.peakSavings / c) * 100) : 0; savings.peakAnnualSavings = savings.peakSavings * 12; }
      if (currentOffPeak > 0 && compOffPeak > 0 && offPeakUsage > 0) { const c = (offPeakUsage * currentOffPeak / 100); const cp = (offPeakUsage * compOffPeak / 100); savings.offPeakSavings = c - cp; savings.offPeakSavingsPercent = c > 0 ? ((savings.offPeakSavings / c) * 100) : 0; savings.offPeakAnnualSavings = savings.offPeakSavings * 12; }
      const currentMonthlyUsageCost = (peakUsage * currentPeak / 100) + (offPeakUsage * currentOffPeak / 100) + (shoulderUsage * (currentShoulder || currentOffPeak) / 100);
      const comparisonMonthlyUsageCost = (peakUsage * compPeak / 100) + (offPeakUsage * compOffPeak / 100) + (shoulderUsage * (compShoulder || compOffPeak) / 100);
      savings.usageSavings = currentMonthlyUsageCost - comparisonMonthlyUsageCost;
      savings.usageSavingsPercent = currentMonthlyUsageCost > 0 ? ((savings.usageSavings / currentMonthlyUsageCost) * 100) : 0;
      savings.meteringSavings = 0;
      if (comparison.utilityType === 'C&I Electricity' && comparison.currentMeteringAnnual != null && comparison.comparisonMeteringAnnual != null) savings.meteringSavings = comparison.currentMeteringAnnual - comparison.comparisonMeteringAnnual;
      savings.supplySavings = 0;
      if (comparison.currentDailySupply && comparison.comparisonDailySupply) savings.supplySavings = (comparison.currentDailySupply - comparison.comparisonDailySupply) * 365;
      savings.demandSavings = 0;
      if (comparison.currentDemandCharge && comparison.comparisonDemandCharge && comparison.demandQuantity) { const ca = (comparison.currentDemandCharge * comparison.demandQuantity * 12); const cpa = (comparison.comparisonDemandCharge * comparison.demandQuantity * 12); savings.demandSavings = ca - cpa; }
      const currentMetering = comparison.utilityType === 'C&I Electricity' ? (comparison.currentMeteringAnnual || 0) : 0;
      const comparisonMetering = comparison.utilityType === 'C&I Electricity' ? (comparison.comparisonMeteringAnnual || 0) : 0;
      const totalCurrentAnnual = (currentMonthlyUsageCost * 12) + currentMetering + ((comparison.currentDailySupply || 0) * 365) + (comparison.currentDemandCharge && comparison.demandQuantity ? (comparison.currentDemandCharge * comparison.demandQuantity * 12) : 0);
      savings.totalAnnualSavings = (savings.usageSavings * 12) + savings.meteringSavings + savings.supplySavings + savings.demandSavings;
      savings.totalAnnualSavingsPercent = totalCurrentAnnual > 0 ? ((savings.totalAnnualSavings / totalCurrentAnnual) * 100) : 0;
    } else if (comparison.utilityType.includes('Gas')) {
      if (comparison.utilityType === "SME Gas" && comparison.smeGasComparisonMode === "sme_benchmark_stub") return savings;
      const currentRate = comparison.currentGasRate || 0; const compRate = comparison.comparisonGasRate || 0;
      const usage = comparison.utilityType === "C&I Gas" ? getCiGasEffectiveUsageGJ(comparison) : comparison.utilityType === "SME Gas" && comparison.smeGasComparisonMode === "ci_offer" ? getSmeCiGasEffectiveUsageGJ(comparison) : comparison.gasUsage || comparison.monthlyUsage || 0;
      const annualOverride = (comparison.utilityType === "C&I Gas" && comparison.ciGasAnnualConsumptionGJ != null && comparison.ciGasAnnualConsumptionGJ > 0 && comparison.ciGasInvoiceReviewDays != null && comparison.ciGasInvoiceReviewDays > 0) || (comparison.utilityType === "SME Gas" && comparison.smeGasComparisonMode === "ci_offer" && comparison.smeGasAnnualConsumptionGJ != null && comparison.smeGasAnnualConsumptionGJ > 0 && comparison.smeGasInvoiceReviewDays != null && comparison.smeGasInvoiceReviewDays > 0);
      if (currentRate > 0 && compRate > 0 && usage > 0) {
        const currentMonthlyCost = usage * currentRate; const comparisonMonthlyCost = usage * compRate;
        savings.usageSavings = currentMonthlyCost - comparisonMonthlyCost; savings.usageSavingsPercent = currentMonthlyCost > 0 ? ((savings.usageSavings / currentMonthlyCost) * 100) : 0;
        const annualGJForGas = comparison.utilityType === "C&I Gas" ? comparison.ciGasAnnualConsumptionGJ : comparison.smeGasAnnualConsumptionGJ;
        if (annualOverride && annualGJForGas != null) savings.gasUsageSavingsAnnual = annualGJForGas * (currentRate - compRate);
        savings.supplySavings = 0;
        if (comparison.currentDailySupply && comparison.comparisonDailySupply) savings.supplySavings = (comparison.currentDailySupply - comparison.comparisonDailySupply) * 365;
        if (annualOverride && annualGJForGas != null) {
          const totalCurrentAnnual = annualGJForGas * currentRate + (comparison.currentDailySupply || 0) * 365;
          savings.totalAnnualSavings = annualGJForGas * (currentRate - compRate) + savings.supplySavings;
          savings.totalAnnualSavingsPercent = totalCurrentAnnual > 0 ? (savings.totalAnnualSavings / totalCurrentAnnual) * 100 : 0;
        } else {
          const totalCurrentAnnual = currentMonthlyCost * 12 + (comparison.currentDailySupply || 0) * 365;
          savings.totalAnnualSavings = savings.usageSavings * 12 + savings.supplySavings;
          savings.totalAnnualSavingsPercent = totalCurrentAnnual > 0 ? (savings.totalAnnualSavings / totalCurrentAnnual) * 100 : 0;
        }
      }
    } else if (comparison.utilityType === 'Oil') {
      const currentRate = comparison.currentOilRate || 0; const compRate = comparison.comparisonOilRate || 0; const usage = comparison.oilUsage || comparison.monthlyUsage || 0;
      if (currentRate > 0 && compRate > 0 && usage > 0) { const c = usage * currentRate; const cp = usage * compRate; savings.usageSavings = c - cp; savings.usageSavingsPercent = c > 0 ? ((savings.usageSavings / c) * 100) : 0; savings.totalAnnualSavings = savings.usageSavings * 12; savings.totalAnnualSavingsPercent = savings.usageSavingsPercent; }
    } else if (comparison.utilityType === 'Waste') {
      const currentRate = comparison.currentWasteRate || 0; const compRate = comparison.comparisonWasteRate || 0; const frequency = comparison.wasteUsage || comparison.monthlyUsage || 0;
      if (currentRate > 0 && compRate > 0 && frequency > 0) { const c = frequency * currentRate; const cp = frequency * compRate; savings.usageSavings = c - cp; savings.usageSavingsPercent = c > 0 ? ((savings.usageSavings / c) * 100) : 0; savings.totalAnnualSavings = savings.usageSavings * 12; savings.totalAnnualSavingsPercent = savings.usageSavingsPercent; }
    } else if (comparison.utilityType === 'Cleaning') {
      const currentRate = comparison.currentCleaningRate || 0; const compRate = comparison.comparisonCleaningRate || 0; const frequency = comparison.cleaningUsage || comparison.monthlyUsage || 0;
      if (currentRate > 0 && compRate > 0 && frequency > 0) { const c = frequency * currentRate; const cp = frequency * compRate; savings.usageSavings = c - cp; savings.usageSavingsPercent = c > 0 ? ((savings.usageSavings / c) * 100) : 0; savings.totalAnnualSavings = savings.usageSavings * 12; savings.totalAnnualSavingsPercent = savings.usageSavingsPercent; }
    }
    return savings;
  };

  const openRecipientConfirmModal = (comparison: UtilityComparison, action: "comparison" | "dma", generateAll: boolean) => {
    const { contactName, contactEmail } = defaultWebhookRecipient(businessInfo, businessInfoData);
    setRecipientConfirmModal({ open: true, comparison, action, generateAll, contactName, contactEmail });
  };

  const handleGenerateClick = (comparison: UtilityComparison, action: 'comparison' | 'dma' = 'comparison') => {
    if (comparison.utilityType === "SME Gas") {
      const mode = comparison.smeGasComparisonMode ?? "invoice_blocks";
      if (mode === "sme_benchmark_stub") { alert("SME vs SME benchmark comparison is not available yet."); return; }
      if (mode === "invoice_blocks") { alert('PDF generation for invoice block rates is not wired yet. Choose "C&I-style comparison (SME → C&I)" to generate.'); return; }
    }
    const matchingUtilities = utilityComparisons.filter((u) => {
      if (u.utilityType !== comparison.utilityType || u.loading || u.error) return false;
      if (comparison.utilityType === "SME Gas") { const m = comparison.smeGasComparisonMode ?? "invoice_blocks"; const um = u.smeGasComparisonMode ?? "invoice_blocks"; return m === um; }
      return true;
    });
    if (matchingUtilities.length <= 1) { openRecipientConfirmModal(comparison, action, false); return; }
    setGenerateChoiceModal({ open: true, comparison, action, matchingUtilities });
  };

  const handleGenerateChoiceConfirm = (generateAll: boolean) => {
    const { comparison, action } = generateChoiceModal;
    if (!comparison) return;
    setGenerateChoiceModal(prev => ({ ...prev, open: false }));
    openRecipientConfirmModal(comparison, action, generateAll);
  };

  const handleRecipientConfirmSubmit = () => {
    const { comparison, action, generateAll, contactName, contactEmail } = recipientConfirmModal;
    if (!comparison) return;
    setRecipientConfirmModal((prev) => ({ ...prev, open: false }));
    generateComparison(comparison, action, generateAll, { contactName, contactEmail });
  };

  const generateComparison = async (comparison: UtilityComparison, action: 'comparison' | 'dma' = 'comparison', generateAll: boolean = false, webhookRecipient?: { contactName: string; contactEmail: string }) => {
    if (!token || !session) { alert('Please log in to generate comparisons'); return; }
    const utilitiesToProcess = generateAll ? utilityComparisons.filter((u) => { if (u.utilityType !== comparison.utilityType || u.loading || u.error) return false; if (comparison.utilityType === "SME Gas") { const m = comparison.smeGasComparisonMode ?? "invoice_blocks"; const um = u.smeGasComparisonMode ?? "invoice_blocks"; return m === um; } return true; }) : [comparison];
    if (utilitiesToProcess.length === 0) { alert('No utilities available to generate'); return; }
    const results: string[] = []; const errors: string[] = []; const successResults: { util: UtilityComparison; result: any }[] = [];
    for (const util of utilitiesToProcess) {
      const sendingKey = `${util.utilityType}-${util.identifier}-${action}`;
      if (sending === sendingKey) continue;
      try {
        setSending(sendingKey); setError(null); setSuccess(false);
        let webhookUrl = '';
        let payload: any = { user_email: session?.user?.email || '', user_name: session?.user?.name || '', user_id: (session?.user as any)?.id || '', full_invoice_data: util.invoiceData, timestamp: new Date().toISOString() };
        if (businessInfo) { payload.business_name = businessInfo.name || ''; payload.business_abn = businessInfo.abn || ''; payload.business_trading_name = businessInfo.trading_name || ''; payload.business_industry = businessInfo.industry || ''; payload.business_website = businessInfo.website || ''; payload.postal_address = businessInfo.postal_address || ''; payload.site_address = businessInfo.site_address || ''; payload.contact_phone = businessInfo.telephone || ''; payload.contact_email = businessInfo.email || ''; payload.contact_name = businessInfo.contact_name || ''; payload.contact_position = businessInfo.position || ''; }
        if (webhookRecipient) { payload.contact_name = webhookRecipient.contactName; payload.contact_email = webhookRecipient.contactEmail; }
        if (action === 'dma' && util.utilityType === 'C&I Electricity') {
          webhookUrl = 'https://membersaces.app.n8n.cloud/webhook/generate-dma-comparaison-review-b2';
          const details = util.invoiceData?.electricity_ci_invoice_details || {}; const fullData = details?.full_invoice_data || {};
          payload.nmi = util.identifier; payload.site_address = fullData['Site Address'] || details?.site_address || businessInfo?.site_address || ''; payload.invoice_number = fullData['Invoice Number'] || details?.invoice_number || ''; payload.invoice_link = fullData['Invoice Link'] || details?.invoice_link || '';
          payload.metering_rate = (util.currentMeterDaily ?? util.currentMeteringDaily ?? 0).toFixed(2); payload.metering_rate_annual = (util.currentMeterAnnual ?? util.currentMeteringAnnual ?? 0).toFixed(2); payload.vas_rate = (util.currentVasDaily ?? 0).toFixed(2); payload.vas_rate_annual = (util.currentVasAnnual ?? 0).toFixed(2); payload.combined_annual_cost = (util.currentMeteringAnnual ?? 0).toFixed(2);
          payload.comparison_meter_annual = (util.comparisonMeterAnnual ?? 600).toFixed(2); payload.comparison_vas_annual = (util.comparisonVasAnnual ?? 300).toFixed(2); payload.comparison_meter_daily = (util.comparisonMeterDaily ?? 600 / 365).toFixed(4); payload.comparison_vas_daily = (util.comparisonVasDaily ?? 300 / 365).toFixed(4); payload.dma_price = (util.comparisonMeterAnnual ?? 600).toFixed(2); payload.vas_price = (util.comparisonVasAnnual ?? 300).toFixed(2); payload.proposed_annual_cost = (util.comparisonMeteringAnnual ?? 900).toFixed(2);
          if (util.currentMeteringAnnual != null && util.comparisonMeteringAnnual != null) payload.annual_savings = (util.currentMeteringAnnual - util.comparisonMeteringAnnual).toFixed(2);
        } else if (util.utilityType === 'C&I Electricity') {
          webhookUrl = 'https://membersaces.app.n8n.cloud/webhook/generate-electricity-ci-comparaison-b2';
          const details = util.invoiceData?.electricity_ci_invoice_details || {}; const fullData = details?.full_invoice_data || {};
          payload.nmi = util.identifier; payload.invoice_id = fullData['Invoice ID'] || details?.invoice_id || ''; payload.site_address = fullData['Site Address'] || details?.site_address || businessInfo?.site_address || ''; payload.retailer = fullData['Retailer'] || details?.retailer || ''; payload.invoice_number = fullData['Invoice Number'] || details?.invoice_number || '';
          payload.peak_rate_invoice = util.currentPeakRate?.toFixed(2) || '0'; payload.off_peak_rate_invoice = util.currentOffPeakRate?.toFixed(2) || '0'; payload.shoulder_rate_invoice = util.currentShoulderRate?.toFixed(2) || '0';
          payload.peak_usage_invoice = util.peakUsage?.toFixed(0) || '0'; payload.off_peak_usage_invoice = util.offPeakUsage?.toFixed(0) || '0'; payload.shoulder_usage_invoice = '0'; payload.total_monthly_usage = util.monthlyUsage?.toFixed(0) || '0';
          payload.offer1PeakRate = util.comparisonPeakRate?.toFixed(2) || '0'; payload.offer1OffPeakRate = util.comparisonOffPeakRate?.toFixed(2) || '0'; payload.offer1ShoulderRate = util.comparisonShoulderRate?.toFixed(2) || '0'; payload.offer1Retailer = 'Comparison Offer'; payload.offer1Validity = '12 months'; payload.offer1Type = 'smoothed'; payload.offer1PeriodYears = '1'; payload.offer1StartDate = new Date().toISOString().split('T')[0];
          payload.current_daily_supply = util.currentDailySupply?.toFixed(2) || '0'; payload.comparison_daily_supply = util.comparisonDailySupply?.toFixed(2) || '0'; payload.current_demand_charge = util.currentDemandCharge?.toFixed(2) || '0'; payload.comparison_demand_charge = util.comparisonDemandCharge?.toFixed(2) || '0'; payload.demand_quantity = util.demandQuantity?.toFixed(2) || '0';
        } else if (util.utilityType === 'C&I Gas') {
          webhookUrl = 'https://membersaces.app.n8n.cloud/webhook/generate-gas-ci-comparaison-b2';
          const details = util.invoiceData?.gas_ci_invoice_details || {}; const fullData = details?.full_invoice_data || {};
          payload.mrin = util.identifier; payload.invoice_id = fullData['Invoice ID'] || details?.invoice_id || ''; payload.site_address = fullData['Site Address'] || details?.site_address || businessInfo?.site_address || ''; payload.invoice_number = fullData['Invoice Number'] || details?.invoice_number || '';
          payload.gas_rate_invoice = util.currentGasRate?.toFixed(4) || '0';
          const gasUsageForWebhook = getCiGasEffectiveUsageGJ(util); const gasUsageStr = gasUsageForWebhook > 0 ? gasUsageForWebhook.toFixed(2) : util.gasUsage?.toFixed(2) || util.monthlyUsage?.toFixed(2) || '0';
          payload.gas_usage_invoice = gasUsageStr; payload.total_monthly_usage = gasUsageStr;
          payload.offer1GasRate = util.comparisonGasRate?.toFixed(4) || '0'; payload.offer1Retailer = 'Comparison Offer'; payload.offer1Validity = '12 months'; payload.offer1Type = 'smoothed'; payload.offer1PeriodYears = '1'; payload.offer1StartDate = new Date().toISOString().split('T')[0];
          payload.current_daily_supply = util.currentDailySupply?.toFixed(2) || '0'; payload.comparison_daily_supply = util.comparisonDailySupply?.toFixed(2) || '0';
        } else if (util.utilityType === "SME Gas") {
          if (util.smeGasComparisonMode !== "ci_offer") { errors.push(`${util.identifier}: Select "C&I-style comparison (SME → C&I)" to generate this comparison.`); setSending(null); continue; }
          webhookUrl = "https://membersaces.app.n8n.cloud/webhook/generate-gas-sme-ci-comparaison-b2";
          const sme = util.invoiceData?.gas_sme_invoicedetails;
          payload.mrin = util.identifier; payload.invoice_id = sme?.invoice_number || sme?.invoice_id || ""; payload.site_address = (typeof sme?.site_address === "string" && sme.site_address) || businessInfo?.site_address || ""; payload.invoice_number = sme?.invoice_number || "";
          payload.gas_rate_invoice = util.currentGasRate?.toFixed(4) || "0";
          const gasUsageForWebhook = getSmeCiGasEffectiveUsageGJ(util); const gasUsageStr = gasUsageForWebhook > 0 ? gasUsageForWebhook.toFixed(2) : util.gasUsage?.toFixed(2) || util.monthlyUsage?.toFixed(2) || "0";
          payload.gas_usage_invoice = gasUsageStr; payload.total_monthly_usage = gasUsageStr;
          payload.offer1GasRate = util.comparisonGasRate?.toFixed(4) || "0"; payload.offer1Retailer = "Comparison Offer"; payload.offer1Validity = "12 months"; payload.offer1Type = "smoothed"; payload.offer1PeriodYears = "1"; payload.offer1StartDate = new Date().toISOString().split("T")[0];
          payload.current_daily_supply = util.currentDailySupply?.toFixed(2) || "0"; payload.comparison_daily_supply = util.comparisonDailySupply?.toFixed(2) || "0";
          payload.sme_gas_ci_comparison = true; payload.sme_gas_bundled_rate_per_gj = util.smeGasBundledRatePerGJ?.toFixed(4) ?? ""; payload.sme_gas_energy_share = util.smeCiEnergyShareOfInvoice?.toFixed(4) ?? ""; payload.sme_gas_postcode = util.smeGasPostcode || ""; payload.sme_gas_invoice_total_stated = util.smeGasTotalExGst?.toFixed(2) ?? ""; payload.sme_gas_invoice_includes_gst = util.smeGasInvoiceTotalIncludesGst === true;
          const exGst = getSmeGasEffectiveTotalExGst(util); payload.sme_gas_effective_total_ex_gst = exGst != null ? exGst.toFixed(2) : "";
          payload.sme_gas_invoice_period_gj = util.smeGasInvoicePeriodGJ != null && util.smeGasInvoicePeriodGJ > 0 ? util.smeGasInvoicePeriodGJ.toFixed(3) : "";
        } else { errors.push(`${util.identifier}: Comparison generation not yet supported for this utility type`); setSending(null); continue; }
        const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        const responseText = await response.text();
        console.log('[Base2 webhook]', { url: webhookUrl, status: response.status, ok: response.ok, identifier: util.identifier, action, responsePreview: responseText.slice(0, 500) });
        let result: Record<string, unknown>;
        try { result = JSON.parse(responseText) as Record<string, unknown>; } catch (parseErr) { console.error('[Base2 webhook] Response is not JSON:', parseErr); errors.push(`${util.identifier}: Webhook response was not valid JSON`); setSending(null); continue; }
        if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && result[0] !== null) { result = result[0] as Record<string, unknown>; console.log('[Base2 webhook] Unwrapped array response to first item'); }
        console.log('[Base2 webhook] Parsed result keys and link/savings fields:', { keys: Object.keys(result), pdf_document_link: result.pdf_document_link, pdf_DMA_link: result.pdf_DMA_link, spreadsheet_document_link: result.spreadsheet_document_link, annual_savings: result.annual_savings, current_cost: result.current_cost, new_cost: result.new_cost, email_ID: result.email_ID ?? result.email_id });
        if (response.ok) { const actionName = action === 'dma' ? 'DMA Review' : 'Comparison'; let message = `${util.utilityType} ${actionName} generated successfully for ${util.identifier}`; if (result.pdf_document_link) message += `\nPDF: ${result.pdf_document_link}`; if (result.spreadsheet_document_link) message += `\nSpreadsheet: ${result.spreadsheet_document_link}`; results.push(message); successResults.push({ util, result }); }
        else { console.error('[Base2 webhook] Non-OK response body:', responseText.slice(0, 800)); errors.push(`${util.identifier}: ${responseText.slice(0, 200)}`); }
      } catch (err: any) { console.error(`Error generating ${action === 'dma' ? 'DMA review' : 'comparison'} for ${util.identifier}:`, err); errors.push(`${util.identifier}: ${err.message || `Failed to generate ${action === 'dma' ? 'DMA review' : 'comparison'}`}`); }
      finally { setSending(null); }
    }
    if (results.length > 0 || errors.length > 0) {
      const actionName = action === 'dma' ? 'DMA Review' : 'Comparison';
      const resultItems: GenerateResultItem[] = successResults.map(({ util, result }) => ({ identifier: util.identifier, utilityType: util.utilityType, pdfUrl: (result.pdf_document_link ?? result.pdf_DMA_link) || undefined, spreadsheetUrl: result.spreadsheet_document_link || undefined }));
      setGenerateResultModal({ open: true, actionName, results: resultItems, errors });
      if (errors.length > 0) setError(`${errors.length} error(s) occurred. See summary for details.`);
      else setError(null);
      if (results.length > 0) {
        setSuccess(true);
        const offerIdFromUrl = urlOfferId ? parseInt(urlOfferId, 10) : null; const clientIdFromUrl = urlClientId ? parseInt(urlClientId, 10) : null;
        const hasValidOfferId = offerIdFromUrl != null && !isNaN(offerIdFromUrl); const hasValidClientId = clientIdFromUrl != null && !isNaN(clientIdFromUrl);
        let offerIdToUse: number | null = hasValidOfferId ? offerIdFromUrl : null;
        if (offerIdToUse == null && hasValidClientId && token && successResults.length > 0) {
          const baseUrl = getApiBaseUrl(); const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
          try { const createRes = await fetch(`${baseUrl}/api/offers`, { method: 'POST', headers, body: JSON.stringify({ client_id: clientIdFromUrl, status: 'requested', business_name: businessName || businessInfo?.name || undefined }) }); if (createRes.ok) { const created = await createRes.json(); offerIdToUse = created?.id ?? null; } } catch (createErr) { console.warn('Failed to create offer for client (Base 2 success):', createErr); }
        }
        if (offerIdToUse != null && token && successResults.length > 0) {
          const baseUrl = getApiBaseUrl(); const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
          try {
            const first = successResults[0]; const docLink = first.result.pdf_document_link || first.result.spreadsheet_document_link || undefined; const externalId = first.result.run_id || first.result.execution_id || `b2_${Date.now()}`;
            const simpleUtilityType = (u: UtilityComparison): string | undefined => { if (u.utilityType.includes('Electricity')) return 'electricity'; if (u.utilityType.includes('Gas')) return 'gas'; if (u.utilityType === 'Waste') return 'waste'; if (u.utilityType === 'Oil') return 'oil'; if (u.utilityType === 'Cleaning') return 'cleaning'; return undefined; };
            const firstUtilityType = simpleUtilityType(first.util); const firstIdentifierKey = first.util.utilityType.includes('Electricity') ? 'nmi' : first.util.utilityType.includes('Gas') ? 'mrin' : first.util.utilityType === 'Waste' ? 'account_number' : first.util.utilityType === 'Oil' ? 'account_name' : 'identifier';
            await fetch(`${baseUrl}/api/offers/${offerIdToUse}/activities`, { method: 'POST', headers, body: JSON.stringify({ activity_type: 'base2_review', document_link: normalizeDocumentLink(docLink) ?? undefined, external_id: externalId, metadata: { utility_type: firstUtilityType, [firstIdentifierKey]: first.util.identifier, source: 'base2_page' }, created_by: session?.user?.email || undefined }) });
            const comparisonTypeSlug = (util: UtilityComparison, isDma: boolean): string | null => { if (isDma && util.utilityType === 'C&I Electricity') return 'dma'; if (util.utilityType === 'C&I Electricity') return 'electricity_ci'; if (util.utilityType === 'SME Electricity') return 'electricity_sme'; if (util.utilityType === 'C&I Gas' || util.utilityType === 'SME Gas') return 'gas'; if (util.utilityType === 'Oil') return 'oil'; if (util.utilityType === 'Waste') return 'waste'; if (util.utilityType === 'Cleaning') return 'cleaning'; return null; };
            const activityIdByLane: Partial<Record<'ci_gas' | 'ci_electricity', number>> = {};
            for (const { util, result } of successResults) {
              const slug = comparisonTypeSlug(util, action === 'dma');
              if (slug) {
                const comparisonDocLink = (result.pdf_document_link ?? result.pdf_DMA_link ?? result.spreadsheet_document_link) || undefined; const utilityType = simpleUtilityType(util); const identifierKey = util.utilityType.includes('Electricity') ? 'nmi' : util.utilityType.includes('Gas') ? 'mrin' : util.utilityType === 'Waste' ? 'account_number' : util.utilityType === 'Oil' ? 'account_name' : 'identifier';
                const metadata: Record<string, any> = { utility_type: utilityType, [identifierKey]: util.identifier, comparison_type: slug, source: 'base2_page' };
                const normAnnual = normalizeMoneyToNumber((result as any).annual_savings); if (normAnnual != null) metadata.annual_savings = normAnnual;
                const normCurrent = normalizeMoneyToNumber((result as any).current_cost); if (normCurrent != null) metadata.current_cost = normCurrent;
                const normNew = normalizeMoneyToNumber((result as any).new_cost); if (normNew != null) metadata.new_cost = normNew;
                const normAnnualUsage = normalizeMoneyToNumber((result as any).annual_usage_gj); if (normAnnualUsage != null) metadata.annual_usage_gj = normAnnualUsage;
                const normEnergyChargePct = normalizeMoneyToNumber((result as any).energy_charge_pct); if (normEnergyChargePct != null) metadata.energy_charge_pct = normEnergyChargePct;
                const normContractedRate = normalizeMoneyToNumber((result as any).contracted_rate); if (normContractedRate != null) metadata.contracted_rate = normContractedRate;
                const normOfferRate = normalizeMoneyToNumber((result as any).offer_rate); if (normOfferRate != null) metadata.offer_rate = normOfferRate;
                const activityPayload = { activity_type: action === 'dma' ? 'dma_review_generated' : 'comparison', document_link: normalizeDocumentLink(comparisonDocLink) ?? undefined, metadata, created_by: session?.user?.email || undefined };
                console.log('[Base2 offer activity] POST to backend', { offerId: offerIdToUse, identifier: util.identifier, activity_type: activityPayload.activity_type, document_link: activityPayload.document_link, metadata_keys: Object.keys(metadata), annual_savings: metadata.annual_savings, current_cost: metadata.current_cost, new_cost: metadata.new_cost });
                const activityRes = await fetch(`${baseUrl}/api/offers/${offerIdToUse}/activities`, { method: 'POST', headers, body: JSON.stringify(activityPayload) });
                if (activityRes.ok) { try { const act = (await activityRes.json()) as { id?: number }; if (typeof act.id === 'number') { if (slug === 'gas') activityIdByLane.ci_gas = act.id; if (slug === 'electricity_ci') activityIdByLane.ci_electricity = act.id; } } catch { /* ignore */ } }
                else { const errBody = await activityRes.text(); console.warn('[Base2 offer activity] Backend responded with error', activityRes.status, errBody); }
              }
            }
            if (action === 'comparison') {
              const lanes = new Set<'ci_gas' | 'ci_electricity'>();
              for (const { util } of successResults) { if (util.utilityType === 'C&I Gas' || (util.utilityType === 'SME Gas' && util.smeGasComparisonMode === 'ci_offer')) lanes.add('ci_gas'); if (util.utilityType === 'C&I Electricity') lanes.add('ci_electricity'); }
              if (lanes.size > 0) {
                const anchorIso = new Date().toISOString(); const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Melbourne' : 'Australia/Melbourne';
                const ctxBase = { base2_trigger: 'comparison_success', business_name: businessName || businessInfo?.name, contact_email: webhookRecipient?.contactEmail ?? businessInfo?.email, contact_phone: businessInfo?.telephone, contact_name: webhookRecipient?.contactName ?? businessInfo?.contact_name };
                for (const lane of lanes) {
                  const sequence_type = lane === 'ci_gas' ? AUTONOMOUS_SEQUENCE_CI_GAS : AUTONOMOUS_SEQUENCE_CI_ELECTRICITY;
                  const laneSuccess = successResults.filter(({ util }) => lane === 'ci_gas' ? util.utilityType === 'C&I Gas' || (util.utilityType === 'SME Gas' && util.smeGasComparisonMode === 'ci_offer') : util.utilityType === 'C&I Electricity');
                  const identifiers = laneSuccess.map(({ util }) => util.identifier);
                  const emailIdsBySite: Record<string, string> = {}; let firstEmailId: string | undefined;
                  for (const { util, result } of laneSuccess) { const raw = result.email_ID ?? result.email_id; if (typeof raw === 'string' && raw.trim()) { const eid = raw.trim(); emailIdsBySite[util.identifier] = eid; if (!firstEmailId) firstEmailId = eid; } }
                  const sequenceContext: Record<string, unknown> = { ...ctxBase, utility_lane: lane, site_identifiers: identifiers };
                  if (firstEmailId) sequenceContext.email_ID = firstEmailId;
                  if (Object.keys(emailIdsBySite).length > 1) sequenceContext.email_ids_by_site = emailIdsBySite;
                  try { const startRes = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/start`, { method: 'POST', headers, body: JSON.stringify({ sequence_type, offer_id: offerIdToUse, client_id: hasValidClientId ? clientIdFromUrl! : undefined, crm_activity_id: activityIdByLane[lane], anchor_at: anchorIso, timezone: tz, context: sequenceContext }) }); if (!startRes.ok) { const errTxt = await startRes.text(); console.warn('[Base2 autonomous] start failed', startRes.status, errTxt); } else { const started = await startRes.json().catch(() => ({})); console.log('[Base2 autonomous] sequence start', { lane, ...started }); } } catch (autoErr) { console.warn('[Base2 autonomous] start error', autoErr); }
                }
              }
            }
          } catch (err) { console.warn('Failed to log offer activities:', err); }
        }
      }
    }
  };

  const getInvoiceLink = (comparison: UtilityComparison): string | null => {
    if (!comparison.invoiceData) return null;
    if (comparison.utilityType.includes('Electricity')) { const details = comparison.invoiceData?.electricity_ci_invoice_details || comparison.invoiceData?.electricity_sme_invoice_details || {}; const fullData = details?.full_invoice_data || comparison.invoiceData?.full_invoice_data || {}; return details?.invoice_link || fullData['Invoice Link'] || null; }
    else if (comparison.utilityType.includes('Gas')) { if (comparison.invoiceData?.gas_sme_invoicedetails) return comparison.invoiceData.gas_sme_invoicedetails.invoice_link || null; const details = comparison.invoiceData?.gas_ci_invoice_details || comparison.invoiceData?.gas_invoice_details || {}; const fullData = details?.full_invoice_data || comparison.invoiceData?.full_invoice_data || {}; return details?.invoice_link || fullData['Invoice Link'] || null; }
    else if (comparison.utilityType === 'Oil') { const details = comparison.invoiceData?.oil_invoice_details || comparison.invoiceData || {}; return details?.invoice_link || null; }
    else if (comparison.utilityType === 'Waste') { const details = comparison.invoiceData?.waste_invoice_details || comparison.invoiceData || {}; return details?.invoice_link || null; }
    else if (comparison.utilityType === 'Cleaning') { const details = comparison.invoiceData?.cleaning_invoice_details || comparison.invoiceData || {}; return details?.invoice_link || null; }
    return null;
  };

  // ─── Table row renderer (visual enhancements) ─────────────────────────────────

  const renderTableRows = (comparison: UtilityComparison, savings: any, isElectricity: boolean, isGas: boolean) => {
    const rows: React.ReactElement[] = [];

    const savingsPill = (value: number | undefined) => {
      if (value == null) return <span className="text-gray-400 text-xs">—</span>;
      const isNeg = value < 0;
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${isNeg ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {isNeg ? '▼' : '▲'} {Math.abs(value).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    };

    const savingsPct = (value: number | undefined) => {
      if (value == null) return <span className="text-gray-400 text-xs">—</span>;
      const isNeg = value < 0;
      return <span className={`text-xs font-semibold tabular-nums ${isNeg ? 'text-red-600' : 'text-emerald-600'}`}>{value.toFixed(1)}%</span>;
    };

    const inputCls = "w-full px-2 py-1 border border-gray-200 rounded-md text-right text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow";
    const tdBase = "border-b border-gray-100 px-2 py-2";
    const labelTd = `${tdBase} text-xs text-gray-600 font-medium whitespace-nowrap`;

    if (isElectricity && comparison.utilityType === 'C&I Electricity') {
      const curMeterAnnual = comparison.currentMeterAnnual ?? comparison.currentMeteringAnnual ?? 0;
      const curVasAnnual = comparison.currentVasAnnual ?? 0;
      const compMeterAnnual = comparison.comparisonMeterAnnual ?? 600;
      const compVasAnnual = comparison.comparisonVasAnnual ?? 300;
      const compTotalAnnual = comparison.comparisonMeteringAnnual ?? 900;
      rows.push(
        <tr key="meter" className="hover:bg-gray-50/50">
          <td className={labelTd}>Meter</td>
          <td className={tdBase}>
            <input type="number" step="0.01" value={comparison.currentMeterDaily ?? comparison.currentMeteringDaily ?? ''} onChange={(e) => { const daily = parseFloat(e.target.value) || 0; updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentMeterDaily', e.target.value); if (daily > 0) updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentMeterAnnual', (daily * 365).toFixed(2)); else updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentMeterAnnual', ''); }} className={inputCls} placeholder="Daily $/day" />
            {curMeterAnnual ? <div className="text-[10px] text-gray-400 text-right mt-0.5">${curMeterAnnual.toFixed(2)}/yr</div> : null}
          </td>
          <td className={`${tdBase} text-center text-gray-300 text-xs`}>—</td>
          <td className={tdBase}>
            <input type="number" step="0.01" value={compMeterAnnual} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonMeterAnnual', e.target.value)} className={inputCls} placeholder="600" />
            <div className="text-[10px] text-gray-400 text-right mt-0.5">$/yr</div>
          </td>
          <td className={`${tdBase} text-right`}>{savingsPill(curMeterAnnual && compMeterAnnual ? curMeterAnnual - compMeterAnnual : undefined)}<div className="text-[10px] text-gray-400 text-right mt-0.5">/yr</div></td>
          <td className={`${tdBase} text-right`}>{savingsPct(curMeterAnnual && compMeterAnnual && curMeterAnnual > 0 ? ((curMeterAnnual - compMeterAnnual) / curMeterAnnual) * 100 : undefined)}</td>
        </tr>
      );
      rows.push(
        <tr key="vas" className="hover:bg-gray-50/50">
          <td className={labelTd}>VAS</td>
          <td className={tdBase}>
            <input type="number" step="0.01" value={comparison.currentVasDaily ?? ''} onChange={(e) => { const daily = parseFloat(e.target.value) || 0; updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentVasDaily', e.target.value); if (daily > 0) updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentVasAnnual', (daily * 365).toFixed(2)); else updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentVasAnnual', ''); }} className={inputCls} placeholder="Daily $/day" />
            {curVasAnnual ? <div className="text-[10px] text-gray-400 text-right mt-0.5">${curVasAnnual.toFixed(2)}/yr</div> : null}
          </td>
          <td className={`${tdBase} text-center text-gray-300 text-xs`}>—</td>
          <td className={tdBase}>
            <input type="number" step="0.01" value={compVasAnnual} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonVasAnnual', e.target.value)} className={inputCls} placeholder="300" />
            <div className="text-[10px] text-gray-400 text-right mt-0.5">$/yr</div>
          </td>
          <td className={`${tdBase} text-right`}>{savingsPill(curVasAnnual && compVasAnnual ? curVasAnnual - compVasAnnual : undefined)}<div className="text-[10px] text-gray-400 text-right mt-0.5">/yr</div></td>
          <td className={`${tdBase} text-right`}>{savingsPct(curVasAnnual && compVasAnnual && curVasAnnual > 0 ? ((curVasAnnual - compVasAnnual) / curVasAnnual) * 100 : undefined)}</td>
        </tr>
      );
      rows.push(
        <tr key="metering-total" className="bg-gray-50/80 hover:bg-gray-50">
          <td className={`${labelTd} font-semibold text-gray-700`}>Metering (total)</td>
          <td className={`${tdBase} text-right text-xs font-mono text-gray-700`}>{comparison.currentMeteringAnnual ? `$${comparison.currentMeteringAnnual.toFixed(2)}/yr` : '—'}</td>
          <td className={`${tdBase} text-center text-gray-300 text-xs`}>—</td>
          <td className={`${tdBase} text-right text-xs font-mono text-gray-700`}>${compTotalAnnual.toFixed(2)}/yr</td>
          <td className={`${tdBase} text-right`}>{savingsPill(comparison.currentMeteringAnnual && compTotalAnnual ? comparison.currentMeteringAnnual - compTotalAnnual : undefined)}</td>
          <td className={`${tdBase} text-right`}>{savingsPct(comparison.currentMeteringAnnual && compTotalAnnual && comparison.currentMeteringAnnual > 0 ? ((comparison.currentMeteringAnnual - compTotalAnnual) / comparison.currentMeteringAnnual) * 100 : undefined)}</td>
        </tr>
      );
    }

    if (isElectricity) {
      rows.push(
        <tr key="peak" className="hover:bg-gray-50/50">
          <td className={labelTd}>Peak Rate <span className="text-gray-400">(c/kWh)</span></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.currentPeakRate || ''} onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentPeakRate', e.target.value)} className={inputCls} placeholder="c/kWh" /></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.peakUsage || ''} onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'peakUsage', e.target.value)} className={inputCls} placeholder="kWh" /></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.comparisonPeakRate || ''} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonPeakRate', e.target.value)} className={inputCls} placeholder="24.50" /></td>
          <td className={`${tdBase} text-right`}>{savingsPill(savings?.peakAnnualSavings)}{savings?.peakAnnualSavings != null && <div className="text-[10px] text-gray-400 text-right mt-0.5">/yr</div>}</td>
          <td className={`${tdBase} text-right`}>{savingsPct(savings?.peakSavingsPercent)}</td>
        </tr>
      );
      rows.push(
        <tr key="offpeak" className="hover:bg-gray-50/50">
          <td className={labelTd}>Off-Peak Rate <span className="text-gray-400">(c/kWh)</span></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.currentOffPeakRate || ''} onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentOffPeakRate', e.target.value)} className={inputCls} placeholder="c/kWh" /></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.offPeakUsage || ''} onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'offPeakUsage', e.target.value)} className={inputCls} placeholder="kWh" /></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.comparisonOffPeakRate || ''} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonOffPeakRate', e.target.value)} className={inputCls} placeholder="18.00" /></td>
          <td className={`${tdBase} text-right`}>{savingsPill(savings?.offPeakAnnualSavings)}{savings?.offPeakAnnualSavings != null && <div className="text-[10px] text-gray-400 text-right mt-0.5">/yr</div>}</td>
          <td className={`${tdBase} text-right`}>{savingsPct(savings?.offPeakSavingsPercent)}</td>
        </tr>
      );
      if (comparison.currentShoulderRate && comparison.currentShoulderRate > 0) {
        rows.push(
          <tr key="shoulder" className="hover:bg-gray-50/50">
            <td className={labelTd}>Shoulder Rate <span className="text-gray-400">(c/kWh)</span></td>
            <td className={tdBase}><input type="number" step="0.01" value={comparison.currentShoulderRate || ''} onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentShoulderRate', e.target.value)} className={inputCls} /></td>
            <td className={`${tdBase} text-center text-gray-300 text-xs`}>—</td>
            <td className={tdBase}><input type="number" step="0.01" value={comparison.comparisonShoulderRate || ''} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonShoulderRate', e.target.value)} className={inputCls} placeholder="20.00" /></td>
            <td className={`${tdBase} text-center text-gray-300 text-xs`}>—</td>
            <td className={`${tdBase} text-center text-gray-300 text-xs`}>—</td>
          </tr>
        );
      }
      if (comparison.utilityType !== 'C&I Electricity') {
        rows.push(
          <tr key="supply" className="hover:bg-gray-50/50">
            <td className={labelTd}>Daily Supply Charge <span className="text-gray-400">($/day)</span></td>
            <td className={tdBase}><input type="number" step="0.01" value={comparison.currentDailySupply || ''} onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentDailySupply', e.target.value)} className={inputCls} /></td>
            <td className={`${tdBase} text-center text-gray-300 text-xs`}>—</td>
            <td className={tdBase}><input type="number" step="0.01" value={comparison.comparisonDailySupply || ''} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonDailySupply', e.target.value)} className={inputCls} placeholder="1.50" /></td>
            <td className={`${tdBase} text-right`}>{savingsPill(comparison.currentDailySupply && comparison.comparisonDailySupply ? (comparison.currentDailySupply - comparison.comparisonDailySupply) * 365 : undefined)}{comparison.currentDailySupply && comparison.comparisonDailySupply && <div className="text-[10px] text-gray-400 text-right mt-0.5">/yr</div>}</td>
            <td className={`${tdBase} text-right`}>{savingsPct(comparison.currentDailySupply && comparison.comparisonDailySupply ? ((comparison.currentDailySupply - comparison.comparisonDailySupply) / comparison.currentDailySupply) * 100 : undefined)}</td>
          </tr>
        );
      }
      if (comparison.utilityType === 'C&I Electricity') {
        const demandQty = comparison.demandQuantity || 0;
        const currentDemand = comparison.currentDemandCharge || 0;
        const currentDemandAnnual = (currentDemand * demandQty * 12);
        const comparisonDemand = comparison.comparisonDemandCharge || 0;
        const comparisonDemandAnnual = (comparisonDemand * demandQty * 12);
        const demandSavings = currentDemandAnnual - comparisonDemandAnnual;
        rows.push(
          <tr key="demand" className="hover:bg-gray-50/50">
            <td className={labelTd}>Demand Charge <span className="text-gray-400">($/kVA/mth)</span></td>
            <td className={tdBase}><input type="number" step="0.01" value={currentDemand > 0 ? currentDemand : ''} onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentDemandCharge', e.target.value)} className={inputCls} placeholder="$/kVA" /></td>
            <td className={tdBase}><input type="number" step="0.01" value={demandQty > 0 ? demandQty : ''} onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'demandQuantity', e.target.value)} className={inputCls} placeholder="kVA" /></td>
            <td className={tdBase}><input type="number" step="0.01" value={comparison.comparisonDemandCharge || ''} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonDemandCharge', e.target.value)} className={inputCls} placeholder="12.00" /></td>
            <td className={`${tdBase} text-right`}>{savingsPill(comparison.comparisonDemandCharge && comparison.comparisonDemandCharge > 0 && currentDemand > 0 ? demandSavings : undefined)}{comparison.comparisonDemandCharge && currentDemand > 0 && <div className="text-[10px] text-gray-400 text-right mt-0.5">/yr</div>}</td>
            <td className={`${tdBase} text-right`}>{savingsPct(comparison.comparisonDemandCharge && comparison.comparisonDemandCharge > 0 && currentDemand > 0 && currentDemandAnnual > 0 ? (demandSavings / currentDemandAnnual) * 100 : undefined)}</td>
          </tr>
        );
      }
    }

    if (isGas) {
      rows.push(
        <tr key="gas-rate" className="hover:bg-gray-50/50">
          <td className={`${labelTd} font-semibold`}>Gas Rate <span className="font-normal text-gray-400">($/GJ)</span></td>
          <td className={tdBase}><input type="number" step="0.0001" value={comparison.currentGasRate || ''} onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentGasRate', e.target.value)} className={inputCls} placeholder="$/GJ" /></td>
          <td className={tdBase}>
            <input type="number" step="0.01" value={comparison.gasUsage || ''} onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'gasUsage', e.target.value)} className={inputCls} placeholder="GJ" />
            {comparison.utilityType === "C&I Gas" && (
              <div className="mt-2 space-y-1">
                <label className="block text-[10px] uppercase tracking-wide text-gray-400">Annual (GJ/yr)</label>
                <input type="number" step="0.01" value={comparison.ciGasAnnualConsumptionGJ ?? ""} onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, "ciGasAnnualConsumptionGJ", e.target.value)} className={inputCls} placeholder="Optional" />
                {(() => { const derived = ciGasBillPeriodUsageFromAnnual(comparison.ciGasAnnualConsumptionGJ, comparison.ciGasInvoiceReviewDays); if (derived != null && derived > 0) return <div className="text-[10px] text-gray-400 text-right">Bill-period: {derived.toFixed(3)} GJ{comparison.ciGasInvoiceReviewDays != null ? ` (${comparison.ciGasInvoiceReviewDays} d)` : ""}</div>; if (comparison.ciGasAnnualConsumptionGJ != null && comparison.ciGasAnnualConsumptionGJ > 0 && !(comparison.ciGasInvoiceReviewDays != null && comparison.ciGasInvoiceReviewDays > 0)) return <div className="text-[10px] text-amber-600 text-right">Add invoice days to derive period usage.</div>; return null; })()}
              </div>
            )}
            {comparison.utilityType === "SME Gas" && (comparison.smeGasComparisonMode ?? "invoice_blocks") === "ci_offer" && (
              <div className="mt-2 space-y-1">
                <label className="block text-[10px] uppercase tracking-wide text-gray-400">Energy share (0–1)</label>
                <input type="number" step="0.01" min={0.01} max={1} value={comparison.smeCiEnergyShareOfInvoice ?? ""} onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, "smeCiEnergyShareOfInvoice", e.target.value)} className={inputCls} placeholder="0.72" />
                <label className="block text-[10px] uppercase tracking-wide text-gray-400">Annual (GJ/yr)</label>
                <input type="number" step="0.01" value={comparison.smeGasAnnualConsumptionGJ ?? ""} onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, "smeGasAnnualConsumptionGJ", e.target.value)} className={inputCls} placeholder="Optional" />
                {(() => { const derived = ciGasBillPeriodUsageFromAnnual(comparison.smeGasAnnualConsumptionGJ, comparison.smeGasInvoiceReviewDays); if (derived != null && derived > 0) return <div className="text-[10px] text-gray-400 text-right">Bill-period: {derived.toFixed(3)} GJ{comparison.smeGasInvoiceReviewDays != null ? ` (${comparison.smeGasInvoiceReviewDays} d)` : ""}</div>; return null; })()}
              </div>
            )}
            {comparison.estimatedAnnualUsage && comparison.estimatedAnnualUsage > 0 && <div className="text-[10px] text-gray-400 text-right mt-1">Est. annual: {comparison.estimatedAnnualUsage.toFixed(2)} GJ</div>}
          </td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.comparisonGasRate || ''} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonGasRate', e.target.value)} className={inputCls} placeholder="14.8" /></td>
          <td className={`${tdBase} text-right`}>{savingsPill(savings?.usageSavings != null ? (savings.gasUsageSavingsAnnual ?? savings.usageSavings * 12) : undefined)}{savings?.usageSavings != null && <div className="text-[10px] text-gray-400 text-right mt-0.5">/yr</div>}</td>
          <td className={`${tdBase} text-right`}>{savingsPct(savings?.usageSavingsPercent)}</td>
        </tr>
      );
      const showSmeGasSupplyRow = comparison.utilityType !== "C&I Gas" && !(comparison.utilityType === "SME Gas" && (comparison.smeGasComparisonMode ?? "invoice_blocks") === "ci_offer");
      if (showSmeGasSupplyRow) {
        rows.push(
          <tr key="gas-supply" className="hover:bg-gray-50/50">
            <td className={labelTd}>Daily Supply Charge <span className="text-gray-400">($/day)</span></td>
            <td className={tdBase}><input type="number" step="0.01" value={comparison.currentDailySupply || ''} onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentDailySupply', e.target.value)} className={inputCls} /></td>
            <td className={`${tdBase} text-center text-gray-300 text-xs`}>—</td>
            <td className={tdBase}><input type="number" step="0.01" value={comparison.comparisonDailySupply || ''} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonDailySupply', e.target.value)} className={inputCls} placeholder="1.20" /></td>
            <td className={`${tdBase} text-right`}>{savingsPill(comparison.currentDailySupply && comparison.comparisonDailySupply ? (comparison.currentDailySupply - comparison.comparisonDailySupply) * 365 : undefined)}</td>
            <td className={`${tdBase} text-right`}>{savingsPct(comparison.currentDailySupply && comparison.comparisonDailySupply ? ((comparison.currentDailySupply - comparison.comparisonDailySupply) / comparison.currentDailySupply) * 100 : undefined)}</td>
          </tr>
        );
      }
    }

    if (comparison.utilityType === 'Oil') {
      rows.push(
        <tr key="oil-rate" className="hover:bg-gray-50/50">
          <td className={`${labelTd} font-semibold`}>Oil Rate <span className="font-normal text-gray-400">($/L)</span></td>
          <td className={tdBase}><input type="number" step="0.0001" value={comparison.currentOilRate || ''} onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentOilRate', e.target.value)} className={inputCls} placeholder="$/L" /></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.oilUsage || ''} onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'oilUsage', e.target.value)} className={inputCls} placeholder="Litres" /></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.comparisonOilRate || ''} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonOilRate', e.target.value)} className={inputCls} placeholder="$/L" /></td>
          <td className={`${tdBase} text-right`}>{savingsPill(savings?.usageSavings != null ? savings.usageSavings * 12 : undefined)}{savings?.usageSavings != null && <div className="text-[10px] text-gray-400 text-right mt-0.5">/yr</div>}</td>
          <td className={`${tdBase} text-right`}>{savingsPct(savings?.usageSavingsPercent)}</td>
        </tr>
      );
    }

    if (comparison.utilityType === 'Waste') {
      rows.push(
        <tr key="waste-rate" className="hover:bg-gray-50/50">
          <td className={`${labelTd} font-semibold`}>Waste Rate <span className="font-normal text-gray-400">($/service)</span></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.currentWasteRate || ''} onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentWasteRate', e.target.value)} className={inputCls} /></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.wasteUsage || ''} onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'wasteUsage', e.target.value)} className={inputCls} placeholder="Per month" /></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.comparisonWasteRate || ''} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonWasteRate', e.target.value)} className={inputCls} placeholder="50.00" /></td>
          <td className={`${tdBase} text-right`}>{savingsPill(savings?.usageSavings != null ? savings.usageSavings * 12 : undefined)}</td>
          <td className={`${tdBase} text-right`}>{savingsPct(savings?.usageSavingsPercent)}</td>
        </tr>
      );
    }

    if (comparison.utilityType === 'Cleaning') {
      rows.push(
        <tr key="cleaning-rate" className="hover:bg-gray-50/50">
          <td className={`${labelTd} font-semibold`}>Cleaning Rate <span className="font-normal text-gray-400">($/visit)</span></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.currentCleaningRate || ''} onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentCleaningRate', e.target.value)} className={inputCls} /></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.cleaningUsage || ''} onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'cleaningUsage', e.target.value)} className={inputCls} placeholder="Per month" /></td>
          <td className={tdBase}><input type="number" step="0.01" value={comparison.comparisonCleaningRate || ''} onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonCleaningRate', e.target.value)} className={inputCls} placeholder="100.00" /></td>
          <td className={`${tdBase} text-right`}>{savingsPill(savings?.usageSavings != null ? savings.usageSavings * 12 : undefined)}</td>
          <td className={`${tdBase} text-right`}>{savingsPct(savings?.usageSavingsPercent)}</td>
        </tr>
      );
    }

    if (savings && savings.totalAnnualSavings !== undefined) {
      const isNeg = savings.totalAnnualSavings < 0;
      rows.push(
        <tr key="savings" className={`${isNeg ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <td colSpan={4} className={`px-3 py-3 text-sm font-semibold ${isNeg ? 'text-red-700' : 'text-emerald-700'}`}>
            <span className="mr-2">{isNeg ? '⚠️' : '✅'}</span>
            Estimated Annual {isNeg ? 'Cost Increase' : 'Savings'}
          </td>
          <td className="px-2 py-3 text-right">
            <span className={`text-base font-bold tabular-nums ${isNeg ? 'text-red-700' : 'text-emerald-700'}`}>
              {savings.totalAnnualSavings.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
            </span>
          </td>
          <td className={`px-2 py-3 text-right font-bold text-sm ${isNeg ? 'text-red-600' : 'text-emerald-600'}`}>
            {savings.totalAnnualSavingsPercent !== undefined ? `${savings.totalAnnualSavingsPercent.toFixed(1)}%` : '—'}
          </td>
        </tr>
      );
    }

    return rows;
  };

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/70">
      <div className="container mx-auto px-6 py-6 max-w-6xl">
        <PageHeader pageName="Base 2 Review" title="Base 2 Review - Quick Rate Comparison" />

        {/* Business Information Card */}
        {businessInfo && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Business Information</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
              {businessInfo.name && (
                <div className="flex items-start gap-2.5">
                  <span className="text-gray-400 mt-0.5 text-sm flex-shrink-0">🏢</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Business Name</div>
                    <div className="text-sm font-semibold text-gray-800">{businessInfo.name}</div>
                  </div>
                </div>
              )}
              {businessInfo.abn && (
                <div className="flex items-start gap-2.5">
                  <span className="text-gray-400 mt-0.5 text-sm flex-shrink-0">🔢</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">ABN</div>
                    <div className="text-sm font-mono text-gray-700">{businessInfo.abn}</div>
                  </div>
                </div>
              )}
              {businessInfo.site_address && (
                <div className="flex items-start gap-2.5">
                  <span className="text-gray-400 mt-0.5 text-sm flex-shrink-0">📍</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Site Address</div>
                    <div className="text-sm text-gray-700">{businessInfo.site_address}</div>
                  </div>
                </div>
              )}
              {businessInfo.email && (
                <div className="flex items-start gap-2.5">
                  <span className="text-gray-400 mt-0.5 text-sm flex-shrink-0">✉️</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Email</div>
                    <div className="text-sm text-gray-700">{businessInfo.email}</div>
                  </div>
                </div>
              )}
              {businessInfo.contact_name && (
                <div className="flex items-start gap-2.5">
                  <span className="text-gray-400 mt-0.5 text-sm flex-shrink-0">👤</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Contact</div>
                    <div className="text-sm text-gray-700">{businessInfo.contact_name}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Linked Utilities */}
        {utilityComparisons.length === 0 && businessInfo?.utilities && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5 flex items-center gap-4">
            <div className="flex-shrink-0">
              <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700">Loading linked utilities…</div>
              <div className="text-xs text-gray-400 mt-0.5">Fetching invoice data from connected accounts</div>
            </div>
          </div>
        )}

        {/* Utility Comparison Cards */}
        {utilityComparisons.map((comparison, idx) => {
          const savings = calculateSavings(comparison);
          const isElectricity = comparison.utilityType.includes('Electricity');
          const isGas = comparison.utilityType.includes('Gas');
          const cfg = getUtilityConfig(comparison.utilityType);
          const hasSavings = savings?.totalAnnualSavings != null;
          const savingsPositive = hasSavings && savings.totalAnnualSavings > 0;

          return (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ borderLeftWidth: 4, borderLeftColor: cfg.color, borderLeftStyle: 'solid' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ backgroundColor: cfg.bg, color: cfg.text }}
                  >
                    {cfg.icon} {cfg.label}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs text-gray-400 flex-shrink-0">{comparison.identifierLabel}</span>
                    <span className="text-sm font-mono font-semibold text-gray-800 truncate">{comparison.identifier}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  {!comparison.loading && !comparison.error && hasSavings && (
                    <div className={`text-right ${savingsPositive ? '' : ''}`}>
                      <div className={`text-xs font-medium ${savingsPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                        {savingsPositive ? 'Potential savings' : 'Cost increase'}
                      </div>
                      <div className={`text-base font-bold tabular-nums ${savingsPositive ? 'text-emerald-700' : 'text-red-600'}`}>
                        {Math.abs(savings.totalAnnualSavings).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}/yr
                      </div>
                    </div>
                  )}
                  {comparison.loading && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading…
                    </span>
                  )}
                </div>
              </div>

              <div className="px-5 py-4">
                {/* Loading State */}
                {comparison.loading && <SkeletonCardBody />}

                {/* Error State */}
                {comparison.error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <span className="text-red-400 flex-shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <div className="text-sm font-semibold text-red-700">Unable to load invoice data</div>
                      <div className="text-xs text-red-500 mt-0.5">{comparison.error}</div>
                    </div>
                  </div>
                )}

                {!comparison.loading && !comparison.error && (
                  <>
                    {/* Invoice Link */}
                    <div className="mb-4">
                      {getInvoiceLink(comparison) ? (
                        <a href={getInvoiceLink(comparison) || '#'} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                          style={{ color: cfg.text, borderColor: cfg.color + '40', backgroundColor: cfg.bg }}
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>
                          View Invoice PDF
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          No invoice link available
                        </span>
                      )}
                    </div>

                    {/* SME Gas Mode Selector */}
                    {comparison.utilityType === "SME Gas" && comparison.invoiceData?.gas_sme_invoicedetails && (
                      <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                        <div className="mb-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wide">Comparison Type — SME Gas</div>
                        <select value={comparison.smeGasComparisonMode ?? "invoice_blocks"} onChange={(e) => setSmeGasComparisonModeFor(comparison.identifier, e.target.value as SmeGasComparisonMode)} className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
                          <option value="invoice_blocks">Invoice block rates (tariff lines from bill)</option>
                          <option value="ci_offer">C&I-style comparison (SME → C&I)</option>
                          <option value="sme_benchmark_stub">SME vs SME benchmark (coming soon)</option>
                        </select>
                        {(comparison.smeGasComparisonMode ?? "invoice_blocks") === "sme_benchmark_stub" && (
                          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">This comparison mode is not yet available.</p>
                        )}
                        {(comparison.smeGasComparisonMode ?? "invoice_blocks") === "ci_offer" && (
                          <div className="mt-3 space-y-3 text-xs text-gray-700">
                            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                              <div className="mb-2 text-sm font-semibold text-gray-900">Bundled rate (C&I-style comparison)</div>
                              <p className="mb-3 text-[11px] leading-snug text-gray-500">Compare using implied energy $/GJ = reference energy share × bundled $ / GJ. Edit totals or usage if extraction missed them.</p>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-500">Invoice total ($)</label>
                                  <input type="number" step="0.01" min={0} value={comparison.smeGasTotalExGst ?? ""} onChange={(e) => { const v = e.target.value; updateSmeGasBillModeling(comparison.identifier, { smeGasTotalExGst: v === "" ? undefined : parseFloat(v) || undefined }); }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="0.00" />
                                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-gray-600">
                                    <input type="checkbox" checked={comparison.smeGasInvoiceTotalIncludesGst === true} onChange={(e) => updateSmeGasBillModeling(comparison.identifier, { smeGasInvoiceTotalIncludesGst: e.target.checked })} className="rounded border-gray-300" />
                                    <span>Amount <strong>includes GST</strong> (÷ 1.1)</span>
                                  </label>
                                  {comparison.smeGasTotalExGst != null && comparison.smeGasTotalExGst > 0 && comparison.smeGasInvoiceTotalIncludesGst === true && (
                                    <p className="mt-1 text-[10px] text-gray-500">Ex-GST: <span className="font-mono font-semibold">{formatAud(getSmeGasEffectiveTotalExGst(comparison))}</span></p>
                                  )}
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-500">Bill-period gas (GJ)</label>
                                  <input type="number" step="0.001" min={0} value={comparison.smeGasInvoicePeriodGJ != null && comparison.smeGasInvoicePeriodGJ > 0 ? comparison.smeGasInvoicePeriodGJ : ""} onChange={(e) => { const v = e.target.value; const n = v === "" ? NaN : parseFloat(v); updateSmeGasBillModeling(comparison.identifier, { smeGasInvoicePeriodGJ: v === "" || !Number.isFinite(n) || n <= 0 ? undefined : n }); }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="e.g. from invoice" />
                                </div>
                              </div>
                              {(() => { const ex = getSmeGasEffectiveTotalExGst(comparison); const gj = comparison.smeGasInvoicePeriodGJ; if (ex != null && ex > 0 && gj != null && Number.isFinite(gj) && gj > 0) { const bundled = ex / gj; return <p className="mt-2 rounded-lg border border-blue-100 bg-white/80 px-3 py-2 font-mono text-[11px] text-gray-800">{formatAud(ex)} ex-GST ÷ {gj.toLocaleString("en-AU", { maximumFractionDigits: 3 })} GJ = <strong className="text-blue-800">${bundled.toFixed(4)}/GJ</strong> bundled</p>; } return <p className="mt-2 text-[10px] text-amber-700">Enter a positive invoice total and bill-period GJ to compute bundled $/GJ.</p>; })()}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">Postcode (C&I reference bills)</span>
                              <input type="text" value={comparison.smeGasPostcode ?? ""} onChange={(e) => updateSmeGasPostcode(comparison.identifier, e.target.value)} className="w-28 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="3029" maxLength={12} />
                              {comparison.smeCiReferenceLoading && <span className="text-xs text-gray-400">Loading reference…</span>}
                            </div>
                            {comparison.smeCiReferenceError && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{comparison.smeCiReferenceError}</p>}
                            {comparison.smeCiReferenceSampleCount != null && comparison.smeCiReferenceSampleCount > 0 && <p className="text-xs text-gray-500">Reference: {comparison.smeCiReferenceSampleCount} C&I bill{comparison.smeCiReferenceSampleCount === 1 ? "" : "s"} (median energy $ ÷ invoice total).</p>}
                            {comparison.smeCiReferenceMatchStrategy && comparison.smeCiReferenceMatchStrategy !== "exact_postcode" && comparison.smeCiReferenceSampleCount != null && comparison.smeCiReferenceSampleCount > 0 && (
                              <p className="text-[11px] text-gray-400">Match: <span className="font-mono">{comparison.smeCiReferenceMatchStrategy}</span>{comparison.smeCiReferenceConfidence ? ` · confidence ${comparison.smeCiReferenceConfidence}` : ""}{comparison.smeCiReferenceMatchedPostcodes?.length ? ` · postcodes ${comparison.smeCiReferenceMatchedPostcodes.join(", ")}` : ""}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Comparison Table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200 mb-4">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: cfg.color }}>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/90 uppercase tracking-wide">Item</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">Current Rate</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">Current Usage</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">Offer Rate</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">Savings $</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">Savings %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {renderTableRows(comparison, savings, isElectricity, isGas)}
                        </tbody>
                      </table>
                    </div>

                    {/* Action Buttons */}
                    {(comparison.utilityType === 'C&I Electricity' || comparison.utilityType === 'C&I Gas' || (comparison.utilityType === 'SME Gas' && (comparison.smeGasComparisonMode ?? 'invoice_blocks') === 'ci_offer')) && (
                      <div className="flex flex-wrap justify-end gap-2.5 pt-1">
                        {comparison.utilityType === 'C&I Electricity' && (
                          <button
                            onClick={() => handleGenerateClick(comparison, 'dma')}
                            disabled={sending !== null && sending.includes(`${comparison.utilityType}-${comparison.identifier}-dma`)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#7C3AED' }}
                          >
                            {sending !== null && sending.includes(`${comparison.utilityType}-${comparison.identifier}-dma`) ? (
                              <><svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating…</>
                            ) : (<>📊 Generate DMA Review</>)}
                          </button>
                        )}
                        {(comparison.utilityType === 'C&I Electricity' || comparison.utilityType === 'C&I Gas' || (comparison.utilityType === 'SME Gas' && (comparison.smeGasComparisonMode ?? 'invoice_blocks') === 'ci_offer')) && (
                          <button
                            onClick={() => handleGenerateClick(comparison, 'comparison')}
                            disabled={sending !== null && sending.includes(`${comparison.utilityType}-${comparison.identifier}-comparison`)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: cfg.color }}
                          >
                            {sending !== null && sending.includes(`${comparison.utilityType}-${comparison.identifier}-comparison`) ? (
                              <><svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating…</>
                            ) : (<>⚡ {offerComparisonButtonLabel(comparison)}</>)}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Global Messages */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <span className="text-red-400 flex-shrink-0">⚠️</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
            <span className="flex-shrink-0">✅</span>
            <p className="text-sm font-semibold text-emerald-700">Comparison saved successfully!</p>
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {/* Generate scope choice modal */}
      {generateChoiceModal.open && generateChoiceModal.comparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" aria-modal="true" role="dialog">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xl">{getUtilityConfig(generateChoiceModal.comparison.utilityType).icon}</span>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Generate {generateChoiceModal.action === 'dma' ? 'DMA Review' : generateChoiceModal.comparison ? offerComparisonKindLabel(generateChoiceModal.comparison) : 'Comparison'} for…
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {generateChoiceModal.matchingUtilities.length} {generateChoiceModal.comparison.utilityType} sites found. Select scope:
            </p>
            <div className="flex flex-col gap-2.5">
              <button type="button" onClick={() => handleGenerateChoiceConfirm(false)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-sm font-medium text-left text-gray-800 dark:text-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="font-semibold">This site only</div>
                <div className="text-xs text-gray-500 mt-0.5 font-mono">{generateChoiceModal.comparison.identifier}</div>
              </button>
              <button type="button" onClick={() => handleGenerateChoiceConfirm(true)} className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: getUtilityConfig(generateChoiceModal.comparison.utilityType).color }}>
                All {generateChoiceModal.matchingUtilities.length} {generateChoiceModal.comparison.utilityType} sites
              </button>
              <button type="button" onClick={() => setGenerateChoiceModal(prev => ({ ...prev, open: false }))} className="w-full px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Recipient confirmation modal */}
      {recipientConfirmModal.open && recipientConfirmModal.comparison && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" aria-modal="true" role="dialog">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {recipientConfirmModal.action === "dma" ? "DMA Review" : "Comparison"} recipient
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Confirm or edit the client contact before sending.
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label htmlFor="b2-recipient-name" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Client name</label>
                <input id="b2-recipient-name" type="text" value={recipientConfirmModal.contactName} onChange={(e) => setRecipientConfirmModal((prev) => ({ ...prev, contactName: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Contact name" autoComplete="name" />
              </div>
              <div>
                <label htmlFor="b2-recipient-email" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Email</label>
                <input id="b2-recipient-email" type="email" value={recipientConfirmModal.contactEmail} onChange={(e) => setRecipientConfirmModal((prev) => ({ ...prev, contactEmail: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="name@example.com" autoComplete="email" />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setRecipientConfirmModal((prev) => ({ ...prev, open: false }))} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors order-2 sm:order-1">Cancel</button>
              <button type="button" onClick={handleRecipientConfirmSubmit} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors order-1 sm:order-2" style={{ backgroundColor: '#1696CF' }}>
                {recipientConfirmModal.action === "dma" ? "Send DMA Review" : "Send Comparison"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate result modal */}
      {generateResultModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" aria-modal="true" role="dialog">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <span className={generateResultModal.errors.length === 0 ? 'text-emerald-500' : 'text-amber-500'}>
                {generateResultModal.errors.length === 0 ? '✅' : '⚠️'}
              </span>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{generateResultModal.actionName} — Generation Summary</h3>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {generateResultModal.results.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{generateResultModal.results.length} item{generateResultModal.results.length === 1 ? '' : 's'} generated</p>
                  <ul className="space-y-2.5">
                    {generateResultModal.results.map((item, i) => {
                      const icfg = getUtilityConfig(item.utilityType);
                      return (
                        <li key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3.5">
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: icfg.bg, color: icfg.text }}>{icfg.icon} {item.utilityType}</span>
                            <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{item.identifier}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.pdfUrl && <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-100 transition-colors">📄 Open PDF</a>}
                            {item.spreadsheetUrl && <a href={item.spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors">📊 Open Spreadsheet</a>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {generateResultModal.errors.length > 0 && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">Errors ({generateResultModal.errors.length})</p>
                  <ul className="space-y-1">
                    {generateResultModal.errors.map((e, i) => <li key={i} className="text-xs text-red-600 dark:text-red-300">{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={() => setGenerateResultModal(prev => ({ ...prev, open: false }))} className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#1696CF' }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}