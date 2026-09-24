"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAutonomousApiBaseUrl, cn } from "@/lib/utils";
import { gmailThreadUrl, stopReasonLabel } from "@/lib/stop-reasons";
import { dispatchRunNowFromList } from "@/lib/autonomous-dispatch";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { useToast } from "@/components/ui/toast";
import AutonomousResources from "./AutonomousResources";
import SequenceTemplateEditor, {
  type SequenceTemplate,
  type SequenceTemplateStep,
  type SequenceTypePromptConfig,
} from "./SequenceTemplateEditor";
import { type RetellAgentListItem, type SequenceTypePromptRow } from "./RetellVoicePromptPanel";
import NewSequenceTemplateWizard from "./NewSequenceTemplateWizard";
import { resolvedSignatureHtml } from "@/lib/autonomous-signature";
import { templateCoversFlow } from "@/lib/autonomous-sequence-keys";
import DeleteSequenceTemplateModal, {
  type TemplateDeletePreview,
  deleteSequenceTemplate,
  loadTemplateDeletePreview,
} from "./DeleteSequenceTemplateModal";

export type AutonomousAgentView = "queue" | "templates" | "resources";

type AgentTab =
  | "needs_attention"
  | "running"
  | "stopped_negative"
  | "stopped_signed"
  | "stopped_invoice"
  | "stopped_unsubscribed"
  | "completed"
  | "errored"
  | "stopped_other"
  | "templates"
  | "resources";

const RUN_GROUPS: { id: AgentTab; label: string }[] = [
  { id: "running", label: "Running" },
  { id: "completed", label: "Completed" },
  { id: "errored", label: "Error" },
  { id: "stopped_signed", label: "Stopped · signed" },
  { id: "stopped_negative", label: "Stopped · negative" },
  { id: "stopped_invoice", label: "Stopped · invoice" },
  { id: "stopped_unsubscribed", label: "Stopped · unsubscribed" },
  { id: "stopped_other", label: "Stopped · other" },
];

function isSequenceQueueTab(tab: AgentTab): boolean {
  return tab !== "templates" && tab !== "resources";
}

function parseQueueTab(value: string | null): AgentTab {
  if (value === "finished") return "completed";
  if (value === "needs_attention" || value === "running") return value;
  if (RUN_GROUPS.some((tab) => tab.id === value)) return value as AgentTab;
  return "needs_attention";
}

interface AutonomousRunRow {
  id: number;
  offer_id: number;
  business_name: string | null;
  sequence_type: string;
  run_status: string;
  stop_reason: string | null;
  anchor_at: string;
  next_step_channel: string | null;
  next_step_at: string | null;
  steps_done: number;
  steps_total: number;
  ack_draft_pending?: boolean;
  ack_draft_thread_id?: string | null;
  shared_thread_with_run_id?: number | null;
  campaign_id?: number | null;
  campaign_name?: string | null;
  is_test?: boolean;
}

function apiDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string" && d.trim()) return d;
  }
  return fallback;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatRelative(iso?: string | null) {
  if (!iso) return "—";
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return iso;
  const diffMs = at - Date.now();
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  let amount: number;
  let unit: string;
  if (abs < hour) {
    amount = Math.max(1, Math.round(abs / minute));
    unit = amount === 1 ? "min" : "min";
  } else if (abs < day) {
    amount = Math.round(abs / hour);
    unit = amount === 1 ? "hr" : "hrs";
  } else {
    amount = Math.round(abs / day);
    unit = amount === 1 ? "day" : "days";
  }
  return diffMs < 0 ? `${amount} ${unit} ago` : `in ${amount} ${unit}`;
}

function isOverdue(run: AutonomousRunRow, now = Date.now()) {
  if (run.run_status !== "running" || !run.next_step_at) return false;
  const at = new Date(run.next_step_at).getTime();
  return !Number.isNaN(at) && at < now;
}

function nextStepSortValue(run: AutonomousRunRow) {
  if (!run.next_step_at) return Number.POSITIVE_INFINITY;
  const at = new Date(run.next_step_at).getTime();
  return Number.isNaN(at) ? Number.POSITIVE_INFINITY : at;
}

function sortByNextStep(rows: AutonomousRunRow[]) {
  return [...rows].sort((a, b) => {
    const delta = nextStepSortValue(a) - nextStepSortValue(b);
    if (delta !== 0) return delta;
    return a.id - b.id;
  });
}

function sequenceTypeLabel(sequenceType: string) {
  return sequenceType.replace(/_v\d+$/, "").replace(/_/g, " ");
}

function sourceLabel(run: AutonomousRunRow) {
  if (run.is_test) return "TEST";
  if (run.campaign_id) {
    return run.campaign_name?.trim() ? `Campaign · ${run.campaign_name.trim()}` : "Campaign";
  }
  return "Follow-up";
}

function matchesRunSearch(run: AutonomousRunRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    run.business_name,
    sequenceTypeLabel(run.sequence_type),
    run.sequence_type,
    String(run.offer_id),
    run.campaign_name,
    sourceLabel(run),
    run.run_status,
    run.stop_reason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function uniqueById(rows: AutonomousRunRow[]) {
  const seen = new Set<number>();
  const out: AutonomousRunRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

type AttentionBucket = "errored" | "drafts" | "negative" | "overdue" | "undeliverable" | "shared";

const ATTENTION_BUCKETS: { id: AttentionBucket; singular: string; plural: string }[] = [
  { id: "errored", singular: "error", plural: "errors" },
  { id: "drafts", singular: "draft", plural: "drafts" },
  { id: "negative", singular: "negative", plural: "negative" },
  { id: "undeliverable", singular: "undeliverable", plural: "undeliverable" },
  { id: "shared", singular: "shared thread", plural: "shared threads" },
  { id: "overdue", singular: "overdue", plural: "overdue" },
];

function inAttentionBucket(run: AutonomousRunRow, bucket: AttentionBucket) {
  switch (bucket) {
    case "errored":
      return run.run_status === "errored";
    case "drafts":
      return Boolean(run.ack_draft_pending);
    case "negative":
      return run.stop_reason === "negative_sentiment_stop";
    case "undeliverable":
      return run.stop_reason === "undeliverable";
    case "shared":
      return typeof run.shared_thread_with_run_id === "number";
    case "overdue":
      return isOverdue(run);
  }
}

function countAttentionBuckets(rows: AutonomousRunRow[]) {
  return {
    errored: rows.filter((row) => inAttentionBucket(row, "errored")).length,
    drafts: rows.filter((row) => inAttentionBucket(row, "drafts")).length,
    negative: rows.filter((row) => inAttentionBucket(row, "negative")).length,
    undeliverable: rows.filter((row) => inAttentionBucket(row, "undeliverable")).length,
    shared: rows.filter((row) => inAttentionBucket(row, "shared")).length,
    overdue: rows.filter((row) => inAttentionBucket(row, "overdue")).length,
  };
}

function stitchAttention(running: AutonomousRunRow[], finished: AutonomousRunRow[]) {
  const now = Date.now();
  const overdue = running.filter((row) => isOverdue(row, now));
  const errored = finished.filter((row) => row.run_status === "errored");
  const negative = finished.filter((row) => row.stop_reason === "negative_sentiment_stop");
  const undeliverable = finished.filter((row) => row.stop_reason === "undeliverable");
  const review = finished.filter((row) => row.stop_reason === "needs_human_review");
  const shared = running.filter((row) => typeof row.shared_thread_with_run_id === "number");
  const drafts = [...running, ...finished].filter((row) => row.ack_draft_pending);
  return sortByNextStep(
    uniqueById([...errored, ...overdue, ...drafts, ...negative, ...undeliverable, ...review, ...shared]),
  );
}

const PAGE_SIZE = 20;
const RUNNING_PAGE_SIZE = 2000;

const RESTARTABLE_SEQUENCE_TYPES = new Set([
  "gas_base2_followup_v1",
  "ci_electricity_base2_followup_v1",
  "ci_electricity_offer",
]);

// ─── small UI helpers ───────────────────────────────────────────────────────

const channelIcon: Record<string, string> = {
  email: "✉",
  sms: "💬",
  voice: "📞",
  engagement_form_generation: "📄",
};

function ChannelBadge({ channel }: { channel: string }) {
  const icon = channelIcon[channel.toLowerCase()] ?? "•";
  const colours: Record<string, string> = {
    email: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    sms: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    voice: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    engagement_form_generation:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  };
  const cls = colours[channel.toLowerCase()] ?? "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide", cls)}>
      <span>{icon}</span>
      <span className="capitalize">{channel}</span>
    </span>
  );
}

function DraftReadyBadge({ threadId }: { threadId?: string | null }) {
  const cls =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide w-fit bg-orange-100 text-orange-800 border-orange-400 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-600";
  if (threadId) {
    return (
      <a
        href={gmailThreadUrl(threadId)}
        target="_blank"
        rel="noreferrer"
        className={cls}
      >
        Draft ready
      </a>
    );
  }
  return <span className={cls}>Draft ready</span>;
}

function StatusPill({ status, stopReason }: { status: string; stopReason?: string | null }) {
  const map: Record<string, string> = {
    running: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    completed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    stopped: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    errored: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  };
  const cls = map[status] ?? "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide capitalize w-fit", cls)}>
        {status.replace(/_/g, " ")}
      </span>
      {stopReason && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 pl-0.5">
          {stopReasonLabel(stopReason)}
        </span>
      )}
    </div>
  );
}

function RunsQueueTable({
  title,
  description,
  runs,
  emptyMessage,
  tab,
  compact,
  search,
  onSearchChange,
  attentionFilter = null,
  attentionCounts = null,
  onAttentionFilter,
  canRestart,
  startingId,
  stoppingId,
  deletingId,
  restartingId,
  reviewingId,
  onStart,
  onStop,
  onRestart,
  onDelete,
  onMarkReviewed,
  selectedIds,
  onToggleSelected,
  onToggleSelectedAll,
}: {
  title: string;
  description: string;
  runs: AutonomousRunRow[];
  emptyMessage: string;
  tab: AgentTab;
  compact: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  attentionFilter?: AttentionBucket | null;
  attentionCounts?: Record<AttentionBucket, number> | null;
  onAttentionFilter?: (bucket: AttentionBucket | null) => void;
  canRestart: (sequenceType: string) => boolean;
  startingId: number | null;
  stoppingId: number | null;
  deletingId: number | null;
  restartingId: number | null;
  reviewingId: number | null;
  onStart: (runId: number) => void;
  onStop: (runId: number) => void;
  onRestart: (runId: number) => void;
  onDelete: (runId: number) => void;
  onMarkReviewed: (runId: number) => void;
  selectedIds: number[];
  onToggleSelected: (id: number, checked: boolean) => void;
  onToggleSelectedAll: (checked: boolean) => void;
}) {
  const allSelected = runs.length > 0 && runs.every((r) => selectedIds.includes(r.id));
  const showSearch = tab === "needs_attention" || tab === "running";
  const cell = compact ? "px-3 py-1.5" : "px-4 py-3";
  const liveActions = tab === "running" || tab === "needs_attention";
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {attentionCounts && onAttentionFilter ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
              {ATTENTION_BUCKETS.map((bucket, index) => {
                const count = attentionCounts[bucket.id];
                const selected = attentionFilter === bucket.id;
                const label = `${count} ${count === 1 ? bucket.singular : bucket.plural}`;
                return (
                  <span key={bucket.id} className="flex items-center gap-1">
                    {index > 0 ? (
                      <span className="px-0.5 text-gray-400" aria-hidden>
                        ·
                      </span>
                    ) : null}
                    <button
                      type="button"
                      disabled={count === 0 && !selected}
                      aria-pressed={selected}
                      onClick={() => onAttentionFilter(selected ? null : bucket.id)}
                      className={cn(
                        "rounded-md px-1.5 py-0.5 font-semibold underline-offset-4",
                        count === 0 && !selected
                          ? "cursor-default text-gray-400 dark:text-gray-600"
                          : "hover:underline",
                        selected && "bg-indigo-50 text-indigo-800 underline dark:bg-indigo-950/50 dark:text-indigo-200",
                      )}
                    >
                      {label}
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {showSearch ? (
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search this list"
            className="w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        ) : null}
      </div>
      {runs.length === 0 ? (
        <p className="px-4 py-10 text-sm text-gray-500 dark:text-gray-400 text-center">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {["", "Source", "Sequence", "Client", "Next step", "Status", "Actions"].map((h) => (
                  <th key={h || "select"} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h ? (
                      h
                    ) : (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(event) => onToggleSelectedAll(event.target.checked)}
                        disabled={runs.length === 0}
                        aria-label="Select all sequences"
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                  <td className={cell}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={(event) => onToggleSelected(r.id, event.target.checked)}
                      aria-label={`Select sequence ${r.id}`}
                    />
                  </td>
                  <td className={cn(cell, "whitespace-nowrap")}>
                    <span
                      className={cn(
                        "inline-flex max-w-[14rem] truncate rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        r.is_test
                          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                          : r.campaign_id
                          ? "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
                          : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
                      )}
                      title={sourceLabel(r)}
                    >
                      {sourceLabel(r)}
                    </span>
                  </td>
                  <td className={cn(cell, "whitespace-nowrap")}>
                    <span className="text-xs capitalize text-gray-600 dark:text-gray-300" title={r.sequence_type}>
                      {sequenceTypeLabel(r.sequence_type)}
                    </span>
                  </td>
                  <td className={cn(cell, "whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100")}>
                    {r.business_name || <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className={cn(cell, "whitespace-nowrap")}>
                    {r.next_step_channel ? (
                      <div className={compact ? "flex items-center gap-2" : "space-y-1"}>
                        <ChannelBadge channel={r.next_step_channel} />
                        <div
                          className={cn(
                            "text-[11px] tabular-nums",
                            isOverdue(r) ? "font-semibold text-amber-700 dark:text-amber-300" : "text-gray-400 dark:text-gray-500",
                          )}
                          title={formatDateTime(r.next_step_at)}
                        >
                          {formatRelative(r.next_step_at)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className={cn(cell, "whitespace-nowrap")}>
                    <div className="flex flex-col gap-1">
                      <StatusPill status={r.run_status} stopReason={r.stop_reason} />
                      {isOverdue(r) ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          Overdue
                        </span>
                      ) : null}
                      {typeof r.shared_thread_with_run_id === "number" ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          Sharing a thread with run #{r.shared_thread_with_run_id}
                        </span>
                      ) : null}
                      {r.ack_draft_pending && (
                        <div className="flex flex-wrap items-center gap-1">
                          <DraftReadyBadge threadId={r.ack_draft_thread_id} />
                          <button
                            type="button"
                            disabled={reviewingId === r.id}
                            onClick={() => onMarkReviewed(r.id)}
                            className="inline-flex items-center rounded-md border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-900 text-orange-800 dark:text-orange-200 text-[11px] font-semibold px-2 py-0.5 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition disabled:opacity-40"
                          >
                            {reviewingId === r.id ? "Saving…" : "Mark reviewed"}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={cn(cell, "whitespace-nowrap")}>
                    <div className="flex flex-wrap gap-1.5">
                      <Link href={`/autonomous-agent/${r.id}`}
                        className="inline-flex items-center rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold px-2 py-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                        Sequence
                      </Link>
                      <Link href={`/offers/${r.offer_id}`}
                        className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-[11px] font-semibold px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        Offer
                      </Link>
                      {liveActions && r.run_status === "running" && (
                        <button
                          type="button"
                          disabled={startingId === r.id || stoppingId === r.id || deletingId === r.id || restartingId === r.id}
                          onClick={() => onStart(r.id)}
                          className="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold px-2 py-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition disabled:opacity-40"
                        >
                          {startingId === r.id ? "Starting…" : "Start"}
                        </button>
                      )}
                      {liveActions && r.run_status === "running" && (
                        <button type="button"
                          disabled={stoppingId === r.id || deletingId === r.id || restartingId === r.id || startingId === r.id}
                          onClick={() => onStop(r.id)}
                          className="inline-flex items-center rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold px-2 py-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition disabled:opacity-40">
                          {stoppingId === r.id ? "Stopping…" : "Stop"}
                        </button>
                      )}
                      {isSequenceQueueTab(tab) && tab !== "running" &&
                        ["stopped", "completed", "cancelled", "errored"].includes(r.run_status) &&
                        canRestart(r.sequence_type) && (
                          <button type="button"
                            disabled={restartingId === r.id || deletingId === r.id || stoppingId === r.id}
                            onClick={() => onRestart(r.id)}
                            className="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold px-2 py-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition disabled:opacity-40">
                            {restartingId === r.id ? "Starting…" : "Start again"}
                          </button>
                        )}
                      <button type="button"
                        disabled={deletingId === r.id || stoppingId === r.id || restartingId === r.id || startingId === r.id}
                        onClick={() => onDelete(r.id)}
                        className="inline-flex items-center rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[11px] font-semibold px-2 py-1 hover:bg-red-100 dark:hover:bg-red-900/50 transition disabled:opacity-40">
                        {deletingId === r.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AutonomousAgentWorkspace({ view }: { view: AutonomousAgentView }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const { showToast } = useToast();

  const tabFromView = (): AgentTab => {
    if (view === "templates") return "templates";
    if (view === "resources") return "resources";
    return parseQueueTab(searchParams.get("group") || searchParams.get("tab"));
  };
  const [tab, setTab] = useState<AgentTab>(tabFromView);
  const [runs, setRuns] = useState<AutonomousRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [ackDraftPendingCount, setAckDraftPendingCount] = useState(0);
  const [queueQuery, setQueueQuery] = useState("");
  const [attentionFilter, setAttentionFilter] = useState<AttentionBucket | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);
  // Same fault as the run detail page: setStartingId only takes effect on the next
  // render, so two clicks in one tick both got through and fired the run twice.
  // Keyed by run id, because two different runs starting at once is legitimate —
  // it is the same run twice that is not.
  const runStartsInFlight = useRef<Set<number>>(new Set());
  const [restartingId, setRestartingId] = useState<number | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [selectedRunIds, setSelectedRunIds] = useState<number[]>([]);
  const [batchBusy, setBatchBusy] = useState<"delete" | "stop" | "trigger" | null>(null);
  const [templates, setTemplates] = useState<SequenceTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [templateQuery, setTemplateQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [savingTemplateId, setSavingTemplateId] = useState<number | null>(null);
  const [savingStepId, setSavingStepId] = useState<number | null>(null);
  const [typePrompts, setTypePrompts] = useState<SequenceTypePromptConfig | null>(null);
  const [typePromptsLoading, setTypePromptsLoading] = useState(false);
  const [typePromptsError, setTypePromptsError] = useState<string | null>(null);
  const [savingTypePrompts, setSavingTypePrompts] = useState(false);
  const [triggeringFlows, setTriggeringFlows] = useState(false);
  const [retellAgents, setRetellAgents] = useState<RetellAgentListItem[]>([]);
  const [retellAgentsLoading, setRetellAgentsLoading] = useState(false);
  const [retellAgentsError, setRetellAgentsError] = useState<string | null>(null);
  const [retellRefresh, setRetellRefresh] = useState(0);
  const [showNewWizard, setShowNewWizard] = useState(false);
  const [deletePreview, setDeletePreview] = useState<TemplateDeletePreview | null>(null);
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  const triggerAutonomousFlows = async () => {
    try {
      setTriggeringFlows(true);
      const res = await fetch("/api/autonomous/trigger-flows", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Trigger failed");
      }
      showToast("Autonomous flows triggered.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Trigger failed", "error");
    } finally {
      setTriggeringFlows(false);
    }
  };

  // ── data fetching (unchanged) ─────────────────────────────────────────────

  const fetchRunPage = async (group: string, offset: number, limit: number) => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    params.set("run_status_group", group);
    const res = await fetch(
      `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data.detail === "string" ? data.detail : "Failed to load sequences");
    }
    return res.json() as Promise<{
      items?: AutonomousRunRow[];
      total?: number;
      ack_draft_pending_count?: number;
    }>;
  };

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    if (!isSequenceQueueTab(tab)) { setLoading(false); return; }
    const fetchRuns = async () => {
      try {
        setLoading(true); setError(null);
        if (tab === "needs_attention") {
          const runningPage = await fetchRunPage("running", 0, RUNNING_PAGE_SIZE);
          const finishedPage = await fetchRunPage("finished", 0, RUNNING_PAGE_SIZE);
          const runningItems = Array.isArray(runningPage.items) ? runningPage.items : [];
          const finishedItems = Array.isArray(finishedPage.items) ? finishedPage.items : [];
          const attention = stitchAttention(runningItems, finishedItems);
          setRuns(attention);
          setTotal(attention.length);
          setAckDraftPendingCount(
            typeof runningPage.ack_draft_pending_count === "number"
              ? runningPage.ack_draft_pending_count
              : typeof finishedPage.ack_draft_pending_count === "number"
                ? finishedPage.ack_draft_pending_count
                : 0,
          );
          setQueueQuery("");
          setAttentionFilter(null);
        } else {
          const pageSize = tab === "running" ? RUNNING_PAGE_SIZE : PAGE_SIZE;
          const page = await fetchRunPage(tab, 0, pageSize);
          const items = sortByNextStep(Array.isArray(page.items) ? page.items : []);
          setRuns(items);
          setTotal(typeof page.total === "number" ? page.total : items.length);
          if (typeof page.ack_draft_pending_count === "number") {
            setAckDraftPendingCount(page.ack_draft_pending_count);
          }
          setQueueQuery("");
          setAttentionFilter(null);
        }
        setSelectedRunIds([]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load sequences");
      } finally { setLoading(false); }
    };
    fetchRuns();
  }, [token, tab]);

  const loadMore = async () => {
    if (!token || tab === "needs_attention" || tab === "running") return;
    if (loadingMore || runs.length >= total) return;
    try {
      setLoadingMore(true);
      const data = await fetchRunPage(tab, runs.length, PAGE_SIZE);
      const items = Array.isArray(data.items) ? data.items : [];
      setRuns((prev) => sortByNextStep([...prev, ...items]));
      if (typeof data.total === "number") setTotal(data.total);
      if (typeof data.ack_draft_pending_count === "number") {
        setAckDraftPendingCount(data.ack_draft_pending_count);
      }
    } catch (e) { console.error("Load more sequences", e); }
    finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    const fetchTemplates = async () => {
      try {
        setTemplatesLoading(true); setTemplatesError(null);
        const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Failed to load sequence templates");
        const rows = (Array.isArray(data) ? data : []) as SequenceTemplate[];
        setTemplates(
          rows.map((t) => ({
            ...t,
            signature_html: resolvedSignatureHtml(t.sequence_type, t.signature_html),
          })),
        );
        setSelectedTemplateId((prev) => prev ?? rows[0]?.id ?? null);
      } catch (e: unknown) {
        setTemplatesError(e instanceof Error ? e.message : "Failed to load templates");
      } finally { setTemplatesLoading(false); }
    };
    fetchTemplates();
  }, [token]);

  useEffect(() => {
    setTab(tabFromView());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, searchParams]);

  const typeParam = searchParams.get("type");
  const appliedUrlTypeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!typeParam || templates.length === 0) return;
    if (appliedUrlTypeRef.current === typeParam) return;
    const match = templates.find((row) => templateCoversFlow(row, typeParam));
    if (match) {
      setSelectedTemplateId(match.id);
      appliedUrlTypeRef.current = typeParam;
    }
  }, [typeParam, templates]);

  const selectTemplate = (row: SequenceTemplate) => {
    setSelectedTemplateId(row.id);
    appliedUrlTypeRef.current = row.sequence_type;
    const params = new URLSearchParams();
    params.set("type", row.sequence_type);
    router.replace(`/autonomous-agent/templates?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!token || tab !== "templates") return;
    const fetchAgents = async () => {
      try {
        setRetellAgentsLoading(true);
        setRetellAgentsError(null);
        const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/retell/agents`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(apiDetail(data, "Failed to load Retell agents"));
        setRetellAgents(Array.isArray(data) ? (data as RetellAgentListItem[]) : []);
      } catch (e: unknown) {
        setRetellAgents([]);
        setRetellAgentsError(e instanceof Error ? e.message : "Failed to load Retell agents");
      } finally {
        setRetellAgentsLoading(false);
      }
    };
    fetchAgents();
  }, [token, tab, retellRefresh]);

  const updateTemplateLocal = (templateId: number, patch: Partial<SequenceTemplate>) =>
    setTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, ...patch } : t)));

  const updateStepLocal = (templateId: number, stepId: number, patch: Partial<SequenceTemplateStep>) =>
    setTemplates((prev) =>
      prev.map((t) =>
        t.id !== templateId ? t : { ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) },
      ),
    );

  const saveTemplate = async (template: SequenceTemplate, silent = false) => {
    if (!token) return;
    setSavingTemplateId(template.id);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates/${template.id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: template.display_name,
            description: template.description ?? "",
            timezone: "Australia/Brisbane",
            is_active: template.is_active,
            is_restartable: template.is_restartable,
            signature_html: template.signature_html ?? "",
            extra_context: template.extra_context ?? "",
            sequence_type: template.sequence_type,
            linked_flow_keys: template.linked_flow_keys ?? [],
            validity_mode: template.validity_mode ?? "fixed_days",
            validity_days: template.validity_days ?? 7,
            stop_on: template.stop_on ?? ["agreement_signed", "negative_sentiment_stop"],
            ack_template_signed: template.ack_template_signed ?? null,
            ack_template_invoice: template.ack_template_invoice ?? null,
            figures_mode: template.figures_mode ?? "comparison",
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Save failed");
      updateTemplateLocal(template.id, data as SequenceTemplate);
      if (!silent) showToast("Template saved.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally { setSavingTemplateId(null); }
  };

  const saveStep = async (templateId: number, step: SequenceTemplateStep, silent = false) => {
    if (!token) return;
    setSavingStepId(step.id);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates/${templateId}/steps/${step.id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            step_index: step.step_index,
            day_number: step.day_number,
            channel: step.channel,
            send_time_local: step.send_time_local,
            prompt_text: step.prompt_text ?? "",
            retell_agent_id: step.retell_agent_id ?? "",
            is_active: step.is_active,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Save failed");
      updateStepLocal(templateId, step.id, data as SequenceTemplateStep);
      if (!silent) showToast("Step saved.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
      throw e;
    } finally { setSavingStepId(null); }
  };

  const addTemplate = () => {
    setShowNewWizard(true);
  };

  const openDeleteTemplate = async (templateId: number) => {
    if (!token) return;
    setDeletePreviewLoading(true);
    try {
      const res = await loadTemplateDeletePreview(token, templateId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiDetail(data, "Failed to load delete preview"));
      setDeletePreview(data as TemplateDeletePreview);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to load delete preview", "error");
    } finally {
      setDeletePreviewLoading(false);
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!token || !deletePreview) return;
    setDeletingTemplate(true);
    try {
      const res = await deleteSequenceTemplate(token, deletePreview.template_id);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiDetail(data, "Delete failed"));
      const warnings = Array.isArray((data as { warnings?: unknown }).warnings)
        ? ((data as { warnings: string[] }).warnings)
        : [];
      setTemplates((prev) => {
        const next = prev.filter((t) => t.id !== deletePreview.template_id);
        setSelectedTemplateId((cur) =>
          cur === deletePreview.template_id ? next[0]?.id ?? null : cur,
        );
        return next;
      });
      setDeletePreview(null);
      if (warnings.length) {
        showToast(warnings[0], "warning");
      } else {
        const runs = Number((data as { deleted_runs?: number }).deleted_runs || 0);
        const retell = Boolean((data as { retell_deleted?: boolean }).retell_deleted);
        showToast(
          `Sequence deleted${runs ? ` (${runs} run${runs === 1 ? "" : "s"})` : ""}${
            retell ? ", including its Retell agent" : ""
          }.`,
          "success",
        );
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setDeletingTemplate(false);
    }
  };

  const addStep = async (templateId: number) => {
    if (!token) return;
    setSavingStepId(-1);
    try {
      const template = templates.find((t) => t.id === templateId);
      const maxIndex = template?.steps.reduce((m, s) => Math.max(m, s.step_index), -1) ?? -1;
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates/${templateId}/steps`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            step_index: maxIndex + 1,
            day_number: 1,
            channel: "email",
            send_time_local: "09:00",
            prompt_text: "",
            retell_agent_id: "",
            is_active: true,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Add step failed");
      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, steps: [...t.steps, data as SequenceTemplateStep] } : t)),
      );
      showToast("Step added.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Add step failed", "error");
    } finally { setSavingStepId(null); }
  };

  const deleteStep = async (templateId: number, stepId: number) => {
    if (!token) return;
    setSavingStepId(stepId);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates/${templateId}/steps/${stepId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Delete failed");
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId ? { ...t, steps: t.steps.filter((s) => s.id !== stepId) } : t,
        ),
      );
      showToast("Step removed.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setSavingStepId(null);
    }
  };

  const selectedSequenceType =
    templates.find((t) => t.id === selectedTemplateId)?.sequence_type?.trim() ?? "";

  useEffect(() => {
    if (!token || tab !== "templates" || !selectedTemplateId || !selectedSequenceType) {
      setTypePrompts(null); setTypePromptsError(null); return;
    }
    const sequenceType = selectedSequenceType;
    const fetchTypePrompts = async () => {
      try {
        setTypePromptsLoading(true); setTypePromptsError(null);
        const params = new URLSearchParams({ sequence_type: sequenceType });
        const res = await fetch(
          `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/type-prompts?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "No autonomous_sequence_type row for this sequence_type");
        setTypePrompts(data as SequenceTypePromptConfig);
      } catch (e: unknown) {
        setTypePrompts(null);
        setTypePromptsError(e instanceof Error ? e.message : "No autonomous_sequence_type row for this sequence_type");
      } finally { setTypePromptsLoading(false); }
    };
    fetchTypePrompts();
  }, [token, tab, selectedTemplateId, selectedSequenceType]);

  const updateTypePromptsLocal = (patch: Partial<SequenceTypePromptConfig>) =>
    setTypePrompts((prev) => (prev ? { ...prev, ...patch } : prev));

  const saveTypePrompts = async () => {
    if (!token || !typePrompts?.sequence_type) return;
    setSavingTypePrompts(true);
    try {
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/type-prompts`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          sequence_type: typePrompts.sequence_type,
          system_prompt: typePrompts.system_prompt ?? "",
          email_example: typePrompts.email_example ?? "",
          sms_example: typePrompts.sms_example ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Prompt save failed");
      setTypePrompts(data as SequenceTypePromptConfig);
      showToast("Saved.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Prompt save failed", "error");
    } finally { setSavingTypePrompts(false); }
  };

  const handleStopRun = async (runId: number) => {
    if (!token) return;
    if (!window.confirm("Stop this sequence? Pending steps will be skipped and no further outreach will run.")) return;
    setStoppingId(runId);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}/stop`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Stop failed");
      }
      setRuns((prev) => prev.filter((r) => r.id !== runId));
      setTotal((t) => Math.max(0, t - 1));
      showToast("Sequence stopped.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Stop failed", "error");
    } finally { setStoppingId(null); }
  };

  const handleStartRunNow = async (runId: number) => {
    if (!token) return;
    if (runStartsInFlight.current.has(runId)) return;
    runStartsInFlight.current.add(runId);
    setStartingId(runId);
    try {
      const msg = await dispatchRunNowFromList({ runId, token });
      showToast(msg, "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Start failed", "error");
    } finally {
      runStartsInFlight.current.delete(runId);
      setStartingId(null);
    }
  };

  const handleRestartRun = async (runId: number) => {
    if (!token) return;
    if (!window.confirm("Start a new sequence for this offer using the same sequence type and saved context? The schedule is anchored from today in AEST; day 1 starts at 9:00 on the next business day.")) return;
    if (runStartsInFlight.current.has(runId)) return;
    runStartsInFlight.current.add(runId);
    setRestartingId(runId);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}/restart`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Restart failed");
      if (data.reused_existing) {
        showToast(`This offer already has an active sequence of this type (run #${data.run_id}).`, "success");
      } else {
        showToast(`New sequence started (run #${data.run_id}).`, "success");
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Restart failed", "error");
    } finally {
      runStartsInFlight.current.delete(runId);
      setRestartingId(null);
    }
  };

  const handleDeleteRun = async (runId: number) => {
    if (!token) return;
    if (!window.confirm(`Delete sequence #${runId} permanently? All steps and event history will be removed. This cannot be undone.`)) return;
    setDeletingId(runId);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Delete failed");
      }
      setRuns((prev) => prev.filter((r) => r.id !== runId));
      setTotal((t) => Math.max(0, t - 1));
      showToast("Sequence deleted.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally { setDeletingId(null); }
  };

  const handleMarkReviewed = async (runId: number) => {
    if (!token) return;
    setReviewingId(runId);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}/ack-reviewed`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not mark reviewed");
      const clearPending = (row: AutonomousRunRow) =>
        row.id === runId ? { ...row, ack_draft_pending: false } : row;
      setRuns((prev) => {
        const next = prev.map(clearPending);
        if (tab !== "needs_attention") return next;
        return next.filter(
          (row) =>
            row.id !== runId ||
            row.run_status === "errored" ||
            row.stop_reason === "negative_sentiment_stop" ||
            typeof row.shared_thread_with_run_id === "number" ||
            isOverdue(row),
        );
      });
      setAckDraftPendingCount((count) => Math.max(0, count - 1));
      showToast("Acknowledgement marked reviewed.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Could not mark reviewed", "error");
    } finally {
      setReviewingId(null);
    }
  };

  const visibleRunIds = runs.map((row) => row.id);
  const selectedVisible = selectedRunIds.filter((id) => visibleRunIds.includes(id));

  const handleBatch = async (action: "delete" | "stop" | "trigger") => {
    if (!token || selectedVisible.length === 0) return;
    if (action === "delete") {
      if (!window.confirm(`Delete ${selectedVisible.length} sequences permanently? This cannot be undone.`)) return;
    }
    if (action === "stop") {
      if (!window.confirm(`Stop ${selectedVisible.length} sequences? Pending steps will be skipped.`)) return;
    }
    setBatchBusy(action);
    try {
      if (action === "trigger") {
        let ok = 0;
        let failed = 0;
        for (const runId of selectedVisible) {
          try {
            await dispatchRunNowFromList({ runId, token });
            ok += 1;
          } catch {
            failed += 1;
          }
        }
        showToast(
          failed ? `Triggered ${ok}. ${failed} failed.` : `Triggered ${ok} sequences.`,
          failed ? "error" : "success",
        );
      } else {
        const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/batch`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedVisible, action }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Batch action failed");
        const updated: number[] = Array.isArray(data.updated) ? data.updated : selectedVisible;
        const gone = new Set(updated);
        setRuns((prev) => prev.filter((row) => !gone.has(row.id)));
        setTotal((t) => Math.max(0, t - updated.length));
        setSelectedRunIds([]);
        showToast(
          action === "delete" ? `Deleted ${updated.length} sequences.` : `Stopped ${updated.length} sequences.`,
          "success",
        );
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Batch action failed", "error");
    } finally {
      setBatchBusy(null);
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const emptyMessage =
    tab === "needs_attention"
      ? attentionFilter
        ? `No ${ATTENTION_BUCKETS.find((bucket) => bucket.id === attentionFilter)?.plural ?? "items"} in this list.`
        : "Nothing needs attention. Errors, overdue steps, negative stops, undeliverable addresses, shared Gmail threads and unreviewed drafts land here."
      : tab === "running"
      ? "No active autonomous sequences. Start a test run from Sequence templates, or generate the linked comparison."
      : tab === "errored"
        ? "No sequences in error."
        : tab === "completed"
          ? "No completed sequences yet."
          : "No sequences in this stop bucket.";
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (row) =>
        row.display_name.toLowerCase().includes(q) ||
        row.sequence_type.toLowerCase().includes(q) ||
        (row.description || "").toLowerCase().includes(q),
    );
  }, [templateQuery, templates]);
  const canRestart = (sequenceType: string) => {
    const tpl = templates.find((t) => t.sequence_type === sequenceType);
    if (tpl) return tpl.is_restartable;
    return RESTARTABLE_SEQUENCE_TYPES.has(sequenceType);
  };
  const attentionCounts = useMemo(
    () => (tab === "needs_attention" ? countAttentionBuckets(runs) : null),
    [tab, runs],
  );
  const visibleRuns = useMemo(() => {
    const bucketed =
      tab === "needs_attention" && attentionFilter
        ? runs.filter((row) => inAttentionBucket(row, attentionFilter))
        : runs;
    if (tab === "needs_attention" || tab === "running") {
      return bucketed.filter((row) => matchesRunSearch(row, queueQuery));
    }
    return bucketed;
  }, [runs, tab, queueQuery, attentionFilter]);
  const queueTitle =
    tab === "needs_attention"
      ? "Needs attention"
      : tab === "running"
        ? "Running sequences"
        : RUN_GROUPS.find((item) => item.id === tab)?.label || "Sequences";
  const queueDescription =
    tab === "needs_attention"
      ? "Errors, overdue next steps, negative-sentiment stops, undeliverable first-touch addresses, agreement runs sharing one Gmail thread, and acknowledgement drafts waiting for review."
      : tab === "running"
        ? "Every live sequence, follow-up and campaign together. Sorted by what fires next."
        : "Follow-up and campaign sequences in this bucket.";

  // ── shared input classes ──────────────────────────────────────────────────

  const pageTitle =
    view === "templates"
      ? "Sequence templates"
      : view === "resources"
        ? "Autonomous Resources"
        : "Queue";
  const pageDescription =
    view === "templates"
      ? "Search a playbook, then edit cadence, copy, and what should stop the chase. Advanced keys stay out of the way until you need them."
      : view === "resources"
        ? "How autonomous sequences, n8n, and Retell fit together."
        : ackDraftPendingCount > 0
          ? `Running sequences plus items that need a person. ${ackDraftPendingCount} acknowledgement ${ackDraftPendingCount === 1 ? "draft is" : "drafts are"} ready for review.`
          : "Running sequences plus errors, overdue steps, negative stops, undeliverable addresses, and unreviewed drafts.";

  const btnSecondary =
    "inline-flex items-center gap-1.5 rounded-full border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark hover:bg-gray/80 dark:hover:bg-dark-3 text-dark dark:text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm";

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        pageName="Autonomous Agent"
        title={pageTitle}
        description={pageDescription}
        actions={
          view === "templates" ? (
            <button type="button" onClick={addTemplate} className={btnSecondary}>
              New sequence
            </button>
          ) : undefined
        }
      />

      <div className="mt-5 space-y-5">

        {view === "queue" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              role="tablist"
              aria-label="Queue"
            >
              {([
                { id: "needs_attention", label: "Needs attention" },
                { id: "running", label: "Running" },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => {
                    setTab(item.id);
                    router.replace(
                      item.id === "needs_attention"
                        ? "/autonomous-agent"
                        : "/autonomous-agent?group=running",
                      { scroll: false },
                    );
                  }}
                  className={cn(
                    "inline-flex items-center rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all",
                    tab === item.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-dark dark:text-white">History</span>
              <select
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-dark shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                value={RUN_GROUPS.some((g) => g.id === tab) ? tab : ""}
                onChange={(e) => {
                  const next = parseQueueTab(e.target.value);
                  setTab(next);
                  router.replace(`/autonomous-agent?group=${next}`, { scroll: false });
                }}
                aria-label="Finished run status"
              >
                <option value="">Choose…</option>
                {RUN_GROUPS.filter((item) => item.id !== "running").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={triggerAutonomousFlows}
              disabled={triggeringFlows || !session}
              className={btnSecondary}
              title="Calls n8n to process due autonomous agent steps (email, voice, SMS)."
            >
              {triggeringFlows ? "Triggering…" : "Trigger Autonomous Flows"}
            </button>
            {isSequenceQueueTab(tab) ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleBatch("trigger")}
                  disabled={selectedVisible.length === 0 || batchBusy !== null || !token}
                  className={btnSecondary}
                >
                  {batchBusy === "trigger" ? "Triggering…" : `Trigger selected${selectedVisible.length ? ` (${selectedVisible.length})` : ""}`}
                </button>
                <button
                  type="button"
                  onClick={() => void handleBatch("stop")}
                  disabled={selectedVisible.length === 0 || batchBusy !== null || !token}
                  className={btnSecondary}
                >
                  {batchBusy === "stop" ? "Stopping…" : `Pause selected${selectedVisible.length ? ` (${selectedVisible.length})` : ""}`}
                </button>
                <button
                  type="button"
                  onClick={() => void handleBatch("delete")}
                  disabled={selectedVisible.length === 0 || batchBusy !== null || !token}
                  className={btnSecondary}
                >
                  {batchBusy === "delete" ? "Deleting…" : `Delete selected${selectedVisible.length ? ` (${selectedVisible.length})` : ""}`}
                </button>
              </div>
            ) : null}
          </div>

          <Link
            href="/offers"
            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
          >
            All offers →
          </Link>
        </div>
        ) : null}

        {/* ── error banner ── */}
        {tab !== "templates" && tab !== "resources" && error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3.5 text-sm text-red-700 dark:text-red-300">
            <span className="mt-0.5 shrink-0 text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ══════════════ RESOURCES TAB ══════════════ */}
        {tab === "resources" ? (
          <AutonomousResources />
        ) : /* ══════════════ TEMPLATES TAB ══════════════ */
        tab === "templates" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">

            {/* sidebar list */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <div className="space-y-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Sequences</p>
                    <p className="text-[11px] text-gray-400">{templates.length} playbook{templates.length === 1 ? "" : "s"}</p>
                  </div>
                  <button type="button" onClick={addTemplate} className={btnSecondary}>
                    New sequence
                  </button>
                </div>
                <input
                  type="search"
                  value={templateQuery}
                  onChange={(e) => setTemplateQuery(e.target.value)}
                  placeholder="Search sequences"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>
              {templatesLoading ? (
                <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500">Loading templates…</p>
              ) : templatesError ? (
                <p className="px-4 py-6 text-sm text-red-500">{templatesError}</p>
              ) : filteredTemplates.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500">
                  {templates.length === 0 ? "No templates found." : "No sequences match that search."}
                </p>
              ) : (
                <nav className="divide-y divide-gray-50 dark:divide-gray-800/80">
                  {filteredTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTemplate(t)}
                      className={cn(
                        "w-full text-left px-4 py-3 transition-colors",
                        selectedTemplateId === t.id
                          ? "bg-indigo-50 dark:bg-indigo-950/40"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/60",
                      )}
                    >
                      <div className={cn("text-sm font-semibold leading-snug", selectedTemplateId === t.id ? "text-indigo-700 dark:text-indigo-300" : "text-gray-800 dark:text-gray-200")}>
                        {t.display_name}
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {(t.steps?.length ?? 0) > 0
                          ? `${t.steps.length} step${t.steps.length === 1 ? "" : "s"} · days ${[...t.steps].sort((a, b) => a.step_index - b.step_index).map((s) => s.day_number).join(", ")}`
                          : t.sequence_type}
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        {t.is_active ? (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold px-2 py-0.5">Active</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-semibold px-2 py-0.5">Inactive</span>
                        )}
                        {t.is_restartable && (
                          <span className="rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-[10px] font-semibold px-2 py-0.5">Restartable</span>
                        )}
                      </div>
                    </button>
                  ))}
                </nav>
              )}
            </div>

            {/* detail pane */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 overflow-hidden">
              {!selectedTemplate ? (
                <div className="py-16 text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Pick a sequence to edit</p>
                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    Search on the left, or create a new playbook for a retailer or product.
                  </p>
                  <button type="button" onClick={addTemplate} className={`${btnSecondary} mt-4`}>
                    New sequence
                  </button>
                </div>
              ) : (
                token ? (
                  <SequenceTemplateEditor
                    key={selectedTemplate.id}
                    template={selectedTemplate}
                    templates={templates}
                    token={token}
                    typePrompts={typePrompts}
                    typePromptsLoading={typePromptsLoading}
                    typePromptsError={typePromptsError}
                    savingTemplateId={savingTemplateId}
                    savingStepId={savingStepId}
                    savingTypePrompts={savingTypePrompts}
                    retellAgents={retellAgents}
                    retellAgentsLoading={retellAgentsLoading}
                    retellAgentsError={retellAgentsError}
                    deletePreviewLoading={deletePreviewLoading}
                    deletingTemplate={deletingTemplate}
                    updateTemplateLocal={updateTemplateLocal}
                    updateStepLocal={updateStepLocal}
                    updateTypePromptsLocal={updateTypePromptsLocal}
                    saveTemplate={saveTemplate}
                    saveTypePrompts={saveTypePrompts}
                    saveStep={saveStep}
                    addStep={addStep}
                    deleteStep={deleteStep}
                    onDeleteTemplate={(id) => void openDeleteTemplate(id)}
                    onTypePromptsUpdated={(row: SequenceTypePromptRow) =>
                      setTypePrompts(row as SequenceTypePromptConfig)
                    }
                    onTestStarted={(runId) => router.push(`/autonomous-agent/${runId}`)}
                    showToast={showToast}
                  />
                ) : (
                  <p className="text-sm text-gray-400">Sign in to edit templates.</p>
                )
              )}
            </div>
          </div>

        ) : loading ? (
          /* ── loading state ── */
          <div className="flex items-center justify-center py-20 text-sm text-gray-400 dark:text-gray-500 gap-2">
            <svg className="animate-spin h-4 w-4 text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading sequences…
          </div>

        ) : (
          /* ══════════════ RUNS TABLES ══════════════ */
          <div className="space-y-5">
            <RunsQueueTable
              title={queueTitle}
              description={queueDescription}
              runs={visibleRuns}
              emptyMessage={
                queueQuery.trim() && runs.length > 0
                  ? "No sequences match that search."
                  : emptyMessage
              }
              tab={tab}
              compact={visibleRuns.length > 20}
              search={queueQuery}
              onSearchChange={setQueueQuery}
              attentionFilter={tab === "needs_attention" ? attentionFilter : null}
              attentionCounts={attentionCounts}
              onAttentionFilter={tab === "needs_attention" ? setAttentionFilter : undefined}
              canRestart={canRestart}
              startingId={startingId}
              stoppingId={stoppingId}
              deletingId={deletingId}
              restartingId={restartingId}
              reviewingId={reviewingId}
              onStart={(id) => void handleStartRunNow(id)}
              onStop={(id) => void handleStopRun(id)}
              onRestart={(id) => void handleRestartRun(id)}
              onDelete={(id) => void handleDeleteRun(id)}
              onMarkReviewed={(id) => void handleMarkReviewed(id)}
              selectedIds={selectedRunIds}
              onToggleSelected={(id, checked) =>
                setSelectedRunIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)))
              }
              onToggleSelectedAll={(checked) =>
                setSelectedRunIds((prev) => {
                  const ids = visibleRuns.map((row) => row.id);
                  return checked
                    ? Array.from(new Set([...prev, ...ids]))
                    : prev.filter((id) => !ids.includes(id));
                })
              }
            />
            {tab !== "running" && tab !== "needs_attention" && runs.length > 0 && runs.length < total ? (
              <div className="flex justify-center">
                <button type="button" onClick={() => void loadMore()} disabled={loadingMore}
                  className={cn(btnSecondary, "px-6 py-2 text-sm")}>
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {showNewWizard && token && (
        <NewSequenceTemplateWizard
          token={token}
          templates={templates}
          onCreated={(created) => {
            const row = created as SequenceTemplate;
            setTemplates((prev) => [
              ...prev,
              {
                ...row,
                signature_html: resolvedSignatureHtml(row.sequence_type, row.signature_html),
              },
            ]);
            setSelectedTemplateId(created.id);
            setRetellRefresh((n) => n + 1);
          }}
          onClose={() => setShowNewWizard(false)}
          showToast={showToast}
        />
      )}
      {deletePreview && (
        <DeleteSequenceTemplateModal
          preview={deletePreview}
          submitting={deletingTemplate}
          onCancel={() => setDeletePreview(null)}
          onConfirm={() => void confirmDeleteTemplate()}
        />
      )}
    </>
  );
}