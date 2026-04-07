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
  const [templates, setTemplates] = useState<SequenceTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [savingTemplateId, setSavingTemplateId] = useState<number | null>(null);
  const [savingStepId, setSavingStepId] = useState<number | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (tab === "templates") {
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

  useEffect(() => {
    if (!token || tab !== "templates") return;
    const fetchTemplates = async () => {
      try {
        setTemplatesLoading(true);
        setTemplatesError(null);
        const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(
            typeof data.detail === "string" ? data.detail : "Failed to load sequence templates",
          );
        }
        const rows = Array.isArray(data) ? data : [];
        setTemplates(rows);
        setSelectedTemplateId((prev) => prev ?? rows[0]?.id ?? null);
      } catch (e: unknown) {
        setTemplatesError(e instanceof Error ? e.message : "Failed to load templates");
      } finally {
        setTemplatesLoading(false);
      }
    };
    fetchTemplates();
  }, [token, tab]);

  const updateTemplateLocal = (templateId: number, patch: Partial<SequenceTemplate>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, ...patch } : t)),
    );
  };

  const updateStepLocal = (
    templateId: number,
    stepId: number,
    patch: Partial<SequenceTemplateStep>,
  ) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id !== templateId
          ? t
          : { ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) },
      ),
    );
  };

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
    } finally {
      setSavingTemplateId(null);
    }
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
    } finally {
      setSavingStepId(null);
    }
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
    } finally {
      setCreatingTemplate(false);
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
    } finally {
      setSavingStepId(null);
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
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

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
              <button
                type="button"
                role="tab"
                aria-selected={tab === "templates"}
                onClick={() => setTab("templates")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  tab === "templates"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
                )}
              >
                Sequence templates
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

        {tab !== "templates" && error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {tab === "templates" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Templates</h3>
                <button
                  type="button"
                  onClick={addTemplate}
                  disabled={creatingTemplate}
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  {creatingTemplate ? "Creating…" : "New"}
                </button>
              </div>
              {templatesLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading templates…</p>
              ) : templatesError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{templatesError}</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No templates found.</p>
              ) : (
                <div className="space-y-1">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={cn(
                        "w-full text-left rounded px-2 py-1.5 text-sm border",
                        selectedTemplateId === t.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300",
                      )}
                    >
                      <div className="font-medium">{t.display_name}</div>
                      <div className="text-xs opacity-70">{t.sequence_type}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              {!selectedTemplate ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Select a template to edit.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Display name
                      <input
                        type="text"
                        value={selectedTemplate.display_name}
                        onChange={(e) =>
                          updateTemplateLocal(selectedTemplate.id, { display_name: e.target.value })
                        }
                        className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Timezone
                      <input
                        type="text"
                        value={selectedTemplate.timezone}
                        onChange={(e) =>
                          updateTemplateLocal(selectedTemplate.id, { timezone: e.target.value })
                        }
                        className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 md:col-span-2">
                      Description
                      <input
                        type="text"
                        value={selectedTemplate.description ?? ""}
                        onChange={(e) =>
                          updateTemplateLocal(selectedTemplate.id, { description: e.target.value })
                        }
                        className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTemplate.is_active}
                        onChange={(e) =>
                          updateTemplateLocal(selectedTemplate.id, { is_active: e.target.checked })
                        }
                      />
                      Active
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTemplate.is_restartable}
                        onChange={(e) =>
                          updateTemplateLocal(selectedTemplate.id, { is_restartable: e.target.checked })
                        }
                      />
                      Restartable
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveTemplate(selectedTemplate)}
                      disabled={savingTemplateId === selectedTemplate.id}
                      className="text-xs px-3 py-1.5 rounded bg-primary text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {savingTemplateId === selectedTemplate.id ? "Saving…" : "Save template"}
                    </button>
                    <button
                      type="button"
                      onClick={() => addStep(selectedTemplate.id)}
                      disabled={savingStepId === -1}
                      className="text-xs px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Add step
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-2 py-2 text-left">Index</th>
                          <th className="px-2 py-2 text-left">Day</th>
                          <th className="px-2 py-2 text-left">Channel</th>
                          <th className="px-2 py-2 text-left">Time</th>
                          <th className="px-2 py-2 text-left">Prompt</th>
                          <th className="px-2 py-2 text-left">Active</th>
                          <th className="px-2 py-2 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedTemplate.steps]
                          .sort((a, b) => a.step_index - b.step_index)
                          .map((s) => (
                            <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  value={s.step_index}
                                  onChange={(e) =>
                                    updateStepLocal(selectedTemplate.id, s.id, {
                                      step_index: Number(e.target.value),
                                    })
                                  }
                                  className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-1 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  value={s.day_number}
                                  onChange={(e) =>
                                    updateStepLocal(selectedTemplate.id, s.id, {
                                      day_number: Number(e.target.value),
                                    })
                                  }
                                  className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-1 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={s.channel}
                                  onChange={(e) =>
                                    updateStepLocal(selectedTemplate.id, s.id, {
                                      channel: e.target.value,
                                    })
                                  }
                                  className="w-28 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-1 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={s.send_time_local}
                                  onChange={(e) =>
                                    updateStepLocal(selectedTemplate.id, s.id, {
                                      send_time_local: e.target.value,
                                    })
                                  }
                                  className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-1 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={s.prompt_text ?? ""}
                                  onChange={(e) =>
                                    updateStepLocal(selectedTemplate.id, s.id, {
                                      prompt_text: e.target.value,
                                    })
                                  }
                                  className="w-72 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-1 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="checkbox"
                                  checked={s.is_active}
                                  onChange={(e) =>
                                    updateStepLocal(selectedTemplate.id, s.id, {
                                      is_active: e.target.checked,
                                    })
                                  }
                                />
                              </td>
                              <td className="px-2 py-2">
                                <button
                                  type="button"
                                  onClick={() => saveStep(selectedTemplate.id, s)}
                                  disabled={savingStepId === s.id}
                                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                                >
                                  {savingStepId === s.id ? "Saving…" : "Save"}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : loading ? (
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

        {tab !== "templates" && !loading && runs.length > 0 && runs.length < total && (
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
