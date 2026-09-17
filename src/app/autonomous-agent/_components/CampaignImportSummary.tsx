"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MERGE_FIELD_BY_KEY,
} from "@/lib/merge-template";
import type { CampaignRowPayload } from "@/lib/campaign-api";
import {
  useCampaign,
  type CampaignRowFilter,
} from "./CampaignControls";

function uniqueRecipientRows(rows: CampaignRowPayload[]): CampaignRowPayload[] {
  const seen = new Set<string>();
  const out: CampaignRowPayload[] = [];
  for (const row of rows) {
    const key = (row.recipient_key || "").trim();
    const id = key ? `email:${key}` : `row:${row.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function filterRows(
  rows: CampaignRowPayload[],
  filter: CampaignRowFilter,
): CampaignRowPayload[] {
  switch (filter) {
    case "distinct":
      return uniqueRecipientRows(rows);
    case "sendable":
      return uniqueRecipientRows(
        rows.filter(
          (row) =>
            row.row_status === "pending" &&
            !row.human_only &&
            !row.run_id &&
            (row.shape_warnings || []).length === 0,
        ),
      );
    case "human_only":
      return rows.filter((row) => row.human_only);
    case "warnings":
      return rows.filter((row) => (row.shape_warnings || []).length > 0);
    default:
      return rows;
  }
}

export function CampaignSummaryBar() {
  const { campaignId, rowCounts, summaryIsPreview, shapeWarnings, rowFilter, setRowFilter } =
    useCampaign();
  if (!rowCounts) return null;

  const sendable = rowCounts.sendable ?? 0;
  const figures: {
    key: CampaignRowFilter;
    count: number;
    label: string;
    tone?: "warning";
  }[] = [
    { key: "rows", count: rowCounts.rows, label: "rows" },
    { key: "distinct", count: rowCounts.unique_recipients, label: "distinct" },
    { key: "sendable", count: sendable, label: "sendable" },
    { key: "human_only", count: rowCounts.human_only, label: "human only" },
    {
      key: "warnings",
      count: rowCounts.warnings ?? 0,
      label: "warnings",
      tone: (rowCounts.warnings ?? 0) > 0 ? "warning" : undefined,
    },
  ];

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "sticky top-16 z-10 flex flex-wrap items-center gap-x-1 gap-y-2 rounded-xl border px-4 py-3 text-sm shadow-sm",
          (rowCounts.warnings ?? 0) > 0
            ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
            : "border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark",
        )}
      >
        {figures.map((figure, index) => (
          <span key={figure.key} className="flex items-center gap-1">
            {index > 0 ? (
              <span className="px-1 text-gray-400" aria-hidden>
                ·
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setRowFilter(figure.key)}
              className={cn(
                "rounded-md px-1.5 py-0.5 font-semibold underline-offset-4 hover:underline",
                rowFilter === figure.key && "underline",
                figure.tone === "warning"
                  ? "text-amber-900 dark:text-amber-100"
                  : "text-dark dark:text-white",
              )}
              aria-pressed={rowFilter === figure.key}
            >
              {figure.count} {figure.label}
            </button>
          </span>
        ))}
        {summaryIsPreview || campaignId == null ? (
          <span className="ml-2 rounded-md bg-white/70 px-1.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-900/50 dark:text-gray-300">
            Preview · not saved
          </span>
        ) : null}
      </div>
      {shapeWarnings.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {shapeWarnings.map((warning) => (
            <p key={warning.key}>
              {warning.label} does not look like the right shape in {warning.fail_count} of{" "}
              {warning.total} recipients ({Math.round(warning.ok_fraction * 100)}% match).
              Click warnings to see the flagged rows.
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CampaignRowList() {
  const {
    campaignId,
    serverRows,
    rowCounts,
    summaryIsPreview,
    rowFilter,
    readOnly,
    busy,
    onSetHumanOnly,
  } = useCampaign();
  const [reasons, setReasons] = useState<Record<number, string>>({});

  const visible = useMemo(
    () => filterRows(serverRows, rowFilter),
    [serverRows, rowFilter],
  );

  if (!rowCounts) return null;

  const filterLabel =
    rowFilter === "distinct"
      ? "distinct values"
      : rowFilter === "sendable"
        ? "sendable recipients"
        : rowFilter === "human_only"
          ? "human-only rows"
          : rowFilter === "warnings"
            ? "flagged rows"
            : "imported rows";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{summaryIsPreview || campaignId == null ? "Preview rows" : "Imported rows"}</CardTitle>
        <CardDescription>
          {summaryIsPreview || campaignId == null
            ? "Counts come from the same server check as Save. Nothing is stored until you save the campaign."
            : "Flag government, hospital, listed-company and large industrial accounts as human only. Shape warnings and human-only rows stay on the list but are never started."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-semibold text-dark dark:text-white">
          Showing {visible.length} {filterLabel}
          <span className="ml-2 font-normal text-gray-500">
            · {rowCounts.sendable ?? 0} sendable
          </span>
        </p>
        <div className="max-h-[32rem] overflow-auto rounded-xl border border-stroke dark:border-dark-3">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 font-semibold">Company</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Flags</th>
                <th className="px-3 py-2 font-semibold">Human only</th>
                <th className="px-3 py-2 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-sm text-gray-500" colSpan={6}>
                    No rows in this filter.
                  </td>
                </tr>
              ) : (
                visible.map((row) => {
                  const reasonValue =
                    reasons[row.id] ?? row.human_only_reason ?? "";
                  const flags = row.shape_warnings || [];
                  const rowBusy = busy === `human-only-${row.id}`;
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-stroke/70 dark:border-dark-3/70"
                    >
                      <td className="px-3 py-2 font-medium text-dark dark:text-white">
                        {row.merge_json.company_name || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={cn(
                            flags.includes("contact_email") &&
                              "rounded bg-amber-100 px-1 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100",
                          )}
                        >
                          {row.merge_json.contact_email || row.recipient_key || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge intent="neutral">{row.row_status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {flags.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {flags.map((key) => (
                              <Badge key={key} intent="warning">
                                {MERGE_FIELD_BY_KEY[key]?.label ?? key}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={row.human_only}
                            disabled={readOnly || campaignId == null || summaryIsPreview || rowBusy}
                            onChange={(event) =>
                              void onSetHumanOnly(
                                row.id,
                                event.target.checked,
                                reasonValue,
                              )
                            }
                          />
                          Human only
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={reasonValue}
                          placeholder="Optional reason"
                          disabled={readOnly || campaignId == null || summaryIsPreview || rowBusy}
                          className="px-2 py-1 text-xs"
                          onChange={(event) =>
                            setReasons((prev) => ({
                              ...prev,
                              [row.id]: event.target.value,
                            }))
                          }
                          onBlur={() => {
                            const next = reasonValue.trim();
                            const current = (row.human_only_reason || "").trim();
                            if (!row.human_only || next === current) return;
                            void onSetHumanOnly(row.id, true, next);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
