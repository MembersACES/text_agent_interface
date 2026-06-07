"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { ReactNode, useState } from "react";

interface CollapsiblePanelProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  className?: string;
}

export function CollapsiblePanel({
  title,
  description,
  children,
  defaultOpen = true,
  badge,
  className,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray/30 dark:hover:bg-dark-3/30"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-dark dark:text-white">
              {title}
            </p>
            {badge}
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-gray-500 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-stroke px-4 py-4 dark:border-dark-3">
          {children}
        </div>
      )}
    </div>
  );
}
