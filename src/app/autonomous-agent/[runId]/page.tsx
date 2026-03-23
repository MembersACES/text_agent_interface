"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAutonomousApiBaseUrl, getApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { useToast } from "@/components/ui/toast";

dayjs.extend(utc);
dayjs.extend(timezone);

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

const scheduleInputCls =
  "rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary min-w-[11rem] max-w-full";

function isScheduleEditable(stepStatus: string): boolean {
  const s = stepStatus.toLowerCase();
  return s === "ready" || s === "to_start";
}

/** ISO instant from API → datetime-local value in the run's timezone */
function scheduledToScheduleInput(iso: string | null, tz: string): string {
  if (!iso) return "";
  return dayjs(iso).tz(tz).format("YYYY-MM-DDTHH:mm");
}

/** datetime-local (wall clock in run TZ) → UTC ISO for the API */
function scheduleInputToIso(local: string, tz: string): string {
  const d = dayjs.tz(local, "YYYY-MM-DDTHH:mm", tz);
  if (!d.isValid()) throw new Error("Invalid date");
  return d.utc().toISOString();
}

/** Milliseconds for cascade: current draft if valid, else server `scheduled_at`. */
function effectiveStepMs(st: StepRow, prevDraft: string | undefined, tz: string): number | null {
  const d = prevDraft?.trim();
  if (d) {
    const t = dayjs.tz(d, "YYYY-MM-DDTHH:mm", tz);
    if (t.isValid()) return t.valueOf();
  }
  return st.scheduled_at ? dayjs(st.scheduled_at).valueOf() : null;
}

/** dayjs: 0 = Sun … 6 = Sat — align with backend “no weekend outreach”. */
function isWeekendWall(t: dayjs.Dayjs): boolean {
  const d = t.day();
  return d === 0 || d === 6;
}

/** Same idea as Python `ensure_weekday`: roll calendar forward until Mon–Fri, keep clock time. */
function snapForwardToBusinessDayWall(t: dayjs.Dayjs): dayjs.Dayjs {
  let x = t;
  while (isWeekendWall(x)) {
    x = x.add(1, "day");
  }
  return x;
}

/**
 * When the user edits step at `changedStepId`, set that time and shift every later *editable* step
 * by the same millisecond gaps as between steps now (drafts if set, else server times).
 * Then snaps each affected step to a weekday and keeps strict time order (business-day rules).
 */
function applySequentialCascadeToDrafts(
  orderedSteps: StepRow[],
  changedStepId: number,
  newLocalValue: string,
  tz: string,
  prev: Record<number, string>,
): Record<number, string> {
  const ci = orderedSteps.findIndex((x) => x.id === changedStepId);
  if (ci < 0) return { ...prev, [changedStepId]: newLocalValue };

  const out = { ...prev };
  if (!newLocalValue.trim()) {
    out[changedStepId] = newLocalValue;
    return out;
  }

  const anchor = dayjs.tz(newLocalValue, "YYYY-MM-DDTHH:mm", tz);
  if (!anchor.isValid()) {
    out[changedStepId] = newLocalValue;
    return out;
  }

  const n = orderedSteps.length;
  const origMs: (number | null)[] = orderedSteps.map((st) =>
    effectiveStepMs(st, prev[st.id], tz),
  );

  const deltaMs: number[] = new Array(n).fill(0);
  for (let j = 1; j < n; j++) {
    const a = origMs[j - 1];
    const b = origMs[j];
    deltaMs[j] = a != null && b != null ? b - a : 0;
  }

  const newMs: number[] = new Array(n).fill(0);
  newMs[ci] = anchor.valueOf();
  for (let j = ci + 1; j < n; j++) {
    newMs[j] = newMs[j - 1] + deltaMs[j];
  }

  for (let j = 0; j < ci; j++) {
    newMs[j] = origMs[j] ?? newMs[ci];
  }

  for (let j = ci; j < n; j++) {
    let t = dayjs(newMs[j]).tz(tz);
    t = snapForwardToBusinessDayWall(t);
    if (j > 0) {
      const prevMs = newMs[j - 1];
      let guard = 0;
      while (t.valueOf() <= prevMs && guard < 21) {
        t = t.add(1, "day");
        t = snapForwardToBusinessDayWall(t);
        guard++;
      }
    }
    newMs[j] = t.valueOf();
  }

  for (let j = ci; j < n; j++) {
    if (!isScheduleEditable(orderedSteps[j].step_status)) continue;
    out[orderedSteps[j].id] = dayjs(newMs[j]).tz(tz).format("YYYY-MM-DDTHH:mm");
  }

  return out;
}

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
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<number, string>>({});
  const [savingSchedules, setSavingSchedules] = useState(false);

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

  const stepScheduleFingerprint = useMemo(() => {
    if (!run) return "";
    return run.steps.map((s) => `${s.id}:${s.scheduled_at ?? ""}:${s.step_status}`).join("|");
  }, [run]);

  useEffect(() => {
    if (!run) {
      setScheduleDrafts({});
      return;
    }
    const next: Record<number, string> = {};
    for (const s of run.steps) {
      if (isScheduleEditable(s.step_status)) {
        next[s.id] = scheduledToScheduleInput(s.scheduled_at, run.timezone);
      }
    }
    setScheduleDrafts(next);
  }, [run?.id, run?.timezone, stepScheduleFingerprint]);

  const hasScheduleChanges = useMemo(() => {
    if (!run) return false;
    for (const s of run.steps) {
      if (!isScheduleEditable(s.step_status)) continue;
      const draft = scheduleDrafts[s.id];
      if (draft === undefined) continue;
      const orig = scheduledToScheduleInput(s.scheduled_at, run.timezone);
      if (draft !== orig) return true;
    }
    return false;
  }, [run, scheduleDrafts]);

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

  const handleSaveSchedules = async () => {
    if (!token || !runId || !run) return;
    const updates: { step_id: number; scheduled_at: string }[] = [];
    for (const s of run.steps) {
      if (!isScheduleEditable(s.step_status)) continue;
      const raw = scheduleDrafts[s.id];
      if (raw === undefined) continue;
      const orig = scheduledToScheduleInput(s.scheduled_at, run.timezone);
      if (raw === orig) continue;
      if (!raw.trim()) {
        showToast("Each updated step needs a scheduled date and time.", "error");
        return;
      }
      try {
        updates.push({ step_id: s.id, scheduled_at: scheduleInputToIso(raw, run.timezone) });
      } catch {
        showToast("Invalid date or time for one or more steps.", "error");
        return;
      }
    }
    if (updates.length === 0) return;
    setSavingSchedules(true);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs/${runId}/steps/schedule`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Schedule update failed");
      }
      applyContextFromRun((await res.json()) as RunDetail);
      showToast("Step schedules saved.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Schedule update failed", "error");
    } finally {
      setSavingSchedules(false);
    }
  };

  const isRunning = run?.run_status === "running";
  const base2Trigger = run ? strField(run.context, "base2_trigger") : "";

  const orderedSteps = useMemo((): StepRow[] => {
    if (!run) return [];
    return [...run.steps].sort((a, b) => a.step_index - b.step_index);
  }, [run]);

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

      <div className="mt-4 space-y-4">

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300 px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-gray-400">Loading sequence…</p>
          </div>
        ) : run ? (
          <>
            {/* ── Top bar ── */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm px-4 py-3">
              <Link href="/autonomous-agent" className="text-sm font-medium text-gray-400 hover:text-primary transition">
                ← Back
              </Link>
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
              <StatusBadge status={run.run_status} stopReason={run.stop_reason} />
              <span className="rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-500">
                {run.timezone}
              </span>
              {base2Trigger && (
                <span className="rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-2.5 py-1 text-xs text-violet-600 dark:text-violet-400">
                  trigger: {base2Trigger}
                </span>
              )}
              {stepsTotal > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-28 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 tabular-nums">{stepsDone}/{stepsTotal} steps</span>
                </div>
              )}
              <Link href={`/offers/${run.offer_id}`} className="text-sm font-medium text-primary hover:underline">
                Offer #{run.offer_id} →
              </Link>
              <div className="flex-1" />
              {isRunning && (
                <button
                  type="button"
                  onClick={handleStopSequence}
                  disabled={stopping}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition shadow-sm"
                >
                  {stopping ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Stopping…</> : <>⏹ Stop sequence</>}
                </button>
              )}
            </div>

            {/* ── Two-column body ── */}
            <div className="grid grid-cols-[1fr_300px] gap-4 items-start">

              {/* LEFT — Outreach context */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

                {/* Header */}
                <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Outreach context</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Sent to n8n and Retell when steps run. Remaining steps use the saved values.</p>
                </div>

                {/* Contact section */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-sm">👤</div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Contact</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Name</label>
                      <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Business</label>
                      <input type="text" value={businessNameCtx} onChange={(e) => setBusinessNameCtx(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
                      <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Phone</label>
                      <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>

                {/* Configuration section */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 text-sm">⚙️</div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Configuration</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Utility lane</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center"><span className="h-2 w-2 rounded-full bg-amber-400" /></span>
                        <input type="text" placeholder="ci_gas or ci_electricity" value={utilityLane} onChange={(e) => setUtilityLane(e.target.value)} className={`${inputCls} pl-7`} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Retell agent ID</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center"><span className="h-2 w-2 rounded-full bg-emerald-400" /></span>
                        <input type="text" value={retellAgentId} onChange={(e) => setRetellAgentId(e.target.value)} className={`${inputCls} pl-7`} />
                      </div>
                    </div>
                  </div>

                  {siteIdentifiers.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Site identifiers</label>
                      <div className="flex flex-wrap gap-2">
                        {siteIdentifiers.map((id, i) => (
                          <div key={i} className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 dark:bg-primary/10 px-3 py-1.5">
                            <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-primary/15"><span className="h-1.5 w-1.5 rounded-full bg-primary" /></span>
                            <span className="font-mono text-xs font-semibold text-primary dark:text-primary/90 tracking-wide">{id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Save footer */}
                <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveContext}
                    disabled={savingContext}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                  >
                    {savingContext
                      ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                      : <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Save context</>
                    }
                  </button>
                  <span className="text-xs text-gray-400 dark:text-gray-500">Changes take effect on the next scheduled step</span>
                </div>
              </div>

              {/* RIGHT — Metrics + Steps */}
              <div className="flex flex-col gap-4">

                {/* Offer metrics */}
                {offer && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                    {offer.annual_savings != null && (
                      <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Annual savings</span>
                        <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{formatMoney(offer.annual_savings)}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-gray-800">
                      {offer.annual_usage_gj != null && (
                        <div className="px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Usage</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums mt-1">{Number(offer.annual_usage_gj).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GJ/yr</p>
                        </div>
                      )}
                      {offer.energy_charge_pct != null && (
                        <div className="px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Energy charge</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums mt-1">{Number(offer.energy_charge_pct).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</p>
                        </div>
                      )}
                      {offer.contracted_rate != null && (
                        <div className="px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Contracted rate</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums mt-1">${Number(offer.contracted_rate).toLocaleString("en-AU", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
                        </div>
                      )}
                      {offer.offer_rate != null && (
                        <div className="px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Offer rate</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums mt-1">${Number(offer.offer_rate).toLocaleString("en-AU", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
                        </div>
                      )}
                      {(offer.current_cost != null || offer.new_cost != null) && (
                        <div className="col-span-2 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Cost</p>
                          <p className="text-sm font-bold tabular-nums mt-1">
                            <span className="line-through text-gray-400 mr-2">{offer.current_cost != null ? formatMoney(offer.current_cost) : "—"}</span>
                            <span className="text-emerald-600 dark:text-emerald-400">→ {offer.new_cost != null ? formatMoney(offer.new_cost) : "—"}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sequence steps */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Sequence steps</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        Times use {run.timezone}. Editing a step shifts later pending steps by the same gaps, then snaps to
                        weekdays (Sat/Sun roll to Mon) and keeps order — same idea as automatic planning.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{run.steps.length} steps · {Math.max(...run.steps.map(s => s.day_number), 0)} days</span>
                      <button
                        type="button"
                        onClick={handleSaveSchedules}
                        disabled={savingSchedules || !hasScheduleChanges}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                      >
                        {savingSchedules ? (
                          <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
                        ) : (
                          "Save schedules"
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {orderedSteps.map((s) => {
                      const editable = isScheduleEditable(s.step_status);
                      return (
                        <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-500">{s.day_number}</span>
                          <span className="shrink-0 text-base leading-none"><ChannelIcon channel={s.channel} /></span>
                          <div className="flex-1 min-w-[8rem]">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{s.channel.replace(/_/g, " ")}</p>
                            {editable ? (
                              <label className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Scheduled (local to timezone above)
                                <input
                                  type="datetime-local"
                                  value={scheduleDrafts[s.id] ?? ""}
                                  onChange={(e) =>
                                    setScheduleDrafts((prev) =>
                                      applySequentialCascadeToDrafts(
                                        orderedSteps,
                                        s.id,
                                        e.target.value,
                                        run.timezone,
                                        prev,
                                      ),
                                    )
                                  }
                                  className={`${scheduleInputCls} mt-0.5 block w-full max-w-xs`}
                                />
                              </label>
                            ) : (
                              <p className="text-xs text-gray-400 mt-0.5">{formatDt(s.scheduled_at)}</p>
                            )}
                          </div>
                          <StepStatusPill status={s.step_status} />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}