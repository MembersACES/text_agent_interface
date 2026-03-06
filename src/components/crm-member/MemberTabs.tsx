"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { MemberTab } from "./types";

export interface TabConfig {
  key: MemberTab;
  label: string;
  count?: number | null;
}

export interface MemberTabsProps {
  basePath: string;
  tabs: TabConfig[];
}

export function MemberTabs({ basePath, tabs }: MemberTabsProps) {
  const searchParams = useSearchParams();
  const current = (searchParams.get("tab") as MemberTab | null) || "overview";

  return (
    <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-700 -mb-px">
      <nav className="flex gap-1 min-w-0 px-1" aria-label="Member tabs">
        {tabs.map(({ key, label, count }) => {
          const isActive = current === key;
          const href = key === "overview" ? basePath : `${basePath}?tab=${key}`;
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors",
                isActive
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-b-0 border-gray-200 dark:border-gray-700 -mb-px"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              )}
            >
              {label}
              {count != null && count > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    isActive
                      ? "bg-primary/15 dark:bg-primary/25 text-primary"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  )}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
