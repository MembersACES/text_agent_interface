"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import type { MarketingVideoRecord } from "@/lib/video-api";

type Props = {
  video: MarketingVideoRecord;
  className?: string;
};

export function VideoAwaitingPipelinePanel({ video, className }: Props) {
  return (
    <div
      className={`rounded-xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 p-8 ${className ?? ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="space-y-2 max-w-md">
          <p className="text-lg font-semibold text-dark dark:text-white">Creating your video</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your video for <strong>{video.business_name || video.slug}</strong> is being prepared. This page will
            show the player and quality review when both cuts are ready.
          </p>
        </div>
      </div>
    </div>
  );
}
