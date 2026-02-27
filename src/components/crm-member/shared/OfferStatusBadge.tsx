"use client";

import {
  OFFER_STATUS_LABELS,
  type OfferStatus,
} from "@/constants/crm";

const base =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

const statusStyles: Record<string, string> = {
  requested:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  awaiting_response:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  response_received:
    "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  accepted:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function OfferStatusBadge({ status }: { status: string }) {
  const label =
    OFFER_STATUS_LABELS[status as OfferStatus] ?? status.replace(/_/g, " ");
  const style = statusStyles[status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

  return <span className={`${base} ${style}`}>{label}</span>;
}
