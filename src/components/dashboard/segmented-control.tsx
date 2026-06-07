"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  sublabel?: string;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "default";
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = "default",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex gap-0 rounded-lg bg-gray-2 p-1 dark:bg-dark-2",
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              active
                ? "bg-white text-dark shadow-sm dark:bg-gray-dark dark:text-white"
                : "text-gray-600 hover:text-dark dark:text-gray-400 dark:hover:text-white",
            )}
          >
            <span className="block">{opt.label}</span>
            {opt.sublabel && (
              <span
                className={cn(
                  "block text-[10px] font-normal",
                  active
                    ? "text-gray-500 dark:text-gray-400"
                    : "text-gray-400 dark:text-gray-500",
                )}
              >
                {opt.sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
