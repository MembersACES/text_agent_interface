"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAutonomousApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { useToast } from "@/components/ui/toast";

interface StepRow {
  id: number;
  step_index: number;
  day_number: number;
  channel: string;
  step_status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  retell_agent_id: string | null;
  last_outcome_summary: string | null;
}

interface RunDetail {
  id: number;
  sequence_type: string;
  offer_id: number;
  client_id: number | null;
  run_status: string;
  stop_reason: string | null;
  anchor_at: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  business_name: string | null;
  context: Record<string, unknown>;
  steps: StepRow[];
}

function formatDt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-AU", {
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

function strField(ctx: Record<string, unknown>, key: string): string {
  const v = ctx[key];
  if (v === null || v === undefined) return "";
  return String(v);
}

export default function AutonomousRunDetailPage() {
  const params = useParams();
  const runId = params?.runId as string;
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const { showToast } = useToast();

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contactName, setContactName] = useState("");
  const [businessNameCtx, setBusinessNameCtx] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [utilityLane, setUtilityLane] = useState("");
  const [retellAgentId, setRetellAgentId] = useState("");
  const [siteIdentifiersJson, setSiteIdentifiersJson] = useState("[]");
  const [savingContext, setSavingContext] = useState(false);
  const [stopping, setStopping] = useState(false);

  const loadRun = useCallback(async () => {
    if (!token || !runId) return;
    const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data.detail === "string" ? data.detail : "Not found");
    }
    return res.json() as Promise<RunDetail>;
  }, [token, runId]);

  useEffect(() => {
    if (!token || !runId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await loadRun();
        if (!cancelled && data) {
          setRun(data);
          const ctx = data.context || {};
          setContactName(strField(ctx, "contact_name"));
          setBusinessNameCtx(strField(ctx, "business_name"));
          setContactEmail(strField(ctx, "contact_email"));
          setContactPhone(strField(ctx, "contact_phone"));
          setUtilityLane(strField(ctx, "utility_lane"));
          setRetellAgentId(strField(ctx, "retell_agent_id"));
          const sid = ctx.site_identifiers;
          try {
            setSiteIdentifiersJson(
              sid === undefined || sid === null
                ? "[]"
                : JSON.stringify(sid, null, 2),
            );
          } catch {
            setSiteIdentifiersJson("[]");
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load run");
          setRun(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, runId, loadRun]);

  const applyContextFromRun = (data: RunDetail) => {
    setRun(data);
    const ctx = data.context || {};
    setContactName(strField(ctx, "contact_name"));
    setBusinessNameCtx(strField(ctx, "business_name"));
    setContactEmail(strField(ctx, "contact_email"));
    setContactPhone(strField(ctx, "contact_phone"));
    setUtilityLane(strField(ctx, "utility_lane"));
    setRetellAgentId(strField(ctx, "retell_agent_id"));
    const sid = ctx.site_identifiers;
    try {
      setSiteIdentifiersJson(
        sid === undefined || sid === null ? "[]" : JSON.stringify(sid, null, 2),
      );
    } catch {
      setSiteIdentifiersJson("[]");
    }
  };

  const handleSaveContext = async () => {
    if (!token || !runId || !run) return;
    let siteIdentifiers: unknown;
    try {
      siteIdentifiers = JSON.parse(siteIdentifiersJson || "[]");
    } catch {
      showToast("Site identifiers must be valid JSON (e.g. an array).", "error");
      return;
    }
    const next: Record<string, unknown> = { ...run.context };
    const setOrDelete = (key: string, value: string) => {
      const t = value.trim();
      if (t) next[key] = t;
      else delete next[key];
    };
    setOrDelete("contact_name", contactName);
    setOrDelete("business_name", businessNameCtx);
    setOrDelete("contact_email", contactEmail);
    setOrDelete("contact_phone", contactPhone);
    setOrDelete("utility_lane", utilityLane);
    setOrDelete("retell_agent_id", retellAgentId);
    next.site_identifiers = siteIdentifiers;
    setSavingContext(true);
    try {
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ context: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Save failed");
      }
      const data = (await res.json()) as RunDetail;
      applyContextFromRun(data);
      showToast("Contact context saved.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSavingContext(false);
    }
  };

  const handleStopSequence = async () => {
    if (!token || !runId || !run || run.run_status !== "running") return;
    if (!window.confirm("Stop this sequence? Pending steps will be skipped and no further outreach will run.")) {
      return;
    }
    setStopping(true);
    try {
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}/stop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Stop failed");
      }
      const data = (await res.json()) as RunDetail;
      applyContextFromRun(data);
      showToast("Sequence stopped.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Stop failed", "error");
    } finally {
      setStopping(false);
    }
  };

  const isRunning = run?.run_status === "running";
  const base2Trigger = run ? strField(run.context, "base2_trigger") : "";

  return (
    <>
      <PageHeader
        pageName="Autonomous run"
        title={run ? `Sequence #${run.id}` : "Sequence"}
        description={
          run
            ? `${run.sequence_type} · Offer #${run.offer_id}${run.business_name ? ` · ${run.business_name}` : ""}`
            : "Autonomous follow-up steps for this offer."
        }
      />
      <div className="mt-4">
        <Link
          href="/autonomous-agent"
          className="text-sm font-medium text-primary hover:underline mb-4 inline-block"
        >
          ← Back to Autonomous Agent
        </Link>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
        ) : run ? (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <p>
                  <span className="font-medium">Status:</span>{" "}
                  <span className="capitalize">{run.run_status.replace(/_/g, " ")}</span>
                  {run.stop_reason ? ` · ${run.stop_reason.replace(/_/g, " ")}` : null}
                </p>
                <p>
                  <span className="font-medium">Timezone:</span> {run.timezone}
                </p>
                <p>
                  <Link
                    href={`/offers/${run.offer_id}`}
                    className="text-primary font-medium hover:underline"
                  >
                    Open offer
                  </Link>
                </p>
              </div>
              {isRunning ? (
                <button
                  type="button"
                  onClick={handleStopSequence}
                  disabled={stopping}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {stopping ? "Stopping…" : "Stop sequence"}
                </button>
              ) : null}
            </div>

            <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Outreach context
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Sent to n8n / Retell when steps run. Edit contact details anytime; remaining steps use
                the saved values.
              </p>
              {base2Trigger ? (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  <span className="font-medium">Trigger:</span> {base2Trigger}
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Contact name</span>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Business name (context)</span>
                  <input
                    type="text"
                    value={businessNameCtx}
                    onChange={(e) => setBusinessNameCtx(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Email</span>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Phone</span>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Utility lane</span>
                  <input
                    type="text"
                    placeholder="ci_gas or ci_electricity"
                    value={utilityLane}
                    onChange={(e) => setUtilityLane(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Retell agent ID</span>
                  <input
                    type="text"
                    value={retellAgentId}
                    onChange={(e) => setRetellAgentId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </label>
              </div>
              <label className="block text-xs mt-3">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Site identifiers (JSON)</span>
                <textarea
                  value={siteIdentifiersJson}
                  onChange={(e) => setSiteIdentifiersJson(e.target.value)}
                  rows={4}
                  className="mt-1 w-full font-mono text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-gray-900 dark:text-gray-100"
                />
              </label>
              <button
                type="button"
                onClick={handleSaveContext}
                disabled={savingContext}
                className="mt-4 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                {savingContext ? "Saving…" : "Save context"}
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        Day
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        Channel
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        Scheduled
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        Outcome
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {run.steps.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{s.step_index}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{s.day_number}</td>
                        <td className="px-3 py-2 capitalize text-gray-700 dark:text-gray-300">
                          {s.channel.replace(/_/g, " ")}
                        </td>
                        <td className="px-3 py-2 capitalize text-gray-700 dark:text-gray-300">
                          {s.step_status.replace(/_/g, " ")}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatDt(s.scheduled_at)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 max-w-md break-words">
                          {s.last_outcome_summary
                            ? s.last_outcome_summary.slice(0, 200)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
