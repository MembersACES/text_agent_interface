"use client";

import type { ClientStage } from "@/constants/crm";
import { CLIENT_STAGE_LABELS } from "@/constants/crm";

const base =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

export function StageBadge({ stage }: { stage: ClientStage }) {
  const s = stage.toLowerCase();

  if (s === "won") {
    return (
      <span
        className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`}
      >
        Won
      </span>
    );
  }
  if (s === "existing_client") {
    return (
      <span
        className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300`}
      >
        Existing Client
      </span>
    );
  }
  if (s === "lost") {
    return (
      <span
        className={`${base} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`}
      >
        Lost
      </span>
    );
  }
  if (s === "offer_sent") {
    return (
      <span
        className={`${base} bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300`}
      >
        Offer Sent
      </span>
    );
  }
  if (s === "analysis_in_progress") {
    return (
      <span
        className={`${base} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`}
      >
        Analysis In Progress
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200`}
    >
      {CLIENT_STAGE_LABELS[stage as keyof typeof CLIENT_STAGE_LABELS] ??
        stage.replace(/_/g, " ")}
    </span>
  );
}
