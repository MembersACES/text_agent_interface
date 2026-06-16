"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchCreationPackLinks,
  VIDEO_STATUS_LABELS,
  videoLocalStreamPath,
  videoQaPreviewPath,
  videoStreamPath,
  type CreationPackLinks,
  type MarketingVideoRecord,
} from "@/lib/video-api";
import {
  drivePreviewUrl,
  driveViewUrl,
  hasCreationPack,
  hasQaReview,
  isVideoRendered,
  sortByVariant,
  type VideoReviewTab,
} from "@/lib/video-review";
import { MemberSubTabs } from "@/components/crm-member/shared/MemberSubTabs";

type Props = {
  videos: MarketingVideoRecord[];
  activeVideoId: number;
  /** When set, pack tab and assets are scoped to this create-session folder. */
  sessionPackFolderUrl?: string | null;
  /** Stream from claude-videos disk when Drive upload not ready yet. */
  previewSlug?: string;
  previewKind?: string;
  className?: string;
};

const REVIEW_TABS: { id: VideoReviewTab; label: string }[] = [
  { id: "video", label: "Video" },
  { id: "qa", label: "QA review" },
  { id: "pack", label: "Creation pack" },
  { id: "source", label: "Source doc" },
];

function VideoPlayer({
  title,
  videoId,
  slug,
  variant,
  kind,
  openHref,
  emptyMessage,
  useLocalFile,
}: {
  title: string;
  videoId?: number;
  slug?: string;
  variant?: string;
  kind?: string;
  openHref?: string | null;
  emptyMessage?: string;
  useLocalFile?: boolean;
}) {
  const localSrc =
    slug && variant ? videoLocalStreamPath(slug, variant, kind || "testimonial") : null;
  const streamSrc = videoId ? videoStreamPath(videoId) : null;
  const primarySrc = useLocalFile && localSrc ? localSrc : streamSrc ?? localSrc;
  const fallbackSrc =
    primarySrc === localSrc && streamSrc
      ? streamSrc
      : primarySrc === streamSrc && localSrc
        ? localSrc
        : null;

  const [src, setSrc] = React.useState<string | null>(primarySrc);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setSrc(primarySrc);
    setLoading(true);
  }, [primarySrc]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-dark dark:text-white">{title}</p>
        {openHref && (
          <a
            href={openHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open in Drive
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {src ? (
        <div className="relative w-full overflow-hidden rounded-xl border border-stroke dark:border-dark-3 bg-black aspect-video">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 text-white text-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span>Loading video — first play can take a few seconds</span>
            </div>
          )}
          <video
            key={src}
            className="absolute inset-0 h-full w-full"
            controls
            playsInline
            preload="metadata"
            src={src ?? undefined}
            onLoadStart={() => setLoading(true)}
            onWaiting={() => setLoading(true)}
            onCanPlay={() => setLoading(false)}
            onPlaying={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              if (fallbackSrc && src !== fallbackSrc) setSrc(fallbackSrc);
            }}
          >
            Your browser does not support HTML5 video.
          </video>
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-gray-600 dark:bg-dark-2">
          {emptyMessage || "Not available yet"}
        </div>
      )}
      {src && (
        <p className="text-xs text-gray-500">
          {src === localSrc
            ? "Playing from local render on your machine — use Open in Drive for the uploaded copy."
            : "Streamed in-app from Drive (not the Drive embed). Use Open in Drive only if you need the file in Drive."}
        </p>
      )}
    </div>
  );
}

function ResourceFrame({
  title,
  src,
  openHref,
  emptyMessage,
  tall = false,
}: {
  title: string;
  src?: string | null;
  openHref?: string | null;
  emptyMessage?: string;
  tall?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-dark dark:text-white">{title}</p>
        {openHref && (
          <a
            href={openHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open in Drive
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {src ? (
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl border border-stroke dark:border-dark-3 bg-black/5 dark:bg-black/30",
            tall ? "h-[min(75vh,900px)]" : "aspect-video"
          )}
        >
          <iframe
            title={title}
            src={src}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; fullscreen"
            sandbox={tall ? "allow-scripts allow-same-origin allow-popups" : undefined}
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-dark-2 text-sm text-gray-500",
            tall ? "h-[min(50vh,480px)]" : "aspect-video"
          )}
        >
          {emptyMessage || "Not available yet"}
        </div>
      )}
    </div>
  );
}

export function VideoReviewWorkspace({
  videos,
  activeVideoId,
  sessionPackFolderUrl,
  previewSlug,
  previewKind = "testimonial",
  className,
}: Props) {
  const sorted = useMemo(() => sortByVariant(videos), [videos]);
  const primary = sorted.find((v) => v.id === activeVideoId) ?? sorted[0];
  const [tab, setTab] = useState<VideoReviewTab>("video");
  const [variantId, setVariantId] = useState(activeVideoId);
  const [packLinks, setPackLinks] = useState<CreationPackLinks | null>(null);
  const [packLoading, setPackLoading] = useState(false);

  const activeCut = sorted.find((v) => v.id === variantId) ?? primary;
  const qaOpen = primary.qa_review_path?.startsWith("http")
    ? driveViewUrl(primary.qa_review_path)
    : primary.qa_review_path;
  const packUrl = sessionPackFolderUrl?.trim() || primary.tool_output_zip_path?.trim();
  const sourceId = primary.source_doc_file_id?.trim();

  useEffect(() => {
    if (!hasCreationPack(primary)) {
      setPackLinks(null);
      return;
    }
    let cancelled = false;
    setPackLoading(true);
    fetchCreationPackLinks(undefined, primary.id)
      .then((data) => {
        if (!cancelled) setPackLinks(data);
      })
      .catch(() => {
        if (!cancelled) setPackLinks(null);
      })
      .finally(() => {
        if (!cancelled) setPackLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [primary.id, primary.tool_output_zip_path]);

  const subfolderUrl = (key: string) => packLinks?.subfolders?.[key]?.folder_url;

  const availableTabs = REVIEW_TABS.filter((t) => {
    if (t.id === "video") return sorted.some(isVideoRendered);
    if (t.id === "qa") return hasQaReview(primary);
    if (t.id === "pack") return hasCreationPack(primary);
    if (t.id === "source") return Boolean(sourceId);
    return false;
  });

  const currentTab = availableTabs.some((t) => t.id === tab) ? tab : availableTabs[0]?.id ?? "video";

  const packItems = [
    {
      key: "root",
      label: "Full pack folder",
      desc: "All artifacts for this video job",
      href: packLinks?.pack_folder_url || packUrl,
      primary: true,
    },
    { key: "renders", label: "renders/", desc: "Long + 30s MP4 copies", href: subfolderUrl("renders") },
    { key: "qa", label: "qa/", desc: "QA-Review.html", href: subfolderUrl("qa") },
    { key: "scripts", label: "scripts/", desc: "Narration and slide plans", href: subfolderUrl("scripts") },
    { key: "slides", label: "slides/", desc: "Presentation slides PDF", href: subfolderUrl("slides") },
  ];

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 overflow-hidden",
        className
      )}
    >
      <div className="flex flex-col gap-3 border-b border-emerald-200/80 dark:border-emerald-800/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-dark dark:text-white">Ready for review</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              MP4{sorted.filter(isVideoRendered).length > 1 ? "s" : ""}, QA report
              {hasCreationPack(primary) ? ", and creation pack" : ""} — use the tabs below.
            </p>
          </div>
        </div>
        <span className="inline-flex self-start rounded-full bg-white/80 dark:bg-dark-2 px-3 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">
          {VIDEO_STATUS_LABELS[primary.status] || primary.status}
        </span>
      </div>

      <div className="bg-white/70 dark:bg-gray-dark px-2 pt-2">
        <MemberSubTabs
          tabs={availableTabs.map((t) => ({ id: t.id, label: t.label }))}
          active={currentTab}
          onChange={(id) => setTab(id as VideoReviewTab)}
        />
      </div>

      <div className="p-4 sm:p-6 bg-white/50 dark:bg-gray-dark/80 space-y-4">
        {currentTab === "video" && (
          <>
            {sorted.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {sorted.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      variantId === v.id
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-2 dark:text-gray-300"
                    )}
                  >
                    {v.variant === "30s" ? "30 second cut" : "Long cut"}
                    {!isVideoRendered(v) && " (pending)"}
                  </button>
                ))}
              </div>
            )}
            <VideoPlayer
              title={activeCut.file_name}
              videoId={isVideoRendered(activeCut) ? activeCut.id : undefined}
              slug={previewSlug || primary.slug}
              variant={activeCut.variant}
              kind={previewKind}
              useLocalFile={!isVideoRendered(activeCut) && Boolean(previewSlug || primary.slug)}
              openHref={
                isVideoRendered(activeCut)
                  ? activeCut.web_view_link || driveViewUrl(activeCut.file_id)
                  : null
              }
              emptyMessage={
                previewSlug
                  ? "Local render not found yet — still rendering or check CLAUDE_VIDEOS_ROOT on backend."
                  : "This cut has not been uploaded yet."
              }
            />
            {sorted.length > 1 && (
              <p className="text-xs text-gray-500">
                {sorted.filter(isVideoRendered).length} of {sorted.length} cuts uploaded — switch above or open{" "}
                <Link href={`/videos?slug=${encodeURIComponent(primary.slug)}`} className="text-primary hover:underline">
                  all cuts in library
                </Link>
                .
              </p>
            )}
          </>
        )}

        {currentTab === "qa" && (
          <>
            <ResourceFrame
              title="QA-Review.html"
              src={videoQaPreviewPath(primary.id)}
              openHref={qaOpen || null}
              emptyMessage="QA report not uploaded yet."
              tall
            />
            <p className="text-xs text-gray-500">
              Rendered in-app from Drive (not the Drive embed). Use <strong>Open in Drive</strong> for the original file.
            </p>
          </>
        )}

        {currentTab === "pack" && packUrl && (
          <>
            {packLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading pack folder links…
              </div>
            )}
            {packLinks?.linked_assets_outside_pack && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-100 space-y-2">
                <p className="font-semibold">Published files are not in this pack folder</p>
                <p>
                  The Interface is showing MP4s and QA from an earlier publish. This pack folder is empty
                  because the create flow ran again and linked a new empty pack. Use the direct links below,
                  or re-run <code className="font-mono">publish:local</code> for this slug.
                </p>
                {packLinks.linked_assets?.qa_review_url && (
                  <a
                    href={packLinks.linked_assets.qa_review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Open linked QA-Review.html
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {(packLinks.linked_assets?.cuts || []).map((cut) => (
                  <a
                    key={cut.variant}
                    href={cut.web_view_link || driveViewUrl(cut.file_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary hover:underline"
                  >
                    {cut.variant === "30s" ? "30s" : "Long"} MP4 — {cut.file_name}
                  </a>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packItems.map((item) => {
                const href = item.href;
                const disabled = !href;
                const inner = (
                  <div
                    className={cn(
                      "rounded-lg border p-4 transition-colors",
                      item.primary
                        ? "border-primary/40 bg-primary/5 sm:col-span-2"
                        : "border-stroke dark:border-dark-3",
                      disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-dark dark:text-white">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                        {(packLinks?.pack_folder_name || primary.render_job_id) && item.primary && (
                          <p className="text-[11px] font-mono text-gray-400 mt-2 break-all">
                            {packLinks?.pack_folder_name || primary.render_job_id}
                          </p>
                        )}
                        {disabled && !packLoading && (
                          <p className="text-[11px] text-amber-600 mt-1">
                            {packLinks?.subfolders?.[item.key]?.file_count === 0
                              ? "Empty — publish has not copied files here yet"
                              : "Subfolder not found yet"}
                          </p>
                        )}
                        {!disabled && (packLinks?.subfolders?.[item.key]?.file_count ?? 0) > 0 && (
                          <p className="text-[11px] text-gray-400 mt-1">
                            {packLinks?.subfolders?.[item.key]?.file_count} file(s)
                          </p>
                        )}
                      </div>
                      {!disabled && <ExternalLink className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  </div>
                );
                if (disabled) {
                  return <div key={item.key}>{inner}</div>;
                }
                return (
                  <a key={item.key} href={href!} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                );
              })}
            </div>
          </>
        )}

        {currentTab === "source" && sourceId && (
          <ResourceFrame
            title="CRM testimonial source"
            src={drivePreviewUrl(sourceId)}
            openHref={driveViewUrl(sourceId)}
          />
        )}
      </div>
    </div>
  );
}
