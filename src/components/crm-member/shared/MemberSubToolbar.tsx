"use client";

import { cn } from "@/lib/utils";

export interface MemberSubToolbarProps {
  caption?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function MemberSubToolbar({
  caption,
  actions,
  className,
}: MemberSubToolbarProps) {
  if (!caption && !actions) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/40 px-5 py-2 dark:border-gray-800/60 dark:bg-gray-900/20",
        className
      )}
    >
      {caption ? (
        <p className="min-w-0 text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {caption}
        </p>
      ) : (
        <span />
      )}
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
