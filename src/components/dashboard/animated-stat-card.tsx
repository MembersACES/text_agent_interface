"use client";

import { StatCard, type StatCardProps } from "@/components/dashboard/stat-card";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";

interface AnimatedStatCardProps extends Omit<StatCardProps, "value"> {
  numericValue: number;
  animateIndex?: number;
  loading?: boolean;
  sparkline?: number[] | null;
}

export function AnimatedStatCard({
  numericValue,
  animateIndex = 0,
  loading = false,
  className,
  ...props
}: AnimatedStatCardProps) {
  return (
    <StatCard
      {...props}
      className={cn(
        "pg-fade-up",
        animateIndex > 0 && animateIndex <= 6 && `pg-stagger-${animateIndex}`,
        className,
      )}
      value={
        loading ? (
          <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray/50 dark:bg-dark-3" />
        ) : (
          <CountUp value={numericValue} active={!loading} />
        )
      }
    />
  );
}
