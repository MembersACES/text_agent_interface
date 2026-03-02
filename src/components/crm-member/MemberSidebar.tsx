"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "./shared/formatDate";
import { OFFER_ACTIVITY_LABELS } from "@/constants/crm";
import type { OfferActivityType } from "@/constants/crm";
import type { Client, Task, TimelineEvent } from "./types";

export interface MemberSidebarProps {
  client: Client;
  tasks: Task[];
  timelineEvents: TimelineEvent[];
  onAddTaskClick: () => void;
  businessInfo?: Record<string, unknown> | null;
}

export function MemberSidebar({
  client,
  tasks,
  timelineEvents,
  onAddTaskClick,
  businessInfo,
}: MemberSidebarProps) {
  const contact = (businessInfo as Record<string, unknown> | null | undefined)
    ?.contact_information as Record<string, unknown> | undefined;
  const phone = contact?.telephone ?? contact?.phone;
  const address = contact?.postal_address ?? contact?.site_address;

  return (
    <div className="space-y-4">
      {/* ── Contact ── single source of truth for contact details */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
            Contact
          </h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Email</dt>
              <dd>
                {client.primary_contact_email ? (
                  <a
                    href={`mailto:${client.primary_contact_email}`}
                    className="text-primary hover:underline break-all"
                  >
                    {client.primary_contact_email}
                  </a>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Phone</dt>
              <dd className="text-gray-700 dark:text-gray-300">
                {phone != null && String(phone).trim() !== "" ? String(phone) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Address</dt>
              <dd className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {address != null && String(address).trim() !== "" ? String(address) : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── Tasks ── */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Tasks
              {tasks.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs w-5 h-5 font-medium">
                  {tasks.length}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
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
            </div>
          </div>
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
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
                    {t.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Activity ── */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Recent activity
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Stage changes and offer activities.
          </p>
          {timelineEvents.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No timeline events yet.
            </p>
          ) : (
            <ul className="space-y-3 max-h-[280px] overflow-y-auto">
              {timelineEvents.slice(0, 5).map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-col gap-1 text-sm border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-1"
                >
                  {ev.type === "stage_change" ? (
                    <>
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        Stage change
                      </span>
                      {ev.note && (
                        <p className="text-gray-700 dark:text-gray-300">{ev.note}</p>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(ev.created_at)}
                        {ev.user_email && ` · ${ev.user_email.split("@")[0]}`}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {ev.activity_type
                          ? (OFFER_ACTIVITY_LABELS[
                              ev.activity_type as OfferActivityType
                            ] ?? ev.activity_type.replace(/_/g, " "))
                          : "Activity"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
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
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}