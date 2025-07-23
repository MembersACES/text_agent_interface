"use client";

import React, { useState } from "react";
import { getApiBaseUrl } from "@/lib/utils";

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
  WASTE: `${getApiBaseUrl()}/api/invoice/waste`,
  COOKING_OIL: `${getApiBaseUrl()}/api/invoice/oil`,
  ELECTRICITY_CI: `${getApiBaseUrl()}/api/invoice/electricity-ci`,
  ELECTRICITY_SME: `${getApiBaseUrl()}/api/invoice/electricity-sme`,
  GAS_CI: `${getApiBaseUrl()}/api/invoice/gas-ci`,
  GAS_SME: `${getApiBaseUrl()}/api/invoice/gas-sme`,
  GREASE_TRAP: `${getApiBaseUrl()}/api/invoice/grease-trap`,
  WATER: `${getApiBaseUrl()}/api/invoice/water`,
};

export default function UtilityInvoiceLodgementPage() {
  const [token, setToken] = useState("");
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
      const res = await fetch(`${endpoint}?token=${encodeURIComponent(token)}`, {
        method: "POST",
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        const text = await res.text();
        setResult(`Error: ${res.status} ${res.statusText}\n${text}`);
        setLoading(false);
        return;
      }

      if (data.status === "success") {
        setResult("Upload successful!");
      } else {
        setResult(`Error: ${data.status || res.status} ${data.message || res.statusText}`);
      }
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h1 className="text-xl font-bold mb-4">Utility Invoice Lodgement</h1>

      <div className="mb-4">
        <label className="block font-medium mb-1">Token</label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>

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
