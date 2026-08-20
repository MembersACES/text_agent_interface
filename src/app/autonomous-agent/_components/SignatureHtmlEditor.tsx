"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type SignatureHtmlEditorProps = {
  value: string;
  onChange: (html: string) => void;
  hint?: string;
};

export default function SignatureHtmlEditor({ value, onChange, hint }: SignatureHtmlEditorProps) {
  const previewRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Signature (click to edit)
          </span>
          <div className="mt-1 h-[11.5rem] overflow-auto rounded-lg border border-gray-200 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500/40 dark:border-gray-300">
            <div
              ref={previewRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Email signature"
              onInput={emitHtml}
              onBlur={emitHtml}
              className="min-h-full text-[13px] leading-[1.45] text-[#222] outline-none [&_a]:text-[#1a73e8]"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            />
          </div>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Generated HTML</span>
          <textarea
            value={value}
            readOnly
            rows={10}
            spellCheck={false}
            tabIndex={-1}
            aria-label="Generated signature HTML"
            className={cn(
              "mt-1 h-[11.5rem] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-gray-600",
              "dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400",
            )}
          />
        </div>
      </div>
      <p className="normal-case tracking-normal font-normal text-[11px] text-gray-400">
        Edit the left preview as it will appear in Gmail — name, title, phone, and links. The HTML on the right
        updates automatically and is what gets sent.
        {hint ? ` ${hint}` : ""}
      </p>
    </div>
  );
}
