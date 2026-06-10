"use client";

import { cn } from "@/lib/utils";

interface GroupSummaryBarProps {
  memberCount: number;
  totalOffers: number;
  signedCount: number;
  stageCount: number;
  className?: string;
}

export function GroupSummaryBar({
  memberCount,
  totalOffers,
  signedCount,
  stageCount,
  className,
}: GroupSummaryBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-dark",
        className
      )}
    >
      <SummaryItem label="Members" value={String(memberCount)} />
      <SummaryItem label="Offers" value={String(totalOffers)} />
      <SummaryItem
        label="Signed"
        value={`${signedCount}/${memberCount} signed`}
      />
      <SummaryItem
        label="Stages"
        value={stageCount > 0 ? String(stageCount) : "—"}
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}
