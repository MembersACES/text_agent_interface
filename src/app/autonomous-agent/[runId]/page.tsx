"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAutonomousApiBaseUrl, getApiBaseUrl } from "@/lib/utils";
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

interface Offer {
  id: number;
  annual_savings?: number | null;
  current_cost?: number | null;
  new_cost?: number | null;
  annual_usage_gj?: number | null;
  energy_charge_pct?: number | null;
  contracted_rate?: number | null;
  offer_rate?: number | null;
  utility_display?: string | null;
  identifier?: string | null;
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

function formatMoney(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return `$${Number(v).toLocaleString("en-AU", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

// ── Visual helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status, stopReason }: { status: string; stopReason?: string | null }) {
  const s = status.toLowerCase();
  const map: Record<string, { bg: string; dot: string; text: string }> = {
    running:   { bg: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800",  dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
    completed: { bg: "bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800",                  dot: "bg-sky-500",     text: "text-sky-700 dark:text-sky-300" },
    stopped:   { bg: "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800",          dot: "bg-amber-500",   text: "text-amber-700 dark:text-amber-300" },
    failed:    { bg: "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800",                  dot: "bg-red-500",     text: "text-red-700 dark:text-red-300" },
  };
  const style = map[s] ?? { bg: "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700", dot: "bg-gray-400", text: "text-gray-600 dark:text-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${s === "running" ? "animate-pulse" : ""}`} />
      <span className="capitalize">{status.replace(/_/g, " ")}</span>
      {stopReason && <span className="opacity-60">· {stopReason.replace(/_/g, " ")}</span>}
    </span>
  );
}

function StepStatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const map: Record<string, string> = {
    ready:     "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    running:   "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300",
    completed: "bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300",
    skipped:   "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300",
    failed:    "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300",
  };
  const cls = map[s] ?? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const c = channel.toLowerCase();
  if (c.includes("email"))      return <span title="Email"      className="text-base">📧</span>;
  if (c.includes("voice"))      return <span title="Voice call" className="text-base">📞</span>;
  if (c.includes("sms"))        return <span title="SMS"        className="text-base">💬</span>;
  return <span className="text-base">📨</span>;
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-800/40 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

// ─────────────────────────────────────────────────────────────────────────────

export default function AutonomousRunDetailPage() {
  const params = useParams();
  const runId = params?.runId as string;
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const { showToast } = useToast();

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);

  const [contactName, setContactName] = useState("");
  const [businessNameCtx, setBusinessNameCtx] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [utilityLane, setUtilityLane] = useState("");
  const [retellAgentId, setRetellAgentId] = useState("");
  const [siteIdentifiers, setSiteIdentifiers] = useState<string[]>([]);
  const [savingContext, setSavingContext] = useState(false);
  const [stopping, setStopping] = useState(false);

  const loadRun = useCallback(async () => {
    if (!token || !runId) return;
    const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data.detail === "string" ? data.detail : "Not found");
    }
    return res.json() as Promise<RunDetail>;
  }, [token, runId]);

  useEffect(() => {
    if (!token || !runId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
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
            const arr = Array.isArray(sid) ? sid.map(String) : [];
            setSiteIdentifiers(arr);
          } catch { setSiteIdentifiers([]); }
        }
      } catch (e: unknown) {
        if (!cancelled) { setError(e instanceof Error ? e.message : "Failed to load run"); setRun(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, runId, loadRun]);

  useEffect(() => {
    if (!token || !run?.offer_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/offers/${run.offer_id}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as Offer;
        if (!cancelled) setOffer(data);
      } catch { /* non-blocking */ }
    })();
    return () => { cancelled = true; };
  }, [token, run?.offer_id]);

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
      const arr = Array.isArray(sid) ? sid.map(String) : [];
      setSiteIdentifiers(arr);
    } catch { setSiteIdentifiers([]); }
  };

  const handleSaveContext = async () => {
    if (!token || !runId || !run) return;
    const next: Record<string, unknown> = { ...run.context };
    const setOrDelete = (key: string, value: string) => {
      const t = value.trim(); if (t) next[key] = t; else delete next[key];
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ context: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Save failed");
      }
      applyContextFromRun((await res.json()) as RunDetail);
      showToast("Contact context saved.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally { setSavingContext(false); }
  };

  const handleStopSequence = async () => {
    if (!token || !runId || !run || run.run_status !== "running") return;
    if (!window.confirm("Stop this sequence? Pending steps will be skipped and no further outreach will run.")) return;
    setStopping(true);
    try {
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Stop failed");
      }
      applyContextFromRun((await res.json()) as RunDetail);
      showToast("Sequence stopped.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Stop failed", "error");
    } finally { setStopping(false); }
  };

  const isRunning = run?.run_status === "running";
  const base2Trigger = run ? strField(run.context, "base2_trigger") : "";

  // Progress bar calc
  const stepsTotal = run?.steps.length ?? 0;
  const stepsDone  = run?.steps.filter(s => s.step_status === "completed").length ?? 0;
  const pct        = stepsTotal > 0 ? Math.round((stepsDone / stepsTotal) * 100) : 0;

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

      <div className="mt-5 space-y-5 pb-10">
        {/* Back link */}
        <Link
          href="/autonomous-agent"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          ← Back to Autonomous Agent
        </Link>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300 p-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-gray-400">Loading sequence…</p>
          </div>
        ) : run ? (
          <>
            {/* ── Run header card ─────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Left: meta */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={run.run_status} stopReason={run.stop_reason} />
                    <span className="rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {run.timezone}
                    </span>
                    {base2Trigger && (
                      <span className="rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-2.5 py-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                        trigger: {base2Trigger}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {stepsTotal > 0 && (
                    <div className="w-56">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {stepsDone}/{stepsTotal} steps
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Link href={`/offers/${run.offer_id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Open offer #{run.offer_id} →
                  </Link>
                </div>

                {/* Right: stop button */}
                {isRunning && (
                  <button
                    type="button"
                    onClick={handleStopSequence}
                    disabled={stopping}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition shadow-sm"
                  >
                    {stopping ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Stopping…
                      </>
                    ) : (
                      <>
                        <span className="text-base leading-none">⏹</span>
                        Stop sequence
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* ── Two-column layout: context + metrics ─────────────────── */}
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

              {/* Outreach context card */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

                {/* Card header */}
                <div className="px-5 py-4 bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Outreach context</h2>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    Sent to n8n and Retell when steps run. Remaining steps use the saved values.
                  </p>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">

                  {/* ── Contact section ── */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-sm">👤</div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Contact</span>
                    </div>
                    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Name</label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-gray-900 transition"
                        />
                      </div>
                      {/* Business */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Business</label>
                        <input
                          type="text"
                          value={businessNameCtx}
                          onChange={(e) => setBusinessNameCtx(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-gray-900 transition"
                        />
                      </div>
                      {/* Email — full width on its own row */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Email</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-xs">✉</span>
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 pl-7 pr-3 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-gray-900 transition"
                          />
                        </div>
                      </div>
                      {/* Phone */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Phone</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-xs">📞</span>
                          <input
                            type="text"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 pl-7 pr-3 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-gray-900 transition"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Configuration section ── */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 text-sm">⚙️</div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Configuration</span>
                    </div>
                    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Utility lane</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                          </span>
                          <input
                            type="text"
                            placeholder="ci_gas or ci_electricity"
                            value={utilityLane}
                            onChange={(e) => setUtilityLane(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 pl-7 pr-3 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-gray-900 transition"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Retell agent ID</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          </span>
                          <input
                            type="text"
                            value={retellAgentId}
                            onChange={(e) => setRetellAgentId(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 pl-7 pr-3 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-gray-900 transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Site identifiers */}
                    {siteIdentifiers.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Site identifiers</p>
                        <div className="flex flex-wrap gap-2">
                          {siteIdentifiers.map((id, i) => (
                            <div
                              key={i}
                              className="inline-flex items-center gap-2 rounded-lg border border-primary/25 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 px-3 py-2"
                            >
                              <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-primary/15 dark:bg-primary/25">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              </span>
                              <span className="font-mono text-xs font-semibold text-primary dark:text-primary/90 tracking-wider">{id}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Save footer */}
                  <div className="px-5 py-4 bg-gray-50/60 dark:bg-gray-800/30 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handleSaveContext}
                      disabled={savingContext}
                      className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold bg-primary text-white hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 transition shadow-sm"
                    >
                      {savingContext ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Save context
                        </>
                      )}
                    </button>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Changes take effect on the next scheduled step</span>
                  </div>

                </div>
              </div>

              {/* Offer metrics card (sidebar) */}
              {offer ? (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 self-start">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Offer metrics
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">Base 2</span>
                  </h2>

                  {/* Savings highlight */}
                  {offer.annual_savings != null && (
                    <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">Annual savings</p>
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{formatMoney(offer.annual_savings)}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {offer.annual_usage_gj != null && (
                      <MetricTile
                        label="Annual usage"
                        value={`${Number(offer.annual_usage_gj).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GJ/yr`}
                      />
                    )}
                    {offer.energy_charge_pct != null && (
                      <MetricTile
                        label="Energy charge"
                        value={`${Number(offer.energy_charge_pct).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                      />
                    )}
                    {offer.contracted_rate != null && (
                      <MetricTile
                        label="Contracted rate"
                        value={`$${Number(offer.contracted_rate).toLocaleString("en-AU", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
                      />
                    )}
                    {offer.offer_rate != null && (
                      <MetricTile
                        label="Offer rate"
                        value={`$${Number(offer.offer_rate).toLocaleString("en-AU", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
                      />
                    )}
                  </div>

                  {(offer.current_cost != null || offer.new_cost != null) && (
                    <div className="mt-2 rounded-lg border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-800/40 px-4 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Cost comparison</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                        <span className="line-through text-gray-400 dark:text-gray-500 mr-1">
                          {offer.current_cost != null ? formatMoney(offer.current_cost) : "—"}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          → {offer.new_cost != null ? formatMoney(offer.new_cost) : "—"}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* ── Steps table ──────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sequence steps</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {run.steps.length} step{run.steps.length !== 1 ? "s" : ""} across {Math.max(...run.steps.map(s => s.day_number), 0)} day{Math.max(...run.steps.map(s => s.day_number), 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-10">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-14">Day</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Channel</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Scheduled</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.steps.map((s, i) => (
                      <tr
                        key={s.id}
                        className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
                          i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/40 dark:bg-gray-800/20"
                        } hover:bg-primary/5 dark:hover:bg-primary/10`}
                      >
                        <td className="px-4 py-3 text-xs font-mono font-medium text-gray-400 dark:text-gray-500">{s.step_index}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">
                            {s.day_number}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                            <ChannelIcon channel={s.channel} />
                            <span className="capitalize text-xs">{s.channel.replace(/_/g, " ")}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StepStatusPill status={s.step_status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDt(s.scheduled_at)}
                        </td>
                        <td className="px-4 py-3 max-w-sm">
                          {s.last_outcome_summary ? (
                            <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                              {s.last_outcome_summary.slice(0, 200)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                          )}
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