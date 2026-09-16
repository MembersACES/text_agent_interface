"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchCommissionFiguresClientCount,
  fetchOriginReadySummary,
  fetchRetailerSheetTabs,
  fetchTrojanUniqueClientCount,
} from "@/lib/invoicing-api";
import {
  formatAud,
  mergeSheetTabs,
  tabLabel,
  toEmbedUrl,
  toSheetUrl,
  type InvoicingStream,
} from "@/lib/invoicing-streams";
import { InvoicingPdfDrawer } from "@/components/invoicing/InvoicingPdfDrawer";
import { InvoicingOmsInvoiceTable } from "@/components/invoicing/InvoicingOmsInvoiceTable";

type Props = {
  stream: InvoicingStream;
  token: string | undefined;
  activeTabGid: string | null;
  onBack: () => void;
  onTabChange: (gid: string) => void;
  /** Skip back-link chrome when shown under category tabs. */
  embedded?: boolean;
};

export function InvoicingWorkspace({
  stream,
  token,
  activeTabGid,
  onBack,
  onTabChange,
  embedded = false,
}: Props) {
  const [liveTabs, setLiveTabs] = useState<{ name: string; gid: string }[] | null>(
    null
  );
  const [metricText, setMetricText] = useState<string | null>(null);
  const [metricLoading, setMetricLoading] = useState(false);
  const [metricError, setMetricError] = useState(false);
  const [pdfsOpen, setPdfsOpen] = useState(Boolean(stream.driveCategory));
  const [sheetOpen, setSheetOpen] = useState(stream.id !== "one-month-savings");
  const isOms = stream.id === "one-month-savings";

  const tabs = useMemo(
    () => mergeSheetTabs(stream.sheet?.tabs ?? [], liveTabs),
    [stream.sheet?.tabs, liveTabs]
  );

  const effectiveGid =
    activeTabGid ??
    stream.defaultTabGid ??
    tabs.find((tab) => tab.gid)?.gid ??
    undefined;

  const previewUrl = stream.sheet
    ? toEmbedUrl(stream.sheet.sheetIdOrUrl, effectiveGid)
    : "";
  const openUrl = stream.sheet
    ? toSheetUrl(stream.sheet.sheetIdOrUrl, effectiveGid)
    : "";

  useEffect(() => {
    setPdfsOpen(isOms ? false : Boolean(stream.driveCategory));
    setSheetOpen(!isOms);
    setLiveTabs(null);
    setMetricText(null);
    setMetricError(false);
  }, [stream.id, stream.driveCategory, isOms]);

  useEffect(() => {
    if (!stream.retailerKey || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const tabsLive = await fetchRetailerSheetTabs(token, stream.retailerKey!);
        if (!cancelled) setLiveTabs(tabsLive);
      } catch {
        if (!cancelled) setLiveTabs(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stream.retailerKey, token]);

  useEffect(() => {
    if (!stream.metrics || !token) {
      setMetricText(null);
      setMetricLoading(false);
      setMetricError(false);
      return;
    }
    let cancelled = false;
    setMetricLoading(true);
    setMetricError(false);
    (async () => {
      try {
        if (stream.metrics === "origin-ready" && stream.retailerKey) {
          const data = await fetchOriginReadySummary(
            token,
            stream.retailerKey as "origin-gas" | "origin-elec"
          );
          const noun = data.rowCount === 1 ? data.rowLabel : `${data.rowLabel}s`;
          if (!cancelled) {
            setMetricText(
              `${data.rowCount} ${noun} · ${formatAud(data.totalCommission)} ready`
            );
          }
        } else if (stream.metrics === "commission-figures" && stream.retailerKey) {
          const count = await fetchCommissionFiguresClientCount(
            token,
            stream.retailerKey
          );
          if (!cancelled) {
            setMetricText(
              `${count} ${count === 1 ? "client" : "clients"} in commission figures`
            );
          }
        } else if (stream.metrics === "trojan-clients") {
          const count = await fetchTrojanUniqueClientCount(token);
          if (!cancelled) {
            setMetricText(
              `${count} unique ${count === 1 ? "client" : "clients"}`
            );
          }
        }
      } catch {
        if (!cancelled) {
          setMetricText(null);
          setMetricError(true);
        }
      } finally {
        if (!cancelled) setMetricLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stream.id, stream.metrics, stream.retailerKey, token]);

  const hasSheet = Boolean(stream.sheet);
  const showPdfDrawer = Boolean(stream.driveCategory) && pdfsOpen;
  const pdfFull = !hasSheet && showPdfDrawer;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {embedded ? null : (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              All invoicing
            </button>
          )}
          <div className={cn("flex flex-wrap items-center gap-2", !embedded && "mt-1")}>
            <h1
              className={cn(
                "font-bold tracking-tight text-dark dark:text-white",
                embedded ? "text-lg" : "text-heading-5"
              )}
            >
              {stream.title}
            </h1>
            {stream.cadence ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-inset ring-gray-200 dark:bg-dark-3 dark:text-gray-300 dark:ring-dark-3">
                {stream.cadence}
              </span>
            ) : null}
          </div>
          {embedded && !metricLoading && !metricError && !metricText ? null : (
            <p className="mt-1 min-h-[1.25rem] text-sm text-gray-600 dark:text-gray-400">
              {metricLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading totals…
                </span>
              ) : metricError ? (
                "Couldn’t load totals — open the sheet to continue."
              ) : (
                metricText ??
                (hasSheet
                  ? isOms
                    ? "Update Generated / Sent / Paid on each invoice below."
                    : "Sheet and issued PDFs for this stream."
                  : "Issued PDFs for this stream.")
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stream.dashboardHref ? (
            <Link
              href={stream.dashboardHref}
              className="rounded-lg border border-stroke bg-white px-3 py-1.5 text-xs font-semibold text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
            >
              Generate invoice
            </Link>
          ) : null}
          {stream.driveCategory ? (
            <button
              type="button"
              onClick={() => setPdfsOpen((open) => !open)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold",
                pdfsOpen
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-stroke bg-white text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
              )}
            >
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
              PDFs
            </button>
          ) : null}
          {hasSheet && isOms ? (
            <button
              type="button"
              onClick={() => setSheetOpen((open) => !open)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold",
                sheetOpen
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-stroke bg-white text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
              )}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
              Sheet
            </button>
          ) : null}
          {openUrl ? (
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
            >
              Open in Sheets
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      {hasSheet && sheetOpen && tabs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const isActive = tab.gid !== undefined && tab.gid === effectiveGid;
            const hasGid = Boolean(tab.gid);
            return (
              <button
                key={`${tab.name}-${tab.gid ?? "none"}`}
                type="button"
                disabled={!hasGid}
                onClick={() => {
                  if (tab.gid) onTabChange(tab.gid);
                }}
                title={hasGid ? tab.name : `${tab.name} (no tab id configured)`}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-dark text-white dark:bg-white dark:text-dark"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-2 dark:text-gray-300 dark:hover:bg-dark-3",
                  !hasGid && "cursor-not-allowed opacity-50"
                )}
              >
                {tabLabel(tab)}
              </button>
            );
          })}
        </div>
      ) : null}

      {isOms ? <InvoicingOmsInvoiceTable token={token} /> : null}

      {pdfFull && stream.driveCategory ? (
        <InvoicingPdfDrawer token={token} category={stream.driveCategory} layout="full" />
      ) : sheetOpen || showPdfDrawer ? (
        <div
          className={cn(
            "grid min-h-0 gap-3",
            showPdfDrawer ? "xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]" : ""
          )}
        >
          {hasSheet && sheetOpen ? (
            <div className="min-w-0 overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
              {previewUrl ? (
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  title={`Sheet: ${stream.title}`}
                  className={`${embedded ? "h-[calc(100vh-16.5rem)]" : "h-[calc(100vh-14.5rem)]"} w-full border-0`}
                />
              ) : (
                <div className={`flex ${embedded ? "h-[calc(100vh-16.5rem)]" : "h-[calc(100vh-14.5rem)]"} items-center justify-center text-sm text-gray-500`}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 opacity-50" />
                  No sheet selected.
                </div>
              )}
            </div>
          ) : null}

          {showPdfDrawer && stream.driveCategory ? (
            <div className="h-[calc(100vh-14.5rem)] overflow-hidden rounded-xl border border-stroke dark:border-dark-3">
              <InvoicingPdfDrawer
                token={token}
                category={stream.driveCategory}
                layout="drawer"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
