"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchSheetPreview,
  formatPreviewColumnLabel,
  latestRowFingerprint,
  latestRowMatchesBusiness,
  type SheetPreviewResponse,
  type SheetPreviewRow,
} from "@/lib/sheet-preview-api";
import { cn } from "@/lib/utils";

const DEFAULT_POLL_MS = 2500;
const DEFAULT_MAX_POLL_MS = 90_000;

export type SheetPreviewStatus = "idle" | "loading" | "waiting" | "updated" | "matched" | "timeout" | "error";

type MemberAcesSheetPreviewProps = {
  utilityType: string;
  token: string;
  /** When set, highlight when row 2 matches this business name. */
  expectedBusinessName?: string;
  /** Poll until the latest row changes or matches expected business name. */
  autoPoll?: boolean;
  pollIntervalMs?: number;
  maxPollMs?: number;
  rowCount?: number;
  className?: string;
  /** Bump to force an immediate refresh (e.g. parent Refresh button). */
  refreshKey?: number;
  onPreviewChange?: (preview: SheetPreviewResponse | null) => void;
  onStatusChange?: (status: SheetPreviewStatus) => void;
  /** Fired when row 2 changes after auto-poll starts, or matches expected business. */
  onLatestRowReady?: (preview: SheetPreviewResponse) => void;
  /** Allow clicking rows to select one (e.g. pick which LOA row to confirm). */
  selectable?: boolean;
  selectedRowNumber?: number | null;
  onRowSelect?: (row: SheetPreviewRow) => void;
  /** Rendered between the preview header and the table (e.g. invoice upload). */
  toolbarExtra?: React.ReactNode;
};

export function MemberAcesSheetPreview({
  utilityType,
  token,
  expectedBusinessName = "",
  autoPoll = false,
  pollIntervalMs = DEFAULT_POLL_MS,
  maxPollMs = DEFAULT_MAX_POLL_MS,
  rowCount = 5,
  className,
  refreshKey = 0,
  onPreviewChange,
  onStatusChange,
  onLatestRowReady,
  selectable = false,
  selectedRowNumber = null,
  onRowSelect,
  toolbarExtra,
}: MemberAcesSheetPreviewProps) {
  const [preview, setPreview] = useState<SheetPreviewResponse | null>(null);
  const [status, setStatus] = useState<SheetPreviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedLabel, setLastFetchedLabel] = useState<string | null>(null);

  const baselineRef = useRef<string | null>(null);
  const pollStartedAtRef = useRef<number | null>(null);
  const readyNotifiedRef = useRef(false);
  const initialSelectDoneRef = useRef(false);
  const lastPushedRowFingerprintRef = useRef<string>("");

  const updateStatus = useCallback(
    (next: SheetPreviewStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange],
  );

  const loadPreview = useCallback(
    async (opts?: { isPoll?: boolean }) => {
      if (!token) {
        updateStatus("error");
        setError("Authentication required. Please sign in again.");
        return null;
      }

      if (!opts?.isPoll) {
        updateStatus("loading");
        setError(null);
      }

      try {
        const data = await fetchSheetPreview(utilityType, token, rowCount);
        setPreview(data);
        onPreviewChange?.(data);

        const fetched = new Date(data.fetched_at);
        setLastFetchedLabel(
          Number.isNaN(fetched.getTime())
            ? "just now"
            : fetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        );

        const fingerprint = latestRowFingerprint(data);
        const hasLatestData = fingerprint.length > 0;
        const matchesBusiness =
          !!expectedBusinessName && latestRowMatchesBusiness(data, expectedBusinessName);

        if (autoPoll && pollStartedAtRef.current !== null) {
          const baseline = baselineRef.current ?? "";
          const changed = hasLatestData && fingerprint !== baseline;
          if (matchesBusiness || (changed && baseline !== "")) {
            updateStatus(matchesBusiness ? "matched" : "updated");
            if (!readyNotifiedRef.current) {
              readyNotifiedRef.current = true;
              onLatestRowReady?.(data);
            }
          } else if (!hasLatestData) {
            updateStatus("waiting");
          } else {
            updateStatus("waiting");
          }
        } else if (matchesBusiness) {
          updateStatus("matched");
        } else if (hasLatestData) {
          updateStatus("idle");
        } else {
          updateStatus("waiting");
        }

        return data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load sheet preview";
        if (message === "REAUTHENTICATION_REQUIRED") {
          window.dispatchEvent(
            new CustomEvent("api-error", {
              detail: { error: "REAUTHENTICATION_REQUIRED", status: 401, message: "Authentication expired" },
            }),
          );
          setError("Session expired. Please wait while we refresh your authentication...");
        } else {
          setError(message);
        }
        updateStatus("error");
        return null;
      }
    },
    [
      autoPoll,
      expectedBusinessName,
      onLatestRowReady,
      onPreviewChange,
      rowCount,
      token,
      updateStatus,
      utilityType,
    ],
  );

  // Initial load + manual refresh via refreshKey
  useEffect(() => {
    void loadPreview();
  }, [loadPreview, refreshKey]);

  // Auto-poll lifecycle
  useEffect(() => {
    if (!autoPoll || !token) return;

    readyNotifiedRef.current = false;
    pollStartedAtRef.current = Date.now();
    baselineRef.current = null;
    updateStatus("waiting");

    let cancelled = false;

    const poll = async () => {
      const data = await loadPreview({ isPoll: true });
      if (cancelled || !data) return;
      if (baselineRef.current === null) {
        baselineRef.current = latestRowFingerprint(data);
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      if (pollStartedAtRef.current && Date.now() - pollStartedAtRef.current > maxPollMs) {
        window.clearInterval(intervalId);
        if (!readyNotifiedRef.current) {
          updateStatus("timeout");
        }
        return;
      }
      void poll();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [autoPoll, loadPreview, maxPollMs, pollIntervalMs, token, updateStatus, utilityType]);

  // Auto-select the latest row once when selectable and parent has not chosen yet.
  useEffect(() => {
    if (!selectable || !preview?.rows?.length || selectedRowNumber != null || initialSelectDoneRef.current) {
      return;
    }
    const latest = preview.rows.find((r) => r.is_latest) ?? preview.rows[0];
    initialSelectDoneRef.current = true;
    lastPushedRowFingerprintRef.current = preview.columns
      .map((col) => String(latest.cells[col] ?? "").trim())
      .join("|");
    onRowSelect?.(latest);
  }, [onRowSelect, preview, selectable, selectedRowNumber]);

  // When preview refreshes and the selected row is still the latest, push updated cells up.
  useEffect(() => {
    if (!selectable || !preview?.rows?.length || selectedRowNumber == null || !onRowSelect) return;
    const selected = preview.rows.find((r) => r.row_number === selectedRowNumber);
    if (!selected) return;

    const fingerprint = preview.columns
      .map((col) => String(selected.cells[col] ?? "").trim())
      .join("|");
    if (fingerprint === lastPushedRowFingerprintRef.current) return;
    lastPushedRowFingerprintRef.current = fingerprint;
    onRowSelect(selected);
  }, [onRowSelect, preview, selectable, selectedRowNumber]);

  const statusMessage = (() => {
    switch (status) {
      case "loading":
        return "Loading sheet preview…";
      case "waiting":
        return autoPoll
          ? "Waiting for the sheet to update with your latest upload…"
          : "No data in the latest row yet.";
      case "updated":
        return "Sheet updated — latest row has new data.";
      case "matched":
        return expectedBusinessName
          ? `Latest row matches “${expectedBusinessName}”.`
          : "Latest row is ready.";
      case "timeout":
        return "Still waiting for a sheet update. Try Refresh or open the sheet directly.";
      case "error":
        return error;
      default:
        return "Row 2 is always the most recently processed document.";
    }
  })();

  const tabLabel = preview?.tab ?? "Member ACES Data";

  return (
    <Card className={cn("border-stroke dark:border-dark-3", className)}>
      <CardContent className="pt-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-dark dark:text-white">
              Live sheet preview — {tabLabel}
            </h3>
            <p
              className={cn(
                "mt-1 text-xs",
                status === "matched" || status === "updated"
                  ? "text-green-700 dark:text-green-400"
                  : status === "error" || status === "timeout"
                    ? "text-red-700 dark:text-red-400"
                    : "text-gray-600 dark:text-gray-400",
              )}
            >
              {status === "loading" || (autoPoll && status === "waiting") ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {statusMessage}
                </span>
              ) : (
                statusMessage
              )}
            </p>
            {lastFetchedLabel && (
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-500">
                Last checked {lastFetchedLabel}
              </p>
            )}
            {selectable ? (
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-500">
                Click a row to populate the details below.
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void loadPreview()}
              disabled={status === "loading"}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", status === "loading" && "animate-spin")} />
              Refresh
            </Button>
            {preview?.spreadsheet_url ? (
              <a
                href={preview.spreadsheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-stroke bg-white px-3 text-xs font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open sheet
              </a>
            ) : null}
          </div>
        </div>

        {toolbarExtra}

        <div className="overflow-x-auto rounded-xl border border-stroke dark:border-dark-3">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-gray/60 dark:bg-dark-2">
              <tr>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  Row
                </th>
                {(preview?.columns ?? []).map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
                  >
                    {formatPreviewColumnLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview?.rows?.length ? (
                preview.rows.map((row) => {
                  const isSelected = selectable && selectedRowNumber === row.row_number;
                  return (
                  <tr
                    key={row.row_number}
                    role={selectable ? "button" : undefined}
                    tabIndex={selectable ? 0 : undefined}
                    onClick={
                      selectable
                        ? () => {
                            lastPushedRowFingerprintRef.current = preview.columns
                              .map((col) => String(row.cells[col] ?? "").trim())
                              .join("|");
                            onRowSelect?.(row);
                          }
                        : undefined
                    }
                    onKeyDown={
                      selectable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowSelect?.(row);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "border-t border-stroke dark:border-dark-3",
                      row.is_latest && !isSelected && "bg-primary/5 dark:bg-primary/10",
                      selectable && "cursor-pointer hover:bg-gray/40 dark:hover:bg-dark-3/80",
                      isSelected && "bg-primary/15 ring-2 ring-inset ring-primary dark:bg-primary/20",
                    )}
                  >
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {row.row_number}
                      {isSelected ? (
                        <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Selected
                        </span>
                      ) : row.is_latest ? (
                        <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Latest
                        </span>
                      ) : null}
                    </td>
                    {preview.columns.map((col) => (
                      <td key={`${row.row_number}-${col}`} className="px-3 py-2 text-gray-800 dark:text-gray-200">
                        {String(row.cells[col] ?? "") || "—"}
                      </td>
                    ))}
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={(preview?.columns?.length ?? 0) + 1}
                    className="px-3 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    {status === "loading" ? "Loading rows…" : "No rows to display yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-gray-500 dark:text-gray-500">
          Showing the top {rowCount} data rows. Row {preview?.latest_row_number ?? 2} is the most recently
          processed upload.
        </p>
      </CardContent>
    </Card>
  );
}
