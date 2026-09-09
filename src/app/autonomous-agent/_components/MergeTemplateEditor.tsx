"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { htmlToPlainText, renderTemplate } from "@/lib/merge-template";

export type MergeTemplateEditorHandle = {
  insertToken: (key: string) => void;
};

type OutputTab = "rendered" | "html" | "plain";

type MergeTemplateEditorProps = {
  value: string;
  onChange: (html: string) => void;
  row: Record<string, string>;
  onFocus?: () => void;
};

const MergeTemplateEditor = forwardRef<
  MergeTemplateEditorHandle,
  MergeTemplateEditorProps
>(function MergeTemplateEditor({ value, onChange, row, onFocus }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<OutputTab>("rendered");

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML === (value || "")) return;
    el.innerHTML = value || "";
  }, [value]);

  const emitHtml = () => {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  };

  useImperativeHandle(ref, () => ({
    insertToken(key: string) {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const token = `{{${key}}}`;
      const selection = window.getSelection();
      if (
        selection &&
        selection.rangeCount > 0 &&
        el.contains(selection.anchorNode)
      ) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(token);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        el.append(token);
      }
      onChange(el.innerHTML);
    },
  }));

  const { output } = renderTemplate(value, row);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Body (click to edit)
          </span>
          <div className="mt-1 h-[18rem] overflow-auto rounded-lg border border-gray-200 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500/40 dark:border-gray-300 dark:bg-white">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Campaign email body"
              onInput={emitHtml}
              onBlur={emitHtml}
              onFocus={onFocus}
              className="min-h-full text-[13px] leading-[1.45] text-[#222] outline-none [&_a]:text-[#1a73e8]"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Preview for this recipient
            </span>
            <div
              className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-900"
              role="tablist"
              aria-label="Preview format"
            >
              {(
                [
                  ["rendered", "Rendered"],
                  ["html", "HTML"],
                  ["plain", "Plain text"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-semibold",
                    tab === id
                      ? "bg-white text-dark shadow-sm dark:bg-gray-800 dark:text-white"
                      : "text-gray-500 hover:text-dark dark:hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {tab === "rendered" ? (
            <div
              className="mt-1 h-[18rem] overflow-auto rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] leading-[1.45] text-[#222] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
              dangerouslySetInnerHTML={{ __html: output || "" }}
            />
          ) : (
            <textarea
              value={tab === "html" ? output : htmlToPlainText(output)}
              readOnly
              rows={10}
              spellCheck={false}
              tabIndex={-1}
              aria-label={tab === "html" ? "Merged HTML" : "Merged plain text"}
              className={cn(
                "mt-1 h-[18rem] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-gray-600",
                "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400",
              )}
            />
          )}
        </div>
      </div>
      <p className="text-[11px] font-normal normal-case tracking-normal text-gray-400">
        Prefer the token chips — typing {"{{…}}"} by hand can split across HTML
        nodes. The right pane is the merge result for the selected recipient,
        not the raw template. HTML is unsanitised in this preview; sanitisation
        lands with persistence in PR 2.
      </p>
    </div>
  );
});

export default MergeTemplateEditor;
