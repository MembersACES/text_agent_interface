"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

export type SignatureHtmlEditorHandle = {
  insertToken: (key: string) => void;
};

type SignatureHtmlEditorProps = {
  value: string;
  onChange: (html: string) => void;
  hint?: string;
  onFocus?: () => void;
  editLabel?: string;
  htmlLabel?: string;
  ariaLabel?: string;
  htmlAriaLabel?: string;
  description?: string;
};

const SignatureHtmlEditor = forwardRef<SignatureHtmlEditorHandle, SignatureHtmlEditorProps>(
  function SignatureHtmlEditor(
    {
      value,
      onChange,
      hint,
      onFocus,
      editLabel = "Signature (click to edit)",
      htmlLabel = "Generated HTML",
      ariaLabel = "Email signature",
      htmlAriaLabel = "Generated signature HTML",
      description = "Edit the left preview as it will appear in Gmail — name, title, phone, and links. The HTML on the right updates automatically and is what gets sent.",
    },
    ref,
  ) {
    const previewRef = useRef<HTMLDivElement>(null);
    const savedRangeRef = useRef<Range | null>(null);

    useLayoutEffect(() => {
      const el = previewRef.current;
      if (!el) return;
      if (document.activeElement === el) return;
      if (el.innerHTML === (value || "")) return;
      el.innerHTML = value || "";
    }, [value]);

    const emitHtml = () => {
      const el = previewRef.current;
      if (!el) return;
      onChange(el.innerHTML);
    };

    const saveSelection = () => {
      const el = previewRef.current;
      const selection = window.getSelection();
      if (!el || !selection || selection.rangeCount === 0) return;
      if (!el.contains(selection.anchorNode)) return;
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    };

    useImperativeHandle(ref, () => ({
      insertToken(key: string) {
        const el = previewRef.current;
        if (!el) return;
        el.focus();
        const token = `{{${key}}}`;
        const selection = window.getSelection();
        const saved = savedRangeRef.current;
        const range =
          saved && el.contains(saved.startContainer)
            ? saved
            : selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)
              ? selection.getRangeAt(0)
              : null;
        if (range && selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          range.deleteContents();
          const node = document.createTextNode(token);
          range.insertNode(node);
          range.setStartAfter(node);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          savedRangeRef.current = range.cloneRange();
        } else {
          el.append(token);
        }
        onChange(el.innerHTML);
      },
    }));

    return (
      <div className="space-y-1.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {editLabel}
            </span>
            <div className="mt-1 h-[11.5rem] overflow-auto rounded-lg border border-gray-200 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500/40 dark:border-gray-300">
              <div
                ref={previewRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label={ariaLabel}
                onInput={emitHtml}
                onMouseUp={saveSelection}
                onKeyUp={saveSelection}
                onBlur={() => {
                  saveSelection();
                  emitHtml();
                }}
                onFocus={onFocus}
                className="min-h-full text-[13px] leading-[1.45] text-[#222] outline-none [&_a]:text-[#1a73e8]"
                style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
              />
            </div>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{htmlLabel}</span>
            <textarea
              value={value}
              readOnly
              rows={10}
              spellCheck={false}
              tabIndex={-1}
              aria-label={htmlAriaLabel}
              className={cn(
                "mt-1 h-[11.5rem] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-gray-600",
                "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400",
              )}
            />
          </div>
        </div>
        <p className="normal-case tracking-normal font-normal text-[11px] text-gray-400">
          {description}
          {hint ? ` ${hint}` : ""}
        </p>
      </div>
    );
  },
);

export default SignatureHtmlEditor;
