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
  | "CLEANING"
  | "ELECTRICITY_CI_INTERVAL"
  | "EOI";
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
  CLEANING: "CLEANING",
  ELECTRICITY_CI_INTERVAL: "C&I E Interval Data",
  EOI: "EOI",
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
  CLEANING:
    "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/cleaning-invoice/process-invoice",
  ELECTRICITY_CI_INTERVAL:
    "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/interval-ci-electricity/process-interval-ci-electricity-data",
  EOI: "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/eoi/process-eoi",
};

// File accept strings
const ACCEPTS: Record<UtilityKey, string> = {
  // DATA category accepts spreadsheet/text files
  ELECTRICITY_CI_INTERVAL:
    ".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv",
  EOI: "application/pdf",
  // INVOICE category accepts PDF
  WASTE: "application/pdf",
  COOKING_OIL: "application/pdf",
  ELECTRICITY_CI: "application/pdf",
  ELECTRICITY_SME: "application/pdf",
  GAS_CI: "application/pdf",
  GAS_SME: "application/pdf",
  GREASE_TRAP: "application/pdf",
  WATER: "application/pdf",
  CLEANING: "application/pdf",
};

// Friendly upload labels
const FRIENDLY_UPLOAD_LABEL: Record<UtilityKey, string> = {
  ELECTRICITY_CI_INTERVAL: "Upload Interval Data (CSV/XLS/XLSX)",
  EOI: "Upload EOI (PDF)",
  WASTE: "Upload Invoice (PDF)",
  COOKING_OIL: "Upload Invoice (PDF)",
  ELECTRICITY_CI: "Upload Invoice (PDF)",
  ELECTRICITY_SME: "Upload Invoice (PDF)",
  GAS_CI: "Upload Invoice (PDF)",
  GAS_SME: "Upload Invoice (PDF)",
  GREASE_TRAP: "Upload Invoice (PDF)",
  WATER: "Upload Invoice (PDF)",
  CLEANING: "Upload Invoice (PDF)",
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
  "CLEANING",
];

const DATA_UTILS: UtilityKey[] = [
  "ELECTRICITY_CI_INTERVAL",
  "EOI",
];

type FileStatus = {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  message: string;
};

export default function UtilityInvoiceLodgementPage() {
  const [category, setCategory] = useState<Category>("INVOICE");
  const [utilityType, setUtilityType] = useState<UtilityKey>(INVOICE_UTILS[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
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
      setFiles([]);
      setFileStatuses([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      // Validate file types
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      
      selectedFiles.forEach((file) => {
        if (category === "DATA") {
          const ok = /\.(csv|xls|xlsx)$/i.test(file.name);
          if (ok) {
            validFiles.push(file);
          } else {
            invalidFiles.push(file.name);
          }
        } else {
          const ok = /\.pdf$/i.test(file.name);
          if (ok) {
            validFiles.push(file);
          } else {
            invalidFiles.push(file.name);
          }
        }
      });
      
      if (invalidFiles.length > 0) {
        alert(`Invalid file types:\n${invalidFiles.join("\n")}\n\n${category === "DATA" ? "Please select .csv, .xls, or .xlsx files" : "Please select PDF files"}`);
      }
      
      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
        setFileStatuses((prev) => [
          ...prev,
          ...validFiles.map((file) => ({
            file,
            status: "pending" as const,
            message: "",
          })),
        ]);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileStatuses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert("No files selected.");
      return;
    }

    setLoading(true);
    const endpoint = API_ENDPOINTS[utilityType];

    // Process each file individually
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Update status to uploading
      setFileStatuses((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: "uploading", message: "Uploading..." };
        return updated;
      });

      const formData = new FormData();
      formData.append("file", file);

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
          setFileStatuses((prev) => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: "error",
              message: `Error parsing JSON: ${res.status} ${res.statusText}\n${text}`,
            };
            return updated;
          });
          continue;
        }

        if (res.ok) {
          setFileStatuses((prev) => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: "success",
              message: data.message || "Upload successful",
            };
            return updated;
          });
        } else {
          setFileStatuses((prev) => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: "error",
              message: data.message || res.statusText,
            };
            return updated;
          });
        }
      } catch (error: any) {
        setFileStatuses((prev) => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            status: "error",
            message: error.message || "Unknown error",
          };
          return updated;
        });
      }
    }

    setLoading(false);
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
              onChange={() => {
                setCategory("INVOICE");
                setFiles([]);
                setFileStatuses([]);
              }}
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
              onChange={() => {
                setCategory("DATA");
                setFiles([]);
                setFileStatuses([]);
              }}
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
            setFiles([]);
            setFileStatuses([]);
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
        <label className="block font-medium mb-1">{currentLabel} (Multiple files allowed)</label>
        <input 
          type="file" 
          accept={currentAccept} 
          onChange={handleFileChange}
          multiple
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          {category === "DATA"
            ? "Accepted: .csv, .xls, .xlsx (You can select multiple files)"
            : "Accepted: .pdf (You can select multiple files)"}
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-4">
          <label className="block font-medium mb-2">Selected Files ({files.length})</label>
          <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded p-2">
            {files.map((file, index) => {
              const status = fileStatuses[index];
              const statusColor = 
                status?.status === "success" ? "text-green-600" :
                status?.status === "error" ? "text-red-600" :
                status?.status === "uploading" ? "text-blue-600" :
                "text-gray-600";
              
              return (
                <div 
                  key={`${file.name}-${index}`} 
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {file.name}
                    </div>
                    {status && status.message && (
                      <div className={`text-xs mt-1 ${statusColor}`}>
                        {status.status === "uploading" && "⏳ "}
                        {status.status === "success" && "✅ "}
                        {status.status === "error" && "❌ "}
                        {status.message}
                      </div>
                    )}
                  </div>
                  {!loading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-2 text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || files.length === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? `Uploading... (${fileStatuses.filter(s => s.status === "uploading").length}/${files.length})` : `Submit ${files.length > 0 ? `(${files.length} file${files.length > 1 ? 's' : ''})` : ''}`}
      </button>

      {/* Summary */}
      {fileStatuses.length > 0 && !loading && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <div className="text-sm font-medium mb-2">Upload Summary:</div>
          <div className="text-xs text-gray-600">
            ✅ Successful: {fileStatuses.filter(s => s.status === "success").length} | 
            ❌ Failed: {fileStatuses.filter(s => s.status === "error").length} | 
            ⏳ Pending: {fileStatuses.filter(s => s.status === "pending").length}
          </div>
        </div>
      )}
    </div>
  );
}
