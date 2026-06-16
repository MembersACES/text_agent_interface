"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useToast } from "@/components/ui/toast";
import { VideoReviewWorkspace } from "@/components/videos/VideoReviewWorkspace";
import {
  fetchMarketingVideo,
  fetchMarketingVideos,
  patchMarketingVideo,
  VIDEO_STATUS_LABELS,
  type MarketingVideoRecord,
} from "@/lib/video-api";
import { isSessionPublishComplete, sortByVariant } from "@/lib/video-review";

const STATUSES = ["draft", "qa_pending", "approved", "published"] as const;

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { data: session } = useSession();
  const { showToast } = useToast();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken;

  const [video, setVideo] = useState<MarketingVideoRecord | null>(null);
  const [siblings, setSiblings] = useState<MarketingVideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const record = await fetchMarketingVideo(token, id);
        if (cancelled) return;
        setVideo(record);
        const related = await fetchMarketingVideos(token, { slug: record.slug });
        if (!cancelled) setSiblings(sortByVariant(related.length ? related : [record]));
      } catch (e) {
        if (!cancelled) showToast(e instanceof Error ? e.message : "Failed to load", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id, showToast]);

  const packUrl = siblings[0]?.tool_output_zip_path || video?.tool_output_zip_path;
  const reviewReady = isSessionPublishComplete(siblings, packUrl);

  useEffect(() => {
    if (loading || !video || reviewReady) return;
    setRedirecting(true);
    router.replace(`/videos/create?slug=${encodeURIComponent(video.slug)}&job=${video.id}`);
  }, [loading, video, reviewReady, router]);

  const updateStatus = async (status: string) => {
    if (!token || !video) return;
    setSaving(true);
    try {
      const updated = await patchMarketingVideo(token, video.id, { status });
      setVideo(updated);
      setSiblings((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      showToast("Status updated", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || redirecting || (!reviewReady && video)) {
    return (
      <div className="flex items-center gap-2 py-12 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        {redirecting ? "Opening create video…" : "Loading…"}
      </div>
    );
  }

  if (!video) {
    return (
      <div className="space-y-4">
        <Breadcrumb />
        <p className="text-gray-500">Video not found.</p>
        <Link href="/videos" className="text-primary hover:underline">
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/videos" className="text-sm text-primary hover:underline">
            ← Videos library
          </Link>
          <h1 className="text-heading-4 font-bold text-dark dark:text-white mt-2">
            {video.business_name || video.slug}
          </h1>
          <p className="text-sm text-gray-500">
            {video.kind} · {video.slug}
            {siblings.length > 1 && ` · ${siblings.length} cuts`}
          </p>
        </div>
        {siblings.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {siblings.map((v) => (
              <Link
                key={v.id}
                href={`/videos/${v.id}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                  v.id === video.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-stroke dark:border-dark-3 text-gray-600 hover:text-primary"
                }`}
              >
                {v.variant === "30s" ? "30s" : "Long"}
              </Link>
            ))}
          </div>
        )}
      </div>

      <VideoReviewWorkspace videos={siblings} activeVideoId={video.id} sessionPackFolderUrl={packUrl} />

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[1fr_320px]">
        <div />

        <div className="space-y-4">
          <div className="rounded-xl border border-stroke dark:border-dark-3 p-4 space-y-3">
            <h2 className="font-semibold text-dark dark:text-white">Workflow</h2>
            <label className="block text-xs font-medium text-gray-500">Status</label>
            <select
              value={video.status}
              disabled={saving}
              onChange={(e) => updateStatus(e.target.value)}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VIDEO_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {video.render_job_id && (
              <p className="text-xs font-mono text-gray-400 break-all">{video.render_job_id}</p>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 text-xs text-gray-500 space-y-2">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Request changes</p>
            <p>
              Start a new session from{" "}
              <Link href="/videos/create" className="text-primary hover:underline">
                Create video
              </Link>{" "}
              to get a fresh pack folder and re-render.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
