"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Circle, Film, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoPipelineProgress, VideoProgressStep } from "@/lib/video-pipeline";
import { STEP_HINTS } from "@/lib/video-pipeline";

type Stage = "starting" | "processing" | "error";

type Props = {
  stage: Stage;
  videoLabel?: string | null;
  errorMessage?: string | null;
  statusMessage?: string | null;
  progress?: VideoPipelineProgress | null;
  onDismiss?: () => void;
  onRestart?: () => void;
  restarting?: boolean;
  className?: string;
};

function StepIcon({ status }: { status: VideoProgressStep["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />;
  if (status === "running") return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
  if (status === "failed") return <XCircle className="h-4 w-4 shrink-0 text-red-600" />;
  return <Circle className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />;
}

export function VideoCreationProgressPanel({
  stage,
  videoLabel,
  errorMessage,
  statusMessage,
  progress,
  onDismiss,
  onRestart,
  restarting = false,
  className,
}: Props) {
  if (stage === "error") {
    return (
      <div
        className={cn(
          "rounded-xl border-2 border-red-300/60 dark:border-red-800 bg-red-50/80 dark:bg-red-950/30 p-8",
          className
        )}
        role="alert"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <AlertCircle className="h-12 w-12 text-red-600 shrink-0" />
          <div className="space-y-2 max-w-md">
            <p className="text-base font-semibold text-dark dark:text-white">
              Could not start video creation
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {errorMessage?.trim() ||
                "Something went wrong while setting up this video. Please try again or contact support."}
            </p>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-sm font-medium text-primary hover:underline"
            >
              Back to create video
            </button>
          )}
        </div>
      </div>
    );
  }

  const title =
    stage === "starting"
      ? "Starting your video…"
      : videoLabel
        ? `Creating video for ${videoLabel}`
        : "Creating your video…";

  const steps = progress?.steps ?? [];
  const runningStep = steps.find((s) => s.status === "running");
  const stepHint = runningStep?.id ? STEP_HINTS[runningStep.id] : null;
  const subtitle =
    progress?.stale_message?.trim() ||
    statusMessage?.trim() ||
    runningStep?.label ||
    (stage === "starting"
      ? "Registering your testimonial and preparing the render pipeline."
      : "Generating both video cuts and a quality review. This page updates automatically when everything is ready to review.");

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 p-8",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center gap-5 py-2">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <Loader2 className="h-14 w-14 animate-spin text-primary/30 absolute" />
          <Film className="h-8 w-8 text-primary relative" />
        </div>
        <div className="space-y-2 max-w-lg">
          <p className="text-lg font-semibold text-dark dark:text-white">{title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          {runningStep?.detail && (
            <p className="text-xs text-gray-500 dark:text-gray-500">{runningStep.detail}</p>
          )}
          {stepHint && runningStep && (
            <p className="text-xs text-gray-500 dark:text-gray-500">{stepHint}</p>
          )}
          {progress?.updated_at && (
            <p className="text-[11px] text-gray-400">
              Last update {new Date(progress.updated_at).toLocaleTimeString()}
            </p>
          )}
        </div>

        {progress?.stale && (
          <div className="w-full max-w-md space-y-3">
            <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/40 px-4 py-3 text-left text-xs text-amber-900 dark:text-amber-100">
              {progress.stale_message ||
                "Progress may be stale. Ensure the render service (port 8001) is running and try again if nothing changes."}
            </div>
            {onRestart && (
              <button
                type="button"
                onClick={onRestart}
                disabled={restarting}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {restarting ? "Restarting pipeline…" : "Restart pipeline"}
              </button>
            )}
          </div>
        )}

        {steps.length > 0 && (
          <div className="w-full max-w-md text-left rounded-lg border border-stroke/80 dark:border-dark-3 bg-white/70 dark:bg-gray-dark/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Progress
            </p>
            <ul className="space-y-2.5">
              {steps.map((step) => (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-start gap-2.5 text-sm",
                    step.status === "running" && "font-medium text-dark dark:text-white",
                    step.status === "pending" && "text-gray-400 dark:text-gray-500",
                    step.status === "done" && "text-gray-700 dark:text-gray-300",
                    step.status === "failed" && "text-red-700 dark:text-red-300"
                  )}
                >
                  <span className="mt-0.5">
                    <StepIcon status={step.status} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{step.label}</span>
                    {step.detail && step.status !== "running" && (
                      <span className="block text-xs text-gray-500 dark:text-gray-500 truncate">
                        {step.detail.startsWith("cached") ? step.detail.replace(/^cached — /, "✓ ") : step.detail}
                      </span>
                    )}
                    {step.status === "running" && step.id && STEP_HINTS[step.id] && (
                      <span className="block text-xs text-gray-500 dark:text-gray-500">
                        {STEP_HINTS[step.id]}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stage === "processing" && (
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Usually several minutes for rendering. You can keep this tab open — no need to refresh.
          </p>
        )}
      </div>
    </div>
  );
}
