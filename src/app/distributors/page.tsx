"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ExternalLink, FolderPlus, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchDistributorMasterList,
  type DistributorMasterList,
  type DistributorMasterRow,
} from "@/lib/member-folder-api";

const DISPLAY_COLUMNS: { key: string; label: string }[] = [
  { key: "Distributor Business", label: "Distributor" },
  { key: "Trading As", label: "Trading As" },
  { key: "Contact Name", label: "Contact" },
  { key: "Email", label: "Email" },
  { key: "Phone", label: "Phone" },
  { key: "Mobile", label: "Mobile" },
  { key: "State", label: "State" },
  { key: "Status", label: "Status" },
  { key: "Start Date", label: "Start" },
  { key: "Drive Folder URL", label: "Folder" },
  { key: "Agreement File URL", label: "Agreement" },
];

function cell(row: DistributorMasterRow, key: string): string {
  return String(row[key] ?? "").trim();
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export default function DistributorsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { accessToken?: string } | null)?.accessToken ??
    "";
  const accessToken =
    (session as { accessToken?: string } | null)?.accessToken ?? "";

  const [list, setList] = useState<DistributorMasterList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setList(await fetchDistributorMasterList(token, accessToken));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [token, accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const rows = list?.rows ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      Object.entries(row).some(
        ([key, value]) =>
          key !== "_row_number" && String(value ?? "").toLowerCase().includes(q),
      ),
    );
  }, [list, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        pageName="Distributors"
        title="Distributors"
        description="Live Distributor Master List — names, contacts, and Drive folders."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => void load()}
              disabled={loading || !token}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button
              onClick={() => router.push("/distributor-folder-creation")}
              leftIcon={<FolderPlus className="h-4 w-4" />}
            >
              New from agreement
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search distributors…"
            className="pl-9"
          />
        </div>
        {list?.spreadsheet_url ? (
          <a
            href={list.spreadsheet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open sheet <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      {!token ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-dark-3 dark:bg-dark-2 dark:text-gray-400">
          Sign in to view distributors.
        </p>
      ) : loading && !list ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-medium">{error}</p>
          <Button className="mt-2" variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-dark-3 dark:bg-dark-2 dark:text-gray-400">
          {query.trim()
            ? "No distributors match that search."
            : "No distributors on the master list yet."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-dark-3">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-dark-2">
                {DISPLAY_COLUMNS.map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap font-semibold">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={String(row._row_number ?? cell(row, "Distributor Business"))}>
                  {DISPLAY_COLUMNS.map((col) => {
                    const value = cell(row, col.key);
                    if (col.key === "Drive Folder URL" || col.key === "Agreement File URL") {
                      return (
                        <TableCell key={col.key}>
                          {isHttpUrl(value) ? (
                            <a
                              href={value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={col.key} className={col.key === "Email" ? "max-w-[220px] truncate" : undefined}>
                        {value || "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {list && !loading ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filtered.length}
          {query.trim() ? ` of ${list.rows.length}` : ""} distributor
          {filtered.length === 1 ? "" : "s"}
          {list.tab ? ` · ${list.tab}` : ""}
        </p>
      ) : null}
    </div>
  );
}
