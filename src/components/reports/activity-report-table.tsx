"use client";

import { ActivityTypeBadge } from "@/components/reports/activity-type-badge";
import { cn } from "@/lib/utils";
import { ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";

export interface ActivityReportRow {
  id: number;
  offer_id: number;
  task_id?: number | null;
  client_id?: number | null;
  business_name?: string | null;
  activity_type: string;
  document_link?: string | null;
  created_at: string;
  created_by?: string | null;
  offer_display?: string | null;
  manual_activity_id?: number | null;
}

export function activityReportRowKey(a: ActivityReportRow): string {
  if (a.manual_activity_id != null) return `cm-${a.manual_activity_id}`;
  if (a.task_id) return `task-${a.task_id}-${a.id}`;
  return `${a.activity_type}-${a.id}`;
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function documentLinkHref(link: string | null | undefined): string | undefined {
  if (!link || typeof link !== "string") return undefined;
  let s = link.trim();
  if (s.startsWith("=")) s = s.slice(1).trim();
  if (s.startsWith("https:/") && !s.startsWith("https://")) s = "https://" + s.slice(7);
  if (s.startsWith("http:/") && !s.startsWith("http://")) s = "http://" + s.slice(6);
  return s.startsWith("http://") || s.startsWith("https://") ? s : undefined;
}

function creatorLabel(email: string | null | undefined): string {
  if (!email) return "—";
  return email.split("@")[0]?.replace(/\./g, " ") ?? email;
}

const thClass =
  "px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400";
const tdClass = "px-3 py-3 align-middle";

interface ActivityReportTableProps {
  rows: ActivityReportRow[];
  onDelete: (target: { kind: "offer_activity"; id: number } | { kind: "client_manual"; id: number }) => void;
}

export function ActivityReportTable({ rows, onDelete }: ActivityReportTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-dark">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] table-fixed">
          <colgroup>
            <col className="w-[10.5rem]" />
            <col className="w-[9.5rem]" />
            <col className="w-[12rem]" />
            <col />
            <col className="w-[5.5rem]" />
            <col className="w-[4rem]" />
            <col className="w-[2.5rem]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 bg-canvas/60 dark:border-dark-3 dark:bg-dark-2/40">
              <th scope="col" className={thClass}>
                Date
              </th>
              <th scope="col" className={thClass}>
                Type
              </th>
              <th scope="col" className={thClass}>
                Client
              </th>
              <th scope="col" className={thClass}>
                Details
              </th>
              <th scope="col" className={thClass}>
                By
              </th>
              <th scope="col" className={thClass}>
                Doc
              </th>
              <th scope="col" className={cn(thClass, "sr-only")}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
            {rows.map((a, index) => {
              const docHref = documentLinkHref(a.document_link);
              const canDelete = a.manual_activity_id != null || a.offer_id > 0;
              const clientLabel = a.business_name ?? (a.client_id ? `Client ${a.client_id}` : "—");
              const detailsLabel =
                a.offer_id > 0
                  ? `${a.offer_display ?? `Offer #${a.offer_id}`} #${a.offer_id}`
                  : a.task_id
                    ? (a.offer_display ?? `Task #${a.task_id}`)
                    : (a.offer_display ?? "—");

              return (
                <tr
                  key={activityReportRowKey(a)}
                  className={cn(
                    "pg-fade-up group transition-colors hover:bg-canvas/70 dark:hover:bg-dark-2/50",
                    index < 6 && `pg-stagger-${Math.min(index + 1, 6)}`,
                  )}
                >
                  <td className={cn(tdClass, "whitespace-nowrap text-xs tabular-nums text-gray-600 dark:text-gray-400")}>
                    {formatDate(a.created_at)}
                  </td>
                  <td className={tdClass}>
                    <ActivityTypeBadge type={a.activity_type} />
                  </td>
                  <td className={cn(tdClass, "text-sm")}>
                    {a.client_id ? (
                      <Link
                        href={`/crm-members/${a.client_id}`}
                        className="block min-w-0 truncate font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                        title={clientLabel}
                      >
                        {clientLabel}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className={cn(tdClass, "text-sm")}>
                    {a.offer_id > 0 ? (
                      <Link
                        href={`/offers/${a.offer_id}`}
                        className="block min-w-0 truncate text-dark hover:text-primary dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                        title={detailsLabel}
                      >
                        <span className="font-medium">{a.offer_display ?? `Offer #${a.offer_id}`}</span>
                        <span className="ml-1 text-xs text-gray-400">#{a.offer_id}</span>
                      </Link>
                    ) : a.task_id ? (
                      <Link
                        href={`/tasks?task_id=${a.task_id}`}
                        className="block min-w-0 truncate font-medium text-dark hover:text-primary dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                        title={detailsLabel}
                      >
                        {a.offer_display ?? `Task #${a.task_id}`}
                      </Link>
                    ) : (
                      <span
                        className="block min-w-0 truncate text-gray-700 dark:text-gray-300"
                        title={detailsLabel !== "—" ? detailsLabel : undefined}
                      >
                        {a.offer_display ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className={cn(tdClass, "whitespace-nowrap text-xs text-gray-500 dark:text-gray-400")}>
                    <span className="block truncate" title={a.created_by ?? undefined}>
                      {creatorLabel(a.created_by)}
                    </span>
                  </td>
                  <td className={tdClass}>
                    {docHref ? (
                      <a
                        href={docHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                      >
                        Open
                        <ExternalLink className="size-3 shrink-0" aria-hidden />
                      </a>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className={cn(tdClass, "text-right")}>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (a.manual_activity_id != null) {
                            onDelete({ kind: "client_manual", id: a.manual_activity_id });
                          } else {
                            onDelete({ kind: "offer_activity", id: a.id });
                          }
                        }}
                        className="inline-flex size-8 items-center justify-center rounded-full text-gray-400 opacity-0 transition-all hover:bg-semantic-block/10 hover:text-semantic-block focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group-hover:opacity-100"
                        aria-label="Delete activity"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
