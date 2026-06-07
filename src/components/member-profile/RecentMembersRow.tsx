"use client";

import {
  formatRelativeViewed,
  getMemberAvatarClass,
  getMemberInitials,
  type RecentMemberView,
} from "@/lib/member-profile-recent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface RecentMembersRowProps {
  items: RecentMemberView[];
  onSelect: (entry: RecentMemberView) => void;
  activeBusinessName?: string;
  loading?: boolean;
}

export function RecentMembersRow({
  items,
  onSelect,
  activeBusinessName,
  loading = false,
}: RecentMembersRowProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-dark dark:text-white">Recent members</p>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {items.map((entry) => {
          const isActive =
            activeBusinessName?.toLowerCase() === entry.businessName.toLowerCase();
          const initials = getMemberInitials(entry.businessName);
          const avatarClass = getMemberAvatarClass(entry.businessName);

          return (
            <div
              key={`${entry.businessName}-${entry.viewedAt}`}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border px-3 py-3 sm:flex-row sm:items-center",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm dark:bg-primary/10"
                  : "border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    avatarClass,
                  )}
                >
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-dark dark:text-white">
                    {entry.businessName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatRelativeViewed(entry.viewedAt)}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onSelect(entry)}
                  disabled={loading}
                  loading={loading && isActive}
                  className="flex-1 sm:flex-none"
                >
                  Get member profile
                </Button>
                {entry.clientId != null && (
                  <Link
                    href={`/crm-members/${entry.clientId}`}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-stroke bg-white px-3 py-1.5 text-xs font-semibold text-dark transition-all hover:bg-gray/80 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-3 sm:flex-none"
                  >
                    Open in CRM
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
