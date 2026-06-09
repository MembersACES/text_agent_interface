"use client";

import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

interface CountUpProps {
  value: number;
  active?: boolean;
  className?: string;
}

export function CountUp({ value, active = true, className }: CountUpProps) {
  const display = useCountUp(value, active);
  return (
    <span className={cn("tabular-nums tracking-tight", className)}>
      {display}
    </span>
  );
}
