"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function SlideOverPanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: SlideOverPanelProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slide-over-title"
    >
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-md flex flex-col bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700",
          className
        )}
      >
        <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2
              id="slide-over-title"
              className="text-sm font-semibold text-gray-800 dark:text-gray-100"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer != null && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
