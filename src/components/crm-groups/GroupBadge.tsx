"use client";

import { cn } from "@/lib/utils";

interface GroupBadgeProps {
  displayName: string;
  slug?: string | null;
  className?: string;
}

/** Violet commercial entity group badge — matches member list / profile styling. */
export function GroupBadge({ displayName, slug, className }: GroupBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-800 dark:border-violet-800/60 dark:bg-violet-900/30 dark:text-violet-200",
        className
      )}
      title={slug ?? undefined}
    >
      {displayName}
    </span>
  );
}
