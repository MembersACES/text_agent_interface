"use client";

import {
  OFFER_STATUS_LABELS,
  type OfferStatus,
} from "@/constants/crm";
import { Badge, type BadgeIntent } from "@/components/ui/badge";

const statusIntents: Record<string, BadgeIntent> = {
  requested: "warning",
  awaiting_response: "info",
  response_received: "info",
  autonomous_agent_trigger: "info",
  autonomous_agent_stopped: "warning",
  accepted: "success",
  lost: "danger",
};

export function OfferStatusBadge({ status }: { status: string }) {
  const label =
    OFFER_STATUS_LABELS[status as OfferStatus] ?? status.replace(/_/g, " ");
  const intent = statusIntents[status] ?? "neutral";

  return (
    <Badge intent={intent} shape="pill">
      {label}
    </Badge>
  );
}
