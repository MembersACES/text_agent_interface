"use client";

const base =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize";

const typeStyles: Record<string, string> = {
  general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  call: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  email: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  meeting: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  status_update:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export function NoteTypeBadge({ noteType }: { noteType: string }) {
  const style =
    typeStyles[noteType] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

  return (
    <span className={`${base} ${style}`}>
      {noteType === "status_update" ? "Status update" : noteType || "general"}
    </span>
  );
}
