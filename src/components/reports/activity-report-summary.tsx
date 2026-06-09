"use client";

import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";
import { Building2, Layers, ListChecks } from "lucide-react";

interface ActivityReportSummaryProps {
  total: number;
  clientCount: number;
  typeCount: number;
  loading?: boolean;
  className?: string;
}

const tiles = [
  { key: "total", label: "Activities", icon: ListChecks },
  { key: "clients", label: "Clients", icon: Building2 },
  { key: "types", label: "Activity types", icon: Layers },
] as const;

export function ActivityReportSummary({
  total,
  clientCount,
  typeCount,
  loading = false,
  className,
}: ActivityReportSummaryProps) {
  const values = { total, clients: clientCount, types: typeCount };

  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {tiles.map(({ key, label, icon: Icon }, index) => (
        <div
          key={key}
          className={cn(
            "rounded-2xl bg-white shadow-sm dark:bg-gray-dark pg-fade-up px-4 py-3.5 transition-transform duration-200 hover:shadow-md",
            `pg-stagger-${index + 1}`,
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold leading-none tracking-[-0.02em] text-dark dark:text-white">
                {loading ? (
                  <span className="inline-block h-7 w-10 animate-pulse rounded bg-gray/50 dark:bg-dark-3" />
                ) : (
                  <CountUp value={values[key]} active={!loading} />
                )}
              </p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
