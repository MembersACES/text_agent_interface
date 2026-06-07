/** Recent member profile views — localStorage until a synced recent_views table exists. */

export interface RecentMemberView {
  businessName: string;
  clientId?: number | null;
  viewedAt: string;
}

const STORAGE_KEY = "aces-member-profile-recent";
const MAX_RECENT = 4;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getRecentMemberViews(): RecentMemberView[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentMemberView[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e?.businessName?.trim())
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function recordMemberProfileView(entry: Omit<RecentMemberView, "viewedAt"> & { viewedAt?: string }): void {
  if (!isBrowser()) return;
  const name = entry.businessName.trim();
  if (!name) return;

  const viewedAt = entry.viewedAt ?? new Date().toISOString();
  const next: RecentMemberView = {
    businessName: name,
    clientId: entry.clientId ?? null,
    viewedAt,
  };

  const existing = getRecentMemberViews().filter(
    (e) => e.businessName.toLowerCase() !== name.toLowerCase(),
  );
  const merged = [next, ...existing].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // quota or private mode — ignore
  }
}

export function getMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE = [
  "bg-primary/15 text-primary",
  "bg-brand-disclosure/15 text-brand-disclosure",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
] as const;

export function getMemberAvatarClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % AVATAR_PALETTE.length;
  }
  return AVATAR_PALETTE[hash];
}

export function formatRelativeViewed(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "Recently";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfThen.getTime()) / 86_400_000);

  if (dayDiff <= 0) return "Viewed today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return `${dayDiff} days ago`;
  if (dayDiff < 14) return "Last week";
  return then.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
