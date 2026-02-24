"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";

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
  // Current rates from invoice
  currentMeteringDaily?: number;
  currentMeteringAnnual?: number;
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
  estimatedAnnualUsage?: number; // For SME Gas: (usage / days * 365)
  // Frequency/other
  oilFrequency?: string;
  wasteFrequency?: string;
  cleaningFrequency?: string;
  // Comparison rates (editable placeholders)
  comparisonMeteringDaily?: number;
  comparisonMeteringAnnual?: number;
  comparisonPeakRate?: number;
  comparisonOffPeakRate?: number;
  comparisonShoulderRate?: number;
  comparisonGasRate?: number;
  comparisonDailySupply?: number;
  comparisonDemandCharge?: number;
  comparisonOilRate?: number;
  comparisonWasteRate?: number;
  comparisonCleaningRate?: number;
  // Savings
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
  };
}

export default function Base2Page() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const urlBusinessName = searchParams.get('businessName') || "";
  const urlBusinessInfo = searchParams.get('businessInfo');
  
  const [businessName, setBusinessName] = useState<string>(urlBusinessName);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(
    urlBusinessInfo ? JSON.parse(decodeURIComponent(urlBusinessInfo)) : null
  );
  
  const [utilityComparisons, setUtilityComparisons] = useState<UtilityComparison[]>([]);
  const [sending, setSending] = useState<string | null>(null); // Track which comparison is being generated: "type-identifier-action"
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessInfoData, setBusinessInfoData] = useState<any>(null); // Full business info from API
  const [businessInfoFetchDone, setBusinessInfoFetchDone] = useState(false); // So we only run fetchUtilityInvoices once

  const token = (session as any)?.id_token;

  // Helper function to extract File ID from Google Drive URL
  const extractFileIdFromUrl = (url: string | undefined): string | null => {
    if (!url || typeof url !== 'string') return null;
    // Extract file ID from URL like: https://drive.google.com/file/d/{FILE_ID}/view?usp=drivesdk
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // Fetch business info from API to get document file IDs (only when we have businessName)
  useEffect(() => {
    if (!token) return;
    if (!businessName) {
      setBusinessInfoFetchDone(true); // No business name → no fetch needed, allow utilities to run
      return;
    }

    let cancelled = false;
    const fetchBusinessInfo = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/get-business-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
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

  // Extract linked utilities and fetch invoice data — run only once when business info is ready
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
      
      // Extract current rates
      rates.currentPeakRate = parseFloat(details?.peak_rate || fullData['Retail Rate Peak (c/kWh)'] || '0') || undefined;
      rates.currentOffPeakRate = parseFloat(details?.offpeak_rate || fullData['Retail Rate Off-Peak (c/kWh)'] || '0') || undefined;
      const shoulderRate = parseFloat(details?.shoulder_rate || fullData['Retail Rate Shoulder (c/kWh)'] || '0');
      rates.currentShoulderRate = shoulderRate > 0 ? shoulderRate : undefined;
      rates.monthlyUsage = parseFloat(details?.monthly_usage || fullData['Monthly Consumption'] || '0');
      
      // Extract usage breakdown
      rates.peakUsage = parseFloat(fullData['Retail Quantity Peak (kWh)'] || details?.peak_usage || '0') || undefined;
      rates.offPeakUsage = parseFloat(fullData['Retail Quantity Off-Peak (kWh)'] || details?.offpeak_usage || '0') || undefined;
      
      // Extract demand quantity
      rates.demandQuantity = parseFloat(fullData['DUOS - Network Demand Charge Quantity (KVA)'] || details?.demand_quantity || '0') || undefined;
      
      // Extract metering price (daily and annual)
      const meterRate = parseFloat(fullData['Meter Rate'] || '0');
      const vasRate = parseFloat(fullData['Value Added Service rater in $/Meter/Day'] || '0');
      const invoiceDays = parseFloat(fullData['Invoice Review Number of Days'] || '30');
      if (meterRate > 0 || vasRate > 0) {
        rates.currentMeteringDaily = meterRate + vasRate;
        rates.currentMeteringAnnual = (meterRate + vasRate) * 365;
      }
      
      // Extract daily supply and demand charge
      rates.currentDailySupply = parseFloat(fullData['Daily Supply Charge'] || details?.daily_supply || '0');
      
      // Extract demand charge - check multiple possible field names
      const demandRateStr = fullData['DUOS - Network Demand Charge Rate ($/KVA)'] || 
                           fullData['DUOS - Network Demand Charge Rate'] ||
                           details?.demand_charge_rate ||
                           '0';
      rates.currentDemandCharge = parseFloat(String(demandRateStr)) || undefined;
      
      console.log('Demand charge extraction:', {
        utilityType,
        demandRateStr,
        parsed: rates.currentDemandCharge,
        fullDataKey: fullData['DUOS - Network Demand Charge Rate ($/KVA)'],
        demandQuantity: rates.demandQuantity
      });
      
      // Set comparison placeholders (slightly better than current)
      rates.comparisonPeakRate = (rates.currentPeakRate && rates.currentPeakRate > 0) ? parseFloat((rates.currentPeakRate * 0.95).toFixed(2)) : 24.50;
      rates.comparisonOffPeakRate = (rates.currentOffPeakRate && rates.currentOffPeakRate > 0) ? parseFloat((rates.currentOffPeakRate * 0.95).toFixed(2)) : 18.00;
      rates.comparisonShoulderRate = (rates.currentShoulderRate && rates.currentShoulderRate > 0) ? parseFloat((rates.currentShoulderRate * 0.95).toFixed(2)) : 20.00;
      // Always use $700/year as comparison metering price
      rates.comparisonMeteringAnnual = 700.00;
      rates.comparisonMeteringDaily = parseFloat((700.00 / 365).toFixed(2)); // 1.92/day
      rates.comparisonDailySupply = rates.currentDailySupply > 0 ? parseFloat((rates.currentDailySupply * 0.95).toFixed(2)) : 1.50;
      rates.comparisonDemandCharge = (rates.currentDemandCharge && rates.currentDemandCharge > 0) ? parseFloat((rates.currentDemandCharge * 0.95).toFixed(2)) : 12.00;
    } else if (utilityType.includes('Gas')) {
      // Check for SME Gas structure first (gas_sme_invoicedetails)
      if (invoiceData?.gas_sme_invoicedetails) {
        const smeDetails = invoiceData.gas_sme_invoicedetails;
        const usage = smeDetails.usage || {};
        const supplyCharge = smeDetails.supply_charge || {};
        
        // Extract usage quantity (in MJ, convert to GJ)
        const generalUsageMJ = parseFloat(usage.general_usage_quantity || '0');
        const gasQuantityGJ = generalUsageMJ > 0 ? generalUsageMJ / 1000 : 0; // Convert MJ to GJ
        
        // Calculate weighted average rate from blocks (rates are in c/MJ, convert to $/GJ)
        let weightedRate = 0;
        let totalConsumption = 0;
        if (usage.block_1 && usage.block_1.consumption && usage.block_1.rate) {
          const block1Consumption = parseFloat(usage.block_1.consumption);
          const block1Rate = parseFloat(usage.block_1.rate); // c/MJ
          weightedRate += (block1Consumption * block1Rate);
          totalConsumption += block1Consumption;
        }
        if (usage.block_2 && usage.block_2.consumption && usage.block_2.rate) {
          const block2Consumption = parseFloat(usage.block_2.consumption);
          const block2Rate = parseFloat(usage.block_2.rate); // c/MJ
          weightedRate += (block2Consumption * block2Rate);
          totalConsumption += block2Consumption;
        }
        
        // Calculate average rate: (weighted sum) / total consumption, then convert c/MJ to $/GJ
        // 1 c/MJ = 0.01 $/MJ = 10 $/GJ (since 1 GJ = 1000 MJ)
        const avgRateCperMJ = totalConsumption > 0 ? (weightedRate / totalConsumption) : 0;
        const gasRate = avgRateCperMJ * 10; // Convert c/MJ to $/GJ
        
        // Extract supply charge (rate is likely total for the period, quantity_days is the number of days)
        const supplyRate = parseFloat(supplyCharge.rate || '0');
        const supplyDays = parseFloat(supplyCharge.quantity_days || smeDetails.invoice_review_days || '0');
        const dailySupply = supplyDays > 0 ? (supplyRate / supplyDays) : supplyRate;
        
        // Calculate estimated annual usage: (usage / days * 365)
        const invoiceDays = parseFloat(smeDetails.invoice_review_days || supplyDays || '0');
        const estimatedAnnualUsageGJ = invoiceDays > 0 && gasQuantityGJ > 0 
          ? (gasQuantityGJ / invoiceDays) * 365 
          : undefined;
        
        rates.currentGasRate = gasRate > 0 ? gasRate : undefined;
        rates.gasUsage = gasQuantityGJ > 0 ? gasQuantityGJ : undefined;
        rates.monthlyUsage = gasQuantityGJ > 0 ? gasQuantityGJ : undefined;
        rates.currentDailySupply = dailySupply > 0 ? dailySupply : undefined;
        rates.estimatedAnnualUsage = estimatedAnnualUsageGJ;
        
        // Set comparison placeholder
        rates.comparisonGasRate = rates.currentGasRate && rates.currentGasRate > 0 
          ? parseFloat((rates.currentGasRate * 0.95).toFixed(4)) 
          : 17.8;
        rates.comparisonDailySupply = rates.currentDailySupply && rates.currentDailySupply > 0
          ? parseFloat((rates.currentDailySupply * 0.95).toFixed(2)) 
          : 1.20;
        
        console.log('SME Gas extraction result:', {
          generalUsageMJ,
          gasQuantityGJ,
          avgRateCperMJ,
          gasRate,
          dailySupply,
          supplyRate,
          supplyDays,
          currentGasRate: rates.currentGasRate,
          currentDailySupply: rates.currentDailySupply
        });
      } else {
        // C&I Gas extraction (existing logic)
        console.log('Gas extraction - Full invoiceData keys:', Object.keys(invoiceData || {}));
        
        const details = invoiceData?.gas_ci_invoice_details || invoiceData?.gas_invoice_details || {};
        const fullData = details?.full_invoice_data || invoiceData?.full_invoice_data || invoiceData || {};
        
        // Extract gas usage/quantity - try all possible field names
        let gasQuantity = 0;
        if (details?.energy_charge_quantity !== undefined && details?.energy_charge_quantity !== null && details?.energy_charge_quantity !== '') {
          const qtyValue = typeof details.energy_charge_quantity === 'string' 
            ? parseFloat(details.energy_charge_quantity) 
            : parseFloat(String(details.energy_charge_quantity));
          if (!isNaN(qtyValue) && qtyValue > 0) {
            gasQuantity = qtyValue;
          }
        }
        if (gasQuantity === 0 && fullData['Energy Charge Quantity in GJ']) {
          gasQuantity = parseFloat(fullData['Energy Charge Quantity in GJ']);
        }
        if (gasQuantity === 0 && fullData['Energy Charge Quantity']) {
          gasQuantity = parseFloat(fullData['Energy Charge Quantity']);
        }
        if (gasQuantity === 0 && details?.gas_usage) {
          gasQuantity = parseFloat(details.gas_usage);
        }
        if (gasQuantity === 0 && fullData['Quantity']) {
          gasQuantity = parseFloat(fullData['Quantity']);
        }
        if (gasQuantity === 0 && fullData['Gas Usage']) {
          gasQuantity = parseFloat(fullData['Gas Usage']);
        }
        if (gasQuantity === 0 && fullData['quantity']) {
          gasQuantity = parseFloat(fullData['quantity']);
        }
        if (gasQuantity === 0 && details?.quantity) {
          gasQuantity = parseFloat(details.quantity);
        }
        
        // Extract gas cost
        let gasCost = 0;
        if (fullData['Energy Charges in $']) gasCost = parseFloat(fullData['Energy Charges in $']);
        else if (fullData['Energy Charge Cost']) gasCost = parseFloat(fullData['Energy Charge Cost']);
        else if (details?.energy_charge_cost) gasCost = parseFloat(details.energy_charge_cost);
        else if (details?.gas_cost) gasCost = parseFloat(details.gas_cost);
        else if (fullData['Cost']) gasCost = parseFloat(fullData['Cost']);
        else if (fullData['cost']) gasCost = parseFloat(fullData['cost']);
        else if (details?.cost) gasCost = parseFloat(details.cost);
        
        // Extract current gas rate
        let gasRate = 0;
        if (details?.energy_charge_rate !== undefined && details?.energy_charge_rate !== null && details?.energy_charge_rate !== '') {
          const rateStr = String(details.energy_charge_rate).trim();
          const rateValue = parseFloat(rateStr);
          if (!isNaN(rateValue) && rateValue > 0) {
            gasRate = rateValue;
          }
        }
        if (gasRate === 0 && fullData['Energy Charge Rate in $/GJ']) {
          gasRate = parseFloat(fullData['Energy Charge Rate in $/GJ']);
        }
        if (gasRate === 0 && fullData['Energy Charge Rate ($/GJ)']) {
          gasRate = parseFloat(fullData['Energy Charge Rate ($/GJ)']);
        }
        if (gasRate === 0 && fullData['Energy Charge Rate']) {
          gasRate = parseFloat(fullData['Energy Charge Rate']);
        }
        if (gasRate === 0 && details?.gas_rate) {
          gasRate = parseFloat(String(details.gas_rate));
        }
        if (gasRate === 0 && fullData['Gas Rate']) {
          gasRate = parseFloat(fullData['Gas Rate']);
        }
        if (gasRate === 0 && fullData['energy_charge_rate']) {
          gasRate = parseFloat(fullData['energy_charge_rate']);
        }
        
        // If rate not found but we have cost and quantity, calculate it
        if (gasRate === 0 && gasCost > 0 && gasQuantity > 0) {
          gasRate = gasCost / gasQuantity;
        }
        
        rates.currentGasRate = gasRate > 0 ? gasRate : undefined;
        rates.monthlyUsage = gasQuantity > 0 ? gasQuantity : undefined;
        rates.gasUsage = gasQuantity > 0 ? gasQuantity : undefined;
        
        const dailySupply = 
          parseFloat(fullData['Daily Supply Charge'] || '0') ||
          parseFloat(details?.daily_supply || '0') ||
          0;
        rates.currentDailySupply = dailySupply > 0 ? dailySupply : undefined;
        
        // C&I Gas: hardcoded comparison rate $/GJ
        rates.comparisonGasRate = 17.8;
        rates.comparisonDailySupply = rates.currentDailySupply && rates.currentDailySupply > 0
          ? parseFloat((rates.currentDailySupply * 0.95).toFixed(2)) 
          : 1.20;
      }
    } else if (utilityType === 'Oil') {
      // Extract oil rates - check oil_invoice_details structure
      const details = invoiceData?.oil_invoice_details || invoiceData || {};
      const fullData = details?.full_invoice_data || details || {};
      
      console.log('Oil extraction - Full invoiceData keys:', Object.keys(invoiceData || {}));
      console.log('Oil extraction - details keys:', Object.keys(details));
      
      // Calculate weighted average rate from products (rate_1, rate_3, etc.)
      let weightedRate = 0;
      let totalQuantity = 0;
      
      // Product 1
      if (details.quantity_1 && details.rate_1) {
        const qty1 = parseFloat(String(details.quantity_1));
        const rate1 = parseFloat(String(details.rate_1));
        if (!isNaN(qty1) && !isNaN(rate1) && qty1 > 0 && rate1 > 0) {
          weightedRate += (qty1 * rate1);
          totalQuantity += qty1;
        }
      }
      
      // Product 2 (note: API uses rate_3, not rate_2)
      if (details.quantity_2 && details.rate_3) {
        const qty2 = parseFloat(String(details.quantity_2));
        const rate3 = parseFloat(String(details.rate_3));
        if (!isNaN(qty2) && !isNaN(rate3) && qty2 > 0 && rate3 > 0) {
          weightedRate += (qty2 * rate3);
          totalQuantity += qty2;
        }
      }
      
      // Calculate average rate
      const avgOilRate = totalQuantity > 0 ? (weightedRate / totalQuantity) : 0;
      
      // Total usage
      const totalOilUsage = totalQuantity;
      
      rates.currentOilRate = avgOilRate > 0 ? avgOilRate : undefined;
      rates.oilUsage = totalOilUsage > 0 ? totalOilUsage : undefined;
      rates.monthlyUsage = totalOilUsage > 0 ? totalOilUsage : undefined;
      
      // Set comparison placeholder (5% better)
      rates.comparisonOilRate = rates.currentOilRate && rates.currentOilRate > 0
        ? parseFloat((rates.currentOilRate * 0.95).toFixed(4))
        : undefined;
      
      console.log('Oil extraction result:', {
        avgOilRate,
        totalOilUsage,
        currentOilRate: rates.currentOilRate,
        monthlyUsage: rates.monthlyUsage,
        quantity_1: details.quantity_1,
        rate_1: details.rate_1,
        quantity_2: details.quantity_2,
        rate_3: details.rate_3,
        weightedRate,
        totalQuantity
      });
    } else if (utilityType === 'Waste') {
      // Extract waste rates - structure may vary
      const details = invoiceData?.waste_invoice_details || invoiceData || {};
      const fullData = details?.full_invoice_data || details || {};
      
      // Try to extract waste rate (price per bin/service)
      const wasteRate = parseFloat(fullData['Service Charge'] || fullData['Rate'] || details?.rate || '0');
      rates.currentWasteRate = wasteRate > 0 ? wasteRate : undefined;
      
      // Extract usage/frequency
      const wasteUsage = parseFloat(fullData['Frequency'] || fullData['Bins'] || details?.frequency || '0');
      rates.wasteUsage = wasteUsage > 0 ? wasteUsage : undefined;
      rates.monthlyUsage = wasteUsage > 0 ? wasteUsage : undefined;
      
      // Set comparison placeholder (5% better)
      rates.comparisonWasteRate = rates.currentWasteRate && rates.currentWasteRate > 0
        ? parseFloat((rates.currentWasteRate * 0.95).toFixed(2))
        : undefined;
    } else if (utilityType === 'Cleaning') {
      // Extract cleaning rates - structure may vary
      const details = invoiceData?.cleaning_invoice_details || invoiceData || {};
      const fullData = details?.full_invoice_data || details || {};
      
      // Try to extract cleaning rate
      const cleaningRate = parseFloat(fullData['Service Charge'] || fullData['Rate'] || details?.rate || '0');
      rates.currentCleaningRate = cleaningRate > 0 ? cleaningRate : undefined;
      
      // Extract usage/frequency
      const cleaningUsage = parseFloat(fullData['Frequency'] || fullData['Visits'] || details?.frequency || '0');
      rates.cleaningUsage = cleaningUsage > 0 ? cleaningUsage : undefined;
      rates.monthlyUsage = cleaningUsage > 0 ? cleaningUsage : undefined;
      
      // Set comparison placeholder (5% better)
      rates.comparisonCleaningRate = rates.currentCleaningRate && rates.currentCleaningRate > 0
        ? parseFloat((rates.currentCleaningRate * 0.95).toFixed(2))
        : undefined;
    }
    
    return rates;
  };

  const fetchUtilityInvoices = async () => {
    // Allow Cleaning to be added even if no utilities object (it's based on documents)
    if (!token) {
      return;
    }

    // Check if we have utilities OR if we should check for Cleaning
    const utilities = businessInfo?.utilities || {};
    
    // Check for Cleaning documents from business-info API data
    let hasCleaningDocuments = false;
    if (businessInfoData?._processed_file_ids) {
      const fileIds = businessInfoData._processed_file_ids;
      const floorPlanUrl = fileIds.business_site_map_upload || fileIds['Floor Plan'];
      const cleaningInvoiceUrl = fileIds.invoice_Cleaning || fileIds['Cleaning Invoice'];
      const floorPlanFileId = extractFileIdFromUrl(floorPlanUrl) || floorPlanUrl;
      const cleaningInvoiceFileId = extractFileIdFromUrl(cleaningInvoiceUrl) || cleaningInvoiceUrl;
      hasCleaningDocuments = !!(floorPlanFileId && cleaningInvoiceFileId);
    }
    
    // If no utilities and no cleaning documents, return early
    if (Object.keys(utilities).length === 0 && !hasCleaningDocuments) {
      setUtilityComparisons([]);
      return;
    }
    
    // Helper to get identifiers from utility data
    const getIdentifiers = (utilityData: any): string[] => {
      if (typeof utilityData === 'string') {
        return utilityData.split(',').map((id: string) => id.trim()).filter(Boolean);
      } else if (Array.isArray(utilityData)) {
        return utilityData;
      }
      return [];
    };

    // Build initial comparison list
    const comparisons: UtilityComparison[] = [];

    // Add C&I Electricity
    if (utilities["C&I Electricity"]) {
      const nmis = getIdentifiers(utilities["C&I Electricity"]);
      nmis.forEach(nmi => {
        comparisons.push({
          utilityType: "C&I Electricity",
          identifier: nmi,
          identifierLabel: "NMI",
          invoiceData: null,
          loading: true,
          error: null
        });
      });
    }

    // Add SME Electricity
    if (utilities["SME Electricity"]) {
      const nmis = getIdentifiers(utilities["SME Electricity"]);
      nmis.forEach(nmi => {
        comparisons.push({
          utilityType: "SME Electricity",
          identifier: nmi,
          identifierLabel: "NMI",
          invoiceData: null,
          loading: true,
          error: null
        });
      });
    }

    // Add C&I Gas
    if (utilities["C&I Gas"]) {
      const mirns = getIdentifiers(utilities["C&I Gas"]);
      mirns.forEach(mrin => {
        comparisons.push({
          utilityType: "C&I Gas",
          identifier: mrin,
          identifierLabel: "MRIN",
          invoiceData: null,
          loading: true,
          error: null
        });
      });
    }

    // Add SME Gas
    if (utilities["SME Gas"] || utilities["Small Gas"]) {
      const mirns = getIdentifiers(utilities["SME Gas"] || utilities["Small Gas"]);
      mirns.forEach(mrin => {
        comparisons.push({
          utilityType: "SME Gas",
          identifier: mrin,
          identifierLabel: "MRIN",
          invoiceData: null,
          loading: true,
          error: null
        });
      });
    }

    // Add Oil
    if (utilities["Oil"] || utilities["COOKING_OIL"]) {
      const accountNames = getIdentifiers(utilities["Oil"] || utilities["COOKING_OIL"]);
      accountNames.forEach(accountName => {
        comparisons.push({
          utilityType: "Oil",
          identifier: accountName,
          identifierLabel: "Account Name",
          invoiceData: null,
          loading: true,
          error: null
        });
      });
    }

    // Add Waste
    if (utilities["Waste"] || utilities["WASTE"]) {
      const customerNumbers = getIdentifiers(utilities["Waste"] || utilities["WASTE"]);
      customerNumbers.forEach(customerNumber => {
        comparisons.push({
          utilityType: "Waste",
          identifier: customerNumber,
          identifierLabel: "Customer Number",
          invoiceData: null,
          loading: true,
          error: null
        });
      });
    }

    // Add Cleaning (if required documents exist)
    // Cleaning is available when both Floor Plan (exit map) and Cleaning Invoice documents exist
    // Get file IDs from business-info API data (_processed_file_ids)
    if (businessInfoData?._processed_file_ids) {
      const fileIds = businessInfoData._processed_file_ids;
      
      // Extract file IDs from URLs (they may be stored as full URLs or just IDs)
      const floorPlanUrl = fileIds.business_site_map_upload || fileIds['Floor Plan'];
      const cleaningInvoiceUrl = fileIds.invoice_Cleaning || fileIds['Cleaning Invoice'];
      
      const floorPlanFileId = extractFileIdFromUrl(floorPlanUrl) || floorPlanUrl;
      const cleaningInvoiceFileId = extractFileIdFromUrl(cleaningInvoiceUrl) || cleaningInvoiceUrl;
      
      const hasFloorPlan = !!floorPlanFileId;
      const hasCleaningInvoice = !!cleaningInvoiceFileId;
      
      console.log('Cleaning eligibility check:', {
        hasFloorPlan,
        hasCleaningInvoice,
        floorPlanUrl,
        cleaningInvoiceUrl,
        floorPlanFileId,
        cleaningInvoiceFileId,
        fileIdsKeys: Object.keys(fileIds || {})
      });
      
      // If both documents exist, add Cleaning utility (use business name as identifier)
      if (hasFloorPlan && hasCleaningInvoice) {
        const cleaningIdentifier = businessName || businessInfo?.name || 'Cleaning Service';
        comparisons.push({
          utilityType: "Cleaning",
          identifier: cleaningIdentifier,
          identifierLabel: "Business",
          invoiceData: null,
          loading: true,
          error: null
        });
      }
    }

    // Set initial state (one render with all cards in loading state)
    setUtilityComparisons(comparisons);

    // Fetch invoice data for each utility (in parallel); collect results and update state once
    const results = await Promise.all(
      comparisons.map(async (comparison): Promise<{ index: number; update: Partial<UtilityComparison> & { invoiceData?: any; loading: boolean; error?: string | null } }> => {
        const index = comparisons.findIndex(
          c => c.utilityType === comparison.utilityType && c.identifier === comparison.identifier
        );
        try {
          let endpoint = '';
          let body: any = { business_name: businessName || businessInfo?.name || '' };

          if (comparison.utilityType === 'C&I Electricity') {
            endpoint = `${getApiBaseUrl()}/api/get-electricity-ci-info`;
            body.nmi = comparison.identifier;
          } else if (comparison.utilityType === 'SME Electricity') {
            endpoint = `${getApiBaseUrl()}/api/get-electricity-sme-info`;
            body.nmi = comparison.identifier;
          } else if (comparison.utilityType === 'C&I Gas') {
            endpoint = `${getApiBaseUrl()}/api/get-gas-ci-info`;
            body.mrin = comparison.identifier;
          } else if (comparison.utilityType === 'SME Gas') {
            endpoint = `${getApiBaseUrl()}/api/get-gas-sme-info`;
            body.mrin = comparison.identifier;
          } else if (comparison.utilityType === 'Oil') {
            endpoint = `${getApiBaseUrl()}/api/get-oil-info`;
            body.business_name = comparison.identifier;
          } else if (comparison.utilityType === 'Waste') {
            endpoint = `${getApiBaseUrl()}/api/get-waste-info`;
            body.customer_number = comparison.identifier;
          } else if (comparison.utilityType === 'Cleaning') {
            return { index, update: { loading: false, error: 'Cleaning API endpoint not yet available' } };
          }

          if (!endpoint) {
            console.log(`No endpoint for utility type: ${comparison.utilityType}`);
            return { index, update: { loading: false, error: `No API endpoint available for ${comparison.utilityType}` } };
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body)
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`Full API response for ${comparison.utilityType} ${comparison.identifier}:`, JSON.stringify(data, null, 2));
            const extractedRates = extractCurrentRates(data, comparison.utilityType);
            return {
              index,
              update: {
                ...extractedRates,
                invoiceData: data,
                loading: false,
                error: null,
              },
            };
          }
          throw new Error('Failed to fetch invoice data');
        } catch (err: any) {
          return { index, update: { loading: false, error: err.message } };
        }
      })
    );

    // Single state update with all results (one re-render instead of one per utility)
    setUtilityComparisons(prev => {
      const next = [...prev];
      for (const { index, update } of results) {
        if (index >= 0 && index < next.length) {
          next[index] = { ...next[index], ...update };
        }
      }
      return next;
    });
  };

  const updateComparisonRate = (utilityType: string, identifier: string, field: keyof UtilityComparison, value: string) => {
    setUtilityComparisons(prev => {
      return prev.map(u => {
        if (u.utilityType === utilityType && u.identifier === identifier) {
          return { ...u, [field]: parseFloat(value) || 0 };
        }
        return u;
      });
    });
  };

  const updateCurrentRate = (utilityType: string, identifier: string, field: keyof UtilityComparison, value: string) => {
    setUtilityComparisons(prev => {
      return prev.map(u => {
        if (u.utilityType === utilityType && u.identifier === identifier) {
          const parsedValue = value === '' ? undefined : (parseFloat(value) || 0);
          return { ...u, [field]: parsedValue };
        }
        return u;
      });
    });
  };

  const updateUsage = (utilityType: string, identifier: string, field: keyof UtilityComparison, value: string) => {
    setUtilityComparisons(prev => {
      return prev.map(u => {
        if (u.utilityType === utilityType && u.identifier === identifier) {
          const parsedValue = value === '' ? undefined : (parseFloat(value) || 0);
          return { ...u, [field]: parsedValue };
        }
        return u;
      });
    });
  };

  const calculateSavings = (comparison: UtilityComparison) => {
    const savings: any = {};
    
    if (comparison.utilityType.includes('Electricity')) {
      // Use actual usage values if available, otherwise estimate from monthly usage
      const peakUsage = comparison.peakUsage || (comparison.monthlyUsage ? comparison.monthlyUsage * 0.4 : 0);
      const offPeakUsage = comparison.offPeakUsage || (comparison.monthlyUsage ? comparison.monthlyUsage * 0.3 : 0);
      const totalUsage = peakUsage + offPeakUsage;
      const shoulderUsage = comparison.monthlyUsage && totalUsage < comparison.monthlyUsage 
        ? (comparison.monthlyUsage - totalUsage) 
        : (comparison.monthlyUsage ? comparison.monthlyUsage * 0.3 : 0);
      
      const currentPeak = comparison.currentPeakRate || 0;
      const currentOffPeak = comparison.currentOffPeakRate || 0;
      const currentShoulder = comparison.currentShoulderRate || 0;
      const compPeak = comparison.comparisonPeakRate || 0;
      const compOffPeak = comparison.comparisonOffPeakRate || 0;
      const compShoulder = comparison.comparisonShoulderRate || 0;
      
      // Calculate individual rate savings (monthly, then annualize)
      if (currentPeak > 0 && compPeak > 0 && peakUsage > 0) {
        const currentPeakCost = (peakUsage * currentPeak / 100);
        const compPeakCost = (peakUsage * compPeak / 100);
        savings.peakSavings = currentPeakCost - compPeakCost;
        savings.peakSavingsPercent = currentPeakCost > 0 ? ((savings.peakSavings / currentPeakCost) * 100) : 0;
        savings.peakAnnualSavings = savings.peakSavings * 12;
      }
      
      if (currentOffPeak > 0 && compOffPeak > 0 && offPeakUsage > 0) {
        const currentOffPeakCost = (offPeakUsage * currentOffPeak / 100);
        const compOffPeakCost = (offPeakUsage * compOffPeak / 100);
        savings.offPeakSavings = currentOffPeakCost - compOffPeakCost;
        savings.offPeakSavingsPercent = currentOffPeakCost > 0 ? ((savings.offPeakSavings / currentOffPeakCost) * 100) : 0;
        savings.offPeakAnnualSavings = savings.offPeakSavings * 12;
      }
      
      // Calculate total usage cost savings
      const currentMonthlyUsageCost = 
        (peakUsage * currentPeak / 100) +
        (offPeakUsage * currentOffPeak / 100) +
        (shoulderUsage * (currentShoulder || currentOffPeak) / 100);
      
      const comparisonMonthlyUsageCost = 
        (peakUsage * compPeak / 100) +
        (offPeakUsage * compOffPeak / 100) +
        (shoulderUsage * (compShoulder || compOffPeak) / 100);
      
      savings.usageSavings = currentMonthlyUsageCost - comparisonMonthlyUsageCost;
      savings.usageSavingsPercent = currentMonthlyUsageCost > 0 ? ((savings.usageSavings / currentMonthlyUsageCost) * 100) : 0;
      
      // Metering savings (annual)
      savings.meteringSavings = 0;
      if (comparison.currentMeteringAnnual && comparison.comparisonMeteringAnnual) {
        savings.meteringSavings = comparison.currentMeteringAnnual - comparison.comparisonMeteringAnnual;
      }
      
      // Daily supply savings (annual)
      savings.supplySavings = 0;
      if (comparison.currentDailySupply && comparison.comparisonDailySupply) {
        savings.supplySavings = (comparison.currentDailySupply - comparison.comparisonDailySupply) * 365;
      }
      
      // Demand charge savings (annual)
      savings.demandSavings = 0;
      if (comparison.currentDemandCharge && comparison.comparisonDemandCharge && comparison.demandQuantity) {
        const currentDemandAnnual = (comparison.currentDemandCharge * comparison.demandQuantity * 12);
        const comparisonDemandAnnual = (comparison.comparisonDemandCharge * comparison.demandQuantity * 12);
        savings.demandSavings = currentDemandAnnual - comparisonDemandAnnual;
      }
      
      // Total annual savings = usage + metering + supply + demand
      const totalCurrentAnnual = 
        (currentMonthlyUsageCost * 12) +
        (comparison.currentMeteringAnnual || 0) +
        ((comparison.currentDailySupply || 0) * 365) +
        (comparison.currentDemandCharge && comparison.demandQuantity ? (comparison.currentDemandCharge * comparison.demandQuantity * 12) : 0);
      
      const totalComparisonAnnual = 
        (comparisonMonthlyUsageCost * 12) +
        (comparison.comparisonMeteringAnnual || 0) +
        ((comparison.comparisonDailySupply || 0) * 365) +
        (comparison.comparisonDemandCharge && comparison.demandQuantity ? (comparison.comparisonDemandCharge * comparison.demandQuantity * 12) : 0);
      
      savings.totalAnnualSavings = 
        (savings.usageSavings * 12) + 
        savings.meteringSavings + 
        savings.supplySavings +
        savings.demandSavings;
      
      savings.totalAnnualSavingsPercent = totalCurrentAnnual > 0 
        ? ((savings.totalAnnualSavings / totalCurrentAnnual) * 100) 
        : 0;
    } else if (comparison.utilityType.includes('Gas')) {
      // Gas rate comparison - rate is in $/GJ, usage is in GJ
      const currentRate = comparison.currentGasRate || 0;
      const compRate = comparison.comparisonGasRate || 0;
      const usage = comparison.gasUsage || comparison.monthlyUsage || 0;
      
      if (currentRate > 0 && compRate > 0 && usage > 0) {
        // Calculate monthly cost: usage (GJ) * rate ($/GJ)
        const currentMonthlyCost = usage * currentRate;
        const comparisonMonthlyCost = usage * compRate;
        savings.usageSavings = currentMonthlyCost - comparisonMonthlyCost;
        savings.usageSavingsPercent = currentMonthlyCost > 0 ? ((savings.usageSavings / currentMonthlyCost) * 100) : 0;
        
        // Daily supply savings (annual)
        savings.supplySavings = 0;
        if (comparison.currentDailySupply && comparison.comparisonDailySupply) {
          savings.supplySavings = (comparison.currentDailySupply - comparison.comparisonDailySupply) * 365;
        }
        
        // Total annual savings = usage (monthly * 12) + supply
        const totalCurrentAnnual = 
          (currentMonthlyCost * 12) +
          ((comparison.currentDailySupply || 0) * 365);
        
        const totalComparisonAnnual = 
          (comparisonMonthlyCost * 12) +
          ((comparison.comparisonDailySupply || 0) * 365);
        
        savings.totalAnnualSavings = (savings.usageSavings * 12) + savings.supplySavings;
        savings.totalAnnualSavingsPercent = totalCurrentAnnual > 0 
          ? ((savings.totalAnnualSavings / totalCurrentAnnual) * 100) 
          : 0;
      }
    } else if (comparison.utilityType === 'Oil') {
      // Oil rate comparison - rate is in $/L, usage is in liters
      const currentRate = comparison.currentOilRate || 0;
      const compRate = comparison.comparisonOilRate || 0;
      const usage = comparison.oilUsage || comparison.monthlyUsage || 0;
      
      if (currentRate > 0 && compRate > 0 && usage > 0) {
        // Calculate cost: usage (L) * rate ($/L)
        const currentCost = usage * currentRate;
        const comparisonCost = usage * compRate;
        savings.usageSavings = currentCost - comparisonCost;
        savings.usageSavingsPercent = currentCost > 0 ? ((savings.usageSavings / currentCost) * 100) : 0;
        
        // Total annual savings (assuming monthly frequency, multiply by 12)
        savings.totalAnnualSavings = savings.usageSavings * 12;
        savings.totalAnnualSavingsPercent = savings.usageSavingsPercent;
      }
    } else if (comparison.utilityType === 'Waste') {
      // Waste rate comparison
      const currentRate = comparison.currentWasteRate || 0;
      const compRate = comparison.comparisonWasteRate || 0;
      const frequency = comparison.wasteUsage || comparison.monthlyUsage || 0;
      
      if (currentRate > 0 && compRate > 0 && frequency > 0) {
        const currentCost = frequency * currentRate;
        const comparisonCost = frequency * compRate;
        savings.usageSavings = currentCost - comparisonCost;
        savings.usageSavingsPercent = currentCost > 0 ? ((savings.usageSavings / currentCost) * 100) : 0;
        
        // Total annual savings (assuming monthly frequency, multiply by 12)
        savings.totalAnnualSavings = savings.usageSavings * 12;
        savings.totalAnnualSavingsPercent = savings.usageSavingsPercent;
      }
    } else if (comparison.utilityType === 'Cleaning') {
      // Cleaning rate comparison
      const currentRate = comparison.currentCleaningRate || 0;
      const compRate = comparison.comparisonCleaningRate || 0;
      const frequency = comparison.cleaningUsage || comparison.monthlyUsage || 0;
      
      if (currentRate > 0 && compRate > 0 && frequency > 0) {
        const currentCost = frequency * currentRate;
        const comparisonCost = frequency * compRate;
        savings.usageSavings = currentCost - comparisonCost;
        savings.usageSavingsPercent = currentCost > 0 ? ((savings.usageSavings / currentCost) * 100) : 0;
        
        // Total annual savings (assuming monthly frequency, multiply by 12)
        savings.totalAnnualSavings = savings.usageSavings * 12;
        savings.totalAnnualSavingsPercent = savings.usageSavingsPercent;
      }
    }
    
    return savings;
  };

  const handleGenerateClick = (comparison: UtilityComparison, action: 'comparison' | 'dma' = 'comparison') => {
    // Find all matching utilities (same type and action)
    const matchingUtilities = utilityComparisons.filter(
      u => u.utilityType === comparison.utilityType && !u.loading && !u.error
    );

    if (matchingUtilities.length <= 1) {
      // Only one utility, generate directly
      generateComparison(comparison, action, false);
      return;
    }

    // Multiple utilities - ask user
    const actionName = action === 'dma' ? 'DMA Review' : 'Comparison';
    const confirmed = window.confirm(
      `Generate ${actionName} for:\n\n` +
      `• This site only (${comparison.identifier})\n` +
      `• All ${matchingUtilities.length} ${comparison.utilityType} sites\n\n` +
      `Click OK for all sites, Cancel for this site only.`
    );

    generateComparison(comparison, action, confirmed);
  };

  const generateComparison = async (
    comparison: UtilityComparison, 
    action: 'comparison' | 'dma' = 'comparison',
    generateAll: boolean = false
  ) => {
    if (!token || !session) {
      alert('Please log in to generate comparisons');
      return;
    }

    // If generateAll, find all matching utilities
    const utilitiesToProcess = generateAll
      ? utilityComparisons.filter(
          u => u.utilityType === comparison.utilityType && !u.loading && !u.error
        )
      : [comparison];

    if (utilitiesToProcess.length === 0) {
      alert('No utilities available to generate');
      return;
    }

    // Process each utility
    const results: string[] = [];
    const errors: string[] = [];

    for (const util of utilitiesToProcess) {
      const sendingKey = `${util.utilityType}-${util.identifier}-${action}`;
      
      // Prevent duplicate requests
      if (sending === sendingKey) {
        continue;
      }

      try {
        setSending(sendingKey);
        setError(null);
        setSuccess(false);

        let webhookUrl = '';
        let payload: any = {
          user_email: session?.user?.email || '',
          user_name: session?.user?.name || '',
          user_id: (session?.user as any)?.id || '',
          full_invoice_data: util.invoiceData,
          timestamp: new Date().toISOString()
        };

        // Add business info if available
        if (businessInfo) {
          payload.business_name = businessInfo.name || '';
          payload.business_abn = businessInfo.abn || '';
          payload.business_trading_name = businessInfo.trading_name || '';
          payload.business_industry = businessInfo.industry || '';
          payload.business_website = businessInfo.website || '';
          payload.postal_address = businessInfo.postal_address || '';
          payload.site_address = businessInfo.site_address || '';
          payload.contact_phone = businessInfo.telephone || '';
          payload.contact_email = businessInfo.email || '';
          payload.contact_name = businessInfo.contact_name || '';
          payload.contact_position = businessInfo.position || '';
        }

        // Check DMA first (before general C&I Electricity check)
        if (action === 'dma' && util.utilityType === 'C&I Electricity') {
          // DMA Review for C&I Electricity
          webhookUrl = 'https://membersaces.app.n8n.cloud/webhook/generate-dma-comparaison-review-b2';
          const details = util.invoiceData?.electricity_ci_invoice_details || {};
          const fullData = details?.full_invoice_data || {};
          payload.nmi = util.identifier;
          payload.site_address = fullData['Site Address'] || details?.site_address || businessInfo?.site_address || '';
          payload.invoice_number = fullData['Invoice Number'] || details?.invoice_number || '';
          payload.invoice_link = fullData['Invoice Link'] || details?.invoice_link || '';
          
          // Current metering rates
          payload.metering_rate = util.currentMeteringDaily?.toFixed(2) || '0';
          payload.metering_rate_annual = util.currentMeteringAnnual?.toFixed(2) || '0';
          
          // New/proposed metering rates (from comparison rates)
          payload.dma_price = util.comparisonMeteringDaily?.toFixed(2) || '0';
          payload.vas_price = '0'; // VAS rate if applicable
          payload.proposed_annual_cost = util.comparisonMeteringAnnual?.toFixed(2) || '700.00';
          
          // Calculate savings
          if (util.currentMeteringAnnual && util.comparisonMeteringAnnual) {
            payload.annual_savings = (util.currentMeteringAnnual - util.comparisonMeteringAnnual).toFixed(2);
          }
        } else if (util.utilityType === 'C&I Electricity') {
          webhookUrl = 'https://membersaces.app.n8n.cloud/webhook/generate-electricity-ci-comparaison';
          // Add electricity-specific fields
          const details = util.invoiceData?.electricity_ci_invoice_details || {};
          const fullData = details?.full_invoice_data || {};
          payload.nmi = util.identifier;
          payload.invoice_id = fullData['Invoice ID'] || details?.invoice_id || '';
          payload.site_address = fullData['Site Address'] || details?.site_address || businessInfo?.site_address || '';
          payload.retailer = fullData['Retailer'] || details?.retailer || '';
          payload.invoice_number = fullData['Invoice Number'] || details?.invoice_number || '';
          
          // CURRENT RATES FROM INVOICE
          payload.peak_rate_invoice = util.currentPeakRate?.toFixed(2) || '0';
          payload.off_peak_rate_invoice = util.currentOffPeakRate?.toFixed(2) || '0';
          payload.shoulder_rate_invoice = util.currentShoulderRate?.toFixed(2) || '0';
          
          // CURRENT USAGE FROM INVOICE
          payload.peak_usage_invoice = util.peakUsage?.toFixed(0) || '0';
          payload.off_peak_usage_invoice = util.offPeakUsage?.toFixed(0) || '0';
          payload.shoulder_usage_invoice = '0'; // Calculate if needed
          payload.total_monthly_usage = util.monthlyUsage?.toFixed(0) || '0';
          
          // COMPARISON/OFFER RATES (from editable UI fields)
          // Using offer1 structure - this is the comparison rate from the UI
          payload.offer1PeakRate = util.comparisonPeakRate?.toFixed(2) || '0';
          payload.offer1OffPeakRate = util.comparisonOffPeakRate?.toFixed(2) || '0';
          payload.offer1ShoulderRate = util.comparisonShoulderRate?.toFixed(2) || '0';
          payload.offer1Retailer = 'Comparison Offer';
          payload.offer1Validity = '12 months';
          payload.offer1Type = 'smoothed';
          payload.offer1PeriodYears = '1';
          payload.offer1StartDate = new Date().toISOString().split('T')[0];
          
          // Additional rates if needed
          payload.current_daily_supply = util.currentDailySupply?.toFixed(2) || '0';
          payload.comparison_daily_supply = util.comparisonDailySupply?.toFixed(2) || '0';
          payload.current_demand_charge = util.currentDemandCharge?.toFixed(2) || '0';
          payload.comparison_demand_charge = util.comparisonDemandCharge?.toFixed(2) || '0';
          payload.demand_quantity = util.demandQuantity?.toFixed(2) || '0';
        } else if (util.utilityType === 'C&I Gas') {
          webhookUrl = 'https://membersaces.app.n8n.cloud/webhook/generate-gas-ci-comparaison-b2';
          // Add gas-specific fields
          const details = util.invoiceData?.gas_ci_invoice_details || {};
          const fullData = details?.full_invoice_data || {};
          payload.mrin = util.identifier;
          payload.invoice_id = fullData['Invoice ID'] || details?.invoice_id || '';
          payload.site_address = fullData['Site Address'] || details?.site_address || businessInfo?.site_address || '';
          payload.invoice_number = fullData['Invoice Number'] || details?.invoice_number || '';
          
          // CURRENT RATES FROM INVOICE
          payload.gas_rate_invoice = util.currentGasRate?.toFixed(4) || '0';
          payload.gas_usage_invoice = util.gasUsage?.toFixed(2) || util.monthlyUsage?.toFixed(2) || '0';
          payload.total_monthly_usage = util.gasUsage?.toFixed(2) || util.monthlyUsage?.toFixed(2) || '0';
          
          // COMPARISON/OFFER RATES (from editable UI fields)
          payload.offer1GasRate = util.comparisonGasRate?.toFixed(4) || '0';
          payload.offer1Retailer = 'Comparison Offer';
          payload.offer1Validity = '12 months';
          payload.offer1Type = 'smoothed';
          payload.offer1PeriodYears = '1';
          payload.offer1StartDate = new Date().toISOString().split('T')[0];
          
          // Additional rates
          payload.current_daily_supply = util.currentDailySupply?.toFixed(2) || '0';
          payload.comparison_daily_supply = util.comparisonDailySupply?.toFixed(2) || '0';
        } else {
          errors.push(`${util.identifier}: Comparison generation not yet supported for this utility type`);
          setSending(null);
          continue;
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          const actionName = action === 'dma' ? 'DMA Review' : 'Comparison';
          let message = `${util.utilityType} ${actionName} generated successfully for ${util.identifier}`;
          if (result.pdf_document_link) message += `\nPDF: ${result.pdf_document_link}`;
          if (result.spreadsheet_document_link) message += `\nSpreadsheet: ${result.spreadsheet_document_link}`;
          results.push(message);
        } else {
          const errorText = await response.text();
          errors.push(`${util.identifier}: ${errorText}`);
        }
      } catch (err: any) {
        console.error(`Error generating ${action === 'dma' ? 'DMA review' : 'comparison'} for ${util.identifier}:`, err);
        errors.push(`${util.identifier}: ${err.message || `Failed to generate ${action === 'dma' ? 'DMA review' : 'comparison'}`}`);
      } finally {
        setSending(null);
      }
    }

    // Show results summary
    if (results.length > 0 || errors.length > 0) {
      const actionName = action === 'dma' ? 'DMA Review' : 'Comparison';
      let summary = `${actionName} Generation Summary:\n\n`;
      if (results.length > 0) {
        summary += `✅ Successfully generated ${results.length} ${results.length === 1 ? 'comparison' : 'comparisons'}:\n`;
        results.forEach((r, i) => {
          summary += `${i + 1}. ${r}\n`;
        });
      }
      if (errors.length > 0) {
        summary += `\n❌ Errors (${errors.length}):\n`;
        errors.forEach((e, i) => {
          summary += `${i + 1}. ${e}\n`;
        });
      }
      alert(summary);
      if (results.length > 0) {
        setSuccess(true);
      }
      if (errors.length > 0) {
        setError(`${errors.length} error(s) occurred. See alert for details.`);
      }
    }
  };

  // Helper function to extract invoice link from invoice data
  const getInvoiceLink = (comparison: UtilityComparison): string | null => {
    if (!comparison.invoiceData) return null;
    
    if (comparison.utilityType.includes('Electricity')) {
      const details = comparison.invoiceData?.electricity_ci_invoice_details || comparison.invoiceData?.electricity_sme_invoice_details || {};
      const fullData = details?.full_invoice_data || comparison.invoiceData?.full_invoice_data || {};
      return details?.invoice_link || fullData['Invoice Link'] || null;
    } else if (comparison.utilityType.includes('Gas')) {
      if (comparison.invoiceData?.gas_sme_invoicedetails) {
        return comparison.invoiceData.gas_sme_invoicedetails.invoice_link || null;
      }
      const details = comparison.invoiceData?.gas_ci_invoice_details || comparison.invoiceData?.gas_invoice_details || {};
      const fullData = details?.full_invoice_data || comparison.invoiceData?.full_invoice_data || {};
      return details?.invoice_link || fullData['Invoice Link'] || null;
    } else if (comparison.utilityType === 'Oil') {
      const details = comparison.invoiceData?.oil_invoice_details || comparison.invoiceData || {};
      const fullData = details?.full_invoice_data || details || {};
      return details?.invoice_link || fullData['Invoice Link'] || null;
    } else if (comparison.utilityType === 'Waste') {
      const details = comparison.invoiceData?.waste_invoice_details || comparison.invoiceData || {};
      const fullData = details?.full_invoice_data || details || {};
      return details?.invoice_link || fullData['Invoice Link'] || null;
    } else if (comparison.utilityType === 'Cleaning') {
      const details = comparison.invoiceData?.cleaning_invoice_details || comparison.invoiceData || {};
      const fullData = details?.full_invoice_data || details || {};
      return details?.invoice_link || fullData['Invoice Link'] || null;
    }
    
    return null;
  };

  const renderTableRows = (comparison: UtilityComparison, savings: any, isElectricity: boolean, isGas: boolean) => {
    const rows: React.ReactElement[] = [];
    
    // Metering Price (Electricity only) - Always show for electricity
    if (isElectricity) {
      rows.push(
        <tr key="metering">
          <td className="border border-gray-300 px-1 py-0.5 font-semibold text-xs">Metering Price</td>
          <td className="border border-gray-300 px-1 py-0.5">
            <div className="space-y-1">
              <input
                type="number"
                step="0.01"
                value={comparison.currentMeteringDaily || ''}
                onChange={(e) => {
                  const daily = parseFloat(e.target.value) || 0;
                  updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentMeteringDaily', e.target.value);
                  if (daily > 0) {
                    updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentMeteringAnnual', (daily * 365).toFixed(2));
                  } else {
                    updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentMeteringAnnual', '');
                  }
                }}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="Daily rate"
              />
              <div className="text-xs text-gray-500 text-right">
                {comparison.currentMeteringAnnual 
                  ? `$${comparison.currentMeteringAnnual.toFixed(2)}/yr` 
                  : ''}
              </div>
            </div>
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs">-</td>
          <td className="border border-gray-300 px-1 py-0.5">
            <div className="space-y-1">
              <input
                type="number"
                step="0.01"
                value={comparison.comparisonMeteringDaily || 1.92}
                onChange={(e) => {
                  const daily = parseFloat(e.target.value) || 1.92;
                  updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonMeteringDaily', e.target.value);
                  // Always keep annual at 700
                  updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonMeteringAnnual', '700.00');
                }}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="1.92"
              />
              <div className="text-xs text-gray-500 text-right">
                $700.00/yr
              </div>
            </div>
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {comparison.currentMeteringAnnual && comparison.comparisonMeteringAnnual
              ? `$${(comparison.currentMeteringAnnual - comparison.comparisonMeteringAnnual).toFixed(2)}/yr`
              : '-'}
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {comparison.currentMeteringAnnual && comparison.comparisonMeteringAnnual
              ? `${(((comparison.currentMeteringAnnual - comparison.comparisonMeteringAnnual) / comparison.currentMeteringAnnual) * 100).toFixed(1)}%`
              : '-'}
          </td>
        </tr>
      );
    }

    // Electricity Rates
    if (isElectricity) {
      rows.push(
        <tr key="peak">
          <td className="border border-gray-300 px-1 py-0.5 text-xs">Peak Rate (c/kWh)</td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.currentPeakRate || ''}
              onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentPeakRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Current rate"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.peakUsage || ''}
              onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'peakUsage', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Usage (kWh)"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.comparisonPeakRate || ''}
              onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonPeakRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="24.50"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.peakAnnualSavings !== undefined ? `$${savings.peakAnnualSavings.toFixed(2)}/yr` : '-'}
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.peakSavingsPercent !== undefined ? `${savings.peakSavingsPercent.toFixed(1)}%` : '-'}
          </td>
        </tr>
      );

      rows.push(
        <tr key="offpeak">
          <td className="border border-gray-300 px-1 py-0.5 text-xs">Off-Peak Rate (c/kWh)</td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.currentOffPeakRate || ''}
              onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentOffPeakRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Current rate"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.offPeakUsage || ''}
              onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'offPeakUsage', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Usage (kWh)"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.comparisonOffPeakRate || ''}
              onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonOffPeakRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="18.00"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.offPeakAnnualSavings !== undefined ? `$${savings.offPeakAnnualSavings.toFixed(2)}/yr` : '-'}
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.offPeakSavingsPercent !== undefined ? `${savings.offPeakSavingsPercent.toFixed(1)}%` : '-'}
          </td>
        </tr>
      );

      if (comparison.currentShoulderRate && comparison.currentShoulderRate > 0) {
        rows.push(
          <tr key="shoulder">
            <td className="border border-gray-300 px-1 py-0.5 text-xs">Shoulder Rate (c/kWh)</td>
            <td className="border border-gray-300 px-1 py-0.5">
              <input
                type="number"
                step="0.01"
                value={comparison.currentShoulderRate || ''}
                onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentShoulderRate', e.target.value)}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="Current rate"
              />
            </td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs">-</td>
            <td className="border border-gray-300 px-1 py-0.5">
              <input
                type="number"
                step="0.01"
                value={comparison.comparisonShoulderRate || ''}
                onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonShoulderRate', e.target.value)}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="20.00"
              />
            </td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs">-</td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs">-</td>
          </tr>
        );
      }

      // Daily Supply Charge for SME Electricity only (not shown for C&I Electricity)
      if (comparison.utilityType !== 'C&I Electricity') {
        rows.push(
          <tr key="supply">
            <td className="border border-gray-300 px-1 py-0.5 text-xs">Daily Supply Charge ($/day)</td>
            <td className="border border-gray-300 px-1 py-0.5">
              <input
                type="number"
                step="0.01"
                value={comparison.currentDailySupply || ''}
                onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentDailySupply', e.target.value)}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="Current rate"
              />
            </td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs">-</td>
            <td className="border border-gray-300 px-1 py-0.5">
              <input
                type="number"
                step="0.01"
                value={comparison.comparisonDailySupply || ''}
                onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonDailySupply', e.target.value)}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="1.50"
              />
            </td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
              {comparison.currentDailySupply && comparison.comparisonDailySupply
                ? `$${((comparison.currentDailySupply - comparison.comparisonDailySupply) * 365).toFixed(2)}/yr`
                : '-'}
            </td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
              {comparison.currentDailySupply && comparison.comparisonDailySupply
                ? `${(((comparison.currentDailySupply - comparison.comparisonDailySupply) / comparison.currentDailySupply) * 100).toFixed(1)}%`
                : '-'}
            </td>
          </tr>
        );
      }

      // Demand Charge (C&I Electricity only) - Always show for C&I Electricity
      if (comparison.utilityType === 'C&I Electricity') {
        // Always show demand charge row for C&I Electricity, even if value is 0
        const demandQty = comparison.demandQuantity || comparison.invoiceData?.electricity_ci_invoice_details?.full_invoice_data?.['DUOS - Network Demand Charge Quantity (KVA)'] || 0;
        const currentDemand = comparison.currentDemandCharge || 0;
        const currentDemandAnnual = (currentDemand * demandQty * 12);
        const comparisonDemand = comparison.comparisonDemandCharge || 0;
        const comparisonDemandAnnual = (comparisonDemand * demandQty * 12);
        const demandSavings = currentDemandAnnual - comparisonDemandAnnual;
        
        rows.push(
          <tr key="demand">
            <td className="border border-gray-300 px-1 py-0.5 text-xs">Demand Charge ($/kVA/month)</td>
            <td className="border border-gray-300 px-1 py-0.5">
              <input
                type="number"
                step="0.01"
                value={currentDemand > 0 ? currentDemand : ''}
                onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentDemandCharge', e.target.value)}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="Current rate"
              />
            </td>
            <td className="border border-gray-300 px-1 py-0.5">
              <input
                type="number"
                step="0.01"
                value={demandQty > 0 ? demandQty : ''}
                onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'demandQuantity', e.target.value)}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="Quantity (kVA)"
              />
            </td>
            <td className="border border-gray-300 px-1 py-0.5">
              <input
                type="number"
                step="0.01"
                value={comparison.comparisonDemandCharge || ''}
                onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonDemandCharge', e.target.value)}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="12.00"
              />
            </td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
              {comparison.comparisonDemandCharge && comparison.comparisonDemandCharge > 0 && currentDemand > 0
                ? `$${demandSavings.toFixed(2)}/yr`
                : '-'}
            </td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
              {comparison.comparisonDemandCharge && comparison.comparisonDemandCharge > 0 && currentDemand > 0
                ? `${((demandSavings / currentDemandAnnual) * 100).toFixed(1)}%`
                : '-'}
            </td>
          </tr>
        );
      }
    }

    // Gas Rates
    if (isGas) {
      rows.push(
        <tr key="gas-rate">
          <td className="border border-gray-300 px-1 py-0.5 font-semibold text-xs">Gas Rate ($/GJ)</td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.0001"
              value={comparison.currentGasRate || ''}
              onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentGasRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Current rate"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.gasUsage || ''}
              onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'gasUsage', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Usage (GJ)"
            />
            {comparison.estimatedAnnualUsage && comparison.estimatedAnnualUsage > 0 && (
              <div className="text-xs text-gray-500 text-right mt-1">
                (Est. Annual: {comparison.estimatedAnnualUsage.toFixed(2)} GJ)
              </div>
            )}
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.comparisonGasRate || ''}
              onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonGasRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="16.75"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.usageSavings && savings.usageSavings > 0 ? `$${(savings.usageSavings * 12).toFixed(2)}/yr` : '-'}
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.usageSavingsPercent ? `${savings.usageSavingsPercent.toFixed(1)}%` : '-'}
          </td>
        </tr>
      );

      // Daily Supply Charge for SME Gas only (not shown for C&I Gas)
      if (comparison.utilityType !== 'C&I Gas') {
        rows.push(
          <tr key="gas-supply">
            <td className="border border-gray-300 px-1 py-0.5 text-xs">Daily Supply Charge ($/day)</td>
            <td className="border border-gray-300 px-1 py-0.5">
              <input
                type="number"
                step="0.01"
                value={comparison.currentDailySupply || ''}
                onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentDailySupply', e.target.value)}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="Current rate"
              />
            </td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs">-</td>
            <td className="border border-gray-300 px-1 py-0.5">
              <input
                type="number"
                step="0.01"
                value={comparison.comparisonDailySupply || ''}
                onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonDailySupply', e.target.value)}
                className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                placeholder="1.20"
              />
            </td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
              {comparison.currentDailySupply && comparison.comparisonDailySupply
                ? `$${((comparison.currentDailySupply - comparison.comparisonDailySupply) * 365).toFixed(2)}/yr`
                : '-'}
            </td>
            <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
              {comparison.currentDailySupply && comparison.comparisonDailySupply
                ? `${(((comparison.currentDailySupply - comparison.comparisonDailySupply) / comparison.currentDailySupply) * 100).toFixed(1)}%`
                : '-'}
            </td>
          </tr>
        );
      }
    }

    // Oil Rates
    if (comparison.utilityType === 'Oil') {
      rows.push(
        <tr key="oil-rate">
          <td className="border border-gray-300 px-1 py-0.5 font-semibold text-xs">Oil Rate ($/L)</td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.0001"
              value={comparison.currentOilRate || ''}
              onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentOilRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Current rate"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.oilUsage || ''}
              onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'oilUsage', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Usage (L)"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.comparisonOilRate || ''}
              onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonOilRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="2.50"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.usageSavings && savings.usageSavings > 0 ? `$${(savings.usageSavings * 12).toFixed(2)}/yr` : '-'}
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.usageSavingsPercent ? `${savings.usageSavingsPercent.toFixed(1)}%` : '-'}
          </td>
        </tr>
      );
    }

    // Waste Rates
    if (comparison.utilityType === 'Waste') {
      rows.push(
        <tr key="waste-rate">
          <td className="border border-gray-300 px-1 py-0.5 font-semibold text-xs">Waste Rate ($/service)</td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.currentWasteRate || ''}
              onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentWasteRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Current rate"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.wasteUsage || ''}
              onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'wasteUsage', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Usage/month"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.comparisonWasteRate || ''}
              onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonWasteRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="50.00"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.usageSavings && savings.usageSavings > 0 ? `$${(savings.usageSavings * 12).toFixed(2)}/yr` : '-'}
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.usageSavingsPercent ? `${savings.usageSavingsPercent.toFixed(1)}%` : '-'}
          </td>
        </tr>
      );
    }

    // Cleaning Rates
    if (comparison.utilityType === 'Cleaning') {
      rows.push(
        <tr key="cleaning-rate">
          <td className="border border-gray-300 px-1 py-0.5 font-semibold text-xs">Cleaning Rate ($/visit)</td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.currentCleaningRate || ''}
              onChange={(e) => updateCurrentRate(comparison.utilityType, comparison.identifier, 'currentCleaningRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Current rate"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.cleaningUsage || ''}
              onChange={(e) => updateUsage(comparison.utilityType, comparison.identifier, 'cleaningUsage', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="Usage/month"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5">
            <input
              type="number"
              step="0.01"
              value={comparison.comparisonCleaningRate || ''}
              onChange={(e) => updateComparisonRate(comparison.utilityType, comparison.identifier, 'comparisonCleaningRate', e.target.value)}
              className="w-full px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
              placeholder="100.00"
            />
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.usageSavings && savings.usageSavings > 0 ? `$${(savings.usageSavings * 12).toFixed(2)}/yr` : '-'}
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings?.usageSavingsPercent ? `${savings.usageSavingsPercent.toFixed(1)}%` : '-'}
          </td>
        </tr>
      );
    }

    // Total Savings Summary
    if (savings && savings.totalAnnualSavings !== undefined) {
      rows.push(
        <tr key="savings" className="bg-green-50 font-bold">
          <td className="border border-gray-300 px-1 py-0.5 text-xs" colSpan={4}>
            Estimated Annual Savings
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            ${savings.totalAnnualSavings.toFixed(2)}
          </td>
          <td className="border border-gray-300 px-1 py-0.5 text-right text-xs text-green-600 font-semibold">
            {savings.totalAnnualSavingsPercent !== undefined 
              ? `${savings.totalAnnualSavingsPercent.toFixed(1)}%`
              : '-'}
          </td>
        </tr>
      );
    }

    return rows;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Base 2 Review - Quick Rate Comparison</h1>

      {/* Business Information Display */}
      {businessInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Business Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {businessInfo.name && <div><strong>Business Name:</strong> {businessInfo.name}</div>}
            {businessInfo.abn && <div><strong>ABN:</strong> {businessInfo.abn}</div>}
            {businessInfo.site_address && <div><strong>Site Address:</strong> {businessInfo.site_address}</div>}
            {businessInfo.email && <div><strong>Email:</strong> {businessInfo.email}</div>}
            {businessInfo.contact_name && <div><strong>Contact:</strong> {businessInfo.contact_name}</div>}
          </div>
        </div>
      )}

      {/* Linked Utilities Section */}
      {utilityComparisons.length === 0 && businessInfo?.utilities && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">Loading Linked Utilites...</p>
        </div>
      )}

      {/* Utility Comparison Cards */}
      {utilityComparisons.map((comparison, idx) => {
        const savings = calculateSavings(comparison);
        const isElectricity = comparison.utilityType.includes('Electricity');
        const isGas = comparison.utilityType.includes('Gas');

        return (
          <div key={idx} className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {comparison.utilityType} - {comparison.identifierLabel}: {comparison.identifier}
            </h2>

            {/* Loading State */}
            {comparison.loading && (
              <div className="text-center py-4">
                <p className="text-gray-600">Loading invoice data...</p>
              </div>
            )}

            {/* Error State */}
            {comparison.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                Error: {comparison.error}
              </div>
            )}

            {/* Invoice Link */}
            {!comparison.loading && !comparison.error && (
              <div className="mb-4">
                {getInvoiceLink(comparison) ? (
                  <a
                    href={getInvoiceLink(comparison) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm font-semibold"
                  >
                    📄 View Invoice PDF
                  </a>
                ) : (
                  <span className="text-gray-500 text-sm">No invoice link available</span>
                )}
              </div>
            )}

            {/* Comparison Table */}
            {!comparison.loading && !comparison.error && (
              <>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-1 py-0.5 text-left text-xs">Item</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-right text-xs">Current Rate</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-right text-xs">Current Usage</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-right text-xs">Comparison Rate</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-right text-xs">Potential Savings $</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-right text-xs">Potential Savings %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderTableRows(comparison, savings, isElectricity, isGas)}
                    </tbody>
                  </table>
                </div>

                {/* Generate Comparison Buttons */}
                {(comparison.utilityType === 'C&I Electricity' || comparison.utilityType === 'C&I Gas') && (
                  <div className="mt-4 flex justify-end gap-3">
                    {comparison.utilityType === 'C&I Electricity' && (
                      <>
                        <button
                          onClick={() => handleGenerateClick(comparison, 'dma')}
                          disabled={sending !== null && sending.includes(`${comparison.utilityType}-${comparison.identifier}-dma`)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                        >
                          {sending !== null && sending.includes(`${comparison.utilityType}-${comparison.identifier}-dma`) ? 'Generating...' : 'Generate DMA Review'}
                        </button>
                        <button
                          onClick={() => handleGenerateClick(comparison, 'comparison')}
                          disabled={sending !== null && sending.includes(`${comparison.utilityType}-${comparison.identifier}-comparison`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                        >
                          {sending !== null && sending.includes(`${comparison.utilityType}-${comparison.identifier}-comparison`) ? 'Generating...' : 'Generate Comparison'}
                        </button>
                      </>
                    )}
                    {comparison.utilityType === 'C&I Gas' && (
                      <button
                        onClick={() => handleGenerateClick(comparison, 'comparison')}
                        disabled={sending !== null && sending.includes(`${comparison.utilityType}-${comparison.identifier}-comparison`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                      >
                        {sending !== null && sending.includes(`${comparison.utilityType}-${comparison.identifier}-comparison`) ? 'Generating...' : 'Generate Comparison'}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          ✅ Comparison saved successfully!
        </div>
      )}
    </div>
  );
}
