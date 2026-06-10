"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CopyChipProps {
  value: string;
  /** Shown in the chip; defaults to `value`. */
  displayValue?: string;
  className?: string;
  /** Accessible label for the copy action. */
  ariaLabel?: string;
}

export function CopyChip({
  value,
  displayValue,
  className,
  ariaLabel = "Copy to clipboard",
}: CopyChipProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      /* ignore */
    }
  }, [value]);

  const shown = displayValue ?? value;

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={copied ? "Copied" : ariaLabel}
      title={copied ? "Copied" : ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-800 transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-200 dark:hover:border-primary/50",
        className
      )}
    >
      <span className="truncate">{shown}</span>
      {copied ? (
        <Check className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      ) : (
        <Copy className="size-3 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
      )}
    </button>
  );
}
