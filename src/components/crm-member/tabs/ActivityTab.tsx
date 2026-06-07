"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "../shared/SectionHeader";
import { formatDate } from "../shared/formatDate";
import {
  getOfferActivityEventVisual,
  getStageChangeEventVisual,
} from "../shared/activityEventTypes";
import { RECORD_ICON_CHIP } from "../shared/recordRowIcons";
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
    <Card className="p-0">
      <CardContent className="p-4 space-y-3">
        <SectionHeader
          title="Activity timeline"
          subtitle="Stage changes and offer activities for this member."
        />
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
          <EmptyState
            title="No activity recorded yet."
            className="py-6 items-start text-left [&_h3]:text-sm [&_h3]:font-normal [&_h3]:text-gray-500 [&_h3]:dark:text-gray-400 [&_h3]:mb-0"
          />
        ) : (
          <ul className="space-y-3 max-h-[480px] overflow-y-auto">
            {filteredEvents.map((ev) => {
              if (ev.type === "stage_change") {
                const visual = getStageChangeEventVisual();
                const StageIcon = visual.icon;
                return (
                  <li
                    key={ev.id}
                    className={cn(
                      "flex flex-col gap-1 rounded-r-md border-l-2 py-1 pl-3 text-sm transition-colors duration-[120ms] hover:bg-gray-2/70 dark:hover:bg-dark-2/50",
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
                        <StageIcon className="h-3 w-3" aria-hidden />
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        Stage change
                      </span>
                    </div>
                    {ev.note && (
                      <p className="text-gray-700 dark:text-gray-300">{ev.note}</p>
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
              const visual = getOfferActivityEventVisual(activityType);
              const ActivityIcon = visual.icon;

              return (
                <li
                  key={ev.id}
                  className={cn(
                    "flex flex-col gap-1 rounded-r-md border-l-2 py-1 pl-3 text-sm transition-colors duration-[120ms] hover:bg-gray-2/70 dark:hover:bg-dark-2/50",
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
                      <ActivityIcon className="h-3 w-3" aria-hidden />
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {label || "Activity"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(ev.created_at)}
                    {ev.created_by && ` · ${ev.created_by}`}
                  </span>
                  {(ev.offer_id != null || ev.document_link) && (
                    <div className="flex flex-wrap items-center gap-2">
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
