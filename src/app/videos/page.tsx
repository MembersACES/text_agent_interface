"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ExternalLink,
  Film,
  FolderOpen,
  Loader2,
  Plus,
  Terminal,
  ClipboardList,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { cn, getApiBaseUrl } from "@/lib/utils";
import {
  fetchDriveVideos,
  fetchMarketingVideos,
  videoStreamPath,
  VIDEOS_DRIVE_FOLDER_URL,
  VIDEO_STATUS_LABELS,
  type DriveVideoItem,
  type MarketingVideoRecord,
} from "@/lib/video-api";
import { RegenerateAllButton } from "@/components/videos/RegenerateAllButton";

type HubTab = "library" | "jobs" | "create";

export default function VideosPage() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const slugFilter = searchParams.get("slug") || "";

  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken;

  const [tab, setTab] = useState<HubTab>("library");
  const [driveVideos, setDriveVideos] = useState<DriveVideoItem[]>([]);
  const [dbVideos, setDbVideos] = useState<MarketingVideoRecord[]>([]);
  const [folderUrl, setFolderUrl] = useState(VIDEOS_DRIVE_FOLDER_URL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devCliSteps, setDevCliSteps] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [drive, db] = await Promise.all([
        fetchDriveVideos(token),
        fetchMarketingVideos(token, slugFilter ? { slug: slugFilter } : undefined),
      ]);
      setFolderUrl(drive.folder_url || VIDEOS_DRIVE_FOLDER_URL);
      setDriveVideos(drive.videos);
      setDbVideos(db);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, [token, slugFilter]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    load();
  }, [sessionStatus, load]);

  const dbByFileId = useMemo(() => {
    const m = new Map<string, MarketingVideoRecord>();
    for (const v of dbVideos) m.set(v.file_id, v);
    return m;
  }, [dbVideos]);

  const filteredDrive = useMemo(() => {
    if (!slugFilter) return driveVideos;
    return driveVideos.filter((v) => v.slug === slugFilter || v.name.includes(slugFilter));
  }, [driveVideos, slugFilter]);

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-3 font-bold text-dark dark:text-white mb-2">Videos</h1>
          <p className="text-body-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Interface Videos library — marketing and testimonial MP4s from Google Drive, linked to CRM
            testimonials and solution range.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RegenerateAllButton
            onCliSteps={(steps) => {
              setDevCliSteps(steps);
              setTab("jobs");
            }}
          />
          <Link
            href="/videos/create"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create video
          </Link>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2 rounded-xl border border-stroke dark:border-dark-3 bg-white/90 dark:bg-gray-dark/90 p-1.5"
        role="tablist"
      >
        {(
          [
            ["library", "Library", Film],
            ["jobs", "Local pipeline", Terminal],
            ["create", "Upload", Plus],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === id
                ? "bg-primary text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-3"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "library" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <FolderOpen className="h-4 w-4" />
              Open Interface Videos folder
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {slugFilter && (
              <Link href="/videos" className="text-sm text-gray-500 hover:underline">
                Clear filter: {slugFilter}
              </Link>
            )}
          </div>

          {sessionStatus === "unauthenticated" && (
            <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg px-3 py-2">
              Sign in to load videos.
            </p>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading…
            </div>
          )}

          {!loading && error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
              <button type="button" onClick={load} className="ml-2 text-primary font-medium hover:underline">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredDrive.length === 0 && (
            <p className="text-sm text-gray-500 italic">No videos in the folder yet.</p>
          )}

          {!loading && filteredDrive.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredDrive.map((v) => {
                const meta = dbByFileId.get(v.id);
                return (
                  <div
                    key={v.id}
                    className="flex flex-col bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-xl overflow-hidden"
                  >
                    <div className="px-4 pt-3 pb-2 border-b border-stroke dark:border-dark-3 flex flex-wrap items-center gap-2">
                      <h3 className="text-dark dark:text-white font-medium text-sm line-clamp-2 flex-1" title={v.name}>
                        {v.name}
                      </h3>
                      {meta && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                          {VIDEO_STATUS_LABELS[meta.status] || meta.status}
                        </span>
                      )}
                      {meta && (
                        <Link
                          href={
                            meta.file_id === "pending"
                              ? `/videos/create?slug=${encodeURIComponent(meta.slug)}`
                              : `/videos/${meta.id}`
                          }
                          className="text-xs text-primary hover:underline"
                        >
                          {meta.file_id === "pending" ? "Continue" : "Review"}
                        </Link>
                      )}
                    </div>
                    <div className="relative aspect-video bg-black">
                      {meta?.id && meta.file_id && meta.file_id !== "pending" ? (
                        <video
                          title={v.name}
                          className="absolute inset-0 h-full w-full"
                          controls
                          playsInline
                          preload="metadata"
                          src={videoStreamPath(meta.id)}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100 px-4 text-center text-xs text-gray-500 dark:bg-dark-2">
                          <Film className="h-8 w-8 opacity-40" />
                          <span>In-app stream available after publish — open Drive to preview meanwhile.</span>
                          <a
                            href={v.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                          >
                            Open in Drive
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-2 flex justify-between items-center text-xs text-gray-500">
                      <span>{v.kind || "video"} {v.variant ? `· ${v.variant}` : ""}</span>
                      <a
                        href={v.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                      >
                        Drive
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "jobs" && (
        <section className="space-y-4 max-w-3xl">
          <div className="rounded-xl border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark p-5 space-y-4">
            <h2 className="font-semibold text-dark dark:text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Local render checklist
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Renders run on your machine (claude-videos). After upload from Create, run these commands, then publish.
            </p>
            <ol className="list-decimal list-inside text-sm space-y-2 font-mono bg-gray-50 dark:bg-dark-2 rounded-lg p-4">
              <li>python tools/understand_testimonial.py --docx &quot;…&quot;</li>
              <li>cd remotion && npm run render:only -- &lt;slug&gt;</li>
              <li>npm run postrender</li>
              <li>npm run publish:local -- --slug &lt;slug&gt; --kind testimonial</li>
            </ol>
            <p className="text-xs text-gray-500">
              Backend: {getApiBaseUrl()} · See claude-videos/docs/LOCAL_DEV.md
            </p>
          </div>

          {devCliSteps && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                  Regenerate all — run on claude-videos machine
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(devCliSteps.join("\n"));
                  }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Copy commands
                </button>
              </div>
              <ol className="list-decimal list-inside text-xs font-mono space-y-1 break-all">
                {devCliSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {tab === "create" && (
        <section className="max-w-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload a testimonial Word document to start the video pipeline.
          </p>
          <Link
            href="/videos/create"
            className="inline-flex items-center gap-2 rounded-lg border border-primary text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
            Go to upload form
          </Link>
        </section>
      )}
    </div>
  );
}
