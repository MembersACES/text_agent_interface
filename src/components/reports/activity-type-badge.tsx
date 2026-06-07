import { activityTypeLabel } from "@/lib/activity-display";
import { cn } from "@/lib/utils";

function badgeTone(type: string): string {
  if (type === "client_manual_activity" || type === "note_added") {
    return "bg-gray/80 text-gray-600 dark:bg-dark-3 dark:text-gray-300";
  }
  return "bg-primary/10 text-primary dark:bg-primary/15";
}

export function ActivityTypeBadge({ type }: { type: string }) {
  return (
        <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        badgeTone(type),
      )}
      title={activityTypeLabel(type)}
    >
      {activityTypeLabel(type)}
    </span>
  );
}
