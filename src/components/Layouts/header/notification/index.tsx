"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  activityHref,
  activityTypeLabel,
  formatActivityTimestamp,
  mergeActivityFeed,
  type ActivityListItem,
} from "@/lib/activity-display";
import { cn, getApiBaseUrl } from "@/lib/utils";
import { useSession } from "next-auth/react";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  FileText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BellIcon } from "./icons";

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  status: string;
  created_at: string;
}

type NotificationTab = "all" | "tasks" | "activity";

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "text-semantic-ok";
    case "in_progress":
      return "text-primary";
    case "pending":
    case "not_started":
      return "text-semantic-flag";
    default:
      return "text-gray-500";
  }
}

function formatTaskDue(dateString: string) {
  if (!dateString) return "No due date";
  try {
    const due = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / 86_400_000);
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return due.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
  } catch {
    return "No due date";
  }
}

function activityIcon(type: string) {
  if (type.includes("testimonial")) return Sparkles;
  if (type.includes("task")) return ClipboardList;
  return FileText;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
      {children}
    </p>
  );
}

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<NotificationTab>("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ||
    (session as { id_token?: string; accessToken?: string })?.accessToken;

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    const base = getApiBaseUrl();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      const mineQuery = "mine=true&limit=12";
      const [tasksRes, offerActRes, taskActRes, manualActRes] = await Promise.all([
        fetch(`${base}/api/tasks/my`, { headers }),
        fetch(`${base}/api/reports/activities/list?${mineQuery}`, { headers }),
        fetch(`${base}/api/reports/activities/tasks?${mineQuery}`, { headers }),
        fetch(`${base}/api/reports/activities/client-manual?${mineQuery}`, { headers }),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const list = (Array.isArray(data) ? data : []) as Task[];
        const pending = list
          .filter((t) => t.status.toLowerCase() !== "completed" && t.status.toLowerCase() !== "cancelled")
          .sort((a, b) => {
            const aDue = new Date(a.due_date || a.created_at).getTime();
            const bDue = new Date(b.due_date || b.created_at).getTime();
            return aDue - bDue;
          })
          .slice(0, 5);
        setTasks(pending);
      } else {
        setTasks([]);
      }

      const activityBatches: ActivityListItem[][] = [];
      for (const res of [offerActRes, taskActRes, manualActRes]) {
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) activityBatches.push(list);
        }
      }
      setActivities(mergeActivityFeed(activityBatches, 6));
    } catch {
      setTasks([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void fetchNotifications();
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (isOpen && token) void fetchNotifications();
  }, [isOpen, token, fetchNotifications]);

  const unreadCount = tasks.length;
  const showTasks = tab === "all" || tab === "tasks";
  const showActivity = tab === "all" || tab === "activity";

  const tabOptions = useMemo(
    () => [
      { value: "all" as const, label: "All" },
      { value: "tasks" as const, label: "Tasks", sublabel: tasks.length > 0 ? String(tasks.length) : undefined },
      { value: "activity" as const, label: "Activity", sublabel: activities.length > 0 ? String(activities.length) : undefined },
    ],
    [tasks.length, activities.length],
  );

  const isEmpty =
    !loading &&
    ((showTasks && showActivity && tasks.length === 0 && activities.length === 0) ||
      (tab === "tasks" && tasks.length === 0) ||
      (tab === "activity" && activities.length === 0));

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stroke bg-gray/50 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white"
        aria-label="Open notification center"
      >
        <span className="relative">
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 z-1 flex size-4 items-center justify-center rounded-full bg-semantic-block text-[9px] font-bold text-white ring-2 ring-white dark:ring-gray-dark">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        align={isMobile ? "end" : "end"}
        className="border border-stroke bg-white p-0 shadow-lg dark:border-dark-3 dark:bg-gray-dark w-[min(100vw-2rem,22rem)]"
      >
        <div className="border-b border-stroke px-3.5 py-3 dark:border-dark-3">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-dark dark:text-white">
              Notifications
            </span>
            {(tasks.length > 0 || activities.length > 0) && !loading && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {tasks.length + activities.length} recent
              </span>
            )}
          </div>
          <div className="flex w-full rounded-lg bg-gray-2 p-1 dark:bg-dark-2" role="tablist">
            {tabOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={tab === opt.value}
                onClick={() => setTab(opt.value)}
                className={cn(
                  "flex-1 rounded-md py-1 text-xs font-medium transition-all",
                  tab === opt.value
                    ? "bg-white text-dark shadow-sm dark:bg-gray-dark dark:text-white"
                    : "text-gray-600 hover:text-dark dark:text-gray-400",
                )}
              >
                {opt.label}
                {opt.sublabel != null && (
                  <span className="ml-1 text-[10px] opacity-70">({opt.sublabel})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto px-2 py-1">
          {loading ? (
            <p className="px-2 py-6 text-center text-sm text-gray-500">Loading…</p>
          ) : isEmpty ? (
            <div className="px-2 py-8 text-center">
              <Activity className="mx-auto mb-2 size-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-dark dark:text-white">All caught up</p>
              <p className="mt-0.5 text-xs text-gray-500">No pending tasks or activity from you yet</p>
            </div>
          ) : (
            <>
              {showTasks && tasks.length > 0 && (
                <div>
                  {tab === "all" && <SectionLabel>Tasks</SectionLabel>}
                  <ul className="space-y-0.5">
                    {tasks.map((task) => (
                      <li key={task.id}>
                        <Link
                          href="/tasks"
                          onClick={() => setIsOpen(false)}
                          className="flex gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-gray/50 dark:hover:bg-dark-3"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ClipboardList className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="truncate text-sm font-medium text-dark dark:text-white">
                                {task.title}
                              </span>
                              <span className={cn("shrink-0 text-[10px] font-semibold capitalize", getStatusColor(task.status))}>
                                {task.status.replace(/_/g, " ")}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                              {formatTaskDue(task.due_date || task.created_at)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showActivity && activities.length > 0 && (
                <div>
                  {tab === "all" && <SectionLabel>Your activity</SectionLabel>}
                  <ul className="space-y-0.5">
                    {activities.map((item) => {
                      const Icon = activityIcon(item.activity_type);
                      return (
                        <li key={`${item.activity_type}-${item.id}`}>
                          <Link
                            href={activityHref(item)}
                            onClick={() => setIsOpen(false)}
                            className="flex gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-gray/50 dark:hover:bg-dark-3"
                          >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-disclosure/10 text-brand-disclosure">
                              <Icon className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-dark dark:text-white">
                                {activityTypeLabel(item.activity_type)}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                                {item.business_name || item.offer_display || "Activity"}
                              </span>
                            </span>
                            <span className="shrink-0 self-start text-[10px] text-gray-400">
                              {formatActivityTimestamp(item.created_at)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-stroke p-2.5 dark:border-dark-3">
          <Link
            href="/tasks"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-stroke px-2 py-2 text-xs font-semibold text-dark transition-colors hover:bg-gray/50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            All tasks
            <ArrowRight className="size-3" />
          </Link>
          <Link
            href="/reports/activities"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Activity report
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
