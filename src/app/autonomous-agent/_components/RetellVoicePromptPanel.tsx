"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAutonomousApiBaseUrl, cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";

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

interface RetellVoiceListItem {
  voice_id: string;
  voice_name: string;
  gender?: string | null;
  accent?: string | null;
  provider?: string | null;
}

interface RetellAgentPrompt {
  agent_id: string;
  agent_name: string;
  response_engine_type: string | null;
  llm_id: string | null;
  prompt_editable: boolean;
  general_prompt: string | null;
  begin_message: string | null;
  voice_id?: string | null;
  language?: string | null;
  voice_speed?: number | null;
  voice_temperature?: number | null;
  responsiveness?: number | null;
  interruption_sensitivity?: number | null;
  enable_backchannel?: boolean | null;
  max_call_duration_ms?: number | null;
  end_call_after_silence_ms?: number | null;
  voicemail_action?: string | null;
  llm_model?: string | null;
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
  hideSave?: boolean;
  onRegisterSave?: (fn: (() => Promise<boolean>) | null) => void;
}

function apiDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string" && d.trim()) return d;
  }
  return fallback;
}

const LLM_MODELS = [
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4o",
  "gpt-4o-mini",
  "claude-4-sonnet",
  "claude-3.7-sonnet",
  "gemini-2.0-flash",
];

const LANGUAGES = [
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-IN", label: "English (India)" },
];

const VOICEMAIL = [
  { value: "hangup", label: "Hang up" },
  { value: "prompt", label: "Leave a message" },
];

const textareaCls =
  "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-2.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition resize-y";
const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-2.5 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-primary to-primary/85 text-white text-xs font-semibold px-3 py-1.5 transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-sm";
const btnSelector =
  "inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1.5 transition hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40";

function numOrEmpty(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(Number(v)) ? "" : String(v);
}

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

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
  hideSave = false,
  onRegisterSave,
}: RetellVoicePromptPanelProps) {
  const [prompt, setPrompt] = useState<RetellAgentPrompt | null>(null);
  const [generalPrompt, setGeneralPrompt] = useState("");
  const [beginMessage, setBeginMessage] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [language, setLanguage] = useState("en-AU");
  const [llmModel, setLlmModel] = useState("");
  const [voiceSpeed, setVoiceSpeed] = useState("1");
  const [voiceTemperature, setVoiceTemperature] = useState("");
  const [responsiveness, setResponsiveness] = useState("");
  const [interruption, setInterruption] = useState("");
  const [enableBackchannel, setEnableBackchannel] = useState(false);
  const [maxCallSec, setMaxCallSec] = useState("600");
  const [silenceSec, setSilenceSec] = useState("");
  const [voicemailAction, setVoicemailAction] = useState("hangup");
  const [voices, setVoices] = useState<RetellVoiceListItem[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [savingAgentId, setSavingAgentId] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pendingAgentId, setPendingAgentId] = useState("");

  const agentId = retellAgentId;
  const listed = agents.find((a) => a.agent_id === agentId);
  const agentLabel = prompt?.agent_name || listed?.agent_name || agentId;
  const pickerAgents = useMemo(() => {
    const rows = [...agents];
    if (agentId && !rows.some((a) => a.agent_id === agentId)) {
      rows.unshift({
        agent_id: agentId,
        agent_name: agentLabel || agentId,
        channel: listed?.channel || "voice",
      });
    }
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (a) =>
        a.agent_name.toLowerCase().includes(q) ||
        a.agent_id.toLowerCase().includes(q) ||
        (a.channel || "").toLowerCase().includes(q),
    );
  }, [agents, agentId, agentLabel, listed?.channel, pickerQuery]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/retell/voices`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok || cancelled) return;
        setVoices(Array.isArray(data) ? (data as RetellVoiceListItem[]) : []);
      } catch {
        if (!cancelled) setVoices([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
        if (!res.ok) throw new Error(apiDetail(data, "Failed to load Retell agent"));
        if (cancelled) return;
        const row = data as RetellAgentPrompt;
        setPrompt(row);
        setGeneralPrompt(row.general_prompt ?? "");
        setBeginMessage(row.begin_message ?? "");
        setVoiceId(row.voice_id ?? "");
        setLanguage(row.language || "en-AU");
        setLlmModel(row.llm_model ?? "");
        setVoiceSpeed(numOrEmpty(row.voice_speed) || "1");
        setVoiceTemperature(numOrEmpty(row.voice_temperature));
        setResponsiveness(numOrEmpty(row.responsiveness));
        setInterruption(numOrEmpty(row.interruption_sensitivity));
        setEnableBackchannel(Boolean(row.enable_backchannel));
        setMaxCallSec(
          row.max_call_duration_ms != null ? String(Math.round(Number(row.max_call_duration_ms) / 1000)) : "600",
        );
        setSilenceSec(
          row.end_call_after_silence_ms != null
            ? String(Math.round(Number(row.end_call_after_silence_ms) / 1000))
            : "",
        );
        setVoicemailAction((row.voicemail_action || "hangup").toLowerCase());
      } catch (e: unknown) {
        if (cancelled) return;
        setPrompt(null);
        setGeneralPrompt("");
        setBeginMessage("");
        setPromptError(e instanceof Error ? e.message : "Failed to load Retell agent");
      } finally {
        if (!cancelled) setPromptLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token, agentId]);

  const applySaved = (row: RetellAgentPrompt) => {
    setPrompt(row);
    setGeneralPrompt(row.general_prompt ?? "");
    setBeginMessage(row.begin_message ?? "");
    setVoiceId(row.voice_id ?? "");
    setLanguage(row.language || "en-AU");
    setLlmModel(row.llm_model ?? "");
    setVoiceSpeed(numOrEmpty(row.voice_speed) || "1");
    setVoiceTemperature(numOrEmpty(row.voice_temperature));
    setResponsiveness(numOrEmpty(row.responsiveness));
    setInterruption(numOrEmpty(row.interruption_sensitivity));
    setEnableBackchannel(Boolean(row.enable_backchannel));
    setMaxCallSec(
      row.max_call_duration_ms != null ? String(Math.round(Number(row.max_call_duration_ms) / 1000)) : "600",
    );
    setSilenceSec(
      row.end_call_after_silence_ms != null
        ? String(Math.round(Number(row.end_call_after_silence_ms) / 1000))
        : "",
    );
    setVoicemailAction((row.voicemail_action || "hangup").toLowerCase());
  };

  const openPicker = () => {
    setPendingAgentId(agentId);
    setPickerQuery("");
    setPickerOpen(true);
  };

  const persistAgentId = async (nextId: string) => {
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
      setPickerOpen(false);
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

  const savePrompt = async (): Promise<boolean> => {
    if (!agentId) return false;
    setSavingPrompt(true);
    try {
      const speed = parseNum(voiceSpeed);
      const temp = parseNum(voiceTemperature);
      const resp = parseNum(responsiveness);
      const interrupt = parseNum(interruption);
      const maxSec = parseNum(maxCallSec);
      const silSec = parseNum(silenceSec);
      const payload: Record<string, unknown> = {
        voice_id: voiceId || undefined,
        language: language || undefined,
        voice_speed: speed,
        voice_temperature: temp,
        responsiveness: resp,
        interruption_sensitivity: interrupt,
        enable_backchannel: enableBackchannel,
        max_call_duration_ms: maxSec != null ? Math.round(maxSec * 1000) : undefined,
        end_call_after_silence_ms: silSec != null ? Math.round(silSec * 1000) : undefined,
        voicemail_action: voicemailAction || undefined,
      };
      if (prompt?.prompt_editable) {
        payload.general_prompt = generalPrompt;
        payload.begin_message = beginMessage;
        payload.llm_model = llmModel || undefined;
      }
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/retell/agents/${encodeURIComponent(agentId)}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiDetail(data, "Failed to save Retell settings"));
      applySaved(data as RetellAgentPrompt);
      showToast("Voice settings saved to Retell.", "success");
      return true;
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to save Retell settings", "error");
      return false;
    } finally {
      setSavingPrompt(false);
    }
  };

  const saveRef = useRef(savePrompt);
  saveRef.current = savePrompt;
  useEffect(() => {
    if (!onRegisterSave) return;
    onRegisterSave(agentId ? () => saveRef.current() : null);
    return () => onRegisterSave(null);
  }, [onRegisterSave, agentId]);

  const modelOptions = llmModel && !LLM_MODELS.includes(llmModel) ? [llmModel, ...LLM_MODELS] : LLM_MODELS;
  const voiceOptions =
    voiceId && !voices.some((v) => v.voice_id === voiceId)
      ? [{ voice_id: voiceId, voice_name: voiceId }, ...voices]
      : voices;
  const languageOptions =
    language && !LANGUAGES.some((l) => l.value === language)
      ? [{ value: language, label: language }, ...LANGUAGES]
      : LANGUAGES;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            This sequence owns one Retell agent. Put {"{{extra_context}}"} in the prompt to speak extra talking points
            from the Setup tab.
          </p>
        </div>
        {!hideSave && prompt?.prompt_editable && (
          <button type="button" onClick={() => void savePrompt()} disabled={savingPrompt || promptLoading} className={btnPrimary}>
            {savingPrompt ? "Saving…" : "Save to Retell"}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={labelCls}>Voice agent</span>
          <button type="button" onClick={openPicker} className={btnSelector}>
            Selector
          </button>
          {retellAgentCopied && (
            <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Copied default — update
            </span>
          )}
        </div>
        {agentsError && !agentId ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">{agentsError}</p>
        ) : !agentId ? (
          <p className="text-xs text-gray-400">
            No voice agent linked. Open <span className="font-semibold">Selector</span> to pick one, or use{" "}
            <span className="font-semibold">+ New</span> to duplicate an existing sequence&rsquo;s Retell agent.
          </p>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-2.5 py-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {agentsLoading && !agentLabel ? "Loading agent…" : agentLabel}
            </p>
            <p className="text-[11px] font-mono text-gray-400 mt-0.5">{agentId}</p>
          </div>
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

      <Modal
        open={pickerOpen}
        onClose={() => {
          if (!savingAgentId) setPickerOpen(false);
        }}
        title="Choose voice agent"
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setPendingAgentId("")}
              disabled={savingAgentId}
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-40"
            >
              Unlink agent
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                disabled={savingAgentId}
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void persistAgentId(pendingAgentId)}
                disabled={savingAgentId || pendingAgentId === agentId}
                className={btnPrimary}
              >
                {savingAgentId ? "Saving…" : pendingAgentId ? "Use this agent" : "Clear agent"}
              </button>
            </div>
          </div>
        }
      >
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Linking a different Retell agent changes which script this sequence dials. Sequences that share an
          agent share the same prompt.
        </p>
        <input
          type="search"
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
          placeholder="Search by name or id"
          className={inputCls}
        />
        {agentsLoading ? (
          <p className="mt-3 text-xs text-gray-400">Loading Retell agents…</p>
        ) : agentsError ? (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">{agentsError}</p>
        ) : pickerAgents.length === 0 ? (
          <p className="mt-3 text-xs text-gray-400">No agents match that search.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {pickerAgents.map((a) => {
              const selected = pendingAgentId === a.agent_id;
              const current = agentId === a.agent_id;
              return (
                <li key={a.agent_id}>
                  <button
                    type="button"
                    onClick={() => setPendingAgentId(a.agent_id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 transition-colors",
                      selected
                        ? "bg-indigo-50 dark:bg-indigo-950/40"
                        : "bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900",
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span>
                        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                          {a.agent_name || a.agent_id}
                        </span>
                        <span className="block text-[11px] font-mono text-gray-400 mt-0.5">{a.agent_id}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-400 pt-0.5">
                        {current ? "Current" : a.channel && a.channel !== "voice" ? a.channel : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>

      {!agentId ? null : promptLoading ? (
        <p className="text-xs text-gray-400">Loading voice settings from Retell…</p>
      ) : promptError ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">{promptError}</p>
      ) : prompt && !prompt.prompt_editable ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          This agent&rsquo;s response engine is{" "}
          <code className="font-mono">{prompt.response_engine_type || "unknown"}</code>, so the prompt cannot be
          edited here.
        </p>
      ) : prompt ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={labelCls}>
              Voice
              <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className={inputCls}>
                <option value="">Select a voice</option>
                {voiceOptions.map((v) => (
                  <option key={v.voice_id} value={v.voice_id}>
                    {v.voice_name}
                    {v.accent ? ` · ${v.accent}` : ""}
                    {v.gender ? ` · ${v.gender}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Model
              <select value={llmModel} onChange={(e) => setLlmModel(e.target.value)} className={inputCls}>
                <option value="">Keep current</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Language
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
                {languageOptions.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Voicemail
              <select value={voicemailAction} onChange={(e) => setVoicemailAction(e.target.value)} className={inputCls}>
                {VOICEMAIL.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Voice speed
              <input type="number" min={0.5} max={2} step={0.05} value={voiceSpeed} onChange={(e) => setVoiceSpeed(e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Interruption sensitivity
              <input type="number" min={0} max={1} step={0.05} value={interruption} onChange={(e) => setInterruption(e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Responsiveness
              <input type="number" min={0} max={1} step={0.05} value={responsiveness} onChange={(e) => setResponsiveness(e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Voice temperature
              <input type="number" min={0} max={2} step={0.05} value={voiceTemperature} onChange={(e) => setVoiceTemperature(e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Max call length (seconds)
              <input type="number" min={30} max={3600} step={30} value={maxCallSec} onChange={(e) => setMaxCallSec(e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              End after silence (seconds)
              <input type="number" min={0} max={120} step={1} value={silenceSec} onChange={(e) => setSilenceSec(e.target.value)} className={inputCls} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none sm:col-span-2 mt-1">
              <input
                type="checkbox"
                checked={enableBackchannel}
                onChange={(e) => setEnableBackchannel(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Backchannel (mm-hmm while the caller talks)
            </label>
          </div>
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
              rows={12}
              className={cn(textareaCls, "font-mono")}
              placeholder="Retell general_prompt — instructions for the voice agent."
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
