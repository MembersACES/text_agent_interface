"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getAutonomousApiBaseUrl, cn } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { useToast } from "@/components/ui/toast";

type AgentTab = "running" | "finished" | "templates";

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

interface SequenceTemplateStep {
  id: number;
  template_id: number;
  step_index: number;
  day_number: number;
  channel: string;
  send_time_local: string;
  prompt_text: string | null;
  retell_agent_id: string | null;
  is_active: boolean;
}

interface SequenceTemplate {
  id: number;
  sequence_type: string;
  display_name: string;
  description: string | null;
  timezone: string;
  is_active: boolean;
  is_restartable: boolean;
  steps: SequenceTemplateStep[];
}

interface SequenceTypePromptConfig {
  id?: number;
  sequence_type: string;
  system_prompt?: string | null;
  email_example?: string | null;
  sms_example?: string | null;
  voice_example?: string | null;
  retell_agent_id?: string | null;
  retell_agent_copied?: number | null;
}

function isRetellAgentCopiedFlag(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "number" && Number.isFinite(v)) return v === 1;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return false;
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

function proxyErrorMessage(data: any, fallback: string): string {
  const base = (typeof data?.error === "string" && data.error) || fallback;
  const upstreamUrl = typeof data?.upstream_url === "string" ? data.upstream_url : "";
  const upstreamDetail =
    (typeof data?.autonomous_response?.detail === "string" && data.autonomous_response.detail) ||
    (typeof data?.autonomous_response?.error === "string" && data.autonomous_response.error) ||
    (typeof data?.autonomous_response?.message === "string" && data.autonomous_response.message) ||
    (typeof data?.detail === "string" && data.detail) ||
    "";
  return [base, upstreamUrl ? `URL: ${upstreamUrl}` : "", upstreamDetail ? `Detail: ${upstreamDetail}` : ""]
    .filter(Boolean)
    .join(" | ");
}

const PAGE_SIZE = 20;

const RESTARTABLE_SEQUENCE_TYPES = new Set([
  "gas_base2_followup_v1",
  "ci_electricity_base2_followup_v1",
]);

// ─── small UI helpers ───────────────────────────────────────────────────────

const channelIcon: Record<string, string> = {
  email: "✉",
  sms: "💬",
  voice: "📞",
};

function ChannelBadge({ channel }: { channel: string }) {
  const icon = channelIcon[channel.toLowerCase()] ?? "•";
  const colours: Record<string, string> = {
    email: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    sms: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    voice: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  };
  const cls = colours[channel.toLowerCase()] ?? "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide", cls)}>
      <span>{icon}</span>
      <span className="capitalize">{channel}</span>
    </span>
  );
}

function StatusPill({ status, stopReason }: { status: string; stopReason?: string | null }) {
  const map: Record<string, string> = {
    running: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    completed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    stopped: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  };
  const cls = map[status] ?? "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide capitalize w-fit", cls)}>
        {status.replace(/_/g, " ")}
      </span>
      {stopReason && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 pl-0.5">
          {stopReason.replace(/_/g, " ")}
        </span>
      )}
    </div>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{done}/{total}</span>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

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
  const [startingId, setStartingId] = useState<number | null>(null);
  const [restartingId, setRestartingId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<SequenceTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [savingTemplateId, setSavingTemplateId] = useState<number | null>(null);
  const [savingStepId, setSavingStepId] = useState<number | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [typePrompts, setTypePrompts] = useState<SequenceTypePromptConfig | null>(null);
  const [typePromptsLoading, setTypePromptsLoading] = useState(false);
  const [typePromptsError, setTypePromptsError] = useState<string | null>(null);
  const [savingTypePrompts, setSavingTypePrompts] = useState(false);
  const [triggeringFlows, setTriggeringFlows] = useState(false);

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

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    if (tab === "templates") { setLoading(false); return; }
    const fetchRuns = async () => {
      try {
        setLoading(true); setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", "0");
        params.set("run_status_group", tab === "running" ? "running" : "finished");
        const res = await fetch(
          `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/runs?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(typeof data.detail === "string" ? data.detail : "Failed to load sequences");
        }
        const data = await res.json();
        setRuns(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load sequences");
      } finally { setLoading(false); }
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
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error("Failed to load more");
      const data = await res.json();
      setRuns((prev) => [...prev, ...(Array.isArray(data.items) ? data.items : [])]);
    } catch (e) { console.error("Load more sequences", e); }
    finally { setLoadingMore(false); }
  };

  useEffect(() => {
    if (!token || tab !== "templates") return;
    const fetchTemplates = async () => {
      try {
        setTemplatesLoading(true); setTemplatesError(null);
        const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Failed to load sequence templates");
        const rows = Array.isArray(data) ? data : [];
        setTemplates(rows);
        setSelectedTemplateId((prev) => prev ?? rows[0]?.id ?? null);
      } catch (e: unknown) {
        setTemplatesError(e instanceof Error ? e.message : "Failed to load templates");
      } finally { setTemplatesLoading(false); }
    };
    fetchTemplates();
  }, [token, tab]);

  const updateTemplateLocal = (templateId: number, patch: Partial<SequenceTemplate>) =>
    setTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, ...patch } : t)));

  const updateStepLocal = (templateId: number, stepId: number, patch: Partial<SequenceTemplateStep>) =>
    setTemplates((prev) =>
      prev.map((t) =>
        t.id !== templateId ? t : { ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) },
      ),
    );

  const saveTemplate = async (template: SequenceTemplate) => {
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
            timezone: template.timezone,
            is_active: template.is_active,
            is_restartable: template.is_restartable,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Save failed");
      updateTemplateLocal(template.id, data as SequenceTemplate);
      showToast("Template saved.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally { setSavingTemplateId(null); }
  };

  const saveStep = async (templateId: number, step: SequenceTemplateStep) => {
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
      showToast("Step saved.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally { setSavingStepId(null); }
  };

  const addTemplate = async () => {
    if (!token) return;
    setCreatingTemplate(true);
    try {
      const name = window.prompt("New sequence key (e.g. gas_base2_followup_v2):");
      if (!name?.trim()) return;
      const sequenceType = name.trim();
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          sequence_type: sequenceType,
          display_name: sequenceType,
          description: "",
          timezone: "Australia/Brisbane",
          is_active: true,
          is_restartable: true,
          steps: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Create failed");
      setTemplates((prev) => [...prev, data as SequenceTemplate]);
      setSelectedTemplateId((data as SequenceTemplate).id);
      showToast("Template created.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Create failed", "error");
    } finally { setCreatingTemplate(false); }
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

  useEffect(() => {
    if (!token || tab !== "templates" || !selectedTemplateId) {
      setTypePrompts(null); setTypePromptsError(null); return;
    }
    const selected = templates.find((t) => t.id === selectedTemplateId);
    const sequenceType = selected?.sequence_type?.trim();
    if (!sequenceType) { setTypePrompts(null); setTypePromptsError(null); return; }
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
  }, [token, tab, selectedTemplateId, templates]);

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
          voice_example: typePrompts.voice_example ?? "",
          retell_agent_id: typePrompts.retell_agent_id ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Prompt save failed");
      setTypePrompts(data as SequenceTypePromptConfig);
      showToast("Prompt examples saved to autonomous_sequence_type.", "success");
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
    setStartingId(runId);
    try {
      const res = await fetch(`/api/autonomous/trigger-flows/run/${runId}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(proxyErrorMessage(data, "Start failed"));
      }
      const msg =
        typeof data.message === "string" && data.message
          ? data.message
          : `Sequence #${runId} trigger sent.`;
      showToast(msg, "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Start failed", "error");
    } finally {
      setStartingId(null);
    }
  };

  const handleRestartRun = async (runId: number) => {
    if (!token) return;
    if (!window.confirm("Start a new sequence for this offer using the same sequence type and saved context? The schedule is anchored from today in AEST; day 1 starts at 9:00 on the next business day.")) return;
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
    } finally { setRestartingId(null); }
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

  // ── derived ───────────────────────────────────────────────────────────────

  const emptyMessage =
    tab === "running"
      ? "No active autonomous sequences. Start one via POST /api/autonomous/sequences/start (or wire from Base 2)."
      : "No finished sequences yet.";
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  // ── shared input classes ──────────────────────────────────────────────────

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition";
  const textareaCls =
    "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-2.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition resize-y";
  const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";
  const btnPrimary =
    "inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm";
  const btnSecondary =
    "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold px-3 py-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm";

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        pageName="Autonomous Agent"
        title="Autonomous Agent"
        description="Follow-up sequence runs (email via n8n, voice via Retell). Data lives in the CRM backend."
      />

      <div className="mt-5 space-y-5">

        {/* ── toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* tab switcher */}
            <div
              className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 shadow-sm gap-0.5"
              role="tablist"
              aria-label="Autonomous sequence queue"
            >
              {(["running", "finished", "templates"] as AgentTab[]).map((t) => {
                const labels: Record<AgentTab, string> = {
                  running: "Running",
                  finished: "Finished",
                  templates: "Sequence templates",
                };
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all",
                      tab === t
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800",
                    )}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={triggerAutonomousFlows}
              disabled={triggeringFlows || !session}
              className={btnSecondary}
              title="Calls n8n to process due autonomous agent steps (email, voice, SMS)."
            >
              {triggeringFlows ? "Triggering…" : "Trigger Autonomous Flows"}
            </button>
          </div>

          <Link
            href="/offers"
            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
          >
            All offers →
          </Link>
        </div>

        {/* ── error banner ── */}
        {tab !== "templates" && error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3.5 text-sm text-red-700 dark:text-red-300">
            <span className="mt-0.5 shrink-0 text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ══════════════ TEMPLATES TAB ══════════════ */}
        {tab === "templates" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">

            {/* sidebar list */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Templates</span>
                <button type="button" onClick={addTemplate} disabled={creatingTemplate} className={btnSecondary}>
                  {creatingTemplate ? "Creating…" : "+ New"}
                </button>
              </div>
              {templatesLoading ? (
                <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500">Loading templates…</p>
              ) : templatesError ? (
                <p className="px-4 py-6 text-sm text-red-500">{templatesError}</p>
              ) : templates.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500">No templates found.</p>
              ) : (
                <nav className="divide-y divide-gray-50 dark:divide-gray-800/80">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(t.id)}
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
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{t.sequence_type}</div>
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
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5">
              {!selectedTemplate ? (
                <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
                  Select a template from the list to edit it.
                </div>
              ) : (
                <div className="space-y-6">

                  {/* template meta */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{selectedTemplate.display_name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className={labelCls}>
                        Display name
                        <input type="text" value={selectedTemplate.display_name}
                          onChange={(e) => updateTemplateLocal(selectedTemplate.id, { display_name: e.target.value })}
                          className={inputCls} />
                      </label>
                      <label className={labelCls}>
                        Timezone
                        <input type="text" value={selectedTemplate.timezone}
                          onChange={(e) => updateTemplateLocal(selectedTemplate.id, { timezone: e.target.value })}
                          className={inputCls} />
                      </label>
                      <label className={cn(labelCls, "md:col-span-2")}>
                        Description
                        <input type="text" value={selectedTemplate.description ?? ""}
                          onChange={(e) => updateTemplateLocal(selectedTemplate.id, { description: e.target.value })}
                          className={inputCls} />
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <input type="checkbox" checked={selectedTemplate.is_active}
                          onChange={(e) => updateTemplateLocal(selectedTemplate.id, { is_active: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        Active
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <input type="checkbox" checked={selectedTemplate.is_restartable}
                          onChange={(e) => updateTemplateLocal(selectedTemplate.id, { is_restartable: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        Restartable
                      </label>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button type="button" onClick={() => saveTemplate(selectedTemplate)}
                        disabled={savingTemplateId === selectedTemplate.id} className={btnPrimary}>
                        {savingTemplateId === selectedTemplate.id ? "Saving…" : "Save template"}
                      </button>
                      <button type="button" onClick={() => addStep(selectedTemplate.id)}
                        disabled={savingStepId === -1} className={btnSecondary}>
                        {savingStepId === -1 ? "Adding…" : "+ Add step"}
                      </button>
                    </div>
                  </div>

                  {/* prompt examples */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950/50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Prompt examples</h4>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Reads/writes <code className="font-mono text-[10px]">autonomous_sequence_type</code> for this sequence type.
                        </p>
                      </div>
                      <button type="button" onClick={saveTypePrompts}
                        disabled={savingTypePrompts || !typePrompts} className={btnPrimary}>
                        {savingTypePrompts ? "Saving…" : "Save prompts"}
                      </button>
                    </div>

                    {typePromptsLoading ? (
                      <p className="text-xs text-gray-400">Loading prompt fields…</p>
                    ) : typePromptsError ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400">{typePromptsError}</p>
                    ) : typePrompts ? (
                      <div className="grid grid-cols-1 gap-4">
                        <label className={labelCls}>
                          System prompt
                          <textarea value={typePrompts.system_prompt ?? ""}
                            onChange={(e) => updateTypePromptsLocal({ system_prompt: e.target.value })}
                            rows={4} className={textareaCls} />
                        </label>
                        <label className={labelCls}>
                          Email example
                          <textarea value={typePrompts.email_example ?? ""}
                            onChange={(e) => updateTypePromptsLocal({ email_example: e.target.value })}
                            rows={4} className={textareaCls} />
                        </label>
                        <label className={labelCls}>
                          SMS example
                          <textarea value={typePrompts.sms_example ?? ""}
                            onChange={(e) => updateTypePromptsLocal({ sms_example: e.target.value })}
                            rows={3} className={textareaCls} />
                        </label>
                        <label className={labelCls}>
                          Voice example
                          <textarea value={typePrompts.voice_example ?? ""}
                            onChange={(e) => updateTypePromptsLocal({ voice_example: e.target.value })}
                            rows={3} className={textareaCls} />
                        </label>

                        {/* retell agent id */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={labelCls}>Retell agent ID</span>
                            {isRetellAgentCopiedFlag(typePrompts.retell_agent_copied) && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                                ⚠ Copied default — update
                              </span>
                            )}
                          </div>
                          <input type="text" value={typePrompts.retell_agent_id ?? ""}
                            onChange={(e) => updateTypePromptsLocal({ retell_agent_id: e.target.value })}
                            className={cn(inputCls, "mt-0 font-mono text-xs")} />
                          {isRetellAgentCopiedFlag(typePrompts.retell_agent_copied) && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!token || !typePrompts?.sequence_type) return;
                                setSavingTypePrompts(true);
                                try {
                                  const res = await fetch(
                                    `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/type-prompts`,
                                    {
                                      method: "PATCH",
                                      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        sequence_type: typePrompts.sequence_type,
                                        retell_agent_reviewed: "true",
                                      }),
                                    },
                                  );
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Update failed");
                                  setTypePrompts(data as SequenceTypePromptConfig);
                                  showToast("Retell agent marked as reviewed.", "success");
                                } catch (e: unknown) {
                                  showToast(e instanceof Error ? e.message : "Update failed", "error");
                                } finally { setSavingTypePrompts(false); }
                              }}
                              disabled={savingTypePrompts}
                              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                            >
                              This Retell ID is correct — clear warning
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* steps table */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Steps</h4>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            {["Index", "Day", "Channel", "Time", "Prompt", "Active", ""].map((h) => (
                              <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {[...selectedTemplate.steps]
                            .sort((a, b) => a.step_index - b.step_index)
                            .map((s) => (
                              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                <td className="px-3 py-2">
                                  <input type="number" value={s.step_index}
                                    onChange={(e) => updateStepLocal(selectedTemplate.id, s.id, { step_index: Number(e.target.value) })}
                                    className="w-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="number" value={s.day_number}
                                    onChange={(e) => updateStepLocal(selectedTemplate.id, s.id, { day_number: Number(e.target.value) })}
                                    className="w-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={s.channel}
                                    onChange={(e) => updateStepLocal(selectedTemplate.id, s.id, { channel: e.target.value })}
                                    className="w-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={s.send_time_local}
                                    onChange={(e) => updateStepLocal(selectedTemplate.id, s.id, { send_time_local: e.target.value })}
                                    className="w-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={s.prompt_text ?? ""}
                                    onChange={(e) => updateStepLocal(selectedTemplate.id, s.id, { prompt_text: e.target.value })}
                                    className="w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input type="checkbox" checked={s.is_active}
                                    onChange={(e) => updateStepLocal(selectedTemplate.id, s.id, { is_active: e.target.checked })}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                </td>
                                <td className="px-3 py-2">
                                  <button type="button" onClick={() => saveStep(selectedTemplate.id, s)}
                                    disabled={savingStepId === s.id} className={btnSecondary}>
                                    {savingStepId === s.id ? "Saving…" : "Save"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
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

        ) : runs.length === 0 ? (
          /* ── empty state ── */
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-16 text-center">
            <div className="text-3xl mb-3">🤖</div>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{emptyMessage}</p>
          </div>

        ) : (
          /* ══════════════ RUNS TABLE ══════════════ */
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {["Client", "Offer", "Status", "Progress", "Next step", "Anchor", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">

                      {/* client */}
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100">
                        {r.business_name || <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>

                      {/* offer */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">#{r.offer_id}</span>
                      </td>

                      {/* status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusPill status={r.run_status} stopReason={r.stop_reason} />
                      </td>

                      {/* progress */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ProgressBar done={r.steps_done} total={r.steps_total} />
                      </td>

                      {/* next step */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.next_step_channel ? (
                          <div className="space-y-1">
                            <ChannelBadge channel={r.next_step_channel} />
                            <div className="text-[11px] text-gray-400 dark:text-gray-500">{formatDateTime(r.next_step_at)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* anchor */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(r.anchor_at)}
                      </td>

                      {/* actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1.5">
                          <Link href={`/autonomous-agent/${r.id}`}
                            className="inline-flex items-center rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold px-2 py-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                            Sequence
                          </Link>
                          <Link href={`/offers/${r.offer_id}`}
                            className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-[11px] font-semibold px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            Offer
                          </Link>
                          {tab === "running" && r.run_status === "running" && (
                            <button
                              type="button"
                              disabled={startingId === r.id || stoppingId === r.id || deletingId === r.id || restartingId === r.id}
                              onClick={() => handleStartRunNow(r.id)}
                              className="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold px-2 py-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition disabled:opacity-40"
                            >
                              {startingId === r.id ? "Starting…" : "Start"}
                            </button>
                          )}
                          {tab === "running" && r.run_status === "running" && (
                            <button type="button"
                              disabled={stoppingId === r.id || deletingId === r.id || restartingId === r.id || startingId === r.id}
                              onClick={() => handleStopRun(r.id)}
                              className="inline-flex items-center rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold px-2 py-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition disabled:opacity-40">
                              {stoppingId === r.id ? "Stopping…" : "Stop"}
                            </button>
                          )}
                          {tab === "finished" &&
                            ["stopped", "completed", "cancelled"].includes(r.run_status) &&
                            RESTARTABLE_SEQUENCE_TYPES.has(r.sequence_type) && (
                              <button type="button"
                                disabled={restartingId === r.id || deletingId === r.id || stoppingId === r.id}
                                onClick={() => handleRestartRun(r.id)}
                                className="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold px-2 py-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition disabled:opacity-40">
                                {restartingId === r.id ? "Starting…" : "Start again"}
                              </button>
                            )}
                          <button type="button"
                            disabled={deletingId === r.id || stoppingId === r.id || restartingId === r.id || startingId === r.id}
                            onClick={() => handleDeleteRun(r.id)}
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
          </div>
        )}

        {/* load more */}
        {tab !== "templates" && !loading && runs.length > 0 && runs.length < total && (
          <div className="flex justify-center">
            <button type="button" onClick={() => loadMore()} disabled={loadingMore}
              className={cn(btnSecondary, "px-6 py-2 text-sm")}>
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}