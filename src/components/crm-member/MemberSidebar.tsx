"use client";

import Link from "next/link";
import { History, ListTodo, Mail, MapPin, Phone, StickyNote, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./shared/SectionHeader";
import { NoteTypeBadge } from "./shared/NoteTypeBadge";
import {
  MEMBER_CARD_BODY,
  MEMBER_CARD_HEADER,
  MEMBER_CARD_SHELL,
} from "./shared/memberCardShell";
import {
  getOfferActivityEventVisual,
  getStageChangeEventVisual,
} from "./shared/activityEventTypes";
import { RECORD_ICON_CHIP } from "./shared/recordRowIcons";
import { formatDate } from "./shared/formatDate";
import { OFFER_ACTIVITY_LABELS } from "@/constants/crm";
import type { OfferActivityType } from "@/constants/crm";
import type { Client, Note, Task, TimelineEvent } from "./types";

const NOTES_TAB_HREF = "?tab=activity&subtab=notes";
const SIDEBAR_NOTE_LIMIT = 3;
const SIDEBAR_TASK_LIMIT = 3;

export interface MemberSidebarProps {
  client: Client;
  notes: Note[];
  tasks: Task[];
  timelineEvents: TimelineEvent[];
  onAddTaskClick: () => void;
  onDeleteTask: (taskId: number) => Promise<void> | void;
  deletingTaskId?: number | null;
  businessInfo?: Record<string, unknown> | null;
}

function SidebarEmpty({
  icon,
  message,
  action,
}: {
  icon: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="mb-2 flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
        {icon}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

function getSidebarNotes(notes: Note[]): Note[] {
  return notes
    .filter((n) => n.note_type !== "status_update")
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function MemberSidebar({
  client,
  notes,
  tasks,
  timelineEvents,
  onAddTaskClick,
  onDeleteTask,
  deletingTaskId = null,
  businessInfo,
}: MemberSidebarProps) {
  const sidebarNotes = getSidebarNotes(notes);
  const hasNotes = sidebarNotes.length > 0;
  const hasTasks = tasks.length > 0;
  const followUpTitle =
    hasNotes && !hasTasks ? "Notes" : hasTasks && !hasNotes ? "Tasks" : "Notes & tasks";
  const FollowUpIcon = hasNotes && !hasTasks ? StickyNote : ListTodo;
  const followUpCount = sidebarNotes.length + tasks.length;
  const visibleNotes = sidebarNotes.slice(0, SIDEBAR_NOTE_LIMIT);
  const visibleTasks = tasks.slice(0, SIDEBAR_TASK_LIMIT);

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
      <Card className={MEMBER_CARD_SHELL}>
        <SectionHeader
          className={MEMBER_CARD_HEADER}
          title="Contact"
          icon={<User className="size-4" aria-hidden />}
        />
        <div className={MEMBER_CARD_BODY}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-violet-50 text-sm font-semibold text-violet-800 dark:bg-violet-900/30 dark:text-violet-200">
              {contactInitials}
            </div>
            <div className="min-w-0 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {repName?.contact_name || client.business_name || "Contact"}
            </div>
          </div>
          <dl className="min-w-0 space-y-3 text-sm">
            <div className="min-w-0 flex gap-2.5">
              <Mail className="mt-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
              <div className="min-w-0 flex-1">
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
                    <span className="text-gray-400 dark:text-gray-500">Not available</span>
                  )}
                </dd>
              </div>
            </div>
            <div className="min-w-0 flex gap-2.5">
              <Phone className="mt-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Phone</dt>
                <dd className="truncate text-gray-800 dark:text-gray-200">
                  {phone != null && String(phone).trim() !== "" ? String(phone) : "Not available"}
                </dd>
              </div>
            </div>
            <div className="min-w-0 flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Address</dt>
                <dd className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                  {address != null && String(address).trim() !== "" ? String(address) : "Not available"}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </Card>

      <Card className={MEMBER_CARD_SHELL}>
        <SectionHeader
          className={MEMBER_CARD_HEADER}
          title={followUpTitle}
          icon={<FollowUpIcon className="size-4" aria-hidden />}
          badge={
            followUpCount > 0 ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {followUpCount}
              </span>
            ) : undefined
          }
          actions={
            <>
              <Link
                href={NOTES_TAB_HREF}
                scroll={false}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {hasNotes ? "View notes" : "Add note"}
              </Link>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <button
                type="button"
                onClick={onAddTaskClick}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Add task
              </button>
            </>
          }
        />
        <div className={cn(MEMBER_CARD_BODY, !hasNotes && !hasTasks && "pt-0")}>
          {!hasNotes && !hasTasks ? (
            <SidebarEmpty
              icon={<StickyNote className="size-4" aria-hidden />}
              message="No notes or tasks for this member yet."
              action={
                <div className="flex items-center gap-2">
                  <Link
                    href={NOTES_TAB_HREF}
                    scroll={false}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Add a note
                  </Link>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <button
                    type="button"
                    onClick={onAddTaskClick}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Add a task
                  </button>
                </div>
              }
            />
          ) : (
            <div className="space-y-4">
              {hasNotes ? (
                <div className="space-y-2.5">
                  {hasTasks ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Notes
                    </p>
                  ) : null}
                  <ul className="space-y-2.5">
                    {visibleNotes.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800/60"
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <NoteTypeBadge noteType={n.note_type || "general"} />
                          <span className="ml-auto shrink-0 text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(n.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-gray-100">
                          {n.note}
                        </p>
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          {n.user_email.split("@")[0]}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {sidebarNotes.length > SIDEBAR_NOTE_LIMIT ? (
                    <Link
                      href={NOTES_TAB_HREF}
                      scroll={false}
                      className="inline-block text-xs font-semibold text-primary hover:underline"
                    >
                      View all {sidebarNotes.length} notes
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {hasTasks ? (
                <div>
                  {hasNotes ? (
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Tasks
                    </p>
                  ) : null}
                  <ul
                    className={cn(
                      "divide-y divide-gray-100 dark:divide-gray-800",
                      hasNotes ? "rounded-lg border border-gray-200 dark:border-gray-700 px-3" : "-mx-5 px-5"
                    )}
                  >
                    {visibleTasks.map((t) => (
                      <li
                        key={t.id}
                        className={cn(
                          "flex items-start justify-between gap-3 py-2.5 text-sm",
                          !hasNotes && "first:pt-0"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                            {t.title}
                          </p>
                          {t.due_date && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Due {formatDate(t.due_date)}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                            {t.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(t.id)}
                            disabled={deletingTaskId === t.id}
                            className="text-xs text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete task"
                          >
                            {deletingTaskId === t.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {tasks.length > SIDEBAR_TASK_LIMIT ? (
                    <Link
                      href="/tasks"
                      className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                    >
                      Open all {tasks.length} tasks
                    </Link>
                  ) : (
                    <Link
                      href="/tasks"
                      className="mt-2 inline-block text-xs text-gray-500 hover:underline dark:text-gray-400"
                    >
                      Open Tasks
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      <Card className={MEMBER_CARD_SHELL}>
        <SectionHeader
          className={MEMBER_CARD_HEADER}
          title="Recent activity"
          subtitle="Stage changes and offer activities."
          icon={<History className="size-4" aria-hidden />}
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
        <div className={cn(MEMBER_CARD_BODY, timelineEvents.length === 0 && "pt-0")}>
          {timelineEvents.length === 0 ? (
            <SidebarEmpty
              icon={<History className="size-4" aria-hidden />}
              message="No timeline events yet."
              action={
                <Link
                  href="?tab=activity"
                  scroll={false}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View activity tab
                </Link>
              }
            />
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
        </div>
      </Card>
    </div>
  );
}
