"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchCommissionFiguresClientCount,
  fetchOriginReadySummary,
  fetchTrojanUniqueClientCount,
  type StreamMetricState,
} from "@/lib/invoicing-api";
import {
  formatAud,
  getInvoicingStream,
  INVOICING_STREAM_GROUPS,
  INVOICING_STREAMS,
  type InvoicingStream,
  type InvoicingStreamGroup,
  type InvoicingStreamId,
} from "@/lib/invoicing-streams";
import { InvoicingWorkspace } from "@/components/invoicing/InvoicingWorkspace";

const EMPTY_METRIC: StreamMetricState = {
  loading: false,
  error: false,
  primary: null,
  secondary: null,
};

function cadenceIntent(cadence: InvoicingStream["cadence"]): string {
  switch (cadence) {
    case "Recurring":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900";
    case "Monthly":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
    case "One-off":
      return "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900";
    case "Active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
    default:
      return "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-dark-3 dark:text-gray-300 dark:ring-dark-3";
  }
}

type Props = {
  token: string | undefined;
  onOpenStream: (id: InvoicingStreamId) => void;
};

export function InvoicingOverview({ token, onOpenStream }: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<InvoicingStreamGroup>("payments");
  const [bankRecTab, setBankRecTab] = useState<string | null>(
    getInvoicingStream("bank-rec")?.defaultTabGid ?? "0"
  );
  const [metrics, setMetrics] = useState<
    Partial<Record<InvoicingStreamId, StreamMetricState>>
  >({});
  const [reloadKey, setReloadKey] = useState(0);

  const loadMetrics = useCallback(async () => {
    if (!token) return;
    const tracked = INVOICING_STREAMS.filter((stream) => stream.metrics);
    setMetrics((prev) => {
      const next = { ...prev };
      for (const stream of tracked) {
        next[stream.id] = {
          loading: true,
          error: false,
          primary: prev[stream.id]?.primary ?? null,
          secondary: prev[stream.id]?.secondary ?? null,
        };
      }
      return next;
    });

    const results = await Promise.allSettled(
      tracked.map(async (stream): Promise<[InvoicingStreamId, StreamMetricState]> => {
        try {
          if (stream.metrics === "origin-ready" && stream.retailerKey) {
            const data = await fetchOriginReadySummary(
              token,
              stream.retailerKey as "origin-gas" | "origin-elec"
            );
            const noun = data.rowCount === 1 ? data.rowLabel : `${data.rowLabel}s`;
            return [
              stream.id,
              {
                loading: false,
                error: false,
                primary: `${formatAud(data.totalCommission)} ready`,
                secondary: `${data.rowCount} ${noun}`,
              },
            ];
          }
          if (stream.metrics === "commission-figures" && stream.retailerKey) {
            const count = await fetchCommissionFiguresClientCount(
              token,
              stream.retailerKey
            );
            return [
              stream.id,
              {
                loading: false,
                error: false,
                primary: `${count} ${count === 1 ? "client" : "clients"}`,
                secondary: "Commission figures",
              },
            ];
          }
          if (stream.metrics === "trojan-clients") {
            const count = await fetchTrojanUniqueClientCount(token);
            return [
              stream.id,
              {
                loading: false,
                error: false,
                primary: `${count} unique ${count === 1 ? "client" : "clients"}`,
                secondary: "All data",
              },
            ];
          }
          return [stream.id, EMPTY_METRIC];
        } catch {
          return [
            stream.id,
            { loading: false, error: true, primary: null, secondary: null },
          ];
        }
      })
    );

    setMetrics((prev) => {
      const next = { ...prev };
      for (const result of results) {
        if (result.status === "fulfilled") {
          const [id, state] = result.value;
          next[id] = state;
        }
      }
      return next;
    });
  }, [token]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics, reloadKey]);

  const bankRec = getInvoicingStream("bank-rec");
  const activeGroup =
    INVOICING_STREAM_GROUPS.find((item) => item.id === group) ??
    INVOICING_STREAM_GROUPS[0];

  const groupCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const counts: Record<InvoicingStreamGroup, number> = {
      retailer: 0,
      direct: 0,
      payments: 0,
    };
    for (const stream of INVOICING_STREAMS) {
      if (q) {
        const hay = `${stream.title} ${stream.shortLabel}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      counts[stream.group] += 1;
    }
    return counts;
  }, [query]);

  const visibleStreams = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INVOICING_STREAMS.filter((stream) => {
      if (stream.group !== group) return false;
      if (!q) return true;
      const hay = `${stream.title} ${stream.shortLabel}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, group]);

  function selectGroup(next: InvoicingStreamGroup) {
    setGroup(next);
  }

  function openStream(id: InvoicingStreamId) {
    if (id === "bank-rec") {
      setGroup("payments");
      return;
    }
    onOpenStream(id);
  }

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Invoicing categories"
        className="grid grid-cols-3 gap-1 rounded-xl border border-stroke bg-gray-100 p-1 dark:border-dark-3 dark:bg-dark-2"
      >
        {INVOICING_STREAM_GROUPS.map((item) => {
          const isActive = item.id === group;
          const count = groupCounts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectGroup(item.id)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-center transition-colors",
                isActive
                  ? "bg-white shadow-sm dark:bg-gray-dark"
                  : "text-gray-600 hover:text-dark dark:text-gray-400 dark:hover:text-white"
              )}
            >
              <span
                className={cn(
                  "block text-sm font-bold",
                  isActive ? "text-dark dark:text-white" : ""
                )}
              >
                {item.title}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-[11px]",
                  isActive
                    ? "text-gray-500 dark:text-gray-400"
                    : "text-gray-400 dark:text-gray-500"
                )}
              >
                {count} {count === 1 ? "stream" : "streams"}
              </span>
            </button>
          );
        })}
      </div>

      {group === "payments" && bankRec ? (
        <InvoicingWorkspace
          stream={bankRec}
          token={token}
          activeTabGid={bankRecTab}
          onBack={() => setGroup("retailer")}
          onTabChange={setBankRecTab}
          embedded
        />
      ) : (
        <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-dark dark:text-white">
            {activeGroup.title}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activeGroup.description}
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
            placeholder={`Search ${activeGroup.title.toLowerCase()}…`}
            className="w-full rounded-xl border border-stroke bg-white py-2 pl-9 pr-3 text-sm text-dark placeholder:text-gray-400 focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
      </div>

      {visibleStreams.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleStreams.map((stream) => {
            const metric = metrics[stream.id];
            return (
              <StreamCard
                key={stream.id}
                stream={stream}
                metric={metric}
                onOpen={() => openStream(stream.id)}
                onRetry={() => setReloadKey((n) => n + 1)}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {query.trim()
            ? `No ${activeGroup.title.toLowerCase()} streams match “${query.trim()}”.`
            : `No streams in ${activeGroup.title.toLowerCase()}.`}
        </p>
      )}
        </>
      )}
    </div>
  );
}

function StreamCard({
  stream,
  metric,
  onOpen,
  onRetry,
}: {
  stream: InvoicingStream;
  metric?: StreamMetricState;
  onOpen: () => void;
  onRetry: () => void;
}) {
  const hasSheet = Boolean(stream.sheet);
  const hasDocs = Boolean(stream.driveCategory);

  return (
    <div className="flex flex-col rounded-2xl border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-dark dark:text-white">
            {stream.title}
          </h3>
          {stream.cadence ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                cadenceIntent(stream.cadence)
              )}
            >
              {stream.cadence}
            </span>
          ) : null}
        </div>

        <div className="mt-3 min-h-[2.5rem]">
          {stream.metrics && metric?.loading ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading totals…
            </p>
          ) : stream.metrics && metric?.error ? (
            <p className="text-sm text-gray-500">Couldn’t load totals.</p>
          ) : metric?.primary ? (
            <div>
              <p className="text-base font-bold tabular-nums text-dark dark:text-white">
                {metric.primary}
              </p>
              {metric.secondary ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {metric.secondary}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Open workspace
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {hasSheet ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-3 dark:text-gray-300">
              <FileSpreadsheet className="h-3 w-3" aria-hidden />
              Sheet
            </span>
          ) : null}
          {hasDocs ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-3 dark:text-gray-300">
              <FolderOpen className="h-3 w-3" aria-hidden />
              PDFs
            </span>
          ) : null}
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-stroke pt-3 dark:border-dark-3">
        {stream.metrics && metric?.error ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-medium text-primary hover:underline"
          >
            Retry
          </button>
        ) : stream.dashboardHref ? (
          <Link
            href={stream.dashboardHref}
            className="text-xs font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Generate invoice
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Open
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
