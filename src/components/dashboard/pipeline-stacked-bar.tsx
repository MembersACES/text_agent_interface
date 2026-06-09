"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const STAGE_COLORS = [
  "bg-primary",
  "bg-primary/70",
  "bg-primary/50",
  "bg-primary/35",
  "bg-primary/25",
  "bg-primary/15",
];

export interface PipelineStageSegment {
  id: string;
  label: string;
  count: number;
  percent: number;
}

interface PipelineStackedBarProps {
  stages: PipelineStageSegment[];
  totalLabel?: string;
  className?: string;
}

export function PipelineStackedBar({
  stages,
  totalLabel,
  className,
}: PipelineStackedBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setMounted(true);
      return;
    }
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, [stages]);

  if (stages.length === 0) return null;

  return (
    <div className={cn("rounded-2xl bg-white shadow-sm dark:bg-gray-dark pg-fade-up px-4 py-3.5", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
          Pipeline mix
        </p>
        {totalLabel && (
          <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{totalLabel}</p>
        )}
      </div>

      <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-2 dark:bg-dark-3">
        {stages.map((stage, i) => {
          const target = Math.max(stage.percent, stage.count > 0 ? 2 : 0);
          return (
            <div
              key={stage.id}
              className={cn(
                "h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full",
                STAGE_COLORS[i % STAGE_COLORS.length],
              )}
              style={{ width: mounted ? `${target}%` : "0%" }}
              title={`${stage.label}: ${stage.count} (${Math.round(stage.percent)}%)`}
            />
          );
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-1.5 text-xs">
            <span
              className={cn("size-2 shrink-0 rounded-full", STAGE_COLORS[i % STAGE_COLORS.length])}
              aria-hidden
            />
            <span className="font-medium text-dark dark:text-white">{stage.label}</span>
            <span className="tabular-nums text-gray-500 dark:text-gray-400">
              {Math.round(stage.percent)}% · {stage.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
