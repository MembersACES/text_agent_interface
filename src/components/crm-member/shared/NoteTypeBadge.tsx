"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const typeStyles: Record<string, string> = {
  general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700",
  call: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  email: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  meeting: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  status_update:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

export function NoteTypeBadge({ noteType }: { noteType: string }) {
  const style =
    typeStyles[noteType] ?? typeStyles.general;

  return (
    <Badge shape="pill" className={cn("capitalize", style)}>
      {noteType === "status_update" ? "Status update" : noteType || "general"}
    </Badge>
  );
}
