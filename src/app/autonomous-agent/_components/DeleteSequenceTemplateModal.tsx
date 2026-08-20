"use client";

import { getAutonomousApiBaseUrl } from "@/lib/utils";

export interface TemplateDeletePreview {
  template_id: number;
  sequence_type: string;
  display_name: string;
  run_count: number;
  retell_agent_id?: string | null;
  retell_agent_name?: string | null;
  retell_will_delete: boolean;
  retell_skip_reason?: string | null;
}

interface DeleteSequenceTemplateModalProps {
  preview: TemplateDeletePreview;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const btnDanger =
  "inline-flex items-center gap-1.5 rounded-full bg-red-600 text-white text-sm font-semibold px-4 py-2 transition hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold px-4 py-2 text-gray-700 dark:text-gray-200 disabled:opacity-40";

export function loadTemplateDeletePreview(token: string, templateId: number) {
  return fetch(
    `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates/${templateId}/delete-preview`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
  );
}

export function deleteSequenceTemplate(token: string, templateId: number) {
  return fetch(
    `${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates/${templateId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
  );
}

export default function DeleteSequenceTemplateModal({
  preview,
  submitting,
  onCancel,
  onConfirm,
}: DeleteSequenceTemplateModalProps) {
  const runLabel =
    preview.run_count === 0
      ? "No scheduled or finished runs of this type"
      : `${preview.run_count} run${preview.run_count === 1 ? "" : "s"} of this type (and their steps)`;
  const retellLabel = preview.retell_will_delete
    ? `Retell agent ${preview.retell_agent_name || preview.retell_agent_id} and its LLM`
    : preview.retell_skip_reason || "No Retell agent will be deleted";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onCancel} aria-label="Close" />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Delete this sequence?</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This cannot be undone. It removes the playbook from the dashboard and everything created
            for <span className="font-mono">{preview.sequence_type}</span>.
          </p>
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preview.display_name}</p>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1.5 list-disc ml-4">
          <li>Template and cadence steps</li>
          <li>{runLabel}</li>
          <li>{retellLabel}</li>
        </ul>
        {!preview.retell_will_delete && preview.retell_skip_reason && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300">{preview.retell_skip_reason}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className={btnSecondary} disabled={submitting}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={btnDanger} disabled={submitting}>
            {submitting ? "Deleting…" : "Yes, delete everything"}
          </button>
        </div>
      </div>
    </div>
  );
}
