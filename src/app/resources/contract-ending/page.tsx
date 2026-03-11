"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiBaseUrl, formatDateAustralian, formatDateDDMMYYYY, parseDateDDMMYYYYToISO } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { RefreshCw, AlertCircle, FileQuestion, CheckCircle2, CalendarClock, CalendarCheck, HelpCircle, Pencil, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ContractItem = {
  identifier: string;
  utility_type: string;
  contract_end_date: string | null;
  retailer: string;
  record_id?: string;
};

type SyncUpdate = {
  utility_type: string;
  identifier: string;
  identifier_label?: string;
  contract_end_date: string;
  source_sheet: string;
};

type ApiResponse = {
  contracts_with_end_date: ContractItem[];
  end_dates_undefined: ContractItem[];
  sync?: {
    updated_electricity: number;
    updated_gas: number;
    errors: string[];
    updates?: SyncUpdate[];
  } | null;
};

const UTILITY_TYPES = ["C&I Electricity", "C&I Gas"] as const;
const MONTHS = [
  { value: "", label: "All months" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleString("en-AU", { month: "long" }),
  })),
];

export default function ContractEndingPage() {
  const { data: session } = useSession();
  const token = (session as { id_token?: string; accessToken?: string })?.id_token
    ?? (session as { id_token?: string; accessToken?: string })?.accessToken;
  const { showToast } = useToast();
  const [contractsWithEndDate, setContractsWithEndDate] = useState<ContractItem[]>([]);
  const [endDatesUndefined, setEndDatesUndefined] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterUtilityType, setFilterUtilityType] = useState<string>("");
  const [lastSync, setLastSync] = useState<ApiResponse["sync"] | null>(null);
  const [activeTab, setActiveTab] = useState<"ending" | "ended" | "undefined">("ending");
  const [editingItem, setEditingItem] = useState<ContractItem | null>(null);
  const [editDateValue, setEditDateValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const fetchData = useCallback(
    async (doSync = false) => {
      if (!token) {
        setError("Please sign in to load contract data.");
        setLoading(false);
        return;
      }
      if (doSync) setSyncing(true);
      else setLoading(true);
      setError(null);
      try {
        const base = getApiBaseUrl();
        const params = new URLSearchParams();
        if (doSync) params.set("sync", "true");
        const url = `${base}/api/resources/contract-ending${params.toString() ? `?${params.toString()}` : ""}`;
        console.log("[Contract Ending] fetch", doSync ? "sync=true" : "refresh", url);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || `Request failed: ${res.status}`);
        }
        const data: ApiResponse = await res.json();
        const withDate = data.contracts_with_end_date?.length ?? 0;
        const undefinedCount = data.end_dates_undefined?.length ?? 0;
        console.log("[Contract Ending] response OK:", { withDate, undefinedCount, sync: data.sync ?? null });
        setContractsWithEndDate(data.contracts_with_end_date ?? []);
        setEndDatesUndefined(data.end_dates_undefined ?? []);
        if (doSync && data.sync) {
          setLastSync(data.sync);
          const { updated_electricity, updated_gas, errors, updates = [] } = data.sync;
          console.log("[Contract Ending] sync result:", { updated_electricity, updated_gas, errors, updates });
          const msg = [
            updates.length > 0
              ? `Updated ${updated_electricity} C&I E, ${updated_gas} C&I G from sheet.`
              : "No new end dates to sync.",
            errors.length ? `Errors: ${errors.join("; ")}` : "",
          ]
            .filter(Boolean)
            .join(" ");
          showToast(msg, errors.length ? "error" : "success");
        } else if (!doSync) {
          setLastSync(null);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load contract data.";
        console.error("[Contract Ending] fetch error:", e);
        setError(message);
        showToast(message, "error");
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [token, showToast]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const filteredWithEndDate = useMemo(() => {
    let list = contractsWithEndDate;
    if (filterUtilityType) {
      list = list.filter((c) => c.utility_type === filterUtilityType);
    }
    if (filterMonth || filterYear) {
      list = list.filter((c) => {
        if (!c.contract_end_date) return false;
        const [y, m] = c.contract_end_date.split("-");
        if (filterMonth && m !== filterMonth) return false;
        if (filterYear && y !== filterYear) return false;
        return true;
      });
    }
    return list;
  }, [contractsWithEndDate, filterMonth, filterYear, filterUtilityType]);

  const contractsEnding = useMemo(() => {
    return filteredWithEndDate.filter((c) => c.contract_end_date && c.contract_end_date >= today);
  }, [filteredWithEndDate, today]);

  const contractsEnded = useMemo(() => {
    return filteredWithEndDate.filter((c) => c.contract_end_date && c.contract_end_date < today);
  }, [filteredWithEndDate, today]);

  const currentMonth = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, []);

  const contractsEndingThisMonth = useMemo(() => {
    return contractsEnding.filter((c) => {
      if (!c.contract_end_date) return false;
      const [y, m] = c.contract_end_date.split("-").map(Number);
      return y === currentMonth.year && m === currentMonth.month;
    });
  }, [contractsEnding, currentMonth]);

  const filteredUndefined = useMemo(() => {
    if (!filterUtilityType) return endDatesUndefined;
    return endDatesUndefined.filter((c) => c.utility_type === filterUtilityType);
  }, [endDatesUndefined, filterUtilityType]);

  const years = useMemo(() => {
    const set = new Set<string>();
    contractsWithEndDate.forEach((c) => {
      if (c.contract_end_date) set.add(c.contract_end_date.slice(0, 4));
    });
    return ["", ...Array.from(set).sort()];
  }, [contractsWithEndDate]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem || !token) return;
    const iso = parseDateDDMMYYYYToISO(editDateValue);
    if (!iso) {
      showToast("Invalid date. Use dd-mm-yyyy (e.g. 31-12-2027).", "error");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/resources/contract-ending/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          utility_type: editingItem.utility_type,
          identifier: editingItem.identifier,
          contract_end_date: iso,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail ?? "Update failed");
      }
      showToast("Contract end date updated", "success");
      setEditingItem(null);
      fetchData(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    } finally {
      setEditSaving(false);
    }
  }, [editingItem, editDateValue, token, showToast, fetchData]);

  const openEdit = useCallback((item: ContractItem) => {
    setEditingItem(item);
    setEditDateValue(formatDateDDMMYYYY(item.contract_end_date));
  }, []);

  const tabs = [
    { id: "ending" as const, label: "Contracts ending", count: contractsEnding.length, icon: CalendarClock },
    { id: "ended" as const, label: "Contracts ended", count: contractsEnded.length, icon: CalendarCheck },
    { id: "undefined" as const, label: "End dates undefined", count: filteredUndefined.length, icon: HelpCircle },
  ];

  const renderTable = (rows: ContractItem[], showDate: boolean, showEdit?: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Identifier (NMI / MRIN)</TableHead>
          <TableHead>Utility type</TableHead>
          {showDate && <TableHead>Contract end date</TableHead>}
          {showEdit && <TableHead className="w-20 text-right">Edit</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={`${row.utility_type}-${row.identifier}-${i}`}>
            <TableCell className="font-mono text-sm">{row.identifier}</TableCell>
            <TableCell>{row.utility_type}</TableCell>
            {showDate && (
              <TableCell>
                {row.contract_end_date ? formatDateAustralian(row.contract_end_date) : "—"}
              </TableCell>
            )}
            {showEdit && (
              <TableCell className="text-right">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-stroke dark:border-dark-3 hover:bg-gray-100 dark:hover:bg-dark-2 text-xs text-gray-700 dark:text-gray-300"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4 max-w-6xl">
      <Breadcrumb />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-heading-3 font-bold text-dark dark:text-white">
            Contract Ending / Expiring
          </h1>
          <p className="text-body-sm text-gray-600 dark:text-gray-400 mt-0.5">
            C&I Electricity and C&I Gas. Sync from Google Sheet to fill missing dates in Airtable.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchData(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark-2 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading || syncing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Sync from Sheet & Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {lastSync && (
        <div className="rounded-lg border border-stroke dark:border-dark-3 bg-slate-50/50 dark:bg-dark-2/50 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5 font-medium text-dark dark:text-white">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Last sync: C&I E {lastSync.updated_electricity} updated, C&I G {lastSync.updated_gas} updated
            {lastSync.errors?.length ? ` · ${lastSync.errors.length} error(s)` : ""}
          </span>
          {lastSync.updates && lastSync.updates.length > 0 && (
            <span className="text-gray-500 dark:text-gray-500">
              {lastSync.updates.length} update(s) applied
            </span>
          )}
        </div>
      )}

      {contractsEndingThisMonth.length > 0 && !loading && (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {contractsEndingThisMonth.length} contract{contractsEndingThisMonth.length !== 1 ? "s" : ""} ending this month
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {new Date(currentMonth.year, currentMonth.month - 1).toLocaleString("en-AU", { month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("ending")}
            className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
          >
            View in table →
          </button>
        </div>
      )}

      {/* Filters + Tabs in one card */}
      <Card className="border border-stroke dark:border-dark-3">
        <CardContent className="p-0">
          <div className="flex flex-wrap gap-4 items-center px-4 pt-4 pb-2 border-b border-stroke dark:border-dark-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              Utility type
              <select
                value={filterUtilityType}
                onChange={(e) => setFilterUtilityType(e.target.value)}
                className="border border-stroke dark:border-dark-3 rounded-md px-2 py-1.5 bg-white dark:bg-gray-dark text-dark dark:text-white text-sm"
              >
                <option value="">All</option>
                {UTILITY_TYPES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              Month
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="border border-stroke dark:border-dark-3 rounded-md px-2 py-1.5 bg-white dark:bg-gray-dark text-dark dark:text-white text-sm"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              Year
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="border border-stroke dark:border-dark-3 rounded-md px-2 py-1.5 bg-white dark:bg-gray-dark text-dark dark:text-white text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y || "All years"}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex border-b border-stroke dark:border-dark-3">
            {tabs.map(({ id, label, count, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  activeTab === id ? "bg-primary/15 text-primary" : "bg-gray-200 dark:bg-dark-3 text-gray-600 dark:text-gray-400"
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>
          <div className="p-4 min-h-[200px]">
            {loading ? (
              <p className="text-sm text-gray-500 py-4">Loading…</p>
            ) : activeTab === "ending" ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Contracts with end date on or after today (filter by month/year to see ending in a specific period).
                </p>
                {contractsEnding.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No contracts ending in the future match the filters.</p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    {renderTable(contractsEnding, true, true)}
                  </div>
                )}
              </>
            ) : activeTab === "ended" ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Contracts whose end date has already passed (filter by month/year to see ended in a specific period).
                </p>
                {contractsEnded.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No past contracts match the filters.</p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    {renderTable(contractsEnded, true, true)}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  No contract end date in Airtable. Use &quot;Sync from Sheet & Refresh&quot; to pull dates from the Member ACES Data spreadsheet, or update in Airtable.
                </p>
                {filteredUndefined.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">None.</p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    {renderTable(filteredUndefined, false, true)}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        open={!!editingItem}
        onClose={() => {
          if (!editSaving) setEditingItem(null);
        }}
        title="Edit contract end date"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-3 py-1.5 rounded border border-stroke dark:border-dark-3 hover:bg-gray-100 dark:hover:bg-dark-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={editSaving}
              className="px-3 py-1.5 rounded bg-primary text-white hover:opacity-90 disabled:opacity-50 text-sm"
            >
              {editSaving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        {editingItem && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-mono">{editingItem.identifier}</span> · {editingItem.utility_type}
            </p>
            <label className="block text-sm font-medium text-dark dark:text-white">
              Contract end date (dd-mm-yyyy)
            </label>
            <input
              type="text"
              value={editDateValue}
              onChange={(e) => setEditDateValue(e.target.value)}
              placeholder="e.g. 31-12-2027"
              className="w-full border border-stroke dark:border-dark-3 rounded-md px-3 py-2 bg-white dark:bg-gray-dark text-dark dark:text-white text-sm"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
