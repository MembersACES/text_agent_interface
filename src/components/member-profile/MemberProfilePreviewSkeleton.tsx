"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";

interface MemberProfilePreviewSkeletonProps {
  loading?: boolean;
  className?: string;
}

export function MemberProfilePreviewSkeleton({
  loading = false,
  className,
}: MemberProfilePreviewSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-stroke bg-surface/50 p-6 dark:border-dark-3 dark:bg-dark-2/30",
        className,
      )}
      aria-hidden={!loading}
      aria-busy={loading}
      aria-label={loading ? "Loading member profile" : undefined}
    >
      <div className="mb-5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Eye className="size-4 shrink-0 text-primary/70" aria-hidden />
        <span>
          {loading
            ? "Loading member profile from Airtable…"
            : "A profile will load here — contacts, LOA status, sites & activity."}
        </span>
      </div>

      <div className={cn("space-y-5", loading && "animate-pulse")}>
        {/* Header row */}
        <div className="flex items-start gap-4">
          <Skeleton variant="circular" className="size-14 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <Skeleton className="h-6 w-48 max-w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>

        {/* Quick actions strip */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>

        {/* Three-column detail blocks */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((col) => (
            <div
              key={col}
              className="rounded-xl border border-stroke/60 bg-white/60 p-4 dark:border-dark-3 dark:bg-gray-dark/40"
            >
              <Skeleton className="mb-3 h-3 w-20" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
