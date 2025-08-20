"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";

export default function QuoteRequestPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token;

  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [utilityResult, setUtilityResult] = useState<Record<string, any>>({});
  const [businessInfo, setBusinessInfo] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Collapsible section states - start collapsed
  const [showBusinessInfo, setShowBusinessInfo] = useState(false);
  const [showUtilityInfo, setShowUtilityInfo] = useState(false);
  const [showIntervalData, setShowIntervalData] = useState(false);

  // Interval data state
  const [intervalData, setIntervalData] = useState<any>(null);
  const [intervalLoading, setIntervalLoading] = useState(false);
  const [intervalError, setIntervalError] = useState<string | null>(null);

  // Quote details state
  const [quoteDetails, setQuoteDetails] = useState({
    quoteType: '',
    commission: '0',
    startDate: '',
    offerDue: '',
    yearlyPeakEst: '',
    yearlyShoulderEst: '',
    yearlyOffPeakEst: '',
    yearlyConsumptionEst: ''
  });

  // Selected retailers state
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  
  // Modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // grab from URL
  const businessInfoRaw = searchParams.get("businessInfo");
  const utility = searchParams.get("utility");
  const identifier = searchParams.get("identifier");

  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showSuccessModalState, setShowSuccessModalState] = useState<boolean>(false);

  // Available retailers based on utility type
  const getAvailableRetailers = () => {
    const testRetailer = 'Test';
    
    if (utility === 'electricity_ci' || utility === 'gas_ci') {
      return [
        testRetailer,
        'Origin C&I',
        'Alinta C&I', 
        'Shell C&I',
        'Momentum C&I'
      ];
    } else if (utility === 'electricity_sme' || utility === 'gas_sme') {
      return [
        testRetailer,
        'Origin SME',
        'Alinta SME',
        'Shell SME', 
        'Momentum SME'
      ];
    } else if (utility === 'waste') {
      return [testRetailer, 'Waste Provider 1', 'Waste Provider 2'];
    } else if (utility === 'oil') {
      return [testRetailer, 'Oil Provider 1', 'Oil Provider 2'];
    }
    return [testRetailer];
  };

  const getQuoteTypeOptions = () => {
    switch (utility) {
      case 'electricity_ci':
        return [
          { value: '3_year_stepped', label: '3 Year Stepped' },
          { value: '3_year_smoothed', label: '3 Year Smoothed' },
          { value: '3_year_stepped_smoothed', label: '3 Year Stepped and Smoothed' },
          { value: '2_year_fixed', label: '2 Year Fixed' },
          { value: '1_year_fixed', label: '1 Year Fixed' }
        ];
      case 'gas_ci':
        return [
          { value: '3_year_stepped', label: '3 Year Stepped' },
          { value: '3_year_smoothed', label: '3 Year Smoothed' }
        ];
      case 'electricity_sme':
        return [
          { value: '2_year_fixed', label: '2 Year Fixed' },
          { value: '1_year_fixed', label: '1 Year Fixed' },
          { value: 'flexible', label: 'Flexible Contract' }
        ];
      case 'gas_sme':
        return [
          { value: '2_year_fixed', label: '2 Year Fixed' },
          { value: '1_year_fixed', label: '1 Year Fixed' }
        ];
      case 'waste':
        return [
          { value: '3_year_contract', label: '3 Year Contract' },
          { value: '2_year_contract', label: '2 Year Contract' },
          { value: 'monthly_service', label: 'Monthly Service' }
        ];
      case 'oil':
        return [
          { value: 'supply_collect', label: 'Supply & Collection Service' },
          { value: 'collection_only', label: 'Collection Only' },
          { value: 'supply_only', label: 'Supply Only' }
        ];
      default:
        return [
          { value: 'standard', label: 'Standard Service' }
        ];
    }
  };

  // Commission options based on utility type
  const getCommissionOptions = () => {
    switch (utility) {
      case 'electricity_ci':
      case 'electricity_sme':
        return [
          { value: '0', label: '0%' },
          { value: '3%', label: '3%' },
          { value: '$3.33 / mWh', label: '$3.33 / mWh' },
          { value: '$5.00 / mWh', label: '$5.00 / mWh' }
        ];
      case 'gas_ci':
      case 'gas_sme':
        return [
          { value: '0', label: '0%' },
          { value: '3%', label: '3%' },
          { value: '$0.50 / GJ', label: '$0.50 / GJ' },
          { value: '$1.00 / GJ', label: '$1.00 / GJ' }
        ];
      case 'waste':
        return [
          { value: '0', label: '0%' },
          { value: '5%', label: '5%' },
          { value: '10%', label: '10%' },
          { value: '$50 / month', label: '$50 / month' }
        ];
      case 'oil':
        return [
          { value: '0', label: '0%' },
          { value: '5%', label: '5%' },
          { value: '$0.10 / litre', label: '$0.10 / litre' }
        ];
      default:
        return [
          { value: '0', label: '0%' }
        ];
    }
  };

  // Helper to get consumption unit based on utility type
  const getConsumptionUnit = () => {
    switch (utility) {
      case 'electricity_ci':
      case 'electricity_sme':
        return 'kWh';
      case 'gas_ci':
      case 'gas_sme':
        return 'MJ';
      case 'waste':
        return 'tonnes';
      case 'oil':
        return 'litres';
      default:
        return 'units';
    }
  };

  // Helper to determine if utility shows peak/shoulder/off-peak breakdown
  const showUsageBreakdown = () => {
    return utility === 'electricity_ci' || utility === 'electricity_sme';
  };

  // Dynamic Quote Details Section Component
  const renderQuoteDetailsSection = () => (
    <div className="p-6 border-b">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quote Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quote Type Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {utility === 'waste' || utility === 'oil' ? 'Service Options' : 'Quote Details'}
          </label>
          <select 
            value={quoteDetails.quoteType}
            onChange={(e) => handleQuoteDetailsChange('quoteType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select option...</option>
            {getQuoteTypeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Commission Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Commission
          </label>
          <select 
            value={quoteDetails.commission}
            onChange={(e) => handleQuoteDetailsChange('commission', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {getCommissionOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={quoteDetails.startDate}
            onChange={(e) => handleQuoteDetailsChange('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Offer Due */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Offer Due
          </label>
          <input
            type="date"
            value={quoteDetails.offerDue}
            onChange={(e) => handleQuoteDetailsChange('offerDue', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Usage Estimates - Different layouts based on utility type */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {utility === 'waste' ? 'Volume Estimates' : 
           utility === 'oil' ? 'Usage Estimates' : 
           'Consumption Estimates'}
          <span className="text-sm font-normal text-gray-600 ml-2">
            (Auto-calculated from invoice data)
          </span>
        </h3>
        
        {showUsageBreakdown() ? (
          // Electricity: Show peak/shoulder/off-peak breakdown
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yearly Peak Est
              </label>
              <input
                type="number"
                value={quoteDetails.yearlyPeakEst}
                onChange={(e) => handleQuoteDetailsChange('yearlyPeakEst', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 mt-1">{getConsumptionUnit()}</span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yearly Shoulder Est
              </label>
              <input
                type="number"
                value={quoteDetails.yearlyShoulderEst}
                onChange={(e) => handleQuoteDetailsChange('yearlyShoulderEst', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 mt-1">{getConsumptionUnit()}</span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yearly Off-Peak Est
              </label>
              <input
                type="number"
                value={quoteDetails.yearlyOffPeakEst}
                onChange={(e) => handleQuoteDetailsChange('yearlyOffPeakEst', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 mt-1">{getConsumptionUnit()}</span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Yearly Est
              </label>
              <input
                type="number"
                value={quoteDetails.yearlyConsumptionEst}
                onChange={(e) => handleQuoteDetailsChange('yearlyConsumptionEst', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 mt-1">{getConsumptionUnit()}</span>
            </div>
          </div>
        ) : (
          // Gas/Waste/Oil: Show only total consumption
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {utility === 'waste' ? 'Annual Volume Est' : 
                 utility === 'oil' ? 'Annual Usage Est' : 
                 'Annual Consumption Est'}
              </label>
              <input
                type="number"
                value={quoteDetails.yearlyConsumptionEst}
                onChange={(e) => handleQuoteDetailsChange('yearlyConsumptionEst', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 mt-1">{getConsumptionUnit()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Updated calculateYearlyEstimates function to handle all utility types
  const calculateYearlyEstimatesForUtility = () => {
    console.log('=== Calculating Yearly Estimates for', utility, '===');
    
    // For gas utilities, look for Energy Charge Quantity field
    if (utility === 'gas_ci' || utility === 'gas_sme') {
      console.log('Processing gas utility data');
      
      if (utilityResult) {
        for (const [key, value] of Object.entries(utilityResult)) {
          if (typeof value === 'object' && value !== null) {
            try {
              const parsed = typeof value === 'string' ? JSON.parse(value) : value;
              console.log('Checking gas data:', parsed);
              
              // Look for Energy Charge Quantity field
              const energyChargeQty = parsed.energy_charge_quantity || parsed["Energy Charge Quantity"] || parsed.gas_usage || parsed["Gas Usage"];
              
              // Look for invoice review period to determine days
              const invoiceReviewPeriod = parsed.invoice_review_period || parsed["Invoice Review Period"];
              let numberOfDays = 30; // default fallback
              
              if (invoiceReviewPeriod) {
                console.log('Found gas invoice review period:', invoiceReviewPeriod);
                const daysMatch = invoiceReviewPeriod.match(/(\d+)\s*days?/i);
                if (daysMatch) {
                  numberOfDays = parseInt(daysMatch[1]);
                }
              }
              
              if (energyChargeQty) {
                console.log(`Found gas usage: ${energyChargeQty} MJ over ${numberOfDays} days`);
                
                const dailyUsage = parseFloat(energyChargeQty) / numberOfDays;
                const annualUsage = dailyUsage * 365;
                
                console.log(`Daily gas usage: ${dailyUsage.toFixed(2)} MJ/day`);
                console.log(`Annual gas usage: ${annualUsage.toFixed(0)} MJ/year`);
                
                return {
                  yearlyPeakEst: '0', // Gas doesn't have peak/off-peak
                  yearlyShoulderEst: '0',
                  yearlyOffPeakEst: '0',
                  yearlyConsumptionEst: Math.round(annualUsage).toString()
                };
              }
            } catch (e) {
              console.log('Error parsing gas data:', e);
            }
          }
        }
      }
      
      // Fallback for gas
      return {
        yearlyPeakEst: '0',
        yearlyShoulderEst: '0',
        yearlyOffPeakEst: '0',
        yearlyConsumptionEst: '50000' // Default MJ consumption
      };
    }
    
    // For waste/oil utilities, simple calculation
    if (utility === 'waste' || utility === 'oil') {
      // Look for volume/quantity fields in utility data
      if (utilityResult) {
        for (const [key, value] of Object.entries(utilityResult)) {
          if (typeof value === 'object' && value !== null) {
            try {
              const parsed = typeof value === 'string' ? JSON.parse(value) : value;
              
              const volumeFields = ['volume', 'quantity', 'amount', 'usage'];
              for (const field of volumeFields) {
                if (parsed[field]) {
                  const volume = parseFloat(parsed[field]);
                  if (!isNaN(volume)) {
                    return {
                      yearlyPeakEst: '0',
                      yearlyShoulderEst: '0', 
                      yearlyOffPeakEst: '0',
                      yearlyConsumptionEst: Math.round(volume * 12).toString() // Assume monthly to annual
                    };
                  }
                }
              }
            } catch (e) {
              console.log('Error parsing waste/oil data:', e);
            }
          }
        }
      }
      
      // Fallback values
      const defaultConsumption = utility === 'waste' ? '240' : '5000'; // tonnes/litres
      return {
        yearlyPeakEst: '0',
        yearlyShoulderEst: '0',
        yearlyOffPeakEst: '0',
        yearlyConsumptionEst: defaultConsumption
      };
    }
    
    // For electricity utilities, use the existing logic
    return calculateYearlyEstimates();
  };

  // decode businessInfo once
  useEffect(() => {
    try {
      if (businessInfoRaw) {
        setBusinessInfo(JSON.parse(decodeURIComponent(businessInfoRaw)));
      }
    } catch (err) {
      console.error("Failed to parse business info:", err);
    }
  }, [businessInfoRaw]);

  // fetch utility info AND interval data once businessInfo is ready
  useEffect(() => {
    if (!businessInfo || !businessInfo.business_name || !utility || !identifier) {
      return;
    }

    async function fetchUtilityInfo() {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/get-utility-information`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            business_name: businessInfo.business_name,
            service_type: utility,
            identifier: identifier,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail || data)
          );
        }
        setUtilityResult(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    async function fetchIntervalDataBackground() {
      // Only fetch for CI utilities
      if (utility !== "electricity_ci" && utility !== "gas_ci") {
        return;
      }

      setIntervalLoading(true);
      setIntervalError(null);
      
      try {
        console.log('Background fetching interval data for identifier:', identifier);
        
        const response = await fetch('https://membersaces.app.n8n.cloud/webhook/return_interval_data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_identifier: identifier
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Background interval data response:', data);
        console.log('Background interval data response type:', typeof data);
        console.log('Background interval data response keys:', Object.keys(data));
        
        setIntervalData(data);
      } catch (error) {
        console.error('Error fetching background interval data:', error);
        setIntervalError(error instanceof Error ? error.message : 'Failed to fetch interval data');
      } finally {
        setIntervalLoading(false);
      }
    }

    // Fetch both utility and interval data
    fetchUtilityInfo();
    fetchIntervalDataBackground();
  }, [businessInfo, utility, identifier, token]);

  const handleBusinessChange = (key: string, value: string) => {
    setBusinessInfo({ ...businessInfo, [key]: value });
  };

  const handleUtilityChange = (key: string, value: string | object) => {
    setUtilityResult({ ...utilityResult, [key]: value });
  };

  // Helper to get utility type display name
  const getUtilityDisplayName = () => {
    const utilityMap = {
      'electricity_ci': 'NMI',
      'electricity_sme': 'NMI', 
      'gas_ci': 'MRIN',
      'gas_sme': 'MRIN',
      'waste': 'Account',
      'oil': 'Account'
    };
    return utilityMap[utility as keyof typeof utilityMap] || 'ID';
  };

  // Filter out user_email from utility results
  const filteredUtilityResult = Object.fromEntries(
    Object.entries(utilityResult).filter(([key]) => !key.toLowerCase().includes('user_email'))
  );

  // Helper to find invoice link from utility data
  const getInvoiceLink = () => {
    // Look for invoice_link in the filtered utility data
    if (filteredUtilityResult.invoice_link) {
      return filteredUtilityResult.invoice_link;
    }
    
    // Look for nested invoice link in complex objects
    for (const [key, value] of Object.entries(filteredUtilityResult)) {
      if (typeof value === 'object' && value !== null) {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          if (parsed.invoice_link) {
            return parsed.invoice_link;
          }
        } catch (e) {
          // Not JSON, skip
        }
      }
    }
    
    return null;
  };

  const getCurrentRetailerFromUtility = (utilityData: Record<string, any>) => {
    if (!utilityData || typeof utilityData !== 'object') return "";
    
    for (const [key, value] of Object.entries(utilityData)) {
      if (typeof value === 'object' && value !== null) {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          const retailerFields = [
            'current_retailer', 'retailer', 'retailer_name', 'current_frmp',
            'frmp', 'electricity_retailer', 'gas_retailer', 'supplier', 'provider'
          ];
          
          for (const field of retailerFields) {
            if (parsed[field] && typeof parsed[field] === 'string' && parsed[field].trim() !== '') {
              return parsed[field].trim();
            }
          }
        } catch (e) {
          // Skip if not parseable
        }
      }
    }
    return "";
  };

  // Helper to get interval data file link
  const getIntervalDataLink = () => {
    if (intervalData && Array.isArray(intervalData) && intervalData.length > 0) {
      const fileId = intervalData[0]["Interval Data File ID"];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/view`;
      }
    }
    return null;
  };

  // Helper functions for formatting
  const formatCurrency = (value: string) => {
    if (!value || value === "-") return "-";
    const num = parseFloat(value);
    return isNaN(num) ? value : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: string) => {
    if (!value || value === "-") return "-";
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toLocaleString('en-US');
  };

  const formatLabel = (key: string) => {
    return key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  // Function to fetch interval data
  const fetchIntervalData = async () => {
    if (!identifier) {
      setIntervalError('No identifier available');
      return;
    }

    setIntervalLoading(true);
    setIntervalError(null);
    
    try {
      console.log('Fetching interval data for identifier:', identifier);
      
      const response = await fetch('https://membersaces.app.n8n.cloud/webhook/return_interval_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_identifier: identifier
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Interval data response:', data);
      console.log('Interval data response type:', typeof data);
      console.log('Interval data response keys:', Object.keys(data));
      
      setIntervalData(data);
    } catch (error) {
      console.error('Error fetching interval data:', error);
      setIntervalError(error instanceof Error ? error.message : 'Failed to fetch interval data');
    } finally {
      setIntervalLoading(false);
    }
  };

  // Calculate yearly estimates from interval data or invoice data
  const calculateYearlyEstimates = () => {
    console.log('=== Calculating Yearly Estimates ===');
    
    // First try to use interval data if available
    if (intervalData && Array.isArray(intervalData) && intervalData.length > 0) {
      const latestData = intervalData[0];
      console.log('Using interval data:', latestData);
      
      if (latestData["Total kWh"]) {
        const totalKwh = parseFloat(latestData["Total kWh"]);
        
        // Try to get peak/off-peak splits from invoice data
        let peakPercent = 0.6; // default fallback
        let shoulderPercent = 0.0; // default fallback  
        let offPeakPercent = 0.4; // default fallback
        
        // Look for usage splits in utility result
        if (utilityResult) {
          for (const [key, value] of Object.entries(utilityResult)) {
            if (typeof value === 'object' && value !== null) {
              try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                
                // Look for peak/off-peak quantities in invoice
                const peakQty = parsed.retail_quantity_peak_kwh || parsed.peak_kwh || parsed["Peak kWh"];
                const shoulderQty = parsed.retail_quantity_shoulder_kwh || parsed.shoulder_kwh || parsed["Shoulder kWh"] || 0;
                const offPeakQty = parsed.retail_quantity_off_peak_kwh || parsed.off_peak_kwh || parsed["Off Peak kWh"];
                
                if (peakQty && offPeakQty) {
                  const total = parseFloat(peakQty) + parseFloat(shoulderQty || 0) + parseFloat(offPeakQty);
                  if (total > 0) {
                    peakPercent = parseFloat(peakQty) / total;
                    shoulderPercent = parseFloat(shoulderQty || 0) / total;
                    offPeakPercent = parseFloat(offPeakQty) / total;
                    console.log('Found invoice splits:', { peakPercent, shoulderPercent, offPeakPercent });
                  }
                }
              } catch (e) {
                // Skip if not parseable
              }
            }
          }
        }
        
        const result = {
          yearlyPeakEst: Math.round(totalKwh * peakPercent).toString(),
          yearlyShoulderEst: Math.round(totalKwh * shoulderPercent).toString(),
          yearlyOffPeakEst: Math.round(totalKwh * offPeakPercent).toString(),
          yearlyConsumptionEst: Math.round(totalKwh).toString()
        };
        console.log('Interval data result:', result);
        return result;
      }
    }
    
    // Fallback to invoice data extrapolation
    console.log('Using invoice data extrapolation');
    console.log('Available utility data:', utilityResult);
    
    if (utilityResult) {
      for (const [key, value] of Object.entries(utilityResult)) {
        console.log(`Checking key: ${key}`, value);
        
        if (typeof value === 'object' && value !== null) {
          try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            console.log('Parsed object:', parsed);
            
            // Look for invoice review period to determine days
            const invoiceReviewPeriod = parsed.invoice_review_period || parsed["Invoice Review Period"];
            let numberOfDays = 30; // default fallback
            
            if (invoiceReviewPeriod) {
              console.log('Found invoice review period:', invoiceReviewPeriod);
              
              // Try to extract number of days from period string
              // Examples: "30/07/2022- 30/08/2022 31 Days", "01/06/2022 - 30/06/2022 (30 days)"
              const daysMatch = invoiceReviewPeriod.match(/(\d+)\s*days?/i);
              if (daysMatch) {
                numberOfDays = parseInt(daysMatch[1]);
                console.log('Extracted days from period:', numberOfDays);
              } else {
                // Try to calculate from date range if no explicit days mentioned
                const dateMatches = invoiceReviewPeriod.match(/(\d{2}\/\d{2}\/\d{4})/g);
                if (dateMatches && dateMatches.length >= 2) {
                  try {
                    const startDate = new Date(dateMatches[0].split('/').reverse().join('-'));
                    const endDate = new Date(dateMatches[1].split('/').reverse().join('-'));
                    const timeDiff = endDate.getTime() - startDate.getTime();
                    numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
                    console.log('Calculated days from date range:', numberOfDays);
                  } catch (e) {
                    console.log('Could not parse dates, using default 30 days');
                  }
                }
              }
            }
            
            // Look for usage amount
            const usageAmount = parsed.monthly_usage || parsed["Monthly Usage"] || parsed.usage_kwh || parsed["Usage kWh"] || parsed.total_kwh || parsed["Total kWh"];
            
            if (usageAmount) {
              console.log(`Found usage: ${usageAmount} kWh over ${numberOfDays} days`);
              
              const dailyUsage = parseFloat(usageAmount) / numberOfDays;
              const annualUsage = dailyUsage * 365;
              
              console.log(`Daily usage: ${dailyUsage.toFixed(2)} kWh/day`);
              console.log(`Annual usage: ${annualUsage.toFixed(0)} kWh/year`);
              
              // Look for peak/off-peak splits
              const peakQty = parsed.retail_quantity_peak_kwh || parsed.peak_kwh || parsed["Peak kWh"];
              const shoulderQty = parsed.retail_quantity_shoulder_kwh || parsed.shoulder_kwh || parsed["Shoulder kWh"] || 0;
              const offPeakQty = parsed.retail_quantity_off_peak_kwh || parsed.off_peak_kwh || parsed["Off Peak kWh"];
              
              let annualPeak, annualShoulder, annualOffPeak;
              
              if (peakQty && offPeakQty) {
                // Use actual splits if available - also convert to daily then annual
                const dailyPeak = parseFloat(peakQty) / numberOfDays;
                const dailyShoulder = parseFloat(shoulderQty || 0) / numberOfDays;
                const dailyOffPeak = parseFloat(offPeakQty) / numberOfDays;
                
                annualPeak = dailyPeak * 365;
                annualShoulder = dailyShoulder * 365;
                annualOffPeak = dailyOffPeak * 365;
                
                console.log('Using actual splits converted to daily then annual:', { 
                  dailyPeak: dailyPeak.toFixed(2), 
                  dailyShoulder: dailyShoulder.toFixed(2), 
                  dailyOffPeak: dailyOffPeak.toFixed(2),
                  annualPeak: annualPeak.toFixed(0),
                  annualShoulder: annualShoulder.toFixed(0),
                  annualOffPeak: annualOffPeak.toFixed(0)
                });
              } else {
                // Use percentage splits if no actual splits found
                annualPeak = annualUsage * 0.6;
                annualShoulder = 0;
                annualOffPeak = annualUsage * 0.4;
                console.log('Using percentage splits (60/40) on annual usage');
              }
              
              const result = {
                yearlyPeakEst: Math.round(annualPeak).toString(),
                yearlyShoulderEst: Math.round(annualShoulder).toString(),
                yearlyOffPeakEst: Math.round(annualOffPeak).toString(),
                yearlyConsumptionEst: Math.round(annualUsage).toString()
              };
              console.log('Invoice extrapolation result:', result);
              return result;
            }
          } catch (e) {
            console.log('Error parsing:', e);
          }
        }
      }
    }
    
    // Final fallback to default values
    console.log('Using fallback default values');
    return {
      yearlyPeakEst: '381091',
      yearlyShoulderEst: '0',
      yearlyOffPeakEst: '246974',
      yearlyConsumptionEst: '628065'
    };
  };

  // Update quote details when interval data or utility data changes
  useEffect(() => {
    if ((intervalData || Object.keys(utilityResult).length > 0) && !loading) {
      const estimates = calculateYearlyEstimatesForUtility();
      setQuoteDetails(prev => {
        // Only update if values actually changed to prevent infinite loop
        if (prev.yearlyPeakEst !== estimates.yearlyPeakEst || 
            prev.yearlyShoulderEst !== estimates.yearlyShoulderEst ||
            prev.yearlyOffPeakEst !== estimates.yearlyOffPeakEst ||
            prev.yearlyConsumptionEst !== estimates.yearlyConsumptionEst) {
          return {
            ...prev,
            ...estimates
          };
        }
        return prev;
      });
    }
  }, [intervalData, utilityResult, loading]);

  const handleQuoteDetailsChange = (key: string, value: string) => {
    setQuoteDetails({ ...quoteDetails, [key]: value });
  };

  // Handle send quote request
  const handleSendQuoteRequest = () => {
    console.log('Business Info for modal:', businessInfo);
    setShowSummaryModal(true);
  };

  const getUtilityTypeIdentifier = (utilityType: string) => {
    switch (utilityType) {
      case 'electricity_ci': return 'C&I Electricity';
      case 'electricity_sme': return 'SME Electricity';
      case 'gas_ci': return 'C&I Gas';
      case 'gas_sme': return 'SME Gas';
      case 'waste': return 'Waste';
      case 'oil': return 'Oil';
      default: return utilityType;
    }
  };
  
  const getRetailerTypeIdentifier = (retailers: string[]) => {
    const hasCI = retailers.some(r => r.includes('C&I'));
    const hasSME = retailers.some(r => r.includes('SME'));
    if (hasCI && hasSME) return 'Mixed C&I & SME';
    if (hasCI) return 'C&I Only';
    if (hasSME) return 'SME Only';
    return 'Other';
  };

  // Updated showSuccessModal function
  const showSuccessModal = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModalState(true);
  };


  const getQuoteDetails = (quoteType: string) => {
    switch (quoteType) {
      case '3_year_stepped': return '3 Year Stepped Contract';
      case '2_year_fixed': return '2 Year Fixed Contract';
      case '1_year_fixed': return '1 Year Fixed Contract';
      case 'flexible': return 'Flexible Contract Options';
      default: return quoteType;
    }
  };

  // Handle actual quote request submission
  const handleSubmitQuoteRequest = async () => {
    try {
      console.log('Session:', session);
      console.log('User:', session?.user);
  
      setLoading(true);
      
      // Validate retailer selection
      if (selectedRetailers.length === 0) {
        alert('Please select at least one retailer to send quote requests to.');
        return;
      }
  
      // Prepare the data payload matching the backend API structure
      const payload = {
        selected_retailers: selectedRetailers,
        business_name: businessInfo.business_name || '',
        trading_as: businessInfo.trading_name || '',
        abn: businessInfo.abn || '',
        site_address: businessInfo.site_address || '',
        client_name: businessInfo.contact_name || '',
        client_number: businessInfo.telephone || '',
        client_email: businessInfo.email || '',
        current_retailer: getCurrentRetailerFromUtility(utilityResult) || '',
        nmi: utility === 'electricity_ci' || utility === 'electricity_sme' ? identifier : undefined,
        mrin: utility === 'gas_ci' || utility === 'gas_sme' ? identifier : undefined,
        utility_type: utility || '',
        quote_type: quoteDetails.quoteType || '',
        commission: quoteDetails.commission || '0',
        start_date: quoteDetails.startDate || '',
        offer_due: quoteDetails.offerDue || '',
        yearly_peak_est: parseInt(quoteDetails.yearlyPeakEst) || 0,
        yearly_shoulder_est: parseInt(quoteDetails.yearlyShoulderEst) || 0,
        yearly_off_peak_est: parseInt(quoteDetails.yearlyOffPeakEst) || 0,
        yearly_consumption_est: parseInt(quoteDetails.yearlyConsumptionEst) || 0,
        loa_file_id: businessInfo.loaLink ? extractFileId(businessInfo.loaLink) : undefined,
        invoice_file_id: getInvoiceLink() ? extractFileId(getInvoiceLink()) : undefined,
        interval_data_file_id: getIntervalDataLink() ? extractFileId(getIntervalDataLink()) : undefined,
        utility_type_identifier: getUtilityTypeIdentifier(utility || ''),
        retailer_type_identifier: getRetailerTypeIdentifier(selectedRetailers),
        quote_details: getQuoteDetails(quoteDetails.quoteType || '')
      };
  
      console.log('Sending quote request payload:', payload);
  
      // Send to backend
      const response = await fetch(`${getApiBaseUrl()}/api/send-quote-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send quote request');
      }
  
      // The backend now returns a formatted string response like the data request tool
      const result = await response.json();
      
      console.log('Quote request result:', result);
      
      // Check if we got a formatted string response or the old JSON format
      let successMessage = '';
      
      if (typeof result === 'string') {
        // New format - formatted string like data request tool
        successMessage = result;
      } else if (result.message || result.success) {
        // Old format - JSON object (fallback)
        const requestId = result.quote_request_id || result.request_id || `QR_${Date.now()}`;
        successMessage = `Quote request sent successfully!\n\nRequest ID: ${requestId}\n\nRetailers contacted: ${selectedRetailers.join(', ')}\n\nEstimated response time: 3-5 business days`;
      } else {
        // Unexpected format
        successMessage = `Quote request sent successfully to ${selectedRetailers.length} retailers: ${selectedRetailers.join(', ')}`;
      }
      
      // Create a styled success modal instead of basic alert
      showSuccessModal(successMessage);
      
      // Close the summary modal
      setShowSummaryModal(false);
      
    } catch (error) {
      console.error('Error sending quote request:', error);
    
      const errorMessage =
        error instanceof Error ? error.message : String(error);
    
      if (errorMessage.includes('✅') || errorMessage.includes('❌')) {
        // This is actually a formatted response, treat as success/info
        showSuccessModal(errorMessage);
        setShowSummaryModal(false);
      } else {
        // This is a real error
        alert(`Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };
  

  // Helper function to extract Google Drive file ID
  const extractFileId = (url: string | null): string | undefined => {
    if (!url) return undefined;
    const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : undefined;
  };

  // Get attachment status
  const getAttachmentStatus = () => {
    const hasLOA = !!businessInfo.loaLink;
    const hasInvoice = !!getInvoiceLink();
    const hasIntervalData = !!getIntervalDataLink();
    
    return {
      hasLOA,
      hasInvoice,
      hasIntervalData,
      attachmentSummary: [
        hasLOA ? "Letter of Authority" : null,
        hasInvoice ? "Recent Invoice" : null,
        hasIntervalData ? "Interval Data" : null
      ].filter(Boolean).join(", ") || "No attachments"
    };
  };

  // Handle interval data section toggle
  const handleIntervalDataToggle = () => {
    setShowIntervalData(!showIntervalData);
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-red-600 text-center">Error: {error}</div>;

  console.log('Debug - utility:', utility, 'identifier:', identifier, 'showUtilityInfo:', showUtilityInfo, 'showBusinessInfo:', showBusinessInfo);
  console.log('Debug - filteredUtilityResult:', filteredUtilityResult);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h1 className="text-3xl font-bold text-gray-900">Supplier Quote Request</h1>
          </div>

          {/* Business Information */}
          {businessInfo && Object.keys(businessInfo).length > 0 && (
            <div className="border-b bg-gray-50">
              <button
                onClick={() => setShowBusinessInfo(!showBusinessInfo)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  Business Information for - {businessInfo.business_name || 'Unknown Business'}
                </h2>
                <span className="text-gray-500 text-2xl font-bold">
                  {showBusinessInfo ? '−' : '+'}
                </span>
              </button>
              {showBusinessInfo && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(businessInfo)
                      .filter(([key]) => 
                        key !== "googleDriveLink" && 
                        key !== "position" && 
                        key !== "retailers" && 
                        key !== "utilities" && 
                        key !== "loaLink" &&
                        !key.toLowerCase().includes('user')
                      )
                      .map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {formatLabel(key)}
                          </label>
                          <input
                            type="text"
                            value={typeof value === "object" ? JSON.stringify(value) : value || ""}
                            onChange={(e) => handleBusinessChange(key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Utility Information */}
          {filteredUtilityResult && Object.keys(filteredUtilityResult).length > 0 && (
            <div className="border-b">
              <button
                onClick={() => setShowUtilityInfo(!showUtilityInfo)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  Utility Analysis for {getUtilityDisplayName()}: {identifier || 'Unknown'}
                </h2>
                <span className="text-gray-500 text-2xl font-bold">
                  {showUtilityInfo ? '−' : '+'}
                </span>
              </button>
              
              {showUtilityInfo && (
                <div className="px-6 pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(filteredUtilityResult).map(([key, value]) => {
                      // Handle complex objects like invoice details
                      if (typeof value === 'object' && value !== null) {
                        try {
                          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                          return (
                            <div key={key} className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg">
                              <div className="text-sm font-medium text-gray-600 mb-3">
                                {formatLabel(key)}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(parsed)
                                  .filter(([subKey]) => subKey.toLowerCase() !== 'invoice_id')
                                  .map(([subKey, subValue]) => (
                                  <div key={subKey} className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-500 mb-1">
                                      {formatLabel(subKey)}
                                    </label>
                                    {subKey.toLowerCase().includes('link') || subKey.toLowerCase().includes('url') ? (
                                      <a
                                        href={String(subValue)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-sm font-medium break-all"
                                      >
                                        View Document
                                      </a>
                                    ) : (
                                      <input
                                        type="text"
                                        value={String(subValue || "")}
                                        onChange={(e) => {
                                          const updatedObject = { ...parsed, [subKey]: e.target.value };
                                          handleUtilityChange(key, updatedObject);
                                        }}
                                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } catch (e) {
                          // If it's not parseable JSON, treat as string
                          return (
                            <div key={key} className="bg-gray-50 p-4 rounded-lg">
                              <div className="text-sm font-medium text-gray-600 mb-1">
                                {formatLabel(key)}
                              </div>
                              <textarea
                                value={String(value)}
                                onChange={(e) => handleUtilityChange(key, e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          );
                        }
                      }
                      
                      // Handle simple string/number values
                      return (
                        <div key={key} className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 mb-1">
                            {formatLabel(key)}
                          </div>
                          <div className="text-lg font-semibold text-gray-900 mb-2">
                            {String(value)}
                          </div>
                          <input
                            type="text"
                            value={String(value || "")}
                            onChange={(e) => handleUtilityChange(key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interval Data Section */}
          {(utility === "electricity_ci" || utility === "gas_ci") && identifier && (
            <div className="border-b">
              <button
                onClick={handleIntervalDataToggle}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  Interval Data for {getUtilityDisplayName()}: {identifier}
                </h2>
                <span className="text-gray-500 text-2xl font-bold">
                  {showIntervalData ? '−' : '+'}
                </span>
              </button>
              
              {showIntervalData && (
                <div className="px-6 pb-6">
                  {intervalLoading && (
                    <div className="text-center py-8">
                      <div className="text-gray-600">Loading interval data...</div>
                    </div>
                  )}
                  
                  {intervalError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="text-red-800 font-medium">Error loading interval data:</div>
                      <div className="text-red-600 text-sm mt-1">{intervalError}</div>
                      <button
                        onClick={fetchIntervalData}
                        className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  
                  {intervalData && !intervalLoading && (
                    <div>
                      {/* Check if interval data is available */}
                      {Array.isArray(intervalData) && intervalData.length > 0 && 
                       intervalData[0]["Interval Data Period"] === "" && 
                       intervalData[0]["Interval Data ID"] === "" && 
                       intervalData[0]["Interval Data Link"] === "" ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="text-yellow-800 font-medium mb-2">
                            No Interval Data Found for this {getUtilityDisplayName()}
                          </div>
                          <div className="text-yellow-700 text-sm mb-3">
                            No interval data is currently available for {identifier}. You can lodge interval data on the document lodgement page.
                          </div>
                          <button 
                            onClick={() => window.open('/document-lodgement', '_blank')}
                            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                          >
                            Go to Document Lodgement
                          </button>
                        </div>
                      ) : Array.isArray(intervalData) && intervalData.length > 0 && intervalData[0]["Total kWh"] ? (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Interval Data Analysis</h3>
                          {intervalData.map((data, index) => (
                            <div key={index} className="bg-blue-50 p-4 rounded-lg mb-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">NMI/MRIN</div>
                                  <div className="text-lg font-semibold text-gray-900">
                                    {data.NMI || data["NMI / MRIN"] || identifier}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Period</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {data.Period || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Year</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {data.Year || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Total kWh</div>
                                  <div className="text-lg font-bold text-blue-900">
                                    {data["Total kWh"] ? formatNumber(data["Total kWh"]) : 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Highest Demand (kW)</div>
                                  <div className="text-lg font-bold text-green-900">
                                    {data["Highest Demand (kW)"] || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Peak Demand Period</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {data["Peak Demand Period"] ? new Date(data["Peak Demand Period"]).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Highest Demand (kVA)</div>
                                  <div className="text-lg font-bold text-purple-900">
                                    {data["Highest Demand (kVA)"] || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Peak Demand Period kVA</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {data["Peak Demand Period kVA"] ? new Date(data["Peak Demand Period kVA"]).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded md:col-span-1 lg:col-span-1">
                                  <div className="text-xs font-medium text-gray-500 mb-1">Data Analysis</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {data["Data Analysis"] || 'N/A'}
                                  </div>
                                </div>
                                {data["Interval Data File ID"] && (
                                  <div className="bg-white p-3 rounded">
                                    <div className="text-xs font-medium text-gray-500 mb-1">Interval Data File</div>
                                    <a
                                      href={`https://drive.google.com/file/d/${data["Interval Data File ID"]}/view`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline text-sm font-medium"
                                    >
                                      View Interval Data File
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Interval Data Results</h3>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(intervalData, null, 2)}
                            </pre>
                          </div>
                          <div className="mt-4 text-sm text-gray-600">
                            Unexpected data format - check console for detailed logs.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!intervalData && !intervalLoading && !intervalError && (
                    <div className="text-center py-8">
                      <div className="text-gray-600">Click to load interval data</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Attachments</h2>
            <div className="bg-white p-4 rounded-lg border">
              <ul className="space-y-2">
                {businessInfo.loaLink && (
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <a 
                      href={businessInfo.loaLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Letter of Authority (PDF)
                    </a>
                  </li>
                )}
                {!businessInfo.loaLink && (
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    Letter of Authority (PDF)
                  </li>
                )}
                {getInvoiceLink() && (
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <a 
                      href={getInvoiceLink()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Recent Invoice
                    </a>
                  </li>
                )}
                {getIntervalDataLink() && (
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <a 
                      href={getIntervalDataLink() || undefined} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Interval Data File
                    </a>
                  </li>
                )}
                {utility === "electricity_ci" || utility === "gas_ci" ? (
                  !getIntervalDataLink() && (
                    <li className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      Interval Data
                    </li>
                  )
                ) : !getInvoiceLink() && (
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    Recent Invoice
                  </li>
                )}
              </ul>
            </div>
          </div>
          
          {/* Retailer Selection */}
          <div className="p-6 border-b bg-blue-50">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Retailers for Quote Requests</h2>
            <p className="text-gray-600 mb-4">
              Choose which retailers you want to send quote requests to. At least one retailer must be selected.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The "Test" retailer sends quote requests to <code className="bg-yellow-100 px-1 rounded">data.quote@fornrg.com</code> for testing purposes. 
                Use this option to test the system without sending live requests to actual retailers.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getAvailableRetailers().map((retailer) => (
                <label key={retailer} className={`flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer ${
                  retailer === 'Test' 
                    ? 'bg-yellow-50 border-yellow-300' 
                    : 'bg-white border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedRetailers.includes(retailer)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRetailers([...selectedRetailers, retailer]);
                      } else {
                        setSelectedRetailers(selectedRetailers.filter(r => r !== retailer));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      retailer === 'Test' ? 'text-yellow-800' : 'text-gray-900'
                    }`}>
                      {retailer}
                    </span>
                    {retailer === 'Test' && (
                      <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded-full font-medium">
                        TEST
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
            
            {selectedRetailers.length === 0 && (
              <div className="mt-3 text-sm text-red-600">
                Please select at least one retailer to send quote requests to.
              </div>
            )}
          </div>

          {/* Quote Details - Dynamic Section */}
          {renderQuoteDetailsSection()}

          {/* Next Steps */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-4">
                Review and adjust the information above. When ready, click below to send your quote request to suppliers.
              </p>
              <button 
                onClick={handleSendQuoteRequest}
                disabled={selectedRetailers.length === 0}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {selectedRetailers.length === 0 ? 'Select Retailers First' : 'Send Quote Request'}
              </button>
            </div>
          </div>

          {/* Summary Modal */}
          {showSummaryModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Quote Request Summary</h2>
                    <button
                      onClick={() => setShowSummaryModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Business Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Business Name:</span>
                        <div className="text-gray-900">{businessInfo.business_name || 'Not specified'}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Site Address:</span>
                        <div className="text-gray-900">
                          {businessInfo.site_address || businessInfo.address || businessInfo.business_address || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Contact Person:</span>
                        <div className="text-gray-900">
                          {businessInfo.contact_name || businessInfo.contact_person || businessInfo.primary_contact || businessInfo.contact || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Phone:</span>
                        <div className="text-gray-900">
                          {businessInfo.telephone || businessInfo.phone || businessInfo.phone_number || businessInfo.contact_phone || businessInfo.mobile || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Email:</span>
                        <div className="text-gray-900">
                          {businessInfo.email || businessInfo.contact_email || businessInfo.business_email || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">ABN:</span>
                        <div className="text-gray-900">
                          {businessInfo.abn || businessInfo.business_abn || businessInfo.abn_number || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Trading Name:</span>
                        <div className="text-gray-900">
                          {businessInfo.trading_name || businessInfo.trade_name || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Postal Address:</span>
                        <div className="text-gray-900">
                          {businessInfo.postal_address || businessInfo.mailing_address || 'Not specified'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Utility Information */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Utility Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">{getUtilityDisplayName()}:</span>
                        <div className="text-gray-900 font-mono">{identifier || 'Not specified'}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Utility Type:</span>
                        <div className="text-gray-900 capitalize">{utility?.replace('_', ' ') || 'Not specified'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Selected Retailers */}
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Selected Retailers</h3>
                    <div className="space-y-2">
                      {selectedRetailers.length > 0 ? (
                        selectedRetailers.map((retailer, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="text-sm font-medium text-gray-900">{retailer}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-red-600">No retailers selected</div>
                      )}
                    </div>
                  </div>

                  {/* Quote Details */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Quote Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Quote Type:</span>
                        <div className="text-gray-900">{quoteDetails.quoteType.replace('_', ' ') || 'Not selected'}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Commission:</span>
                        <div className="text-gray-900">{quoteDetails.commission || '0'}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Start Date:</span>
                        <div className="text-gray-900">{quoteDetails.startDate || 'Not specified'}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Offer Due:</span>
                        <div className="text-gray-900">{quoteDetails.offerDue || 'Not specified'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Annual Usage Estimates */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Annual Usage Estimates</h3>
                    {showUsageBreakdown() ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-gray-600">Peak</div>
                          <div className="text-lg font-bold text-blue-900">
                            {quoteDetails.yearlyPeakEst ? formatNumber(quoteDetails.yearlyPeakEst) : '0'} {getConsumptionUnit()}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-600">Shoulder</div>
                          <div className="text-lg font-bold text-green-900">
                            {quoteDetails.yearlyShoulderEst ? formatNumber(quoteDetails.yearlyShoulderEst) : '0'} {getConsumptionUnit()}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-600">Off-Peak</div>
                          <div className="text-lg font-bold text-purple-900">
                            {quoteDetails.yearlyOffPeakEst ? formatNumber(quoteDetails.yearlyOffPeakEst) : '0'} {getConsumptionUnit()}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-600">Total</div>
                          <div className="text-xl font-bold text-red-900">
                            {quoteDetails.yearlyConsumptionEst ? formatNumber(quoteDetails.yearlyConsumptionEst) : '0'} {getConsumptionUnit()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="font-medium text-gray-600 mb-2">
                          {utility === 'waste' ? 'Annual Volume' : 
                           utility === 'oil' ? 'Annual Usage' : 
                           'Annual Consumption'}
                        </div>
                        <div className="text-xl font-bold text-blue-900">
                          {quoteDetails.yearlyConsumptionEst ? formatNumber(quoteDetails.yearlyConsumptionEst) : '0'} {getConsumptionUnit()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attachments Status */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Attachments</h3>
                    <div className="space-y-2">
                      {(() => {
                        const status = getAttachmentStatus();
                        return (
                          <>
                            <div className="flex items-center space-x-2">
                              <span className={`w-3 h-3 rounded-full ${status.hasLOA ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <span className="text-sm">Letter of Authority</span>
                              <span className="text-xs text-gray-500">
                                {status.hasLOA ? '✓ Attached' : '✗ Missing'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`w-3 h-3 rounded-full ${status.hasInvoice ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <span className="text-sm">Recent Invoice</span>
                              <span className="text-xs text-gray-500">
                                {status.hasInvoice ? '✓ Attached' : '✗ Missing'}
                              </span>
                            </div>
                            {(utility === "electricity_ci" || utility === "gas_ci") && (
                              <div className="flex items-center space-x-2">
                                <span className={`w-3 h-3 rounded-full ${status.hasIntervalData ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                <span className="text-sm">Interval Data</span>
                                <span className="text-xs text-gray-500">
                                  {status.hasIntervalData ? '✓ Available' : '⚠ Optional'}
                                </span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex space-x-3">
                  <button
                    onClick={() => setShowSummaryModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Review & Edit
                  </button>
                  <button
                    onClick={handleSubmitQuoteRequest}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Confirm & Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Success Modal */}
          {showSuccessModalState && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Quote Request Sent Successfully!</h2>
                    </div>
                    <button
                      onClick={() => setShowSuccessModalState(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-medium">
                      {successMessage}
                    </pre>
                  </div>
                  
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Retailers will review your quote request</li>
                      <li>• You should receive quotes within 3-5 business days</li>
                      <li>• Quotes will be sent directly to your email address</li>
                      <li>• You can compare offers and choose the best option</li>
                    </ul>
                  </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex space-x-3">
                  <button
                    onClick={() => setShowSuccessModalState(false)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccessModalState(false);
                      window.location.href = '/dashboard';
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}