"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** Accessible label for screen readers */
  "aria-label"?: string;
}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={props["aria-label"] ?? "Loading"}
      className={cn("animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      {...props}
    />
  );
}
