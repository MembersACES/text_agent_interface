"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode } from "react";

export type BadgeIntent =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  intent?: BadgeIntent;
  shape?: "default" | "pill";
  children: ReactNode;
}

const intentStyles: Record<BadgeIntent, string> = {
  success:
    "bg-green-light-6 text-green-dark border border-green-dark/30 dark:bg-green-dark/30 dark:text-green-light-2 dark:border-green-light-2",
  warning:
    "bg-yellow-light-4 text-yellow-dark-2 border border-yellow-dark-2/50 dark:bg-yellow-dark/30 dark:text-yellow-light dark:border-yellow-dark-2",
  danger:
    "bg-red-light-6 text-red-dark border border-red-dark/30 dark:bg-red/30 dark:text-red-light dark:border-red",
  info: "bg-blue-5 text-blue-dark border border-blue-dark/30 dark:bg-blue/30 dark:text-blue-light-2 dark:border-blue-dark",
  neutral:
    "bg-gray-3 text-dark-5 border border-gray-4 dark:bg-dark-3 dark:text-gray-5 dark:border-dark-3",
};

const shapeStyles = {
  default: "rounded-md",
  pill: "rounded-full",
};

export function Badge({
  className,
  intent = "neutral",
  shape = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-xs font-medium",
        shapeStyles[shape],
        intentStyles[intent],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
