"use client";

import { cn } from "@/lib/utils";

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-2.5 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40";

type SignatureHtmlEditorProps = {
  value: string;
  onChange: (html: string) => void;
  hint?: string;
};

export default function SignatureHtmlEditor({ value, onChange, hint }: SignatureHtmlEditorProps) {
  const html = value.trim();

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">HTML</span>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={10}
            spellCheck={false}
            className={cn(inputCls, "h-[11.5rem] resize-y font-mono text-[11px] leading-relaxed")}
          />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Gmail preview</span>
          <div className="mt-1 h-[11.5rem] overflow-auto rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-300">
            {html ? (
              <div
                className="text-[13px] leading-[1.45] text-[#222] [&_a]:text-[#1a73e8]"
                style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="text-[12px] text-gray-400">Nothing to preview yet.</p>
            )}
          </div>
        </div>
      </div>
      {hint ? (
        <p className="normal-case tracking-normal font-normal text-[11px] text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}
