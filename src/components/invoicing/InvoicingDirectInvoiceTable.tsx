"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  fetchDirectClientInvoices,
  OMS_INVOICE_STATUSES,
  updateDirectClientInvoiceStatus,
  type DirectInvoiceRow,
  type DirectInvoiceStatus,
} from "@/lib/invoicing-api";
import { formatAud, type InvoicingStream } from "@/lib/invoicing-streams";

const STATUS_FILTERS = ["All", ...OMS_INVOICE_STATUSES] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function normalizeStatus(value: string): DirectInvoiceStatus {
  const match = OMS_INVOICE_STATUSES.find(
    (status) => status.toLowerCase() === value.trim().toLowerCase()
  );
  return match ?? "Generated";
}

function statusClass(status: string): string {
  switch (normalizeStatus(status)) {
    case "Paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "Sent":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
  }
}

function rowKey(inv: DirectInvoiceRow): string {
  return `${inv.business_name}::${inv.invoice_number}::${inv.invoice_file_id || ""}`;
}

type Props = {
  token: string | undefined;
  stream: InvoicingStream;
};

export function InvoicingDirectInvoiceTable({ token, stream }: Props) {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<DirectInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("Sign in required to load invoices.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchDirectClientInvoices(token, stream.id);
      setInvoices(rows);
    } catch {
      setError(`Couldn’t load ${stream.title} invoices.`);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [token, stream.id, stream.title]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const next: Record<DirectInvoiceStatus, number> = {
      Generated: 0,
      Sent: 0,
      Paid: 0,
    };
    for (const inv of invoices) {
      next[normalizeStatus(inv.status)] += 1;
    }
    return next;
  }, [invoices]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "All" && normalizeStatus(inv.status) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const hay = `${inv.business_name} ${inv.invoice_number}`.toLowerCase();
      return hay.includes(q);
    });
  }, [invoices, query, statusFilter]);

  async function onStatusChange(inv: DirectInvoiceRow, status: DirectInvoiceStatus) {
    const key = rowKey(inv);
    const previous = inv.status;
    setInvoices((prev) =>
      prev.map((row) => (rowKey(row) === key ? { ...row, status } : row))
    );
    setSavingKey(key);
    try {
      await updateDirectClientInvoiceStatus({
        stream: stream.id,
        business_name: inv.business_name,
        invoice_number: inv.invoice_number,
        status,
        invoice_file_id: inv.invoice_file_id,
      });
      showToast(`${inv.invoice_number} marked ${status}`, "success");
    } catch (e) {
      setInvoices((prev) =>
        prev.map((row) =>
          rowKey(row) === key ? { ...row, status: previous } : row
        )
      );
      showToast(
        e instanceof Error ? e.message : "Failed to update status",
        "error"
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke px-4 py-3 dark:border-dark-3">
        <div>
          <h2 className="text-sm font-bold text-dark dark:text-white">
            {stream.title} invoices
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Change status here — Generated / Sent / Paid.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client or invoice…"
            className="w-full rounded-lg border border-stroke bg-white py-1.5 pl-9 pr-3 text-xs text-dark placeholder:text-gray-400 focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-stroke px-4 py-2 dark:border-dark-3">
        {STATUS_FILTERS.map((filter) => {
          const count =
            filter === "All"
              ? invoices.length
              : counts[filter as DirectInvoiceStatus];
          const isActive = statusFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium",
                isActive
                  ? "bg-dark text-white dark:bg-white dark:text-dark"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-2 dark:text-gray-300 dark:hover:bg-dark-3"
              )}
            >
              {filter}
              <span className="ml-1 tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 px-4 py-8 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoices…
        </p>
      ) : error ? (
        <div className="px-4 py-6 text-sm text-gray-600 dark:text-gray-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="px-4 py-8 text-sm text-gray-500">
          {query.trim() || statusFilter !== "All"
            ? "No invoices match this filter."
            : `No ${stream.title} invoices found.`}
        </p>
      ) : (
        <div className="max-h-[min(52vh,560px)] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-dark-2 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 font-semibold">Client</th>
                <th className="px-4 py-2 font-semibold">Invoice</th>
                <th className="px-4 py-2 font-semibold">Due</th>
                <th className="px-4 py-2 font-semibold">Amount</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke dark:divide-dark-3">
              {visible.map((inv) => {
                const key = rowKey(inv);
                const saving = savingKey === key;
                const status = normalizeStatus(inv.status);
                const solutions = (inv.line_items || [])
                  .map((item) => item.solution_label)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <tr key={key} className="align-top">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-dark dark:text-white">
                        {inv.business_name}
                      </p>
                      {solutions ? (
                        <p className="text-[11px] text-gray-500">{solutions}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-dark dark:text-white">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300">
                      {inv.due_date || "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-xs font-semibold text-dark dark:text-white">
                      {inv.total_amount ? formatAud(inv.total_amount) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={status}
                        disabled={saving}
                        onChange={(e) =>
                          void onStatusChange(
                            inv,
                            e.target.value as DirectInvoiceStatus
                          )
                        }
                        className={cn(
                          "rounded-md border px-2 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60",
                          statusClass(status)
                        )}
                      >
                        {OMS_INVOICE_STATUSES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      {inv.invoice_file_id ? (
                        <a
                          href={`https://drive.google.com/file/d/${inv.invoice_file_id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
