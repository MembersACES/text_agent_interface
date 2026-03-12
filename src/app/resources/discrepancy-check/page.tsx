"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
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
import { getApiBaseUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { RefreshCw, AlertCircle, ExternalLink } from "lucide-react";

const SHEET_ID = "1l_ShkAcpS1HBqX8EdXLEVmn3pkliVGwsskkkI0GlLho";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=379463966`;

export type DiscrepancyRow = {
  discrepancy_type: string;
  utility_identifier: string;
  linked_business_name: string;
  invoice_period: string;
  invoice_rate: string;
  contract_period: string;
  contract_rate: string;
  rate_difference: string;
  pct_difference: string;
  annual_quantity_gj: string;
  annual_potential_overcharge: string;
  take_or_pay_invoice: string;
};

type ApiResponse = {
  rows: DiscrepancyRow[];
  utility_type: string;
};

export default function DiscrepancyCheckPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token = (session as { id_token?: string; accessToken?: string })?.id_token
    ?? (session as { id_token?: string; accessToken?: string })?.accessToken;
  const { showToast } = useToast();

  const [rows, setRows] = useState<DiscrepancyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialBusinessName = searchParams.get("business_name") ?? searchParams.get("businessName") ?? "";
  const initialIdentifier = searchParams.get("identifier") ?? searchParams.get("utility_identifier") ?? "";
  const [filterBusinessName, setFilterBusinessName] = useState(initialBusinessName);
  const [filterIdentifier, setFilterIdentifier] = useState(initialIdentifier);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError("Please sign in to load discrepancy data.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = getApiBaseUrl();
      const params = new URLSearchParams();
      const businessNameParam = filterBusinessName.trim();
      if (businessNameParam) params.set("business_name", businessNameParam);
      const url = `${base}/api/resources/discrepancy-check${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || `Request failed: ${res.status}`);
      }
      const data: ApiResponse = await res.json();
      setRows(data.rows ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load discrepancy data.";
      setError(message);
      showToast(message, "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, filterBusinessName, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRows = useMemo(() => {
    let list = rows;
    const idFilter = filterIdentifier.trim().toLowerCase();
    if (idFilter) {
      list = list.filter((r) =>
        (r.utility_identifier ?? "").toLowerCase().includes(idFilter)
      );
    }
    return list;
  }, [rows, filterIdentifier]);

  /** Parse "DD/MM/YYYY" or "DD/MM/YYYY-DD/MM/YYYY" to get end date for sorting (most recent first). */
  const sortedRows = useMemo(() => {
    const parseEndDate = (period: string): number => {
      if (!period || !period.trim()) return 0;
      const part = period.includes("-") ? period.split("-")[1]?.trim() : period.trim();
      const [d, m, y] = (part ?? "").split("/").map(Number);
      if (!y || !m || !d) return 0;
      const date = new Date(y, m - 1, d);
      return date.getTime();
    };
    return [...filteredRows].sort((a, b) => {
      const timeA = parseEndDate(a.invoice_period ?? "");
      const timeB = parseEndDate(b.invoice_period ?? "");
      return timeB - timeA;
    });
  }, [filteredRows]);

  return (
    <div className="space-y-4 max-w-6xl">
      <Breadcrumb />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-heading-3 font-bold text-dark dark:text-white">
            C&I Gas Discrepancy Check
          </h1>
          <p className="text-body-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Rate and contract discrepancies from the C&I Gas Descrepancy Check sheet. Filter by business name or utility identifier.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark-2 text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            Open Google Sheet
          </a>
          <button
            type="button"
            onClick={() => fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark-2 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card className="border border-stroke dark:border-dark-3">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              Business name
              <input
                type="text"
                value={filterBusinessName}
                onChange={(e) => setFilterBusinessName(e.target.value)}
                placeholder="Filter by Linked Business Name"
                className="border border-stroke dark:border-dark-3 rounded-md px-2 py-1.5 bg-white dark:bg-gray-dark text-dark dark:text-white text-sm min-w-[180px]"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              Utility identifier (MRIN)
              <input
                type="text"
                value={filterIdentifier}
                onChange={(e) => setFilterIdentifier(e.target.value)}
                placeholder="Filter by identifier"
                className="border border-stroke dark:border-dark-3 rounded-md px-2 py-1.5 bg-white dark:bg-gray-dark text-dark dark:text-white text-sm min-w-[140px]"
              />
            </label>
            {(filterBusinessName.trim() || filterIdentifier.trim()) && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filterBusinessName.trim()
                  ? "Business filter applied on server. "
                  : ""}
                {sortedRows.length} row(s) after identifier filter. Sorted by most recent invoice period first.
              </span>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-gray-500 py-4">Loading…</p>
          ) : sortedRows.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">
              No discrepancy rows match the filters. Try clearing filters or check the sheet.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Sorted by most recent invoice period at top.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Discrepancy type</TableHead>
                    <TableHead>Utility ID</TableHead>
                    <TableHead>Linked business</TableHead>
                    <TableHead>Invoice period</TableHead>
                    <TableHead>Invoice rate</TableHead>
                    <TableHead>Contract period</TableHead>
                    <TableHead>Contract rate</TableHead>
                    <TableHead>Rate diff.</TableHead>
                    <TableHead>% diff.</TableHead>
                    <TableHead>Annual Qty (GJ)</TableHead>
                    <TableHead>Annual potential overcharge</TableHead>
                    <TableHead>Take or Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((r, i) => (
                    <TableRow key={`${r.utility_identifier}-${i}`}>
                      <TableCell className="text-sm">{r.discrepancy_type || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{r.utility_identifier || "—"}</TableCell>
                      <TableCell className="text-sm">{r.linked_business_name || "—"}</TableCell>
                      <TableCell className="text-sm">{r.invoice_period || "—"}</TableCell>
                      <TableCell className="text-sm">{r.invoice_rate || "—"}</TableCell>
                      <TableCell className="text-sm">{r.contract_period || "—"}</TableCell>
                      <TableCell className="text-sm">{r.contract_rate || "—"}</TableCell>
                      <TableCell className="text-sm">{r.rate_difference || "—"}</TableCell>
                      <TableCell className="text-sm">{r.pct_difference || "—"}</TableCell>
                      <TableCell className="text-sm">{r.annual_quantity_gj || "—"}</TableCell>
                      <TableCell className="text-sm">{r.annual_potential_overcharge || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[120px] truncate" title={r.take_or_pay_invoice || ""}>
                        {r.take_or_pay_invoice || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
