"use client";

import { useRef, useState } from "react";
import {
  MERGE_FIELD_BY_KEY,
  type MergeField,
  validateTemplate,
} from "@/lib/merge-template";
import SignatureHtmlEditor, {
  type SignatureHtmlEditorHandle,
} from "./SignatureHtmlEditor";

const ACK_TOKEN_KEYS = ["first_name", "contact_name", "company_name", "state"] as const;

const ACK_MERGE_FIELDS: MergeField[] = ACK_TOKEN_KEYS.map((key) => MERGE_FIELD_BY_KEY[key]);

type LastFocus = "subject" | "body";

type AckTemplateEditorProps = {
  title: string;
  subject: string;
  html: string;
  onChange: (next: { subject: string; html: string }) => void;
  subjectClassName: string;
};

export default function AckTemplateEditor({
  title,
  subject,
  html,
  onChange,
  subjectClassName,
}: AckTemplateEditorProps) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<SignatureHtmlEditorHandle>(null);
  const subjectCaretRef = useRef({ start: 0, end: 0 });
  const [lastFocus, setLastFocus] = useState<LastFocus>("body");
  const validation = validateTemplate(html, ACK_MERGE_FIELDS);
  const unknown = validation.ok ? [] : validation.unknown;

  const saveSubjectCaret = () => {
    const el = subjectRef.current;
    if (!el) return;
    subjectCaretRef.current = {
      start: el.selectionStart ?? subject.length,
      end: el.selectionEnd ?? el.selectionStart ?? subject.length,
    };
  };

  const insertToken = (key: string) => {
    const token = `{{${key}}}`;
    if (lastFocus === "subject") {
      const { start, end } = subjectCaretRef.current;
      const next = subject.slice(0, start) + token + subject.slice(end);
      onChange({ subject: next, html });
      requestAnimationFrame(() => {
        const input = subjectRef.current;
        if (!input) return;
        input.focus();
        const pos = start + token.length;
        input.setSelectionRange(pos, pos);
        subjectCaretRef.current = { start: pos, end: pos };
      });
      return;
    }
    bodyRef.current?.insertToken(key);
  };

  return (
    <div className="space-y-2">
      <p className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Token picker</p>
        <div className="flex flex-wrap gap-1.5">
          {ACK_TOKEN_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => insertToken(key)}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
            >
              {`{{${key}}}`}
            </button>
          ))}
        </div>
      </div>
      <input
        ref={subjectRef}
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={(e) => onChange({ subject: e.target.value, html })}
        onSelect={saveSubjectCaret}
        onKeyUp={saveSubjectCaret}
        onMouseUp={saveSubjectCaret}
        onFocus={() => setLastFocus("subject")}
        onBlur={saveSubjectCaret}
        className={subjectClassName}
      />
      <SignatureHtmlEditor
        ref={bodyRef}
        value={html}
        onChange={(nextHtml) => onChange({ subject, html: nextHtml })}
        onFocus={() => setLastFocus("body")}
        editLabel="Body (click to edit)"
        htmlLabel="Generated HTML"
        ariaLabel={`${title} body`}
        htmlAriaLabel={`${title} generated HTML`}
        hint="Use the token chips — they insert at the caret in the subject or body."
        description="Edit the left preview as it will appear in Gmail. The HTML on the right updates automatically and is what gets sent."
      />
      {unknown.length > 0 ? (
        <p className="text-[11px] text-amber-800 dark:text-amber-200" role="alert">
          Unknown token{unknown.length === 1 ? "" : "s"}:{" "}
          {unknown.map((token) => `{{${token}}}`).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
