"use client";

import { useEffect, useMemo, useState } from "react";
import { getAutonomousApiBaseUrl, cn } from "@/lib/utils";

interface SequenceTemplateLite {
  id: number;
  sequence_type: string;
  display_name: string;
  signature_html?: string | null;
  steps: unknown[];
}

interface UncoveredFlow {
  sequence_type: string;
  display_name: string;
  source: string;
  copy_hint: string | null;
  copy_hint_available: boolean;
}

interface NewSequenceTemplateWizardProps {
  token: string;
  templates: SequenceTemplateLite[];
  onCreated: (template: SequenceTemplateLite) => void;
  onClose: () => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

function apiDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string" && d.trim()) return d;
  }
  return fallback;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-2.5 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-primary to-primary/85 text-white text-sm font-semibold px-4 py-2 transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-sm";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold px-4 py-2 text-gray-700 dark:text-gray-200 disabled:opacity-40";

const CUSTOM = "__custom__";

export const ACES_TEAM_FOLLOWUP_SIGNATURE_HTML = `<p style="margin-bottom:0;"><strong>The Team</strong><br>
Australian Circular Economy Solutions</p>
<p style="margin-top:16px; margin-bottom:0;"><strong>Carbon Zero Australasia</strong><br>
Australian Circular Economy Solutions Division<br>
Direct: 0468 050 399<br>
Email: <a href="mailto:business@acesolutions.com.au" style="color:#1a73e8;">business@acesolutions.com.au</a><br>
470 St Kilda Road, Melbourne VIC 3004<br>
Website: <a href="https://acesolutions.com.au" style="color:#1a73e8;">acesolutions.com.au</a></p>`;

const SOLAR_ENGAGEMENT_SIGNATURE_HTML = `<p style="margin-bottom:0;"><strong>Amelia Williams</strong><br>
<span style="color:#666;">Customer Success Manager (CSM) – Implementation: Connects onboarding directly to future success.</span></p>
<p style="margin-top:16px; margin-bottom:0;"><strong>Carbon Zero Australasia</strong><br>
Australian Circular Economy Solutions Division<br>
Direct: 0468 050 399<br>
Email: <a href="mailto:business@acesolutions.com.au" style="color:#1a73e8;">business@acesolutions.com.au</a><br>
470 St Kilda Road, Melbourne VIC 3004<br>
Ph: 1300 849 908 | Website: <a href="https://acesolutions.com.au" style="color:#1a73e8;">acesolutions.com.au</a></p>`;

const SOLAR_ENGAGEMENT_FORM_SEQUENCE_TYPE = "solar_panel_cleaning_engagement_form_v1";

export default function NewSequenceTemplateWizard({
  token,
  templates,
  onCreated,
  onClose,
  showToast,
}: NewSequenceTemplateWizardProps) {
  const [flows, setFlows] = useState<UncoveredFlow[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [flowKey, setFlowKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sequenceType, setSequenceType] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [duplicateRetell, setDuplicateRetell] = useState(true);
  const [signatureHtml, setSignatureHtml] = useState(ACES_TEAM_FOLLOWUP_SIGNATURE_HTML);
  const [submitting, setSubmitting] = useState(false);

  const applySignatureFromCopy = (key: string) => {
    const src = templates.find((t) => t.sequence_type === key);
    const copied = (src?.signature_html || "").trim();
    if (copied) {
      setSignatureHtml(copied);
      return;
    }
    if (key === SOLAR_ENGAGEMENT_FORM_SEQUENCE_TYPE) {
      setSignatureHtml(SOLAR_ENGAGEMENT_SIGNATURE_HTML);
      return;
    }
    setSignatureHtml(ACES_TEAM_FOLLOWUP_SIGNATURE_HTML);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingFlows(true);
        const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/template-suggestions`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(apiDetail(data, "Failed to load suggestions"));
        const rows = Array.isArray(data.uncovered_flows) ? (data.uncovered_flows as UncoveredFlow[]) : [];
        setFlows(rows);
        if (rows[0]) {
          setFlowKey(rows[0].sequence_type);
          setDisplayName(rows[0].display_name);
          setSequenceType(rows[0].sequence_type);
          if (rows[0].copy_hint_available && rows[0].copy_hint) {
            setCopyFrom(rows[0].copy_hint);
            applySignatureFromCopy(rows[0].copy_hint);
          }
        } else {
          setFlowKey(CUSTOM);
        }
      } catch {
        setFlows([]);
        setFlowKey(CUSTOM);
      } finally {
        setLoadingFlows(false);
      }
    };
    load();
  }, [token]);

  const selectedFlow = flows.find((f) => f.sequence_type === flowKey) ?? null;
  const isCustom = flowKey === CUSTOM || !selectedFlow;

  const applyFlow = (key: string) => {
    setFlowKey(key);
    if (key === CUSTOM) {
      setDisplayName("");
      setSequenceType("");
      return;
    }
    const flow = flows.find((f) => f.sequence_type === key);
    if (!flow) return;
    setDisplayName(flow.display_name);
    setSequenceType(flow.sequence_type);
    const hint = flow.copy_hint_available && flow.copy_hint ? flow.copy_hint : "";
    setCopyFrom(hint);
    applySignatureFromCopy(hint);
  };

  const copySourceHasAgent = useMemo(() => {
    return Boolean(copyFrom);
  }, [copyFrom]);

  const submit = async () => {
    const key = (isCustom ? slugify(sequenceType || displayName) : sequenceType).trim();
    const name = displayName.trim() || key;
    if (!key) {
      showToast("Choose a comparison or enter a sequence key.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          sequence_type: key,
          display_name: name,
          description: selectedFlow ? `Follow-up for ${selectedFlow.source}.` : "",
          timezone: "Australia/Brisbane",
          is_active: true,
          is_restartable: true,
          steps: [],
          copy_from_sequence_type: copyFrom || null,
          duplicate_retell: Boolean(duplicateRetell && copyFrom),
          signature_html: signatureHtml.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiDetail(data, "Create failed"));
      onCreated(data as SequenceTemplateLite);
      showToast(
        duplicateRetell && copyFrom
          ? "Template created with a duplicated Retell agent."
          : "Template created.",
        "success",
      );
      onClose();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Create failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">New sequence template</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Pick a comparison that does not have a sequence yet, copy cadence from an existing one, then
            duplicate its Retell voice agent so this template owns its own prompt.
          </p>
        </div>

        <label className={labelCls}>
          Comparison / flow
          {loadingFlows ? (
            <p className="mt-2 text-sm text-gray-400">Loading suggestions…</p>
          ) : (
            <select value={flowKey} onChange={(e) => applyFlow(e.target.value)} className={inputCls}>
              {flows.map((f) => (
                <option key={f.sequence_type} value={f.sequence_type}>
                  {f.display_name} — {f.source}
                </option>
              ))}
              <option value={CUSTOM}>Custom sequence key…</option>
            </select>
          )}
        </label>
        {selectedFlow && (
          <p className="text-[11px] text-gray-400 -mt-2">
            Suggested because {selectedFlow.source} has no sequence template yet.
          </p>
        )}

        <label className={labelCls}>
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
        </label>

        {isCustom && (
          <label className={labelCls}>
            Sequence key
            <input
              value={sequenceType}
              onChange={(e) => setSequenceType(slugify(e.target.value))}
              placeholder="e.g. oil_base2_followup_v1"
              className={cn(inputCls, "font-mono text-xs")}
            />
          </label>
        )}
        {!isCustom && sequenceType && (
          <p className="text-[11px] font-mono text-gray-400">Key: {sequenceType}</p>
        )}

        <label className={labelCls}>
          Copy cadence from
          <select
            value={copyFrom}
            onChange={(e) => {
              const key = e.target.value;
              setCopyFrom(key);
              applySignatureFromCopy(key);
            }}
            className={inputCls}
          >
            <option value="">Start blank (no steps)</option>
            {templates.map((t) => (
              <option key={t.sequence_type} value={t.sequence_type}>
                {t.display_name} ({t.steps.length} steps)
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={duplicateRetell}
            disabled={!copySourceHasAgent}
            onChange={(e) => setDuplicateRetell(e.target.checked)}
          />
          <span>
            Duplicate the source sequence&rsquo;s Retell agent and rename it to match this template.
            {!copyFrom && (
              <span className="block text-[11px] text-gray-400 mt-0.5">
                Choose a sequence to copy from first — that agent is cloned, not reused.
              </span>
            )}
          </span>
        </label>

        <label className={labelCls}>
          Email signature
          <textarea
            value={signatureHtml}
            onChange={(e) => setSignatureHtml(e.target.value)}
            rows={7}
            className={cn(inputCls, "font-mono text-[11px] leading-relaxed")}
          />
          <span className="mt-1 block normal-case tracking-normal font-normal text-[11px] text-gray-400">
            Appended to every email in this sequence. Pair it with the Retell agent you duplicate above.
            SMS and voice are unchanged. Leave blank to use the default ACES Team block.
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={submitting}>
            Cancel
          </button>
          <button type="button" onClick={submit} className={btnPrimary} disabled={submitting || loadingFlows}>
            {submitting ? "Creating…" : "Create template"}
          </button>
        </div>
      </div>
    </div>
  );
}
