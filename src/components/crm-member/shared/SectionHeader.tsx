"use client";

import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
  titleClassName?: string;
}

const titleStyles = {
  h1: "text-[18px] font-medium text-gray-900 dark:text-gray-100",
  h2: "text-sm font-semibold text-gray-800 dark:text-gray-100",
  h3: "text-sm font-semibold text-gray-900 dark:text-gray-100",
};

export function SectionHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  as = "h2",
  className,
  titleClassName,
}: SectionHeaderProps) {
  const Tag = as;

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Tag className={cn(titleStyles[as], titleClassName)}>{title}</Tag>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
