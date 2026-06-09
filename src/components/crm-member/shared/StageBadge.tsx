"use client";

import type { ClientStage } from "@/constants/crm";
import { CLIENT_STAGE_LABELS } from "@/constants/crm";
import { Badge, type BadgeIntent } from "@/components/ui/badge";

function stageIntent(stage: string): BadgeIntent {
  const s = stage.toLowerCase();

  if (s === "won" || s === "existing_client") return "success";
  if (s === "lost") return "danger";
  if (s === "offer_sent" || s === "analysis_in_progress") return "info";

  return "neutral";
}

function stageLabel(stage: ClientStage): string {
  if (stage.toLowerCase() === "offer_sent") return "Offer Sent";
  if (stage.toLowerCase() === "analysis_in_progress") return "Analysis In Progress";

  return (
    CLIENT_STAGE_LABELS[stage as keyof typeof CLIENT_STAGE_LABELS] ??
    stage.replace(/_/g, " ")
  );
}

export function StageBadge({ stage }: { stage: ClientStage }) {
  return (
    <Badge intent={stageIntent(stage)} className="font-semibold">
      {stageLabel(stage)}
    </Badge>
  );
}
