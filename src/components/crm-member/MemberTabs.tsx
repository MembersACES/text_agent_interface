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
      <nav className="flex gap-1 min-w-0" aria-label="Member tabs">
        {tabs.map(({ key, label, count }) => {
          const isActive = current === key;
          const href = key === "overview" ? basePath : `${basePath}?tab=${key}`;
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
              )}
            >
              {label}
              {count != null && count > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs",
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
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
