"use client";

import { FileSpreadsheet, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { INVOICING_DRIVE_CATEGORIES } from "@/lib/invoicing-drive-categories";

export type InvoicingViewMode = "sheets" | "documents";

type Props = {
  mode: InvoicingViewMode;
  onChange: (mode: InvoicingViewMode) => void;
  sheetStats?: {
    sheets: number;
    categories: number;
    tabs: number;
  };
};

const OPTIONS: Array<{
  id: InvoicingViewMode;
  label: string;
  description: string;
  icon: typeof FileSpreadsheet;
}> = [
  {
    id: "sheets",
    label: "Sheets",
    description: "Google Sheets workbooks, tabs, and reconciliation views",
    icon: FileSpreadsheet,
  },
  {
    id: "documents",
    label: "Documents",
    description: "Invoice PDFs from Drive, organised by category and business",
    icon: FolderOpen,
  },
];

export function InvoicingModeToggle({ mode, onChange, sheetStats }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map((opt) => {
        const isActive = mode === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-all",
              isActive
                ? "border-indigo-600 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40 dark:ring-indigo-500/20"
                : "border-stroke bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-500 dark:bg-dark-3 dark:text-gray-400"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-bold",
                      isActive
                        ? "text-indigo-900 dark:text-indigo-100"
                        : "text-dark dark:text-white"
                    )}
                  >
                    {opt.label}
                  </span>
                  {isActive ? (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Active
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "mt-0.5 text-xs leading-snug",
                    isActive
                      ? "text-indigo-800/80 dark:text-indigo-200/80"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {opt.description}
                </p>
                {opt.id === "sheets" && sheetStats ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <ModeStat label="Sheets" value={sheetStats.sheets} active={isActive} />
                    <ModeStat
                      label="Categories"
                      value={sheetStats.categories}
                      active={isActive}
                    />
                    <ModeStat label="Tabs" value={sheetStats.tabs} active={isActive} />
                  </div>
                ) : null}
                {opt.id === "documents" ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <ModeStat
                      label="Categories"
                      value={INVOICING_DRIVE_CATEGORIES.length}
                      active={isActive}
                    />
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
                        isActive
                          ? "bg-white/80 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
                          : "bg-gray-100 text-gray-600 dark:bg-dark-3 dark:text-gray-400"
                      )}
                    >
                      Drive invoices
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ModeStat({
  label,
  value,
  active,
}: {
  label: string;
  value: number;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 rounded-md px-2 py-0.5 text-[11px]",
        active
          ? "bg-white/80 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-100"
          : "bg-gray-100 text-gray-700 dark:bg-dark-3 dark:text-gray-300"
      )}
    >
      <span className="font-bold tabular-nums">{value}</span>
      <span className="uppercase tracking-wide opacity-70">{label}</span>
    </span>
  );
}
