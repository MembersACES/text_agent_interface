import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from 'react-markdown';

interface ExtraField {
  name: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
}

interface InfoToolPageProps {
  title: string;
  description: string;
  endpoint: string;
  extraFields?: ExtraField[];
  isFileUpload?: boolean;
  secondaryField?: { name: string; label: string };
  initialBusinessName?: string;
  initialSecondaryValue?: string;
  autoSubmit?: boolean;
  formRef?: React.RefObject<HTMLFormElement>;
  initialExtraFields?: { [key: string]: any };
}

interface DemandResponseData {
  demandCapacityInvoice: string;
  demandCapacityUnit: string;
  demandCapacityRate: string;
  highestDemandKW: string;
  peakDemandPeriod: string;
  highestDemandKVA: string;
  peakDemandPeriodKVA: string;
  notes: string;
  invoiceLink: string;
  intervalDataLink: string;
  siteAddress: string;
  nmi: string;
  invoiceNumber: string;
}

interface DMAData {
  meteringRate: string;
  meteringCost: string;
  meteringDays: string;
  meteringCostType: 'daily' | 'annual';
  dmaPrice: string;
  vasPrice: string;
  startDate: string;
  periodYears: string;
  endDate: string;
  notes: string;
  invoiceLink: string;
  siteAddress: string;
  nmi: string;
  invoiceNumber: string;
}

function DemandResponseModal({ 
  isOpen, 
  onClose, 
  invoiceData, 
  intervalData, 
  comparisons,
  session,
  token
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  invoiceData: any; 
  intervalData: any; 
  comparisons: any[];
  session: any;
  token: string;
}) {
  const [formData, setFormData] = useState<DemandResponseData>({
    demandCapacityInvoice: '',
    demandCapacityUnit: 'kW',
    notes: '', 
    demandCapacityRate: '',
    highestDemandKW: '',
    peakDemandPeriod: '',
    highestDemandKVA: '',
    peakDemandPeriodKVA: '',
    invoiceLink: '',
    intervalDataLink: '',
    siteAddress: '',
    nmi: '',
    invoiceNumber: ''
  });

  const [sending, setSending] = useState(false);

  // Populate form data when modal opens
  useEffect(() => {
    if (isOpen && invoiceData && intervalData) {
      const invoiceDetails = invoiceData?.electricity_ci_invoice_details || 
                            invoiceData?.electricity_sme_invoice_details;
      const latestInterval = Array.isArray(intervalData) && intervalData.length > 0 ? intervalData[0] : null;
  
      // Add logging to see what's in the invoice details
      console.log('Full invoiceData:', invoiceData);
      console.log('Extracted invoiceDetails:', invoiceDetails);
      console.log('Invoice Number from details:', invoiceDetails?.invoice_number);
      console.log('Invoice ID from details:', invoiceDetails?.invoice_id);
      console.log('All available invoice detail keys:', invoiceDetails ? Object.keys(invoiceDetails) : 'No invoice details');
  
      setFormData({
        demandCapacityInvoice: invoiceDetails?.demand_capacity || '',
        demandCapacityUnit: 'kW',
        highestDemandKW: latestInterval?.["Highest Demand (kW)"] || '',
        demandCapacityRate: '',
        notes: '', 
        peakDemandPeriod: latestInterval?.["Peak Demand Period"] ? new Date(latestInterval["Peak Demand Period"]).toLocaleDateString() : '',
        highestDemandKVA: latestInterval?.["Highest Demand (kVA)"] || '',
        peakDemandPeriodKVA: latestInterval?.["Peak Demand Period kVA"] ? new Date(latestInterval["Peak Demand Period kVA"]).toLocaleDateString() : '',
        invoiceLink: invoiceDetails?.invoice_link || '',
        intervalDataLink: latestInterval?.["Interval Data File ID"] ? `https://drive.google.com/file/d/${latestInterval["Interval Data File ID"]}/view` : '',
        siteAddress: invoiceDetails?.site_address || '',
        nmi: invoiceDetails?.nmi || '',
        invoiceNumber: invoiceDetails?.invoice_number || ''
      });
    }
  }, [isOpen, invoiceData, intervalData]);

  const handleInputChange = (field: keyof DemandResponseData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateTableHTML = () => {
    // Calculate costs
    const invoiceQuantity = parseFloat(formData.demandCapacityInvoice) || 0;
    const rate = parseFloat(formData.demandCapacityRate) || 0;
    const invoiceCost = (invoiceQuantity * rate).toFixed(2);
    
    // Get interval quantity based on invoice unit type
    const intervalQuantity = formData.demandCapacityUnit === 'kVA' 
      ? parseFloat(formData.highestDemandKVA) || 0
      : parseFloat(formData.highestDemandKW) || 0;
    const intervalCost = (intervalQuantity * rate).toFixed(2);
    
    // Calculate difference and determine if it's savings or cost increase
    const difference = parseFloat(invoiceCost) - parseFloat(intervalCost);
    const costLine = difference > 0 
      ? `Potential Savings: $${difference.toFixed(2)}`
      : `Cost Increase: $${Math.abs(difference).toFixed(2)}`;
    
    // Use the appropriate peak demand period based on invoice unit
    const peakPeriod = formData.demandCapacityUnit === 'kVA' 
      ? formData.peakDemandPeriodKVA 
      : formData.peakDemandPeriod;
    
    // Include notes as its own line if they exist
    const notesLine = formData.notes.trim() ? `\nNotes: ${formData.notes}` : '';
    
    return `DEMAND RESPONSE REVIEW
  
  BUSINESS DETAILS
  Site Address: ${formData.siteAddress}
  NMI: ${formData.nmi}
  
  DEMAND COST ANALYSIS
  Invoice Demand: ${formData.demandCapacityInvoice} ${formData.demandCapacityUnit} @ $${formData.demandCapacityRate}/${formData.demandCapacityUnit} = $${invoiceCost}
  Interval Demand: ${intervalQuantity} ${formData.demandCapacityUnit} @ $${formData.demandCapacityRate}/${formData.demandCapacityUnit} = $${intervalCost}
  ${costLine}
  Peak Demand Period: ${peakPeriod} (Interval Data)${notesLine}`;
  };

  const copyToClipboard = () => {
    const tableText = generateTableHTML();
    navigator.clipboard.writeText(tableText).then(() => {
      alert('Email-friendly table copied to clipboard! You can now paste this directly into Gmail.');
    });
  };

  const sendDemandResponseReview = async () => {
    setSending(true);
    try {
      const tableHTML = generateTableHTML();
      
      // Determine which demand values to send based on the selected unit
      const isKVA = formData.demandCapacityUnit === 'kVA';
      
      // Prepare the payload with user information and demand data
      const payload: any = {
        // User information from session
        user_email: session?.user?.email || '',
        user_name: session?.user?.name || '',
        user_id: session?.user?.id || '',
        
        // Existing demand response data
        site_address: formData.siteAddress,
        nmi: formData.nmi,
        table_html: tableHTML,
        notes: formData.notes,
        demand_capacity_invoice: formData.demandCapacityInvoice,
        demand_capacity_unit: formData.demandCapacityUnit,
        demand_capacity_rate: formData.demandCapacityRate,
        invoice_link: formData.invoiceLink,
        interval_data_link: formData.intervalDataLink,
        invoice_number: formData.invoiceNumber,
        
        // Timestamp for tracking
        timestamp: new Date().toISOString()
      };

      // Add the appropriate demand values based on unit type
      if (isKVA) {
        payload.highest_demand_kva = formData.highestDemandKVA;
        payload.peak_demand_period_kva = formData.peakDemandPeriodKVA;
        payload.highest_demand_kw = '';
        payload.peak_demand_period = '';
      } else {
        payload.highest_demand_kw = formData.highestDemandKW;
        payload.peak_demand_period = formData.peakDemandPeriod;
        payload.highest_demand_kva = '';
        payload.peak_demand_period_kva = '';
      }
      
      const response = await fetch('https://membersaces.app.n8n.cloud/webhook/generate-maximum-demand-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Demand Response Review sent successfully!');
        onClose();
      } else {
        throw new Error('Failed to send review');
      }
    } catch (error) {
      console.error('Error sending demand response review:', error);
      alert('Failed to send review. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 24,
        maxWidth: '95vw',
        width: '1200px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Demand Response Review</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Metric</th>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Value</th>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Unit & Source</th>
            </tr>
          </thead>
            <tbody>
            <tr>
              <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Site Address</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>
                <div style={{ padding: 4, fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {formData.siteAddress || 'N/A'}
                </div>
              </td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>Invoice</td>
            </tr>
            <tr>
              <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>NMI</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>
                <div style={{ padding: 4, fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {formData.nmi || 'N/A'}
                </div>
              </td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>Invoice</td>
            </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Invoice Link</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  {formData.invoiceLink ? (
                    <a 
                      href={formData.invoiceLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'underline' }}
                    >
                      View Invoice PDF
                    </a>
                  ) : (
                    <span style={{ color: '#6b7280' }}>No invoice link available</span>
                  )}
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Invoice</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Interval Data Link</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  {formData.intervalDataLink ? (
                    <a 
                      href={formData.intervalDataLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'underline' }}
                    >
                      View Interval Data File
                    </a>
                  ) : (
                    <span style={{ color: '#6b7280' }}>No interval data link available</span>
                  )}
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Interval Data</td>
              </tr>
              <tr style={{ backgroundColor: '#e6f3ff' }}>
                <td colSpan={3} style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600, textAlign: 'center' }}>
                  Demand Metrics
                </td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Demand Capacity</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="text"
                    value={formData.demandCapacityInvoice}
                    onChange={(e) => handleInputChange('demandCapacityInvoice', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder="N/A"
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <select
                    value={formData.demandCapacityUnit}
                    onChange={(e) => handleInputChange('demandCapacityUnit', e.target.value)}
                    style={{ padding: 4, border: '1px solid #ccc', borderRadius: 4, marginRight: 8 }}
                  >
                    <option value="kW">kW</option>
                    <option value="kVA">kVA</option>
                  </select>
                  (Invoice)
                </td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Demand Capacity Rate</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="text"
                    value={formData.demandCapacityRate}
                    onChange={(e) => handleInputChange('demandCapacityRate', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder="$/kW or $/kVA"
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>$ per unit (Invoice)</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Highest Demand</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="text"
                    value={formData.highestDemandKW}
                    onChange={(e) => handleInputChange('highestDemandKW', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder="N/A"
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>kW (Interval Data)</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Peak Demand Period</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="text"
                    value={formData.peakDemandPeriod}
                    onChange={(e) => handleInputChange('peakDemandPeriod', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder="N/A"
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Date (Interval Data)</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Highest Demand</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="text"
                    value={formData.highestDemandKVA}
                    onChange={(e) => handleInputChange('highestDemandKVA', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder="N/A"
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>kVA (Interval Data)</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Peak Demand Period</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="text"
                    value={formData.peakDemandPeriodKVA}
                    onChange={(e) => handleInputChange('peakDemandPeriodKVA', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder="N/A"
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Date kVA (Interval Data)</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Notes</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: 4, 
                      border: '1px solid #ccc', 
                      borderRadius: 4,
                      minHeight: '60px',
                      resize: 'vertical'
                    }}
                    placeholder="Optional notes..."
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Optional</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={copyToClipboard}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Copy for Gmail
        </button>
          <button
            onClick={sendDemandResponseReview}
            disabled={sending}
            style={{
              padding: '8px 16px',
              backgroundColor: sending ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: sending ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {sending ? 'Sending...' : 'Send Demand Response Review'}
          </button>
        </div>
        </div>
    </div>
  );
}

function DMAModal({ 
  isOpen, 
  onClose, 
  invoiceData, 
  session,
  token
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  invoiceData: any; 
  session: any;
  token: string;
}) {
  const [formData, setFormData] = useState<DMAData>({
    meteringRate: '',
    meteringCost: '',
    meteringDays: '',
    meteringCostType: 'daily',
    dmaPrice: '700',
    vasPrice: '200',
    startDate: new Date().toISOString().split('T')[0],
    periodYears: '5',
    endDate: '',
    notes: '',
    invoiceLink: '',
    siteAddress: '',
    nmi: '',
    invoiceNumber: ''
  });

  const [sending, setSending] = useState(false);

  // Calculate end date based on start date and period
  useEffect(() => {
    if (formData.startDate && formData.periodYears) {
      const startDate = new Date(formData.startDate);
      const years = parseInt(formData.periodYears);
      if (!isNaN(years)) {
        const endDate = new Date(startDate);
        endDate.setFullYear(startDate.getFullYear() + years);
        setFormData(prev => ({ 
          ...prev, 
          endDate: endDate.toISOString().split('T')[0] 
        }));
      }
    }
  }, [formData.startDate, formData.periodYears]);

  // Populate form data when modal opens
  useEffect(() => {
    if (isOpen && invoiceData) {
      const invoiceDetails = invoiceData?.electricity_ci_invoice_details;
      
      console.log('DMA Modal - Full invoiceData:', invoiceData);
      console.log('DMA Modal - Extracted invoiceDetails:', invoiceDetails);
      
      setFormData(prev => ({
        ...prev,
        meteringRate: invoiceDetails?.metering_rate || '',
        meteringCost: '',
        meteringDays: '',
        meteringCostType: 'daily',
        invoiceLink: invoiceDetails?.invoice_link || '',
        siteAddress: invoiceDetails?.site_address || '',
        nmi: invoiceDetails?.nmi || '',
        invoiceNumber: invoiceDetails?.invoice_number || ''
      }));
    }
  }, [isOpen, invoiceData]);

  const handleInputChange = (field: keyof (DMAData & { meteringCostType: 'daily' | 'annual' }), value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  // Calculate daily rate from annual cost or vice versa
  const getCalculatedDailyRate = (): number => {
    if (formData.meteringCostType === 'daily') {
      return parseFloat(formData.meteringRate) || 0;
    } else {
      // Calculate daily from annual
      const annualCost = parseFloat(formData.meteringRate) || 0;
      return annualCost / 365;
    }
  };

  const getCalculatedAnnualCost = (): number => {
    if (formData.meteringCostType === 'annual') {
      return parseFloat(formData.meteringRate) || 0;
    } else {
      // Calculate annual from daily
      const dailyRate = parseFloat(formData.meteringRate) || 0;
      return dailyRate * 365;
    }
  };

  const generateDMATableHTML = () => {
    const dmaPrice = parseFloat(formData.dmaPrice) || 0;
    const vasPrice = parseFloat(formData.vasPrice) || 0;
    const totalReplacementCost = dmaPrice + vasPrice;
    const currentAnnualCost = getCalculatedAnnualCost();
    const dailyRate = getCalculatedDailyRate();
    const annualSavings = currentAnnualCost - totalReplacementCost;
    const totalSavingsOverPeriod = annualSavings * (parseInt(formData.periodYears) || 0);
    
    const notesLine = formData.notes.trim() ? `\nNotes: ${formData.notes}` : '';
    
    return `DMA (DATA METERING ANALYSIS) REVIEW
  
  BUSINESS DETAILS
  Site Address: ${formData.siteAddress}
  NMI: ${formData.nmi}
  
  CURRENT METERING COSTS
  Current Metering Rate: $${dailyRate.toFixed(2)}/day
  Current Annual Cost: $${currentAnnualCost.toFixed(2)}
  
  PROPOSED DMA SOLUTION
  DMA Price: $${formData.dmaPrice}
  VAS Price: $${formData.vasPrice}
  Total Replacement Cost: $${totalReplacementCost.toFixed(2)}
  
  PROJECT TIMELINE
  Start Date: ${formData.startDate}
  Period: ${formData.periodYears} years
  End Date: ${formData.endDate}
  
  FINANCIAL ANALYSIS
  Annual Savings: $${annualSavings.toFixed(2)}
  Total Savings Over ${formData.periodYears} Years: $${totalSavingsOverPeriod.toFixed(2)}${notesLine}`;
  };

  const copyToClipboard = () => {
    const tableText = generateDMATableHTML();
    navigator.clipboard.writeText(tableText).then(() => {
      alert('DMA analysis copied to clipboard! You can now paste this directly into Gmail.');
    });
  };

  const sendDMAReview = async () => {
    setSending(true);
    try {
      const tableHTML = generateDMATableHTML();
      const dailyRate = getCalculatedDailyRate();
      const annualCost = getCalculatedAnnualCost();
      
      const payload = {
        // User information from session
        user_email: session?.user?.email || '',
        user_name: session?.user?.name || '',
        user_id: session?.user?.id || '',
        
        // DMA specific data
        site_address: formData.siteAddress,
        nmi: formData.nmi,
        table_html: tableHTML,
        notes: formData.notes,
        metering_rate: dailyRate.toFixed(2), // Always send as daily rate
        metering_rate_annual: annualCost.toFixed(2), // Also send annual for reference
        metering_cost_type: formData.meteringCostType,
        metering_cost: formData.meteringCost,
        metering_days: formData.meteringDays,
        dma_price: formData.dmaPrice,
        vas_price: formData.vasPrice,
        start_date: formData.startDate,
        period_years: formData.periodYears,
        end_date: formData.endDate,
        invoice_link: formData.invoiceLink,
        invoice_number: formData.invoiceNumber,
        
        // Timestamp for tracking
        timestamp: new Date().toISOString()
      };
      
      const response = await fetch('https://membersaces.app.n8n.cloud/webhook/generate-dma-comparaison-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('DMA Review sent successfully!');
        onClose();
      } else {
        throw new Error('Failed to send DMA review');
      }
    } catch (error) {
      console.error('Error sending DMA review:', error);
      alert('Failed to send DMA review. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const dailyRate = getCalculatedDailyRate();
  const annualCost = getCalculatedAnnualCost();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 24,
        maxWidth: '95vw',
        width: '1200px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>DMA (Data Metering Analysis) Review</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Field</th>
                <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Value</th>
                <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Site Address</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <div style={{ padding: 4, fontSize: 14, fontWeight: 600, color: '#111827' }}>
                    {formData.siteAddress || 'N/A'}
                  </div>
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Invoice</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>NMI</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <div style={{ padding: 4, fontSize: 14, fontWeight: 600, color: '#111827' }}>
                    {formData.nmi || 'N/A'}
                  </div>
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Invoice</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Invoice Link</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  {formData.invoiceLink ? (
                    <a 
                      href={formData.invoiceLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'underline' }}
                    >
                      View Invoice PDF
                    </a>
                  ) : (
                    <span style={{ color: '#6b7280' }}>No invoice link available</span>
                  )}
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Invoice</td>
              </tr>
              <tr style={{ backgroundColor: '#e6f3ff' }}>
                <td colSpan={3} style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600, textAlign: 'center' }}>
                  Current Metering Costs
                </td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Cost Type</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <select
                    value={formData.meteringCostType}
                    onChange={(e) => handleInputChange('meteringCostType', e.target.value as 'daily' | 'annual')}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                  >
                    <option value="daily">Daily Rate</option>
                    <option value="annual">Annual Cost</option>
                  </select>
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Cost Structure</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>
                  {formData.meteringCostType === 'daily' ? 'Metering Rate (Daily)' : 'Metering Cost (Annual)'}
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="text"
                    value={formData.meteringRate}
                    onChange={(e) => handleInputChange('meteringRate', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder={formData.meteringCostType === 'daily' ? '$/day' : '$/year'}
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  {formData.meteringCostType === 'daily' ? '$/day (Invoice)' : '$/year (Invoice)'}
                </td>
              </tr>
              {/* Show calculated values */}
              {formData.meteringRate && (
                <>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600, fontStyle: 'italic' }}>
                      Calculated Daily Rate
                    </td>
                    <td style={{ padding: 8, border: '1px solid #ddd', fontStyle: 'italic' }}>
                      ${dailyRate.toFixed(2)}
                    </td>
                    <td style={{ padding: 8, border: '1px solid #ddd', fontStyle: 'italic' }}>
                      {formData.meteringCostType === 'daily' ? 'From input' : 'Annual ÷ 365'}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600, fontStyle: 'italic' }}>
                      Calculated Annual Cost
                    </td>
                    <td style={{ padding: 8, border: '1px solid #ddd', fontStyle: 'italic' }}>
                      ${annualCost.toFixed(2)}
                    </td>
                    <td style={{ padding: 8, border: '1px solid #ddd', fontStyle: 'italic' }}>
                      {formData.meteringCostType === 'annual' ? 'From input' : 'Daily × 365'}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Metering Days</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="text"
                    value={formData.meteringDays}
                    onChange={(e) => handleInputChange('meteringDays', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder="Number of days"
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Days (Invoice Period)</td>
              </tr>
              <tr style={{ backgroundColor: '#f0f9ff' }}>
                <td colSpan={3} style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600, textAlign: 'center' }}>
                  Proposed DMA Solution
                </td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>DMA Price</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="text"
                    value={formData.dmaPrice}
                    onChange={(e) => handleInputChange('dmaPrice', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder="700"
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>$ (Per Annum)</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>VAS Price</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="text"
                    value={formData.vasPrice}
                    onChange={(e) => handleInputChange('vasPrice', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder="200"
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>$ (Per Annum)</td>
              </tr>
              <tr style={{ backgroundColor: '#fefce8' }}>
                <td colSpan={3} style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600, textAlign: 'center' }}>
                  Project Timeline
                </td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Start Date</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>DMA Start Date</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Period (Years)</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="number"
                    value={formData.periodYears}
                    onChange={(e) => handleInputChange('periodYears', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                    placeholder="5"
                    min="1"
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>DMA Period</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>End Date</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    style={{ width: '100%', padding: 4, border: '1px solid #ccc', borderRadius: 4 }}
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>DMA End Date - Auto-calculated</td>
              </tr>
              <tr>
                <td style={{ padding: 8, border: '1px solid #ddd', fontWeight: 600 }}>Notes</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: 4, 
                      border: '1px solid #ccc', 
                      borderRadius: 4,
                      minHeight: '60px',
                      resize: 'vertical'
                    }}
                    placeholder="Optional notes..."
                  />
                </td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>Optional</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={copyToClipboard}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Copy for Gmail
          </button>
          <button
            onClick={sendDMAReview}
            disabled={sending}
            style={{
              padding: '8px 16px',
              backgroundColor: sending ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: sending ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {sending ? 'Sending...' : 'Send DMA Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultMessage({ message }: { message: string }) {
  // Split into lines and process
  const lines = message
    .split('\n')
    .filter((line: string) => !line.includes('Request ID') && !line.includes('LOA File ID'));

  // Helper to bold key labels and highlight key data
  function formatLine(line: string) {
    // Bold key labels
    let formatted = line
      .replace(/^(Business|Service Type|Account|Subject|Sent to|Supplier):/g, '**$1:**');
    // Highlight key data
    formatted = formatted.replace(/^(Business|Service Type|Account): (.*)$/g, '**$1:** <span style="background:#f0f6ff;padding:2px 6px;border-radius:4px;font-weight:600;">$2</span>');
    // Make emails clickable
    if (formatted.startsWith('**Sent to:**')) {
      formatted = formatted.replace(/([\w.-]+@[\w.-]+\.[A-Za-z]{2,})/g, '<a href="mailto:$1" style="color:#2563eb;text-decoration:underline;">$1</a>');
    }
    return formatted;
  }

  // Section headers with icons and larger font
  function sectionHeader(line: string) {
    if (/^\s*Request Details:?\s*$/i.test(line)) {
      return <div style={{ marginTop: 18, marginBottom: 6, fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center' }}><span style={{ marginRight: 8 }}>📄</span>Request Details:</div>;
    }
    if (/^\s*Email Information:?\s*$/i.test(line)) {
      return <div style={{ marginTop: 18, marginBottom: 6, fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center' }}><span style={{ marginRight: 8 }}>✉️</span>Email Information:</div>;
    }
    return null;
  }

  // Find first non-empty line (success)
  const firstLineIdx = lines.findIndex(l => l.trim());
  // Find warning line(s)
  const warningIdx = lines.findIndex(l => l.includes('Note:'));

  return (
    <div style={{ fontFamily: 'inherit', textAlign: 'left' }}>
      {lines.map((line, idx) => {
        if (idx === firstLineIdx) {
          // Success line
          return (
            <div key={idx} style={{ background: '#e6f9ed', color: '#217a4a', padding: 10, borderRadius: 6, marginBottom: 10, fontWeight: 600, fontSize: 17, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 22, marginRight: 8 }}>✅</span>
              <span>{line.replace(/^✅ /, '')}</span>
            </div>
          );
        }
        if (idx === warningIdx) {
          // Warning line
          return (
            <div key={idx} style={{ background: '#fffbe6', color: '#b38600', padding: 10, borderRadius: 6, marginTop: 16, fontWeight: 500, border: '1px solid #ffe58f', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 20, marginRight: 8 }}>⚠️</span>
              <span>{line.replace(/^⚠️ /, '')}</span>
            </div>
          );
        }
        // Section headers
        const header = sectionHeader(line);
        if (header) return <div key={idx}>{header}</div>;
        // Normal line (with markdown and custom HTML)
        return <div key={idx} style={{ marginBottom: 3 }}><ReactMarkdown components={{ span: ({node, ...props}) => <span {...props} dangerouslySetInnerHTML={{__html: props.children as string}} /> }}>{formatLine(line)}</ReactMarkdown></div>;
      })}
    </div>
  );
}

function InvoiceResult({ result, session, token }: { result: any; session: any; token: string }) {
  const [showDMAModal, setShowDMAModal] = useState(false);
  // Detect which invoice type is present
  const types = [
    { key: 'electricity_ci_invoice_details', label: 'C&I Electricity Invoice' },
    { key: 'electricity_sme_invoice_details', label: 'SME Electricity Invoice' },
    { key: 'gas_invoice_details', label: 'Gas Invoice' },
    { key: 'gas_sme_invoicedetails', label: 'SME Gas Invoice' },
    { key: 'waste_invoice_details', label: 'Waste Invoice' },
    { key: 'oil_invoice_details', label: 'Oil Invoice' },
  ];
  const type = types.find(t => result[t.key]);
  if (!type) return <pre style={{ background: '#f4f4f4', padding: 12, borderRadius: 6 }}>{JSON.stringify(result, null, 2)}</pre>;
  const details = result[type.key];
  
  // Helper for field rendering in card format
  function Field({ label, value, isLink = false }: { label: string, value: any, isLink?: boolean }) {
    if (!value) return null;
    // Hide Invoice ID
    if (label === 'Invoice ID') return null;
    // Format $ fields
    let displayValue = value;
    if (typeof value === 'string' && (label.includes('Total Invoice Cost') || label.endsWith('($)'))) {
      const num = parseFloat(value.replace(/[^0-9.\-]/g, ''));
      if (!isNaN(num)) displayValue = `${num.toFixed(2)}`;
    }
    if (isLink) {
      return (
        <div style={{ background: 'white', padding: 12, borderRadius: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{label}</div>
          <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontSize: 14, fontWeight: 600 }}>
            View Invoice
          </a>
        </div>
      );
    }
    return (
      <div style={{ background: 'white', padding: 12, borderRadius: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
          {displayValue}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 22, marginRight: 8 }}>🧾</span> {type.label}
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16 
        }}>
          {details.invoice_number && <Field label="Invoice Number" value={details.invoice_number} />}
          {details.nmi && <Field label="NMI" value={details.nmi} />}
          {details.mrin && <Field label="MRIN" value={details.mrin} />}
          {details.business_name && <Field label="Business Name" value={details.business_name} />}
          {details.client_name && <Field label="Client Name" value={details.client_name} />}
          {details.account_name && <Field label="Account Name" value={details.account_name} />}
          {details.site_address && <Field label="Site Address" value={details.site_address} />}
          {details.retailer && <Field label="Retailer" value={details.retailer} />}
          {details.invoice_review_period && <Field label="Invoice Review Period" value={details.invoice_review_period} />}
          {details.period && <Field label="Period" value={details.period} />}
          {details.invoice_date && <Field label="Invoice Date" value={details.invoice_date} />}
          {details.monthly_usage && <Field label="Monthly Usage (kWh)" value={details.monthly_usage} />}
          {details.peak_rate && <Field label="Peak Rate (c/kWh)" value={details.peak_rate} />}
          {details.offpeak_rate && <Field label="Offpeak Rate (c/kWh)" value={details.offpeak_rate} />}
          {details.metering_rate && <Field label="Metering Rate" value={details.metering_rate} />}
          {details.vas_rate && <Field label="VAS Rate" value={details.vas_rate} />}
          {details.demand_capacity && <Field label="Demand Capacity" value={details.demand_capacity} />}
          {details.energy_charge_quantity && <Field label="Energy Charge Quantity" value={details.energy_charge_quantity} />}
          {details.energy_charge_rate && <Field label="Energy Charge Rate" value={details.energy_charge_rate} />}
          {details.product_1 && <Field label="Product 1" value={details.product_1} />}
          {details.quantity_1 && <Field label="Quantity 1" value={details.quantity_1} />}
          {details.rate_1 && <Field label="Rate 1" value={details.rate_1} />}
          {details.product_2 && <Field label="Product 2" value={details.product_2} />}
          {details.quantity_2 && <Field label="Quantity 2" value={details.quantity_2} />}
          {details.rate_2 && <Field label="Rate 2" value={details.rate_2} />}
          {details.rate_3 && <Field label="Rate 3" value={details.rate_3} />}
          {details.average_cost && <Field label="Average Cost" value={details.average_cost} />}
          {details.total_invoice_cost && <Field label="Total Invoice Cost ($)" value={details.total_invoice_cost} />}
          {details.invoice_link && <Field label="Invoice PDF" value={details.invoice_link} isLink />}
        </div>
        
        {/* DMA Button for C&I Electricity only */}
        {type.key === 'electricity_ci_invoice_details' && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setShowDMAModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              DMA
            </button>
          </div>
        )}
      </div>
      
      {/* DMA Modal */}
      {type.key === 'electricity_ci_invoice_details' && (
        <DMAModal
          isOpen={showDMAModal}
          onClose={() => setShowDMAModal(false)}
          invoiceData={result}
          session={session}
          token={token}
        />
      )}
    </div>
  );
}

// Data Comparison Component
function DataComparisonSection({ 
  invoiceData, 
  intervalData, 
  title, 
  session, 
  token 
}: { 
  invoiceData: any, 
  intervalData: any, 
  title: string,
  session: any,
  token: string
}) {
  // Helper functions
  const parseNumber = (value: any): number | null => {
    if (!value || value === "-") return null;
    const num = parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
    return isNaN(num) ? null : num;
  };

  const formatNumber = (value: number | null): string => {
    if (value === null) return "N/A";
    return value.toLocaleString('en-US');
  };

  const getComparisonStatus = (invoiceVal: number | null, intervalVal: number | null, tolerance: number = 0.05): { status: 'match' | 'close' | 'mismatch' | 'missing', message: string } => {
    if (invoiceVal === null || intervalVal === null) {
      return { status: 'missing', message: 'Data missing from one source' };
    }
    
    const diff = Math.abs(invoiceVal - intervalVal);
    const avgVal = (invoiceVal + intervalVal) / 2;
    const percentDiff = avgVal === 0 ? 0 : (diff / avgVal);
    
    if (percentDiff <= tolerance) {
      return { status: 'match', message: 'Values match' };
    } else if (percentDiff <= 0.1) {
      return { status: 'close', message: `Close match (${(percentDiff * 100).toFixed(1)}% difference)` };
    } else {
      return { status: 'mismatch', message: `Significant difference (${(percentDiff * 100).toFixed(1)}%)` };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'match': return { bg: '#e6f9ed', border: '#b8e6c1', text: '#217a4a', icon: '✅' };
      case 'close': return { bg: '#fffbe6', border: '#ffe58f', text: '#b38600', icon: '⚠️' };
      case 'mismatch': return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '❌' };
      case 'missing': return { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280', icon: '➖' };
      default: return { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280', icon: '❓' };
    }
  };

  const [showDemandModal, setShowDemandModal] = useState(false);
  // Extract comparison metrics
  // Get invoice details
  const invoiceDetails = invoiceData?.electricity_ci_invoice_details || 
                        invoiceData?.electricity_sme_invoice_details || 
                        invoiceData?.gas_invoice_details || 
                        invoiceData?.gas_sme_invoicedetails;

  // Get the latest interval data entry with proper typing
  const latestIntervalData = Array.isArray(intervalData) && intervalData.length > 0 ? intervalData[0] : null;

  if (!invoiceDetails || !latestIntervalData) {
    return null;
  }

  // Now TypeScript knows latestIntervalData is definitely not null
  const comparisons: Array<{
    metric: string;
    invoiceValue: string;
    intervalValue: string;
    comparison: { status: 'match' | 'close' | 'mismatch' | 'missing', message: string };
  }> = [];

  // Demand Capacity (kW) Comparison
  if (invoiceDetails.demand_capacity || latestIntervalData["Highest Demand (kW)"]) {
    const invoiceKW = parseNumber(invoiceDetails.demand_capacity);
    const intervalKW = parseNumber(latestIntervalData["Highest Demand (kW)"]);
    const comparison = getComparisonStatus(invoiceKW, intervalKW);
    
    comparisons.push({
      metric: 'Demand Capacity (kW)',
      invoiceValue: formatNumber(invoiceKW),
      intervalValue: formatNumber(intervalKW),
      comparison
    });
  }

  // kVA Comparison (if available)
  if (latestIntervalData["Highest Demand (kVA)"]) {
    const intervalKVA = parseNumber(latestIntervalData["Highest Demand (kVA)"]);
    
    comparisons.push({
      metric: 'Highest Demand (kVA)',
      invoiceValue: "Not available in invoice",
      intervalValue: formatNumber(intervalKVA),
      comparison: { status: 'missing', message: 'Only available in interval data' }
    });
  }

  // Monthly Usage vs Total kWh - Handle period differences
  if (invoiceDetails.monthly_usage || latestIntervalData["Total kWh"]) {
    const invoiceUsage = parseNumber(invoiceDetails.monthly_usage);
    const intervalUsage = parseNumber(latestIntervalData["Total kWh"]);
    
    // Determine if interval data is annual or monthly based on period
    const intervalPeriod = latestIntervalData.Period || "";
    const isIntervalAnnual = intervalPeriod.includes("to") || intervalPeriod.includes("-");
    
    if (invoiceUsage && intervalUsage) {
      // If interval data is annual and invoice is monthly, compare annualized invoice usage
      if (isIntervalAnnual) {
        const annualizedInvoiceUsage = invoiceUsage * 12;
        const comparison = getComparisonStatus(annualizedInvoiceUsage, intervalUsage, 0.1); // 10% tolerance for annual comparison
        
        comparisons.push({
          metric: 'Energy Usage (kWh) - Annual Comparison',
          invoiceValue: `${formatNumber(invoiceUsage)} monthly → ${formatNumber(annualizedInvoiceUsage)} annual`,
          intervalValue: `${formatNumber(intervalUsage)} annual`,
          comparison: {
            ...comparison,
            message: comparison.status === 'match' ? 'Annual usage aligns well' :
                    comparison.status === 'close' ? `${comparison.message} (annualized)` :
                    `${comparison.message} - Invoice: ${formatNumber(annualizedInvoiceUsage)} vs Interval: ${formatNumber(intervalUsage)}`
          }
        });
        
        // Also show monthly rate comparison if interval data spans full year
        const monthlyFromInterval = intervalUsage / 12;
        const monthlyComparison = getComparisonStatus(invoiceUsage, monthlyFromInterval, 0.15); // 15% tolerance for monthly
        
        comparisons.push({
          metric: 'Energy Usage (kWh) - Monthly Rate',
          invoiceValue: `${formatNumber(invoiceUsage)} (invoice month)`,
          intervalValue: `${formatNumber(monthlyFromInterval)} (avg monthly from annual)`,
          comparison: {
            ...monthlyComparison,
            message: monthlyComparison.status === 'match' ? 'Monthly rate consistent' :
                    monthlyComparison.status === 'close' ? `${monthlyComparison.message} monthly rate` :
                    `${monthlyComparison.message} - May indicate seasonal variation or billing period mismatch`
          }
        });
      } else {
        // Direct monthly to monthly comparison
        const comparison = getComparisonStatus(invoiceUsage, intervalUsage, 0.02); // 2% tolerance for direct monthly
        
        comparisons.push({
          metric: 'Energy Usage (kWh) - Monthly',
          invoiceValue: formatNumber(invoiceUsage),
          intervalValue: formatNumber(intervalUsage),
          comparison
        });
      }
    }
  }

  // Period Comparison - Enhanced logic
  if (invoiceDetails.period || latestIntervalData.Period) {
    const invoicePeriod = invoiceDetails.period || invoiceDetails.invoice_review_period;
    const intervalPeriod = latestIntervalData.Period;
    
    // Extract date information for better comparison
    let periodComparison: { status: 'match' | 'close' | 'mismatch' | 'missing', message: string };
    
    if (invoicePeriod && intervalPeriod) {
      // Check if invoice period falls within interval period
      const invoicePeriodLower = invoicePeriod.toLowerCase();
      const intervalPeriodLower = intervalPeriod.toLowerCase();
      
      // Extract year from invoice period (look for 2024, 2025, etc.)
      const invoiceYearMatch = invoicePeriod.match(/20\d{2}/);
      const intervalYearMatch = intervalPeriod.match(/20\d{2}/g); // Could have multiple years
      
      if (invoiceYearMatch && intervalYearMatch) {
        const invoiceYear = invoiceYearMatch[0];
        const intervalYears = intervalYearMatch;
        
        if (intervalYears.includes(invoiceYear)) {
          periodComparison = { status: 'close', message: `Invoice period (${invoiceYear}) falls within interval data timeframe` };
        } else {
          periodComparison = { status: 'mismatch', message: `Invoice year (${invoiceYear}) not covered by interval data (${intervalYears.join('-')})` };
        }
      } else if (invoicePeriod === intervalPeriod) {
        periodComparison = { status: 'match', message: 'Periods match exactly' };
      } else {
        // Check if they're describing the same general timeframe
        if (invoicePeriodLower.includes('07') && intervalPeriodLower.includes('07')) {
          periodComparison = { status: 'close', message: 'Both periods include July - partial overlap likely' };
        } else {
          periodComparison = { status: 'mismatch', message: 'Different time periods - comparison may not be meaningful' };
        }
      }
    } else {
      periodComparison = { status: 'missing', message: 'Period information missing from one source' };
    }
    
    comparisons.push({
      metric: 'Billing Period Coverage',
      invoiceValue: invoicePeriod || "N/A",
      intervalValue: intervalPeriod || "N/A",
      comparison: periodComparison
    });
  }

  if (comparisons.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 22, marginRight: 8 }}>🔍</span> Invoice vs Interval Data Comparison
        </h3>
        
        <div style={{ marginBottom: 20 }}>
          {comparisons.map((comp, index) => {
            const colors = getStatusColor(comp.comparison.status);
            return (
              <div key={index} style={{ 
                marginBottom: 16, 
                padding: 16, 
                background: colors.bg, 
                border: `1px solid ${colors.border}`, 
                borderRadius: 6 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 18, marginRight: 8 }}>{colors.icon}</span>
                  <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: colors.text }}>
                    {comp.metric}
                  </h4>
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 2fr', 
                  gap: 16, 
                  alignItems: 'center' 
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                      Invoice Data
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                      {comp.invoiceValue}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                      Interval Data
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                      {comp.intervalValue}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                      Comparison Status
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                      {comp.comparison.message}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Data Quality Summary */}
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Data Quality Summary:
          </h4>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
            This comparison helps identify potential discrepancies between your invoice and actual usage data. 
            Large differences may indicate billing errors, meter reading issues, or data quality problems that warrant investigation.
          </div>
        </div>
        {/* Demand Response Review Button - only show for C&I electricity */}
        {title.toLowerCase().includes('electricity') && title.toLowerCase().includes('c&i') && (
          <button
            onClick={() => setShowDemandModal(true)}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Demand Response Review
          </button>
        )}

        {/* Modal - Updated to include session and token */}
        <DemandResponseModal
          isOpen={showDemandModal}
          onClose={() => setShowDemandModal(false)}
          invoiceData={invoiceData}
          intervalData={intervalData}
          comparisons={comparisons}
          session={session}
          token={token}
        />
      </div>
    </div>
  );
}

// Interval Data Component
function IntervalDataSection({ 
  title, 
  identifier, 
  result, 
  session, 
  token 
}: { 
  title: string, 
  identifier: string, 
  result: any,
  session: any,
  token: string
}) {
  const [intervalData, setIntervalData] = useState<any>(null);
  const [intervalLoading, setIntervalLoading] = useState(false);
  const [intervalError, setIntervalError] = useState<string | null>(null);

  // Helper to determine if this page should show interval data
  const shouldShowIntervalData = () => {
    const titleLower = title.toLowerCase();
    return (titleLower.includes('electricity') || titleLower.includes('gas')) && 
           (titleLower.includes('c&i') || titleLower.includes('ci'));
  };

  // Helper to get the field type display name
  const getFieldDisplayName = () => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('electricity')) return 'NMI';
    if (titleLower.includes('gas')) return 'MRIN';
    return 'ID';
  };

  // Helper functions for formatting
  const formatNumber = (value: string) => {
    if (!value || value === "-") return "-";
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toLocaleString('en-US');
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
      
      setIntervalData(data);
    } catch (error) {
      console.error('Error fetching interval data:', error);
      setIntervalError(error instanceof Error ? error.message : 'Failed to fetch interval data');
    } finally {
      setIntervalLoading(false);
    }
  };

  // Auto-fetch interval data when result is available
  useEffect(() => {
    if (shouldShowIntervalData() && identifier && result) {
      fetchIntervalData();
    }
  }, [result, identifier, title]);

  if (!shouldShowIntervalData() || !identifier) {
    return null;
  }

  // Check if we have valid interval data for comparison
  const hasValidIntervalData = intervalData && 
    Array.isArray(intervalData) && 
    intervalData.length > 0 && 
    intervalData[0]["Total kWh"] &&
    !(intervalData[0]["Interval Data Period"] === "" && 
      intervalData[0]["Interval Data ID"] === "" && 
      intervalData[0]["Interval Data Link"] === "");

  return (
    <>
      <div style={{ marginTop: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 22, marginRight: 8 }}>📊</span> Interval Data for {getFieldDisplayName()}: {identifier}
          </h3>
          
          {intervalLoading && (
            <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
              Loading interval data...
            </div>
          )}
          
          {intervalError && (
            <div style={{ 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: 6, 
              padding: 16, 
              marginBottom: 16 
            }}>
              <div style={{ color: '#991b1b', fontWeight: 600 }}>Error loading interval data:</div>
              <div style={{ color: '#dc2626', fontSize: 14, marginTop: 4 }}>{intervalError}</div>
              <button
                onClick={fetchIntervalData}
                style={{ 
                  marginTop: 8, 
                  padding: '4px 12px', 
                  background: '#dc2626', 
                  color: 'white', 
                  fontSize: 14, 
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer'
                }}
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
                <div style={{ 
                  background: '#fffbeb', 
                  border: '1px solid #fed7aa', 
                  borderRadius: 6, 
                  padding: 16 
                }}>
                  <div style={{ color: '#92400e', fontWeight: 600, marginBottom: 8 }}>
                    No Interval Data Found for this {getFieldDisplayName()}
                  </div>
                  <div style={{ color: '#d97706', fontSize: 14, marginBottom: 12 }}>
                    No interval data is currently available for {identifier}. You can lodge interval data on the document lodgement page.
                  </div>
                  <button 
                    onClick={() => window.open('/document-lodgement', '_blank')}
                    style={{ 
                      padding: '4px 12px', 
                      background: '#d97706', 
                      color: 'white', 
                      fontSize: 14, 
                      borderRadius: 4,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Go to Document Lodgement
                  </button>
                </div>
              ) : Array.isArray(intervalData) && intervalData.length > 0 && intervalData[0]["Total kWh"] ? (
                <div>
                  {intervalData.map((data, index) => (
                    <div key={index} style={{ marginBottom: index < intervalData.length - 1 ? 16 : 0 }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                        gap: 16 
                      }}>
                        <div style={{ background: 'white', padding: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                            {getFieldDisplayName()}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {data.NMI || data["NMI / MRIN"] || identifier}
                          </div>
                        </div>
                        <div style={{ background: 'white', padding: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Period</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {data.Period || 'N/A'}
                          </div>
                        </div>
                        <div style={{ background: 'white', padding: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Year</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {data.Year || 'N/A'}
                          </div>
                        </div>
                        <div style={{ background: 'white', padding: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Total kWh</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {data["Total kWh"] ? formatNumber(data["Total kWh"]) : 'N/A'}
                          </div>
                        </div>
                        <div style={{ background: 'white', padding: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Highest Demand (kW)</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {data["Highest Demand (kW)"] || 'N/A'}
                          </div>
                        </div>
                        <div style={{ background: 'white', padding: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Peak Demand Period</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {data["Peak Demand Period"] ? new Date(data["Peak Demand Period"]).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div style={{ background: 'white', padding: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Highest Demand (kVA)</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {data["Highest Demand (kVA)"] || 'N/A'}
                          </div>
                        </div>
                        <div style={{ background: 'white', padding: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Peak Demand Period kVA</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {data["Peak Demand Period kVA"] ? new Date(data["Peak Demand Period kVA"]).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div style={{ background: 'white', padding: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Data Analysis</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {data["Data Analysis"] || 'N/A'}
                          </div>
                        </div>
                        {data["Interval Data File ID"] && (
                          <div style={{ background: 'white', padding: 12, borderRadius: 4, border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Interval Data File</div>
                            <a
                              href={`https://drive.google.com/file/d/${data["Interval Data File ID"]}/view`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2563eb', textDecoration: 'underline', fontSize: 14, fontWeight: 600 }}
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
                  <div style={{ background: '#f3f4f6', padding: 16, borderRadius: 6 }}>
                    <pre style={{ fontSize: 14, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(intervalData, null, 2)}
                    </pre>
                  </div>
                  <div style={{ marginTop: 16, fontSize: 14, color: '#6b7280' }}>
                    Unexpected data format - check console for detailed logs.
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!intervalData && !intervalLoading && !intervalError && (
            <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
              No interval data available
            </div>
          )}
        </div>
      </div>
      
      {/* Add Data Comparison Section if we have both invoice and interval data */}
      {hasValidIntervalData && result && (
        <DataComparisonSection 
          invoiceData={result}
          intervalData={intervalData}
          title={title}
          session={session}
          token={token}
        />
      )}
    </>
  );
}

export default function InfoToolPage({ title, description, endpoint, extraFields = [], isFileUpload = false, secondaryField, initialBusinessName = "", initialSecondaryValue = "", autoSubmit = false, formRef, initialExtraFields = {} }: InfoToolPageProps) {
  const { data: session } = useSession();
  const token = (session as any)?.id_token;
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [secondaryValue, setSecondaryValue] = useState(initialSecondaryValue);
  const [fields, setFields] = useState<{ [key: string]: any }>(initialExtraFields || {});
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formElement = formRef || useRef<HTMLFormElement>(null);

  const handleFieldChange = (name: string, value: any) => {
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setResult(null);
  
    if (!businessName && !secondaryValue) {
      setError("Please provide at least a Business Name or a Secondary Field value.");
      return;
    }
  
    setLoading(true);
    try {
      let res;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s
  
      if (isFileUpload && file) {
        const formData = new FormData();
        if (businessName) formData.append("business_name", businessName);
        if (secondaryField && secondaryValue) formData.append(secondaryField.name, secondaryValue);
        if (secondaryField) formData.append(secondaryField.name, secondaryValue);
        extraFields.forEach((f) => formData.append(f.name, fields[f.name] || ""));
        formData.append("file", file);
  
        res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal,
        });
      } else {
        const body: any = {};
        if (businessName) body.business_name = businessName;
        if (secondaryField && secondaryValue) body[secondaryField.name] = secondaryValue;
        extraFields.forEach((f) => (body[f.name] = fields[f.name]));
  
        res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      }
  
      clearTimeout(timeoutId);
  
      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          typeof err.detail === "string"
            ? err.detail
            : JSON.stringify(err.detail || err)
        );
      }
  
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("The request is taking longer than expected. Please wait or check the backend logs.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit if requested and both initial values are present
  useEffect(() => {
    if (
      autoSubmit &&
      (initialBusinessName || initialSecondaryValue) &&
      token // Only auto-submit if token is available
    ) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit, initialBusinessName, initialSecondaryValue, token]);

  // Update fields if initialExtraFields changes
  useEffect(() => {
    if (initialExtraFields && Object.keys(initialExtraFields).length > 0) {
      setFields((prev) => ({ ...initialExtraFields, ...prev }));
    }
  }, [JSON.stringify(initialExtraFields)]);

  // Helper to get identifier for interval data
  const getIdentifierForIntervalData = () => {
    // First try the secondary value (from URL params)
    if (secondaryValue) return secondaryValue;
    
    // Then try to extract from result data
    if (result) {
      // Check for NMI in electricity results
      if (result.electricity_ci_invoice_details?.nmi) return result.electricity_ci_invoice_details.nmi;
      if (result.electricity_sme_invoice_details?.nmi) return result.electricity_sme_invoice_details.nmi;
      
      // Check for MRIN in gas results  
      if (result.gas_invoice_details?.mrin) return result.gas_invoice_details.mrin;
      if (result.gas_sme_invoicedetails?.mrin) return result.gas_sme_invoicedetails.mrin;
    }
    
    return null;
  };

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 32, background: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>
      <div style={{ marginBottom: 20, color: '#555' }}>{description}</div>
      <form onSubmit={handleSubmit} ref={formElement}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: secondaryField ? '1fr 1fr' : '1fr', 
          gap: 16, 
          marginBottom: 16 
        }}>
          <div>
            <label htmlFor="business-name-input" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 16 }}>
              Business Name:
            </label>
            <input
              id="business-name-input"
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="Enter a business name..."
              style={{ width: '100%', padding: "8px 14px", fontSize: "16px", borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
            />
          </div>
          {secondaryField && (
            <div>
              <label htmlFor={secondaryField.name} style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 16 }}>
                {secondaryField.label}:
              </label>
              <input
                id={secondaryField.name}
                type="text"
                value={secondaryValue}
                onChange={e => setSecondaryValue(e.target.value)}
                placeholder={`Enter a ${secondaryField.label.toLowerCase()}...`}
                style={{ width: '100%', padding: "8px 14px", fontSize: "16px", borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
              />
            </div>
          )}
        </div>
        {extraFields.map((f) => (
          <div key={f.name} style={{ marginBottom: 16 }}>
            <label htmlFor={f.name} style={{ marginRight: 12, fontWeight: 600, fontSize: 16 }}>{f.label}:</label>
            {f.type === "select" && f.options ? (
              <select
                id={f.name}
                value={fields[f.name] || ""}
                onChange={e => handleFieldChange(f.name, e.target.value)}
                style={{ padding: "8px 14px", fontSize: "16px", borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
                required={f.required}
              >
                <option value="">Select...</option>
                {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                id={f.name}
                value={fields[f.name] || ""}
                onChange={e => handleFieldChange(f.name, e.target.value)}
                style={{ padding: "8px 14px", fontSize: "16px", borderRadius: 6, border: '1px solid #ccc', outline: 'none', minHeight: 60, minWidth: 220 }}
              />
            ) : (
              <input
                id={f.name}
                type={f.type || "text"}
                value={fields[f.name] || ""}
                onChange={e => handleFieldChange(f.name, e.target.value)}
                style={{ padding: "8px 14px", fontSize: "16px", borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
                required={f.required}
              />
            )}
          </div>
        ))}
        {isFileUpload && (
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="file-upload" style={{ marginRight: 12, fontWeight: 600, fontSize: 16 }}>File:</label>
            <input
              id="file-upload"
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
        )}
        <button
          type="submit"
          style={{ padding: "10px 20px", fontSize: "16px", borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600 }}
          disabled={loading}
        >
          {loading ? "Loading..." : "Submit"}
        </button>
      </form>
      {error && <div style={{ color: "red", marginTop: 18 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 28, textAlign: "left" }}>
          <h3>Result:</h3>
          {typeof result === 'object' && result.message ? (
            <div style={{ background: '#f4f4f4', padding: 12, borderRadius: 6 }}>
              <ResultMessage message={result.message} />
            </div>
          ) : (
            <InvoiceResult result={result} session={session} token={token} />
          )}
        </div>
      )}
      
      {/* Interval Data Section - Only show for electricity and gas */}
      {result && getIdentifierForIntervalData() && (
        <IntervalDataSection 
          title={title}
          identifier={getIdentifierForIntervalData()!}
          result={result}
          session={session}
          token={token}
        />
      )}
    </div>
  );
}