"use client";

import type { ReactNode } from "react";

interface BusinessInfoRowProps {
  label: string;
  value: ReactNode;
}

export function BusinessInfoRow({ label, value }: BusinessInfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm py-0.5">
      <div className="min-w-[140px] font-medium text-gray-700 dark:text-gray-300">
        {label}
      </div>
      <div className="flex-1 text-gray-900 dark:text-gray-100 break-words">
        {value ?? <span className="text-gray-400 dark:text-gray-500">—</span>}
      </div>
    </div>
  );
}

