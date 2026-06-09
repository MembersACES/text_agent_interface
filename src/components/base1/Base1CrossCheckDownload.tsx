"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export function Base1CrossCheckDownload() {
  const [runId, setRunId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    const id = runId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/base1-crosscheck/${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}-savings-crosscheck.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
      <h3 className="text-sm font-semibold text-dark dark:text-white">
        Savings cross-check (staff)
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        Enter a run ID from <code className="text-[11px]">metadata.runId</code> on a staff process
        response (<code className="text-[11px]">?format=json&amp;includeStaffCrossCheck=1</code>).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={runId}
          onChange={(e) => setRunId(e.target.value)}
          placeholder="Run UUID"
          className="min-w-[240px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
        />
        <button
          type="button"
          onClick={() => void download()}
          disabled={loading || !runId.trim()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2"
        >
          <Download className="h-4 w-4" />
          {loading ? "Downloading…" : "Download XLSX"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
