"use client";

import { Modal } from "@/components/ui/modal";
import {
  CI_DATA_REQUEST_RETAILERS,
  SME_DATA_REQUEST_RETAILERS,
  WASTE_DATA_REQUEST_RETAILERS,
  type DataRequestSummary,
} from "@/lib/data-request";

type DataRequestConfirmModalProps = {
  summary: DataRequestSummary | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRetailerChange: (retailer: string) => void;
};

export function DataRequestConfirmModal({
  summary,
  loading,
  onClose,
  onConfirm,
  onRetailerChange,
}: DataRequestConfirmModalProps) {
  const requestType = summary?.requestType ?? "";
  const isCI = requestType === "electricity_ci" || requestType === "gas_ci";
  const isSME = requestType === "electricity_sme" || requestType === "gas_sme";
  const isWaste = requestType === "waste";
  const allRetailers = [
    ...CI_DATA_REQUEST_RETAILERS,
    ...SME_DATA_REQUEST_RETAILERS,
    ...WASTE_DATA_REQUEST_RETAILERS,
  ];

  return (
    <Modal
      open={!!summary}
      onClose={onClose}
      title="Confirm Data Request"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !summary?.retailer}
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-primary text-white font-semibold hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending…" : "Confirm & Send"}
          </button>
        </div>
      }
    >
      {summary && (
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <span className="font-semibold">Business Name:</span>{" "}
            <span className="ml-2">{summary.businessName}</span>
          </div>
          <div>
            <label className="font-semibold block mb-1">Retailer:</label>
            <select
              value={summary.retailer || ""}
              onChange={(e) => onRetailerChange(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-400 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a retailer...</option>
              {isCI && (
                <optgroup label="C&I Electricity & Gas">
                  {CI_DATA_REQUEST_RETAILERS.map((retailer) => (
                    <option key={retailer} value={retailer}>
                      {retailer}
                    </option>
                  ))}
                </optgroup>
              )}
              {isSME && (
                <optgroup label="SME Electricity & Gas">
                  {SME_DATA_REQUEST_RETAILERS.map((retailer) => (
                    <option key={retailer} value={retailer}>
                      {retailer}
                    </option>
                  ))}
                </optgroup>
              )}
              {isWaste && (
                <optgroup label="Waste">
                  {WASTE_DATA_REQUEST_RETAILERS.map((retailer) => (
                    <option key={retailer} value={retailer}>
                      {retailer}
                    </option>
                  ))}
                </optgroup>
              )}
              {!isCI && !isSME && !isWaste && (
                <>
                  <optgroup label="C&I Electricity & Gas">
                    {CI_DATA_REQUEST_RETAILERS.map((retailer) => (
                      <option key={retailer} value={retailer}>
                        {retailer}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="SME Electricity & Gas">
                    {SME_DATA_REQUEST_RETAILERS.map((retailer) => (
                      <option key={retailer} value={retailer}>
                        {retailer}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Waste">
                    {WASTE_DATA_REQUEST_RETAILERS.map((retailer) => (
                      <option key={retailer} value={retailer}>
                        {retailer}
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
              <optgroup label="Other">
                <option value="Other">Other Supplier</option>
              </optgroup>
              {summary.retailer &&
                !(allRetailers as readonly string[]).includes(summary.retailer) &&
                summary.retailer !== "Other" && (
                  <option value={summary.retailer}>
                    {summary.retailer} (Current)
                  </option>
                )}
            </select>
          </div>
          <div>
            <span className="font-semibold">Identifier:</span>{" "}
            <span className="ml-2">{summary.identifier}</span>
          </div>
          <div>
            <span className="font-semibold">Request Type:</span>{" "}
            <span className="ml-2">{summary.requestType}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}

type DataRequestResultModalProps = {
  result: string | null;
  onClose: () => void;
};

export function DataRequestResultModal({ result, onClose }: DataRequestResultModalProps) {
  return (
    <Modal
      open={!!result}
      onClose={onClose}
      title="Data Request Result"
      size="lg"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-primary text-white font-semibold hover:bg-primary/90 focus:outline-none"
          >
            Close
          </button>
        </div>
      }
    >
      {result && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg max-h-[60vh] overflow-auto">
          <div className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-gray-200">
            {result.split("\n").map((line, idx) => {
              if (line.includes("✅")) {
                return (
                  <div
                    key={idx}
                    className="text-green-700 dark:text-green-400 font-semibold mb-2"
                  >
                    {line}
                  </div>
                );
              }
              if (line.includes("❌") || line.startsWith("Error:")) {
                return (
                  <div
                    key={idx}
                    className="text-red-700 dark:text-red-400 font-semibold mb-2"
                  >
                    {line}
                  </div>
                );
              }
              return (
                <div key={idx} className="mb-1">
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
