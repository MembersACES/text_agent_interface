"use client";

import React, { useMemo, useState } from "react";

// ---- Types ----
type Category = "INVOICE" | "DATA";

type UtilityKey =
  | "WASTE"
  | "COOKING_OIL"
  | "ELECTRICITY_CI"
  | "ELECTRICITY_SME"
  | "GAS_CI"
  | "GAS_SME"
  | "GREASE_TRAP"
  | "WATER"
  | "ELECTRICITY_CI_INTERVAL"; // data type (more coming later)

// ---- Catalogs ----
const LABELS: Record<UtilityKey, string> = {
  WASTE: "WASTE",
  COOKING_OIL: "COOKING OIL",
  ELECTRICITY_CI: "ELECTRICITY C&I",
  ELECTRICITY_SME: "ELECTRICITY SME",
  GAS_CI: "GAS C&I",
  GAS_SME: "GAS SME",
  GREASE_TRAP: "GREASE TRAP",
  WATER: "WATER",
  ELECTRICITY_CI_INTERVAL: "C&I E Interval Data",
};

const API_ENDPOINTS: Record<UtilityKey, string> = {
  WASTE:
    "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/waste/process-invoice",
  COOKING_OIL:
    "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/oil/process-invoice",
  ELECTRICITY_CI:
    "https://aces-api-63gwbzzcdq-km.a.run.app/v1/electricity-ci/process-invoice",
  ELECTRICITY_SME:
    "https://aces-api-63gwbzzcdq-km.a.run.app/v1/electricity-sme/process-invoice",
  GAS_CI: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/gas-ci/process-invoice",
  GAS_SME:
    "https://aces-api-63gwbzzcdq-km.a.run.app/v1/gas-sme/process-invoice",
  GREASE_TRAP:
    "https://aces-api-63gwbzzcdq-km.a.run.app/v1/grease-trap/process-invoice",
  WATER: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/water/process-invoice",
  ELECTRICITY_CI_INTERVAL:
    "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/interval-ci-electricity/process-interval-ci-electricity-data",
};

// File accept strings
const ACCEPTS: Record<UtilityKey, string> = {
  // DATA category accepts spreadsheet/text files
  ELECTRICITY_CI_INTERVAL:
    ".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv",
  // INVOICE category accepts PDF
  WASTE: "application/pdf",
  COOKING_OIL: "application/pdf",
  ELECTRICITY_CI: "application/pdf",
  ELECTRICITY_SME: "application/pdf",
  GAS_CI: "application/pdf",
  GAS_SME: "application/pdf",
  GREASE_TRAP: "application/pdf",
  WATER: "application/pdf",
};

// Friendly upload labels
const FRIENDLY_UPLOAD_LABEL: Record<UtilityKey, string> = {
  ELECTRICITY_CI_INTERVAL: "Upload Interval Data (CSV/XLS/XLSX)",
  WASTE: "Upload Invoice (PDF)",
  COOKING_OIL: "Upload Invoice (PDF)",
  ELECTRICITY_CI: "Upload Invoice (PDF)",
  ELECTRICITY_SME: "Upload Invoice (PDF)",
  GAS_CI: "Upload Invoice (PDF)",
  GAS_SME: "Upload Invoice (PDF)",
  GREASE_TRAP: "Upload Invoice (PDF)",
  WATER: "Upload Invoice (PDF)",
};

// Partition utilities by category
const INVOICE_UTILS: UtilityKey[] = [
  "WASTE",
  "COOKING_OIL",
  "ELECTRICITY_CI",
  "ELECTRICITY_SME",
  "GAS_CI",
  "GAS_SME",
  "GREASE_TRAP",
  "WATER",
];

const DATA_UTILS: UtilityKey[] = [
  "ELECTRICITY_CI_INTERVAL", // ← add more here as you build them
];

export default function UtilityInvoiceLodgementPage() {
  const [category, setCategory] = useState<Category>("INVOICE");
  const [utilityType, setUtilityType] = useState<UtilityKey>(INVOICE_UTILS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // Options for current category
  const options = useMemo(
    () => (category === "INVOICE" ? INVOICE_UTILS : DATA_UTILS),
    [category]
  );

  // Ensure utilityType stays valid when switching category
  React.useEffect(() => {
    if (!options.includes(utilityType)) {
      setUtilityType(options[0]);
      setFile(null);
      setResult("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) {
      setResult("No file selected.");
      return;
    }

    // Lightweight guard by category
    if (category === "DATA") {
      const ok = /\.(csv|xls|xlsx)$/i.test(file.name);
      if (!ok) {
        setResult("Please upload a .csv, .xls, or .xlsx file for Data uploads.");
        return;
      }
    } else {
      const ok = /\.pdf$/i.test(file.name);
      if (!ok) {
        setResult("Please upload a PDF for Invoice uploads.");
        return;
      }
    }

    setLoading(true);
    setResult("");

    const formData = new FormData();
    formData.append("file", file);

    const endpoint = API_ENDPOINTS[utilityType];

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        setResult(`❌ Error parsing JSON: ${res.status} ${res.statusText}\n${text}`);
        setLoading(false);
        return;
      }

      if (res.ok) {
        setResult(`✅ Upload successful: ${data.message || "No message returned."}`);
      } else {
        setResult(`❌ Upload failed: ${data.message || res.statusText}`);
      }
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentAccept = ACCEPTS[utilityType];
  const currentLabel = FRIENDLY_UPLOAD_LABEL[utilityType];

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h1 className="text-xl font-bold mb-2">Utility Invoice Lodgement</h1>

      {/* Category toggle */}
      <div className="mb-4">
        <span className="block font-medium mb-1">Upload Type</span>
        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="category"
              value="INVOICE"
              checked={category === "INVOICE"}
              onChange={() => setCategory("INVOICE")}
              className="h-4 w-4"
            />
            <span>Invoice</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="category"
              value="DATA"
              checked={category === "DATA"}
              onChange={() => setCategory("DATA")}
              className="h-4 w-4"
            />
            <span>Data</span>
          </label>
        </div>
      </div>

      {/* Utility picker (filtered by category) */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Utility Type</label>
        <select
          value={utilityType}
          onChange={(e) => {
            setUtilityType(e.target.value as UtilityKey);
            setFile(null);
            setResult("");
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        >
          {options.map((type) => (
            <option key={type} value={type}>
              {LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {/* File upload */}
      <div className="mb-4">
        <label className="block font-medium mb-1">{currentLabel}</label>
        <input type="file" accept={currentAccept} onChange={handleFileChange} />
        <p className="text-xs text-gray-500 mt-1">
          {category === "DATA"
            ? "Accepted: .csv, .xls, .xlsx"
            : "Accepted: .pdf"}
        </p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Submit"}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{result}</div>
      )}
    </div>
  );
}
