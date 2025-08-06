"use client";

import React, { useState } from "react";

const UTILITY_OPTIONS = [
  "WASTE",
  "COOKING_OIL",
  "ELECTRICITY_CI",
  "ELECTRICITY_SME",
  "GAS_CI",
  "GAS_SME",
  "GREASE_TRAP",
  "WATER",
];

const API_ENDPOINTS: Record<string, string> = {
  WASTE: "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/waste/process-invoice",
  COOKING_OIL: "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/oil/process-invoice",
  ELECTRICITY_CI: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/electricity-ci/process-invoice",
  ELECTRICITY_SME: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/electricity-sme/process-invoice",
  GAS_CI: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/gas-ci/process-invoice",
  GAS_SME: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/gas-sme/process-invoice",
  GREASE_TRAP: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/grease-trap/process-invoice",
  WATER: "https://aces-api-63gwbzzcdq-km.a.run.app/v1/water/process-invoice",
};

export default function UtilityInvoiceLodgementPage() {
  const [utilityType, setUtilityType] = useState("WASTE");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) {
      setResult("No file selected.");
      return;
    }
  
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
  
    const endpoint = API_ENDPOINTS[utilityType];
  
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
  
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
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
    }
  
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h1 className="text-xl font-bold mb-4">Utility Invoice Lodgement</h1>

      <div className="mb-4">
        <label className="block font-medium mb-1">Utility Type</label>
        <select
          value={utilityType}
          onChange={(e) => setUtilityType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        >
          {UTILITY_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1">Upload Invoice (PDF)</label>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Submit"}
      </button>

      {result && <div className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{result}</div>}
    </div>
  );
}
