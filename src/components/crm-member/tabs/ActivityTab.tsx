"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "../shared/formatDate";
import { OFFER_ACTIVITY_LABELS } from "@/constants/crm";
import type { OfferActivityType } from "@/constants/crm";
import type { TimelineEvent } from "../types";

export interface ActivityTabProps {
  timelineEvents: TimelineEvent[];
}

type FilterKind = "all" | "stage_change" | string;

export function ActivityTab({ timelineEvents }: ActivityTabProps) {
  const [filter, setFilter] = useState<FilterKind>("all");

  const activityTypesInData = useMemo(() => {
    const set = new Set<string>();
    timelineEvents.forEach((ev) => {
      if (ev.type === "offer_activity" && ev.activity_type) {
        set.add(ev.activity_type);
      }
    });
    return Array.from(set).sort();
  }, [timelineEvents]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return timelineEvents;
    if (filter === "stage_change") {
      return timelineEvents.filter((ev) => ev.type === "stage_change");
    }
    return timelineEvents.filter(
      (ev) => ev.type === "offer_activity" && ev.activity_type === filter
    );
  }, [timelineEvents, filter]);

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardContent className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Activity timeline
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Stage changes and offer activities for this member.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("stage_change")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === "stage_change"
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Stage changes
          </button>
          {activityTypesInData.map((activityType) => {
            const label =
              OFFER_ACTIVITY_LABELS[activityType as OfferActivityType] ??
              activityType.replace(/_/g, " ");
            return (
              <button
                key={activityType}
                type="button"
                onClick={() => setFilter(activityType)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === activityType
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {filteredEvents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No activity recorded yet.
          </p>
        ) : (
          <ul className="space-y-3 max-h-[480px] overflow-y-auto">
            {filteredEvents.map((ev) => {
              if (ev.type === "stage_change") {
                return (
                  <li
                    key={ev.id}
                    className="flex flex-col gap-1 text-sm border-l-2 border-blue-200 dark:border-blue-600 pl-3 py-1"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      Stage change
                    </span>
                    {ev.note && (
                      <p className="text-gray-700 dark:text-gray-300">
                        {ev.note}
                      </p>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(ev.created_at)}
                      {ev.user_email && ` · ${ev.user_email.split("@")[0]}`}
                    </span>
                  </li>
                );
              }

              const activityType = ev.activity_type ?? "";
              const label =
                OFFER_ACTIVITY_LABELS[activityType as OfferActivityType] ??
                activityType.replace(/_/g, " ");

              return (
                <li
                  key={ev.id}
                  className="flex flex-col gap-1 text-sm border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-1"
                >
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {label || "Activity"}
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
                          Open document
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
