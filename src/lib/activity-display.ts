import {
  OFFER_ACTIVITY_LABELS,
  type OfferActivityType,
} from "@/constants/crm";

export interface ActivityListItem {
  id: number;
  offer_id: number;
  task_id?: number | null;
  client_id?: number | null;
  business_name?: string | null;
  activity_type: string;
  document_link?: string | null;
  created_at: string;
  created_by?: string | null;
  offer_display?: string | null;
  manual_activity_id?: number | null;
}

export function activityTypeLabel(type: string): string {
  if (type === "note_added") return "Note added";
  if (type === "task_created") return "Task created";
  if (type === "task_edited") return "Task edited";
  if (type === "task_completed") return "Task completed";
  if (type === "testimonial_activity") return "Testimonial activity";
  if (type === "client_manual_activity") return "Manual activity";
  return OFFER_ACTIVITY_LABELS[type as OfferActivityType] ?? type.replace(/_/g, " ");
}

export function formatActivityTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function activityHref(item: ActivityListItem): string {
  if (item.task_id) return "/tasks";
  if (item.client_id) return `/crm-members/${item.client_id}`;
  if (item.offer_id) return `/offers/${item.offer_id}`;
  return "/reports/activities";
}

export function mergeActivityFeed(
  batches: ActivityListItem[][],
  limit = 6,
): ActivityListItem[] {
  const seen = new Set<string>();
  const merged: ActivityListItem[] = [];
  for (const item of batches
    .flat()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )) {
    const key =
      item.manual_activity_id != null
        ? `manual-${item.manual_activity_id}`
        : `${item.activity_type}-${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}
