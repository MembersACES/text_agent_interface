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

function InvoiceResult({ result }: { result: any }) {
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
  // Helper for field rendering
  function Field({ label, value, isLink = false }: { label: string, value: any, isLink?: boolean }) {
    if (!value) return null;
    // Hide Invoice ID
    if (label === 'Invoice ID') return null;
    // Format $ fields
    let displayValue = value;
    if (typeof value === 'string' && (label.includes('Total Invoice Cost') || label.endsWith('($)'))) {
      const num = parseFloat(value.replace(/[^0-9.\-]/g, ''));
      if (!isNaN(num)) displayValue = `$${num.toFixed(2)}`;
    }
    if (isLink) {
      return <div style={{ marginBottom: 6 }}><b>{label}:</b> <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>View Invoice</a></div>;
    }
    return <div style={{ marginBottom: 6 }}><b>{label}:</b> <span style={{ background: '#f0f6ff', padding: '2px 6px', borderRadius: 4 }}>{displayValue}</span></div>;
  }
  return (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: 18, marginTop: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 22, marginRight: 8 }}>🧾</span> {type.label}
      </div>
      {details.invoice_id && <Field label="Invoice ID" value={details.invoice_id} />}
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

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 32, background: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>
      <div style={{ marginBottom: 20, color: '#555' }}>{description}</div>
      <form onSubmit={handleSubmit} ref={formElement}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="business-name-input" style={{ marginRight: 12, fontWeight: 600, fontSize: 16 }}>
            Business Name:
          </label>
          <input
            id="business-name-input"
            type="text"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="Enter a business name..."
            style={{ padding: "8px 14px", fontSize: "16px", minWidth: 220, borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
          />
        </div>
        {secondaryField && (
          <div style={{ marginBottom: 16 }}>
            <label htmlFor={secondaryField.name} style={{ marginRight: 12, fontWeight: 600, fontSize: 16 }}>{secondaryField.label}:</label>
            <input
              id={secondaryField.name}
              type="text"
              value={secondaryValue}
              onChange={e => setSecondaryValue(e.target.value)}
              placeholder={`Enter a ${secondaryField.label.toLowerCase()}...`}
              style={{ padding: "8px 14px", fontSize: "16px", minWidth: 220, borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
            />
          </div>
        )}
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
            <InvoiceResult result={result} />
          )}
        </div>
      )}
    </div>
  );
} 