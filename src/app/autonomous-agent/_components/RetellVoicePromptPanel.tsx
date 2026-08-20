"use client";

import { useEffect, useState } from "react";
import { getAutonomousApiBaseUrl, cn } from "@/lib/utils";

export interface RetellAgentListItem {
  agent_id: string;
  agent_name: string;
  channel: string;
}

export interface SequenceTypePromptRow {
  sequence_type: string;
  retell_agent_id?: string | null;
  retell_agent_copied?: number | null;
  [key: string]: unknown;
}

interface RetellAgentPrompt {
  agent_id: string;
  agent_name: string;
  response_engine_type: string | null;
  llm_id: string | null;
  prompt_editable: boolean;
  general_prompt: string | null;
  begin_message: string | null;
}

interface RetellVoicePromptPanelProps {
  token: string;
  sequenceType: string;
  retellAgentId: string;
  retellAgentCopied: boolean;
  agents: RetellAgentListItem[];
  agentsLoading: boolean;
  agentsError: string | null;
  onTypePromptsUpdated: (row: SequenceTypePromptRow) => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

function apiDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string" && d.trim()) return d;
  }
  return fallback;
}

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition";
const textareaCls =
  "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-2.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition resize-y";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-primary to-primary/85 text-white text-xs font-semibold px-3 py-1.5 transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-sm";

export default function RetellVoicePromptPanel({
  token,
  sequenceType,
  retellAgentId,
  retellAgentCopied,
  agents,
  agentsLoading,
  agentsError,
  onTypePromptsUpdated,
  showToast,
}: RetellVoicePromptPanelProps) {
  const [prompt, setPrompt] = useState<RetellAgentPrompt | null>(null);
  const [generalPrompt, setGeneralPrompt] = useState("");
  const [beginMessage, setBeginMessage] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [savingAgentId, setSavingAgentId] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [selectedId, setSelectedId] = useState(retellAgentId);

  useEffect(() => {
    setSelectedId(retellAgentId);
  }, [sequenceType, retellAgentId]);

  const agentId = selectedId;
  const agentInList = agents.some((a) => a.agent_id === agentId);

  useEffect(() => {
    if (!token || !agentId) {
      setPrompt(null);
      setGeneralPrompt("");
      setBeginMessage("");
      setPromptError(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setPromptLoading(true);
      setPromptError(null);
      try {
        const res = await fetch(
          `${getAutonomousApiBaseUrl()}/api/autonomous/retell/agents/${encodeURIComponent(agentId)}`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(apiDetail(data, "Failed to load Retell prompt"));
        if (cancelled) return;
        const row = data as RetellAgentPrompt;
        setPrompt(row);
        setGeneralPrompt(row.general_prompt ?? "");
        setBeginMessage(row.begin_message ?? "");
      } catch (e: unknown) {
        if (cancelled) return;
        setPrompt(null);
        setGeneralPrompt("");
        setBeginMessage("");
        setPromptError(e instanceof Error ? e.message : "Failed to load Retell prompt");
      } finally {
        if (!cancelled) setPromptLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token, agentId]);

  const persistAgentId = async (nextId: string) => {
    setSelectedId(nextId);
    setSavingAgentId(true);
    try {
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/type-prompts`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sequence_type: sequenceType, retell_agent_id: nextId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiDetail(data, "Failed to save Retell agent"));
      onTypePromptsUpdated(data as SequenceTypePromptRow);
      showToast(nextId ? "Retell agent linked to this sequence." : "Retell agent cleared.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to save Retell agent", "error");
    } finally {
      setSavingAgentId(false);
    }
  };

  const clearCopiedWarning = async () => {
    setSavingAgentId(true);
    try {
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/type-prompts`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sequence_type: sequenceType, retell_agent_reviewed: "true" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiDetail(data, "Update failed"));
      onTypePromptsUpdated(data as SequenceTypePromptRow);
      showToast("Retell agent marked as reviewed.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    } finally {
      setSavingAgentId(false);
    }
  };

  const savePrompt = async () => {
    if (!agentId) return;
    setSavingPrompt(true);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/retell/agents/${encodeURIComponent(agentId)}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            general_prompt: generalPrompt,
            begin_message: beginMessage,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiDetail(data, "Failed to save Retell prompt"));
      const row = data as RetellAgentPrompt;
      setPrompt(row);
      setGeneralPrompt(row.general_prompt ?? "");
      setBeginMessage(row.begin_message ?? "");
      showToast("Voice prompt saved to Retell.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to save Retell prompt", "error");
    } finally {
      setSavingPrompt(false);
    }
  };

  const dirty =
    !!prompt &&
    prompt.prompt_editable &&
    ((prompt.general_prompt ?? "") !== generalPrompt || (prompt.begin_message ?? "") !== beginMessage);

  return (
    <div className="space-y-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-gray-900/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h5 className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            Retell voice agent
          </h5>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            Prompt is stored in Retell. Sequences that share this agent share the same script.
          </p>
        </div>
        {prompt?.prompt_editable && (
          <button
            type="button"
            onClick={savePrompt}
            disabled={savingPrompt || promptLoading || !dirty}
            className={btnPrimary}
          >
            {savingPrompt ? "Saving…" : "Save to Retell"}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={labelCls}>Voice agent</span>
          {retellAgentCopied && (
            <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              ⚠ Copied default — update
            </span>
          )}
        </div>
        {agentsLoading ? (
          <p className="text-xs text-gray-400">Loading Retell agents…</p>
        ) : agentsError ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">{agentsError}</p>
        ) : (
          <select
            value={agentId}
            disabled={savingAgentId}
            onChange={(e) => persistAgentId(e.target.value)}
            className={cn(inputCls, "mt-0 font-mono text-xs")}
          >
            <option value="">— None —</option>
            {agents.map((a) => (
              <option key={a.agent_id} value={a.agent_id}>
                {a.agent_name} ({a.agent_id})
              </option>
            ))}
            {agentId && !agentInList && (
              <option value={agentId}>{agentId} (not in Retell list)</option>
            )}
          </select>
        )}
        {retellAgentCopied && (
          <button
            type="button"
            onClick={clearCopiedWarning}
            disabled={savingAgentId}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
          >
            This Retell ID is correct — clear warning
          </button>
        )}
      </div>

      {!agentId ? (
        <p className="text-xs text-gray-400">Select a Retell agent to load and edit its voice prompt.</p>
      ) : promptLoading ? (
        <p className="text-xs text-gray-400">Loading voice prompt from Retell…</p>
      ) : promptError ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">{promptError}</p>
      ) : prompt && !prompt.prompt_editable ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          This agent&rsquo;s response engine is{" "}
          <code className="font-mono">{prompt.response_engine_type || "unknown"}</code>, so the prompt
          cannot be edited here.
        </p>
      ) : prompt ? (
        <div className="grid grid-cols-1 gap-3">
          <label className={labelCls}>
            Opening line
            <textarea
              value={beginMessage}
              onChange={(e) => setBeginMessage(e.target.value)}
              rows={2}
              className={textareaCls}
              placeholder="First utterance the agent says (leave blank to let Retell generate it)."
            />
          </label>
          <label className={labelCls}>
            Voice system prompt
            <textarea
              value={generalPrompt}
              onChange={(e) => setGeneralPrompt(e.target.value)}
              rows={10}
              className={cn(textareaCls, "font-mono")}
              placeholder="Retell general_prompt — instructions for the voice agent."
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
