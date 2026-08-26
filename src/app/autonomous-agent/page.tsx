"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAutonomousApiBaseUrl, cn } from "@/lib/utils";
import { dispatchRunNowFromList } from "@/lib/autonomous-dispatch";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { useToast } from "@/components/ui/toast";
import AutonomousResources from "./_components/AutonomousResources";
import SequenceTemplateEditor, {
  type SequenceTemplate,
  type SequenceTemplateStep,
  type SequenceTypePromptConfig,
} from "./_components/SequenceTemplateEditor";
import { type RetellAgentListItem, type SequenceTypePromptRow } from "./_components/RetellVoicePromptPanel";
import NewSequenceTemplateWizard from "./_components/NewSequenceTemplateWizard";
import { resolvedSignatureHtml } from "@/lib/autonomous-signature";
import { templateCoversFlow } from "@/lib/autonomous-sequence-keys";
import DeleteSequenceTemplateModal, {
  type TemplateDeletePreview,
  deleteSequenceTemplate,
  loadTemplateDeletePreview,
} from "./_components/DeleteSequenceTemplateModal";

type AgentTab = "running" | "finished" | "templates" | "resources";

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

const PAGE_SIZE = 20;

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const { showToast } = useToast();

  const tabFromUrl = searchParams.get("tab");
  const initialTab: AgentTab =
    tabFromUrl === "templates" || tabFromUrl === "finished" || tabFromUrl === "resources" || tabFromUrl === "running"
      ? tabFromUrl
      : "running";
  const [tab, setTab] = useState<AgentTab>(initialTab);
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

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    if (tab === "templates" || tab === "resources") { setLoading(false); return; }
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
    const t = searchParams.get("tab");
    if (t === "templates" || t === "finished" || t === "resources" || t === "running") {
      setTab(t);
    }
  }, [searchParams]);

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
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "templates");
    params.set("type", row.sequence_type);
    router.replace(`/autonomous-agent?${params.toString()}`, { scroll: false });
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
    setStartingId(runId);
    try {
      const msg = await dispatchRunNowFromList({ runId, token });
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
      ? "No active autonomous sequences. Start a test run from Sequence templates, or generate the linked comparison."
      : "No finished sequences yet.";
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const canRestart = (sequenceType: string) => {
    const tpl = templates.find((t) => t.sequence_type === sequenceType);
    if (tpl) return tpl.is_restartable;
    return RESTARTABLE_SEQUENCE_TYPES.has(sequenceType);
  };

  // ── shared input classes ──────────────────────────────────────────────────

  const btnSecondary =
    "inline-flex items-center gap-1.5 rounded-full border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark hover:bg-gray/80 dark:hover:bg-dark-3 text-dark dark:text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm";

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
              {(["running", "finished", "templates", "resources"] as AgentTab[]).map((t) => {
                const labels: Record<AgentTab, string> = {
                  running: "Running",
                  finished: "Finished",
                  templates: "Sequence templates",
                  resources: "Autonomous Resources",
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
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">

            {/* sidebar list */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Templates</span>
                <button type="button" onClick={addTemplate} className={btnSecondary}>
                  + New
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
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 overflow-hidden">
              {!selectedTemplate ? (
                <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
                  Select a template from the list to edit it.
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
                            canRestart(r.sequence_type) && (
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
        {tab !== "templates" && tab !== "resources" && !loading && runs.length > 0 && runs.length < total && (
          <div className="flex justify-center">
            <button type="button" onClick={() => loadMore()} disabled={loadingMore}
              className={cn(btnSecondary, "px-6 py-2 text-sm")}>
              {loadingMore ? "Loading…" : "Load more"}
            </button>
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