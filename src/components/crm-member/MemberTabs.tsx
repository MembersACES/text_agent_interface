"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Dropdown, DropdownContent, DropdownTrigger, DropdownClose } from "@/components/ui/dropdown";
import { resolveMemberTab } from "./member-tab-utils";
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

const MOBILE_VISIBLE_COUNT = 4;

function TabLink({
  basePath,
  tabKey,
  label,
  count,
  isActive,
  className,
}: {
  basePath: string;
  tabKey: MemberTab;
  label: string;
  count?: number | null;
  isActive: boolean;
  className?: string;
}) {
  const href = tabKey === "overview" ? basePath : `${basePath}?tab=${tabKey}`;
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors",
        isActive
          ? "border-b-2 border-primary bg-primary/5 text-primary dark:bg-primary/10 -mb-px"
          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50",
        className
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
}

export function MemberTabs({ basePath, tabs }: MemberTabsProps) {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const { tab: current } = resolveMemberTab(rawTab);
  const [moreOpen, setMoreOpen] = useState(false);

  const mobilePrimary = tabs.slice(0, MOBILE_VISIBLE_COUNT);
  const mobileOverflow = tabs.slice(MOBILE_VISIBLE_COUNT);
  const overflowActive = mobileOverflow.some((t) => t.key === current);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 -mb-px">
      {/* Desktop: all tabs visible */}
      <nav
        className="hidden lg:flex gap-1 min-w-0 px-1"
        aria-label="Member tabs"
      >
        {tabs.map(({ key, label, count }) => (
          <TabLink
            key={key}
            basePath={basePath}
            tabKey={key}
            label={label}
            count={count}
            isActive={current === key}
          />
        ))}
      </nav>

      {/* Mobile / tablet: primary tabs + More dropdown */}
      <nav
        className="flex lg:hidden items-center gap-1 min-w-0 px-1"
        aria-label="Member tabs"
      >
        {mobilePrimary.map(({ key, label, count }) => (
          <TabLink
            key={key}
            basePath={basePath}
            tabKey={key}
            label={label}
            count={count}
            isActive={current === key}
          />
        ))}

        {mobileOverflow.length > 0 && (
          <Dropdown isOpen={moreOpen} setIsOpen={setMoreOpen}>
            <DropdownTrigger
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors",
                overflowActive
                  ? "border-b-2 border-primary bg-primary/5 text-primary dark:bg-primary/10 -mb-px"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              )}
            >
              More
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </DropdownTrigger>
            <DropdownContent
              align="end"
              className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-md min-w-[10rem]"
            >
              {mobileOverflow.map(({ key, label, count }) => (
                <DropdownClose key={key}>
                  <Link
                    href={key === "overview" ? basePath : `${basePath}?tab=${key}`}
                    className={cn(
                      "flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors",
                      current === key
                        ? "text-primary font-medium bg-primary/5 dark:bg-primary/10"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    {label}
                    {count != null && count > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </Link>
                </DropdownClose>
              ))}
            </DropdownContent>
          </Dropdown>
        )}
      </nav>
    </div>
  );
}
