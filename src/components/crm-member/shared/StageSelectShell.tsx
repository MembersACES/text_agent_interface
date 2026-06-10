"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLIENT_STAGES, CLIENT_STAGE_LABELS, type ClientStage } from "@/constants/crm";

function stageDotClass(stage: string): string {
  const s = stage.toLowerCase();
  if (s === "won" || s === "existing_client") return "bg-emerald-500";
  if (s === "lost") return "bg-red-500";
  if (s === "offer_sent" || s === "analysis_in_progress") return "bg-primary";
  return "bg-gray-400 dark:bg-gray-500";
}

export interface StageSelectShellProps {
  value: ClientStage;
  onChange: (stage: ClientStage) => void;
  disabled?: boolean;
  className?: string;
}

/** Styled wrapper around native <select> — preserves keyboard, a11y, and PATCH behaviour. */
export function StageSelectShell({
  value,
  onChange,
  disabled = false,
  className,
}: StageSelectShellProps) {
  return (
    <div className={cn("relative h-9 min-w-[10.5rem]", className)}>
      <span
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 z-[1] size-2 -translate-y-1/2 rounded-full",
          stageDotClass(value)
        )}
        aria-hidden
      />
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
        aria-hidden
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ClientStage)}
        disabled={disabled}
        aria-label="Member stage"
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-lg border border-stroke bg-white pl-7 pr-8 text-sm font-medium text-gray-900",
          "transition-colors hover:border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "dark:border-dark-3 dark:bg-gray-dark dark:text-gray-100 dark:hover:border-gray-600"
        )}
      >
        {CLIENT_STAGES.map((s) => (
          <option key={s} value={s}>
            {CLIENT_STAGE_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
