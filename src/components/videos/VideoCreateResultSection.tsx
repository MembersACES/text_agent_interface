"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { VideoCreationProgressPanel } from "@/components/videos/VideoCreationProgressPanel";
import { VideoReviewWorkspace } from "@/components/videos/VideoReviewWorkspace";
import type { VideoPipelineResult, VideoRenderJob } from "@/lib/video-pipeline";
import { mergeVideoProgress } from "@/lib/video-pipeline";
import { fetchMarketingVideos, type MarketingVideoRecord } from "@/lib/video-api";
import { getApiBaseUrl } from "@/lib/utils";
import {
  filterVideosForSessionPack,
  isSessionPreviewReady,
  isSessionPublishComplete,
  isSessionRenderComplete,
  isVideoRendered,
  sortByVariant,
} from "@/lib/video-review";

type Props = {
  result?: VideoPipelineResult | null;
  loading?: boolean;
  loadingMessage?: string;
  videoLabel?: string | null;
  token?: string;
  onDismiss?: () => void;
  className?: string;
};

const FAILED_JOB_STATUSES = new Set([
  "failed",
  "enqueue_failed",
  "spawn_failed",
]);

const JOB_POLL_MS = 3_000;

function jobPollParams(result: VideoPipelineResult | null, renderJob: VideoRenderJob | null): URLSearchParams | null {
  if (!result?.slug) return null;
  const params = new URLSearchParams({ slug: result.slug });
  if (renderJob?.id?.trim()) params.set("job_id", renderJob.id.trim());
  return params;
}

export function VideoCreateResultSection({
  result,
  loading = false,
  loadingMessage,
  videoLabel,
  token,
  onDismiss,
  className,
}: Props) {
  const [videos, setVideos] = useState<MarketingVideoRecord[]>([]);
  const [renderJob, setRenderJob] = useState<VideoRenderJob | null>(result?.renderJob ?? null);
  const [restarting, setRestarting] = useState(false);

  const sessionPackUrl = result?.packFolderUrl?.trim() || null;
  const jobPoll = jobPollParams(result, renderJob);

  useEffect(() => {
    setRenderJob(result?.renderJob ?? null);
  }, [result?.renderJob]);

  const mergedProgress = useMemo(
    () => mergeVideoProgress(result?.progress, renderJob?.progress),
    [result?.progress, renderJob?.progress]
  );

  const loadVideos = useCallback(async () => {
    if (!token || !result?.slug) return;
    try {
      const rows = await fetchMarketingVideos(token, { slug: result.slug });
      setVideos(sortByVariant(rows));
    } catch {
      /* keep last good state */
    }
  }, [token, result?.slug]);

  const pollRenderJob = useCallback(async () => {
    if (!jobPoll || !token) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/videos/render-job?${jobPoll}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as VideoRenderJob;
      setRenderJob((prev) => ({
        ...prev,
        ...data,
        progress: data.progress ?? prev?.progress ?? null,
      }));
    } catch {
      /* ignore */
    }
  }, [jobPoll, token]);

  const restartPipeline = useCallback(async () => {
    if (!result?.slug || restarting) return;
    setRestarting(true);
    try {
      const fd = new FormData();
      fd.append("slug", result.slug);
      const res = await fetch("/api/videos/restart-pipeline", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.detail || "Restart failed");
      }
      setRenderJob((prev) => ({
        ...prev,
        ...(data.render_job ?? {}),
        status: data.render_job?.status ?? "running",
        message: data.message ?? data.render_job?.message ?? "Render pipeline restarted",
        progress: data.progress ?? data.render_job?.progress ?? prev?.progress ?? null,
      }));
    } catch (err) {
      setRenderJob((prev) => ({
        ...prev,
        status: "failed",
        error: err instanceof Error ? err.message : "Restart failed",
      }));
    } finally {
      setRestarting(false);
    }
  }, [result?.slug, restarting]);

  useEffect(() => {
    if (!result?.slug || !token) {
      setVideos([]);
      return;
    }
    loadVideos();
  }, [result?.slug, token, loadVideos]);

  useEffect(() => {
    if (!result?.slug || !token || !sessionPackUrl) return;
    if (isSessionPublishComplete(videos, sessionPackUrl)) return;
    const id = window.setInterval(loadVideos, 15_000);
    return () => window.clearInterval(id);
  }, [result?.slug, token, sessionPackUrl, videos, loadVideos]);

  useEffect(() => {
    if (!jobPoll || !result?.slug || !token) return;
    if (renderJob?.status && !FAILED_JOB_STATUSES.has(renderJob.status) && renderJob.status === "completed") {
      return;
    }
    pollRenderJob();
    const id = window.setInterval(pollRenderJob, JOB_POLL_MS);
    return () => window.clearInterval(id);
  }, [jobPoll, result?.slug, token, renderJob?.status, pollRenderJob]);

  const sessionVideos = useMemo(
    () => filterVideosForSessionPack(videos, sessionPackUrl),
    [videos, sessionPackUrl]
  );

  const sessionReady = isSessionPublishComplete(videos, sessionPackUrl);
  const previewReady = isSessionPreviewReady(videos, sessionPackUrl, mergedProgress);
  const renderComplete = isSessionRenderComplete(mergedProgress);
  const earlyPreview = previewReady && !sessionReady && renderComplete;
  const progressFailure = mergedProgress?.steps?.find((s) => s.status === "failed");
  const jobFailed =
    (renderJob?.status && FAILED_JOB_STATUSES.has(renderJob.status)) ||
    renderJob?.status === "failed" ||
    Boolean(progressFailure);

  const progressProps = {
    progress: mergedProgress,
    statusMessage: renderJob?.message ?? null,
    onRestart: mergedProgress?.stale ? restartPipeline : undefined,
    restarting,
  };

  if (loading) {
    return (
      <VideoCreationProgressPanel
        stage="starting"
        videoLabel={videoLabel}
        statusMessage={loadingMessage}
        className={className}
      />
    );
  }

  if (!result) return null;

  if (result.packError && !sessionPackUrl) {
    return (
      <VideoCreationProgressPanel
        stage="error"
        errorMessage={result.packError}
        onDismiss={onDismiss}
        className={className}
      />
    );
  }

  if (jobFailed) {
    return (
      <VideoCreationProgressPanel
        stage="error"
        errorMessage={
          renderJob?.error ||
          progressFailure?.detail ||
          progressFailure?.label ||
          renderJob?.message ||
          "Video creation failed. Check the render service logs and try again."
        }
        progress={mergedProgress}
        onDismiss={onDismiss}
        className={className}
      />
    );
  }

  const activeId =
    result.videoIds?.find((id) => sessionVideos.some((v) => v.id === id)) ??
    sessionVideos.find((v) => v.variant === "long")?.id ??
    sessionVideos[0]?.id ??
    result.videoIds?.[0] ??
    0;

  if (previewReady && sessionVideos.length > 0 && activeId) {
    return (
      <div className={`space-y-4 ${className ?? ""}`}>
        {earlyPreview && (
          <div className="rounded-lg border border-sky-300 dark:border-sky-700 bg-sky-50/80 dark:bg-sky-950/30 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">
            Videos are playing from your local render while upload to Drive finishes — playback should be smooth.
            QA and pack links appear when publishing completes.
          </div>
        )}
        <VideoReviewWorkspace
          videos={sessionVideos}
          activeVideoId={activeId}
          sessionPackFolderUrl={sessionPackUrl}
          previewSlug={earlyPreview ? result.slug : undefined}
          previewKind={result.slug ? "testimonial" : undefined}
        />
        {onDismiss && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={onDismiss}
              className="font-medium text-primary hover:underline"
            >
              Create another video
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <VideoCreationProgressPanel
      stage="processing"
      videoLabel={videoLabel}
      className={className}
      {...progressProps}
    />
  );
}
