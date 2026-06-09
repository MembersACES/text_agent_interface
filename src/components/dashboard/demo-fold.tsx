"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { ReactNode, useState } from "react";

interface DemoFoldProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function DemoFold({
  title,
  description,
  children,
  defaultOpen = false,
  className,
}: DemoFoldProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-stroke bg-canvas/50 dark:border-dark-3 dark:bg-dark-2/30",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/60 dark:hover:bg-gray-dark/40"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-dark dark:text-white">
            {title}
          </p>
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
      {open && <div className="border-t border-dashed border-stroke px-4 py-4 dark:border-dark-3">{children}</div>}
    </div>
  );
}
