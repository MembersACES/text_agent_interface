"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  COMPARISON_TRIGGERS,
  isWiredSequenceType,
  sequenceTypeLooksValid,
  templateCoversFlow,
  WIRED_SEQUENCE_TYPE_LABELS,
} from "@/lib/autonomous-sequence-keys";
import SignatureHtmlEditor from "./SignatureHtmlEditor";
import StartTestRunPanel from "./StartTestRunPanel";
import RetellVoicePromptPanel, {
  type RetellAgentListItem,
  type SequenceTypePromptRow,
} from "./RetellVoicePromptPanel";

export interface SequenceTemplateStep {
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

export interface SequenceTemplate {
  id: number;
  sequence_type: string;
  display_name: string;
  description: string | null;
  timezone: string;
  is_active: boolean;
  is_restartable: boolean;
  signature_html: string | null;
  extra_context?: string | null;
  /** "none" | "retailer_date" | "fixed_days" - how the offer validity date is decided. */
  validity_mode?: string;
  /** Days from send, used only when validity_mode is "fixed_days". */
  validity_days?: number;
  linked_flow_keys?: string[];
  steps: SequenceTemplateStep[];
}

export interface SequenceTypePromptConfig {
  id?: number;
  sequence_type: string;
  system_prompt?: string | null;
  email_example?: string | null;
  sms_example?: string | null;
  voice_example?: string | null;
  retell_agent_id?: string | null;
  retell_agent_copied?: number | null;
}

type EditorTab = "setup" | "cadence" | "email" | "sms" | "voice" | "test";

const TABS: { id: EditorTab; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "cadence", label: "Steps" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "voice", label: "Voice" },
  { id: "test", label: "Test" },
];

const CHANNELS = [
  { value: "email", label: "Email", icon: "📧" },
  { value: "sms", label: "SMS", icon: "💬" },
  { value: "voice_call", label: "Voice", icon: "📞" },
  { value: "engagement_form_generation", label: "Engagement form", icon: "📄" },
];

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-2.5 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40";
const textareaCls =
  "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-2.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-y";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-primary to-primary/85 text-white text-xs font-semibold px-3 py-1.5 transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-sm";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1.5 transition hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40";

function isRetellAgentCopiedFlag(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "number" && Number.isFinite(v)) return v === 1;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return false;
}

function channelMeta(channel: string) {
  return CHANNELS.find((c) => c.value === channel) ?? { value: channel, label: channel.replace(/_/g, " "), icon: "📨" };
}

function uniqueCallKey(base: string, templates: SequenceTemplate[], excludeId: number): string {
  const slug =
    base
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "sequence";
  const used = new Set(templates.filter((t) => t.id !== excludeId).map((t) => t.sequence_type));
  if (!used.has(slug)) return slug;
  let i = 2;
  while (used.has(`${slug}_${i}`)) i += 1;
  return `${slug}_${i}`;
}

interface SequenceTemplateEditorProps {
  template: SequenceTemplate;
  templates: SequenceTemplate[];
  token: string;
  typePrompts: SequenceTypePromptConfig | null;
  typePromptsLoading: boolean;
  typePromptsError: string | null;
  savingTemplateId: number | null;
  savingStepId: number | null;
  savingTypePrompts: boolean;
  retellAgents: RetellAgentListItem[];
  retellAgentsLoading: boolean;
  retellAgentsError: string | null;
  deletePreviewLoading: boolean;
  deletingTemplate: boolean;
  updateTemplateLocal: (templateId: number, patch: Partial<SequenceTemplate>) => void;
  updateStepLocal: (templateId: number, stepId: number, patch: Partial<SequenceTemplateStep>) => void;
  updateTypePromptsLocal: (patch: Partial<SequenceTypePromptConfig>) => void;
  saveTemplate: (template: SequenceTemplate, silent?: boolean) => Promise<void> | void;
  saveTypePrompts: () => Promise<void> | void;
  saveStep: (templateId: number, step: SequenceTemplateStep, silent?: boolean) => Promise<void> | void;
  addStep: (templateId: number) => Promise<void> | void;
  deleteStep: (templateId: number, stepId: number) => Promise<void> | void;
  onDeleteTemplate: (templateId: number) => void;
  onTypePromptsUpdated: (row: SequenceTypePromptRow) => void;
  onTestStarted: (runId: number) => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export default function SequenceTemplateEditor({
  template,
  templates,
  token,
  typePrompts,
  typePromptsLoading,
  typePromptsError,
  savingTemplateId,
  savingStepId,
  savingTypePrompts,
  retellAgents,
  retellAgentsLoading,
  retellAgentsError,
  deletePreviewLoading,
  deletingTemplate,
  updateTemplateLocal,
  updateStepLocal,
  updateTypePromptsLocal,
  saveTemplate,
  saveTypePrompts,
  saveStep,
  addStep,
  deleteStep,
  onDeleteTemplate,
  onTypePromptsUpdated,
  onTestStarted,
  showToast,
}: SequenceTemplateEditorProps) {
  const [tab, setTab] = useState<EditorTab>("setup");
  const [savingVoice, setSavingVoice] = useState(false);
  const [savingCadence, setSavingCadence] = useState(false);
  const voiceSaveRef = useRef<(() => Promise<boolean>) | null>(null);
  const originalSequenceTypeRef = useRef(template.sequence_type);
  const wasSavingTemplate = useRef(false);
  useEffect(() => {
    originalSequenceTypeRef.current = template.sequence_type;
    wasSavingTemplate.current = false;
  }, [template.id]);
  useEffect(() => {
    if (savingTemplateId === template.id) {
      wasSavingTemplate.current = true;
      return;
    }
    if (wasSavingTemplate.current) {
      originalSequenceTypeRef.current = template.sequence_type;
      wasSavingTemplate.current = false;
    }
  }, [savingTemplateId, template.id, template.sequence_type]);

  const orderedSteps = [...template.steps].sort((a, b) => a.step_index - b.step_index);
  const savingTemplate = savingTemplateId === template.id;
  const linkedKeys = template.linked_flow_keys ?? [];

  const toggleComparisonLink = (flowKey: string) => {
    const linked = templateCoversFlow(template, flowKey);
    if (linked) {
      if (template.sequence_type === flowKey) {
        updateTemplateLocal(template.id, {
          sequence_type: uniqueCallKey(`${template.display_name}_unlinked`, templates, template.id),
          linked_flow_keys: linkedKeys.filter((k) => k !== flowKey),
        });
        return;
      }
      updateTemplateLocal(template.id, { linked_flow_keys: linkedKeys.filter((k) => k !== flowKey) });
      return;
    }
    const owner = templates.find((t) => t.id !== template.id && templateCoversFlow(t, flowKey));
    if (owner) {
      showToast(`Already linked on “${owner.display_name}”. Unlink it there first.`, "error");
      return;
    }
    updateTemplateLocal(template.id, { linked_flow_keys: [...linkedKeys, flowKey] });
  };

  const saveSetup = () => {
    void saveTemplate({
      ...template,
      timezone: "Australia/Brisbane",
    });
  };

  const saveEmail = async () => {
    await saveTemplate({ ...template, timezone: "Australia/Brisbane" }, true);
    await saveTypePrompts();
  };

  const saveCadenceAll = async () => {
    setSavingCadence(true);
    try {
      for (const step of orderedSteps) {
        await saveStep(template.id, step, true);
      }
      showToast("Steps saved.", "success");
    } catch {
      // saveStep already toasted
    } finally {
      setSavingCadence(false);
    }
  };

  const saveVoice = async () => {
    setSavingVoice(true);
    try {
      await voiceSaveRef.current?.();
    } finally {
      setSavingVoice(false);
    }
  };

  const moveStep = (stepId: number, dir: -1 | 1) => {
    const idx = orderedSteps.findIndex((s) => s.id === stepId);
    const other = orderedSteps[idx + dir];
    if (idx < 0 || !other) return;
    const a = orderedSteps[idx];
    updateStepLocal(template.id, a.id, { step_index: other.step_index });
    updateStepLocal(template.id, other.id, { step_index: a.step_index });
  };

  const registerVoiceSave = useCallback((fn: (() => Promise<boolean>) | null) => {
    voiceSaveRef.current = fn;
  }, []);

  const saveLabel =
    tab === "setup"
      ? savingTemplate
        ? "Saving…"
        : "Save"
      : tab === "cadence"
        ? savingCadence
          ? "Saving…"
          : "Save"
        : tab === "email" || tab === "sms"
          ? savingTypePrompts || savingTemplate
            ? "Saving…"
            : "Save"
          : tab === "voice"
            ? savingVoice
              ? "Saving…"
              : "Save"
            : null;

  const saveDisabled =
    tab === "setup"
      ? savingTemplate
      : tab === "cadence"
        ? savingCadence || savingStepId != null
        : tab === "email" || tab === "sms"
          ? savingTypePrompts || savingTemplate || !typePrompts
          : tab === "voice"
            ? savingVoice
            : true;

  const onHeaderSave = () => {
    if (tab === "setup") saveSetup();
    else if (tab === "cadence") void saveCadenceAll();
    else if (tab === "email") void saveEmail();
    else if (tab === "sms") void saveTypePrompts();
    else if (tab === "voice") void saveVoice();
  };

  return (
    <div className="flex flex-col min-h-[32rem]">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 px-5 pt-4 pb-3 mb-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">
            {template.display_name}
          </h3>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={template.is_active}
              onChange={(e) => updateTemplateLocal(template.id, { is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Active
          </label>
          {saveLabel && (
            <button type="button" onClick={onHeaderSave} disabled={saveDisabled} className={btnPrimary}>
              {saveLabel}
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap transition border shadow-sm",
                tab === t.id
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200/80 dark:shadow-none"
                  : "bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "setup" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={labelCls}>
              Display name
              <input
                type="text"
                value={template.display_name}
                onChange={(e) => updateTemplateLocal(template.id, { display_name: e.target.value })}
                className={inputCls}
              />
              <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-gray-400">
                Shown in the template list and on Base 2.
              </span>
            </label>
            <label className={labelCls}>
              Call key
              <input
                type="text"
                value={template.sequence_type}
                onChange={(e) => updateTemplateLocal(template.id, { sequence_type: e.target.value })}
                className={cn(inputCls, "font-mono")}
                spellCheck={false}
              />
              <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-gray-400">
                How the app starts this sequence. Letters, numbers, dots, underscores, hyphens.
              </span>
            </label>
            {isWiredSequenceType(template.sequence_type) &&
              template.sequence_type.trim() === originalSequenceTypeRef.current && (
              <p className="md:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                This call key is wired to <strong>{WIRED_SEQUENCE_TYPE_LABELS[template.sequence_type]}</strong>.
                Change the display name if you only want a clearer label. Changing the key will stop that page from finding this template.
              </p>
            )}
            {isWiredSequenceType(originalSequenceTypeRef.current) &&
              template.sequence_type.trim() !== originalSequenceTypeRef.current && (
              <p className="md:col-span-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Saving will disconnect <strong>{WIRED_SEQUENCE_TYPE_LABELS[originalSequenceTypeRef.current]}</strong> from this template.
                Existing runs keep the new key; that page will look for <span className="font-mono">{originalSequenceTypeRef.current}</span> and miss it.
              </p>
            )}
            {!sequenceTypeLooksValid(template.sequence_type) && (
              <p className="md:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                This placeholder key will not save until you replace it with a slug such as{" "}
                <span className="font-mono">ci_electricity_offer_draft</span>.
              </p>
            )}
            <div className="md:col-span-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-300">
                Linked comparison types
              </div>
              <p className="mt-1 text-[11px] font-normal normal-case tracking-normal text-gray-500">
                Which product pages start this sequence. Save after changing. A type can only be linked to one template.
              </p>
              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {COMPARISON_TRIGGERS.map((flow) => {
                  const checked = templateCoversFlow(template, flow.sequence_type);
                  const owner = templates.find(
                    (t) => t.id !== template.id && templateCoversFlow(t, flow.sequence_type),
                  );
                  return (
                    <label
                      key={flow.sequence_type}
                      className="flex items-start gap-2 rounded-md px-1 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && owner != null}
                        onChange={() => toggleComparisonLink(flow.sequence_type)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                      />
                      <span className="min-w-0">
                        <span className="block leading-snug">{flow.label}</span>
                        <span className="block text-[11px] font-normal text-gray-400">
                          {owner ? `Linked on ${owner.display_name}` : flow.startsWhen}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <label className={labelCls}>
              Timezone
              <input type="text" value="AEST (Australia/Brisbane)" readOnly className={cn(inputCls, "bg-gray-50 dark:bg-gray-900 text-gray-500")} />
            </label>
            <label className={cn(labelCls, "md:col-span-2")}>
              Description
              <input
                type="text"
                value={template.description ?? ""}
                onChange={(e) => updateTemplateLocal(template.id, { description: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={template.is_restartable}
                onChange={(e) => updateTemplateLocal(template.id, { is_restartable: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Restartable
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={(template.validity_mode ?? "fixed_days") !== "none"}
                onChange={(e) =>
                  updateTemplateLocal(template.id, {
                    validity_mode: e.target.checked ? "fixed_days" : "none",
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Offer has a validity date
            </label>
            {(template.validity_mode ?? "fixed_days") !== "none" && (
              <>
                <label className={labelCls}>
                  Validity source
                  <select
                    value={template.validity_mode ?? "fixed_days"}
                    onChange={(e) => updateTemplateLocal(template.id, { validity_mode: e.target.value })}
                    className={inputCls}
                  >
                    <option value="fixed_days">Fixed window from send</option>
                    <option value="retailer_date">Retailer&apos;s expiry date (entered per offer)</option>
                  </select>
                </label>
                {(template.validity_mode ?? "fixed_days") === "fixed_days" && (
                  <label className={labelCls}>
                    Validity period (days)
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={template.validity_days ?? 7}
                      onChange={(e) =>
                        updateTemplateLocal(template.id, {
                          validity_days: Math.min(365, Math.max(1, Number(e.target.value) || 7)),
                        })
                      }
                      className={inputCls}
                    />
                  </label>
                )}
                <p className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">
                  {(template.validity_mode ?? "fixed_days") === "retailer_date"
                    ? "The agent quotes only a date supplied with the offer. If none is supplied it says nothing about validity rather than inventing a deadline."
                    : `The agent asks for a response within ${template.validity_days ?? 7} day(s) of sending. This is our review window, not the retailer's expiry.`}
                </p>
              </>
            )}
          </div>
          <label className={labelCls}>
            Extra context
            <textarea
              value={template.extra_context ?? ""}
              onChange={(e) => updateTemplateLocal(template.id, { extra_context: e.target.value })}
              rows={5}
              className={textareaCls}
              placeholder="Talking points injected into every email, SMS, and voice call as {{extra_context}}. Add {{extra_context}} to the Retell prompt if the agent should say this."
            />
          </label>
          <button
            type="button"
            onClick={() => onDeleteTemplate(template.id)}
            disabled={deletePreviewLoading || deletingTemplate}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold px-3 py-1.5 transition hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-40"
          >
            {deletePreviewLoading ? "Checking…" : "Delete sequence"}
          </button>
        </div>
      )}

      {tab === "cadence" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400">Day 1 is the first business day after the sequence starts. Times are AEST.</p>
            <button type="button" onClick={() => void addStep(template.id)} disabled={savingStepId === -1} className={btnSecondary}>
              {savingStepId === -1 ? "Adding…" : "+ Add step"}
            </button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))] gap-3">
            {orderedSteps.map((s, i) => {
              const meta = channelMeta(s.channel);
              return (
                <div
                  key={s.id}
                  className="min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-500">
                      {i + 1}
                    </span>
                    <span className="text-base leading-none">{meta.icon}</span>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex-1 truncate">{meta.label}</span>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Channel
                      <select
                        value={s.channel}
                        onChange={(e) => updateStepLocal(template.id, s.id, { channel: e.target.value })}
                        className={cn(inputCls, "text-xs py-1.5")}
                      >
                        {!CHANNELS.some((c) => c.value === s.channel) && (
                          <option value={s.channel}>{s.channel}</option>
                        )}
                        {CHANNELS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Day
                        <input
                          type="number"
                          min={1}
                          value={s.day_number}
                          onChange={(e) => updateStepLocal(template.id, s.id, { day_number: Number(e.target.value) })}
                          className={cn(inputCls, "text-xs py-1.5")}
                        />
                      </label>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Time
                        <input
                          type="time"
                          value={s.send_time_local?.slice(0, 5) || "09:00"}
                          onChange={(e) => updateStepLocal(template.id, s.id, { send_time_local: e.target.value })}
                          className={cn(inputCls, "text-xs py-1.5")}
                        />
                      </label>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.is_active}
                        onChange={(e) => updateStepLocal(template.id, s.id, { is_active: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600"
                      />
                      Active
                    </label>
                    <div className="flex items-center gap-1 pt-1">
                      <button type="button" onClick={() => moveStep(s.id, -1)} disabled={i === 0} className={btnSecondary}>
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(s.id, 1)}
                        disabled={i === orderedSteps.length - 1}
                        className={btnSecondary}
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Remove this step from the template?")) void deleteStep(template.id, s.id);
                        }}
                        className="ml-auto inline-flex items-center rounded-full border border-red-200 dark:border-red-800 text-red-600 text-[11px] font-semibold px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "email" && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Signature is appended to every email. Use {"{{extra_context}}"} in the system prompt or example if the
            extra talking points from Setup should appear in drafts.
          </p>
          <div>
            <span className={labelCls}>Email signature</span>
            <div className="mt-1">
              <SignatureHtmlEditor
                value={template.signature_html ?? ""}
                onChange={(html) => updateTemplateLocal(template.id, { signature_html: html })}
                hint="Appended to every email. SMS and voice are unchanged."
              />
            </div>
          </div>
          {typePromptsLoading ? (
            <p className="text-xs text-gray-400">Loading email prompts…</p>
          ) : typePromptsError ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">{typePromptsError}</p>
          ) : typePrompts ? (
            <div className="grid grid-cols-1 gap-4">
              <label className={labelCls}>
                System prompt
                <textarea
                  value={typePrompts.system_prompt ?? ""}
                  onChange={(e) => updateTypePromptsLocal({ system_prompt: e.target.value })}
                  rows={6}
                  className={textareaCls}
                />
              </label>
              <label className={labelCls}>
                Email example
                <textarea
                  value={typePrompts.email_example ?? ""}
                  onChange={(e) => updateTypePromptsLocal({ email_example: e.target.value })}
                  rows={6}
                  className={textareaCls}
                />
              </label>
            </div>
          ) : null}
        </div>
      )}

      {tab === "sms" && (
        <div className="space-y-4">
          {typePromptsLoading ? (
            <p className="text-xs text-gray-400">Loading SMS example…</p>
          ) : typePromptsError ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">{typePromptsError}</p>
          ) : typePrompts ? (
            <label className={labelCls}>
              SMS example
              <textarea
                value={typePrompts.sms_example ?? ""}
                onChange={(e) => updateTypePromptsLocal({ sms_example: e.target.value })}
                rows={8}
                className={textareaCls}
              />
            </label>
          ) : null}
        </div>
      )}

      {tab === "voice" && (
        <RetellVoicePromptPanel
          token={token}
          sequenceType={template.sequence_type}
          retellAgentId={typePrompts?.retell_agent_id ?? ""}
          retellAgentCopied={isRetellAgentCopiedFlag(typePrompts?.retell_agent_copied)}
          agents={retellAgents}
          agentsLoading={retellAgentsLoading}
          agentsError={retellAgentsError}
          onTypePromptsUpdated={onTypePromptsUpdated}
          showToast={showToast}
          hideSave
          onRegisterSave={registerVoiceSave}
        />
      )}

      {tab === "test" && (
        <StartTestRunPanel
          token={token}
          sequenceType={template.sequence_type}
          displayName={template.display_name}
          onStarted={onTestStarted}
          showToast={showToast}
        />
      )}
    </div>
  );
}
