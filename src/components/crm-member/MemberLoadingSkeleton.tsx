"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MemberLoadingSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 min-w-0">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-t-md" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
