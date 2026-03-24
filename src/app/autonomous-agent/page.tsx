"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getAutonomousApiBaseUrl, cn } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { useToast } from "@/components/ui/toast";

type AgentTab = "running" | "finished";

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

const PAGE_SIZE = 20;

/** Base-2 follow-up types that support POST .../restart (must match backend). */
const RESTARTABLE_SEQUENCE_TYPES = new Set([
  "gas_base2_followup_v1",
  "ci_electricity_base2_followup_v1",
]);

export default function AutonomousAgentPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const { showToast } = useToast();

  const [tab, setTab] = useState<AgentTab>("running");
  const [runs, setRuns] = useState<AutonomousRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [restartingId, setRestartingId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchRuns = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", "0");
        params.set("run_status_group", tab === "running" ? "running" : "finished");
        const res = await fetch(
          `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.detail === "string" ? data.detail : "Failed to load sequences",
          );
        }
        const data = await res.json();
        setRuns(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      } catch (e: unknown) {
        console.error("Error loading autonomous sequences", e);
        setError(e instanceof Error ? e.message : "Failed to load sequences");
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, [token, tab]);

  const loadMore = async () => {
    if (!token || loadingMore || runs.length >= total) return;
    try {
      setLoadingMore(true);
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(runs.length));
      params.set("run_status_group", tab === "running" ? "running" : "finished");
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        },
      );
      if (!res.ok) throw new Error("Failed to load more");
      const data = await res.json();
      const next = Array.isArray(data.items) ? data.items : [];
      setRuns((prev) => [...prev, ...next]);
    } catch (e) {
      console.error("Load more sequences", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleStopRun = async (runId: number) => {
    if (!token) return;
    if (
      !window.confirm(
        "Stop this sequence? Pending steps will be skipped and no further outreach will run.",
      )
    ) {
      return;
    }
    setStoppingId(runId);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}/stop`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        },
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
    } finally {
      setStoppingId(null);
    }
  };

  const handleRestartRun = async (runId: number) => {
    if (!token) return;
    if (
      !window.confirm(
        "Start a new sequence for this offer using the same sequence type and saved context? The schedule is anchored from today in AEST; day 1 starts at 9:00 on the next business day.",
      )
    ) {
      return;
    }
    setRestartingId(runId);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}/restart`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Restart failed");
      }
      if (data.reused_existing) {
        showToast(
          `This offer already has an active sequence of this type (run #${data.run_id}).`,
          "success",
        );
      } else {
        showToast(`New sequence started (run #${data.run_id}).`, "success");
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Restart failed", "error");
    } finally {
      setRestartingId(null);
    }
  };

  const handleDeleteRun = async (runId: number) => {
    if (!token) return;
    if (
      !window.confirm(
        `Delete sequence #${runId} permanently? All steps and event history will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(runId);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        },
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
    } finally {
      setDeletingId(null);
    }
  };

  const emptyMessage =
    tab === "running"
      ? "No active autonomous sequences. Start one via POST /api/autonomous/sequences/start (or wire from Base 2)."
      : "No finished sequences yet.";

  return (
    <>
      <PageHeader
        pageName="Autonomous Agent"
        title="Autonomous Agent"
        description="Follow-up sequence runs (email via n8n, voice via Retell). Data lives in the CRM backend."
      />
      <div className="mt-4">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 p-0.5 bg-gray-50 dark:bg-gray-800/50"
              role="tablist"
              aria-label="Autonomous sequence queue"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "running"}
                onClick={() => setTab("running")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  tab === "running"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
                )}
              >
                Running
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "finished"}
                onClick={() => setTab("finished")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  tab === "finished"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
                )}
              >
                Finished
              </button>
            </div>
            <Link
              href="/offers"
              className="text-sm font-medium text-primary hover:underline"
            >
              All offers
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            Loading sequences…
          </div>
        ) : runs.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Offer
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Run status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Next step
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Anchor
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">
                        {r.business_name || "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        #{r.offer_id}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        <span className="capitalize">{r.run_status.replace(/_/g, " ")}</span>
                        {r.stop_reason ? (
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            {r.stop_reason.replace(/_/g, " ")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {r.steps_done}/{r.steps_total}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {r.next_step_channel ? (
                          <>
                            <span className="capitalize">{r.next_step_channel.replace(/_/g, " ")}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTime(r.next_step_at)}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatDateTime(r.anchor_at)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/autonomous-agent/${r.id}`}
                            className="text-primary text-xs font-medium hover:underline"
                          >
                            Sequence
                          </Link>
                          <Link
                            href={`/offers/${r.offer_id}`}
                            className="text-primary text-xs font-medium hover:underline"
                          >
                            Offer
                          </Link>
                          {tab === "running" && r.run_status === "running" ? (
                            <button
                              type="button"
                              disabled={stoppingId === r.id || deletingId === r.id || restartingId === r.id}
                              onClick={() => handleStopRun(r.id)}
                              className="text-left text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50"
                            >
                              {stoppingId === r.id ? "Stopping…" : "Stop"}
                            </button>
                          ) : null}
                          {tab === "finished" &&
                          ["stopped", "completed", "cancelled"].includes(r.run_status) &&
                          RESTARTABLE_SEQUENCE_TYPES.has(r.sequence_type) ? (
                            <button
                              type="button"
                              disabled={
                                restartingId === r.id || deletingId === r.id || stoppingId === r.id
                              }
                              onClick={() => handleRestartRun(r.id)}
                              className="text-left text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50"
                            >
                              {restartingId === r.id ? "Starting…" : "Start again"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={
                              deletingId === r.id || stoppingId === r.id || restartingId === r.id
                            }
                            onClick={() => handleDeleteRun(r.id)}
                            className="text-left text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                          >
                            {deletingId === r.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && runs.length > 0 && runs.length < total && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => loadMore()}
              disabled={loadingMore}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
