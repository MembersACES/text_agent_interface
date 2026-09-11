"use client";

import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { renderMergeTokens, type OperationalEmailTemplate } from "@/lib/operational-email-api";

type HtmlTemplateEditorProps = {
  template: OperationalEmailTemplate;
  subject: string;
  html: string;
  onSubjectChange: (value: string) => void;
  onHtmlChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
};

export function HtmlTemplateEditor({
  template,
  subject,
  html,
  onSubjectChange,
  onHtmlChange,
  onSave,
  saving,
  dirty,
}: HtmlTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewSubject = useMemo(
    () => renderMergeTokens(subject, template.sample_values || {}),
    [subject, template.sample_values],
  );
  const previewHtml = useMemo(
    () => renderMergeTokens(html, template.sample_values || {}),
    [html, template.sample_values],
  );

  const insertToken = (key: string) => {
    const token = `{{${key}}}`;
    const el = textareaRef.current;
    if (!el) {
      onHtmlChange(html + token);
      return;
    }
    const start = el.selectionStart ?? html.length;
    const end = el.selectionEnd ?? start;
    const next = html.slice(0, start) + token + html.slice(end);
    onHtmlChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-dark dark:text-white">{template.name}</h2>
          {template.description ? (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
          ) : null}
          <p className="mt-1 text-xs text-gray-500">
            Last updated {template.updated_at ? new Date(template.updated_at).toLocaleString() : "never"}
            {template.updated_by ? ` by ${template.updated_by}` : ""}
          </p>
        </div>
        <Button onClick={onSave} disabled={!dirty || saving} loading={saving}>
          Save template
        </Button>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</span>
        <input
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-dark focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </label>

      {template.merge_fields.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Insert field</p>
          <div className="flex flex-wrap gap-1.5">
            {template.merge_fields.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => insertToken(key)}
                className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-[11px] text-gray-700 hover:border-primary hover:text-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                {`{{${key}}}`}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">HTML</span>
          <textarea
            ref={textareaRef}
            value={html}
            onChange={(e) => onHtmlChange(e.target.value)}
            spellCheck={false}
            className="h-[28rem] w-full resize-y rounded-lg border border-gray-300 bg-white p-3 font-mono text-[12px] leading-relaxed text-dark focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Live preview</span>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700">
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              {previewSubject || "(no subject)"}
            </div>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={previewHtml}
              className="h-[24.5rem] w-full bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
