"use client";

import { cn } from "@/lib/utils";

export type MemberSubTabItem = {
  id: string;
  label: string;
  count?: number;
};

export interface MemberSubTabsProps {
  tabs: MemberSubTabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function MemberSubTabs({
  tabs,
  active,
  onChange,
  className,
}: MemberSubTabsProps) {
  return (
    <div
      className={cn(
        "border-b border-gray-200 dark:border-gray-700",
        className
      )}
    >
      <div className="no-scrollbar flex items-center gap-0 overflow-x-auto -mb-px">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2 text-xs font-medium transition-colors md:text-sm",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100"
              )}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  className={cn(
                    "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    isActive
                      ? "bg-primary/15 text-primary dark:bg-primary/25"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  )}
                >
                  {tab.count > 99 ? "99+" : tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
