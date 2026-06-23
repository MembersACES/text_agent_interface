"use client";

import type { ReactNode } from "react";
import { Users, Tag, PenLine, Layers, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupSummaryBarProps {
  memberCount: number;
  totalOffers: number;
  signedCount: number;
  stageCount: number;
  /** Optional content pinned to the right of the bar (e.g. climate disclosure chip). */
  trailing?: ReactNode;
  className?: string;
}

type Tint = "violet" | "blue" | "emerald" | "amber";

const tintStyles: Record<Tint, string> = {
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
};

export function GroupSummaryBar({
  memberCount,
  totalOffers,
  signedCount,
  stageCount,
  trailing,
  className,
}: GroupSummaryBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-dark",
        className
      )}
    >
      <SummaryItem icon={Users} tint="violet" label="Members" value={String(memberCount)} />
      <Divider />
      <SummaryItem icon={Tag} tint="blue" label="Offers" value={String(totalOffers)} />
      <Divider />
      <SummaryItem
        icon={PenLine}
        tint="emerald"
        label="Signed"
        value={`${signedCount}/${memberCount}`}
      />
      <Divider />
      <SummaryItem
        icon={Layers}
        tint="amber"
        label="Stages"
        value={stageCount > 0 ? String(stageCount) : "—"}
      />
      {trailing != null ? <div className="ml-auto">{trailing}</div> : null}
    </div>
  );
}

function Divider() {
  return <span className="hidden h-8 w-px bg-gray-200 dark:bg-gray-700 sm:block" aria-hidden />;
}

function SummaryItem({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: LucideIcon;
  tint: Tint;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          tintStyles[tint]
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {label}
        </span>
      </div>
    </div>
  );
}
