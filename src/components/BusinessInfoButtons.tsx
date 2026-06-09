import React from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none dark:focus:ring-offset-gray-dark";

export function PrimaryButton({
  children,
  className = "",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "default" | "sm";
}) {
  const sizeClass =
    size === "sm"
      ? "px-3 py-1.5 text-xs rounded-full gap-1.5"
      : "px-4 py-2 text-sm rounded-full gap-2";
  return (
    <button
      className={cn(
        base,
        sizeClass,
        "bg-gradient-to-br from-primary to-primary/85 text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md disabled:hover:translate-y-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "default" | "sm";
}) {
  const sizeClass =
    size === "sm"
      ? "px-3 py-1.5 text-xs rounded-full gap-1.5"
      : "px-4 py-2 text-sm rounded-full gap-2";
  return (
    <button
      className={cn(
        base,
        sizeClass,
        "border border-stroke bg-white text-dark hover:bg-gray/80 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-3",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Text/link-style button for low-emphasis actions (e.g. Edit, Delete on notes) */
export function LinkButton({
  children,
  className = "",
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  const colorClass = danger
    ? "text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-950/30"
    : "text-gray-600 hover:text-gray-900 hover:bg-gray/80 dark:text-gray-400 dark:hover:text-white dark:hover:bg-dark-3";
  return (
    <button
      className={cn(base, "rounded-full px-3 py-1.5 text-sm font-medium", colorClass, className)}
      {...props}
    >
      {children}
    </button>
  );
}
