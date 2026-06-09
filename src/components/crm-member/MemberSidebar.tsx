"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./shared/SectionHeader";
import {
  getOfferActivityEventVisual,
  getStageChangeEventVisual,
} from "./shared/activityEventTypes";
import { RECORD_ICON_CHIP } from "./shared/recordRowIcons";
import { formatDate } from "./shared/formatDate";
import { OFFER_ACTIVITY_LABELS } from "@/constants/crm";
import type { OfferActivityType } from "@/constants/crm";
import type { Client, Task, TimelineEvent } from "./types";

export interface MemberSidebarProps {
  client: Client;
  tasks: Task[];
  timelineEvents: TimelineEvent[];
  onAddTaskClick: () => void;
  onDeleteTask: (taskId: number) => Promise<void> | void;
  deletingTaskId?: number | null;
  businessInfo?: Record<string, unknown> | null;
}

export function MemberSidebar({
  client,
  tasks,
  timelineEvents,
  onAddTaskClick,
  onDeleteTask,
  deletingTaskId = null,
  businessInfo,
}: MemberSidebarProps) {
  const contact = (businessInfo as Record<string, unknown> | null | undefined)
    ?.contact_information as Record<string, unknown> | undefined;
  const phone = contact?.telephone ?? contact?.phone;
  const address = contact?.postal_address ?? contact?.site_address;
  const repName = (businessInfo as Record<string, unknown> | null | undefined)
    ?.representative_details as { contact_name?: string } | undefined;
  const contactInitials = (() => {
    const name = repName?.contact_name?.trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (client.primary_contact_email) {
      return client.primary_contact_email.slice(0, 2).toUpperCase();
    }
    return "—";
  })();

  return (
    <div className="min-w-0 space-y-4">
      {/* ── Contact ── */}
      <Card className="rounded-xl border border-gray-200/80 dark:border-dark-3 bg-white dark:bg-dark-2 shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-700/50 overflow-hidden">
        <CardContent className="min-w-0 p-4">
          <SectionHeader title="Contact" className="mb-3" />
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary dark:bg-primary/20">
              {contactInitials}
            </div>
            <div className="min-w-0 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {repName?.contact_name || client.business_name || "Contact"}
            </div>
          </div>
          <dl className="min-w-0 space-y-2 text-sm">
            <div className="min-w-0">
              <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Email</dt>
              <dd className="min-w-0">
                {client.primary_contact_email ? (
                  <a
                    href={`mailto:${client.primary_contact_email}`}
                    title={client.primary_contact_email}
                    className="block truncate text-primary hover:underline"
                  >
                    {client.primary_contact_email}
                  </a>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">—</span>
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Phone</dt>
              <dd className="truncate text-gray-700 dark:text-gray-300">
                {phone != null && String(phone).trim() !== "" ? String(phone) : "—"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Address</dt>
              <dd className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {address != null && String(address).trim() !== "" ? String(address) : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── Tasks ── */}
      <Card className="rounded-xl border border-gray-200/80 dark:border-dark-3 bg-white dark:bg-dark-2 shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-700/50 overflow-hidden">
        <CardContent className="min-w-0 p-4">
          <SectionHeader
            title="Tasks"
            className="mb-3"
            badge={
              tasks.length > 0 ? (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {tasks.length}
                </span>
              ) : undefined
            }
            actions={
              <>
                <button
                  type="button"
                  onClick={onAddTaskClick}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Add task
                </button>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <Link
                  href="/tasks"
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  Open Tasks
                </Link>
              </>
            }
          />
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No tasks linked to this client yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 -mx-4 px-4">
              {tasks.slice(0, 3).map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 py-2 text-sm first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {t.title}
                    </p>
                    {t.due_date && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Due {formatDate(t.due_date)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {t.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(t.id)}
                      disabled={deletingTaskId === t.id}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Delete task"
                    >
                      {deletingTaskId === t.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Activity ── */}
      <Card className="rounded-xl border border-gray-200/80 dark:border-dark-3 bg-white dark:bg-dark-2 shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-700/50 overflow-hidden">
        <CardContent className="min-w-0 p-4">
          <SectionHeader
            title="Recent activity"
            subtitle="Stage changes and offer activities."
            className="mb-3"
            actions={
              timelineEvents.length > 0 ? (
                <Link
                  href="?tab=activity"
                  scroll={false}
                  className="shrink-0 text-xs font-semibold text-primary hover:underline"
                >
                  View all
                </Link>
              ) : undefined
            }
          />
          {timelineEvents.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No timeline events yet.
            </p>
          ) : (
            <ul className="min-w-0 space-y-3 max-h-[280px] overflow-y-auto">
              {timelineEvents.slice(0, 5).map((ev) => {
                const visual =
                  ev.type === "stage_change"
                    ? getStageChangeEventVisual()
                    : getOfferActivityEventVisual(ev.activity_type ?? "");
                const EventIcon = visual.icon;
                return (
                <li
                  key={ev.id}
                  className={cn(
                    "min-w-0 flex flex-col gap-1 rounded-r-md border-l-2 py-1 pl-3 text-sm",
                    visual.borderClass
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", visual.dotClass)} />
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                        RECORD_ICON_CHIP[visual.iconIntent]
                      )}
                    >
                      <EventIcon className="h-3 w-3" aria-hidden />
                    </span>
                    <span className="truncate font-medium text-gray-800 dark:text-gray-100">
                      {ev.type === "stage_change"
                        ? "Stage change"
                        : ev.activity_type
                          ? (OFFER_ACTIVITY_LABELS[
                              ev.activity_type as OfferActivityType
                            ] ?? ev.activity_type.replace(/_/g, " "))
                          : "Activity"}
                    </span>
                  </div>
                  {ev.type === "stage_change" ? (
                    <>
                      {ev.note && (
                        <p className="break-words text-gray-700 dark:text-gray-300">{ev.note}</p>
                      )}
                      <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(ev.created_at)}
                        {ev.user_email && ` · ${ev.user_email.split("@")[0]}`}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(ev.created_at)}
                        {ev.created_by && ` · ${ev.created_by}`}
                      </span>
                      {(ev.offer_id != null || ev.document_link) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {ev.offer_id != null && (
                            <Link
                              href={`/offers/${ev.offer_id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              View offer
                            </Link>
                          )}
                          {ev.document_link && (
                            <a
                              href={ev.document_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Document
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}