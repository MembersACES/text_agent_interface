import type { MarketingVideoRecord } from "@/lib/video-api";

export type VideoReviewTab = "video" | "qa" | "pack" | "source";

export function driveFileIdFromUrl(url: string): string | null {
  const m = url.match(/\/file\/d\/([^/]+)/);
  return m?.[1] ?? null;
}

export function drivePreviewUrl(fileIdOrUrl: string): string {
  const id = fileIdOrUrl.includes("drive.google.com")
    ? driveFileIdFromUrl(fileIdOrUrl)
    : fileIdOrUrl;
  return id ? `https://drive.google.com/file/d/${id}/preview` : fileIdOrUrl;
}

export function driveViewUrl(fileIdOrUrl: string): string {
  const id = fileIdOrUrl.includes("drive.google.com")
    ? driveFileIdFromUrl(fileIdOrUrl)
    : fileIdOrUrl;
  return id ? `https://drive.google.com/file/d/${id}/view` : fileIdOrUrl;
}

export function isVideoRendered(video: MarketingVideoRecord): boolean {
  return Boolean(video.file_id && video.file_id !== "pending");
}

export function hasQaReview(video: MarketingVideoRecord): boolean {
  const path = video.qa_review_path?.trim();
  return Boolean(path && (path.startsWith("http") || path.endsWith(".html")));
}

export function hasCreationPack(video: MarketingVideoRecord): boolean {
  return Boolean(video.tool_output_zip_path?.includes("drive.google.com"));
}

export function driveFolderIdFromUrl(url: string): string | null {
  const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m?.[1]) return m[1];
  const q = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return q?.[1] ?? null;
}

export function videoMatchesPackFolder(
  video: MarketingVideoRecord,
  packFolderUrl: string
): boolean {
  const expected = driveFolderIdFromUrl(packFolderUrl);
  const actual = driveFolderIdFromUrl(video.tool_output_zip_path || "");
  return Boolean(expected && actual && expected === actual);
}

/** True once publish has landed MP4(s) and/or QA on Drive. */
export function isVideoReviewReady(video: MarketingVideoRecord): boolean {
  return isVideoRendered(video) || hasQaReview(video);
}

/**
 * Render finished locally — show preview before Drive publish completes.
 */
export function isSessionRenderComplete(
  progress: { steps?: Array<{ id: string; status: string }> } | null | undefined
): boolean {
  const rendering = progress?.steps?.find((s) => s.id === "rendering");
  return rendering?.status === "done";
}

/**
 * Create-page gate: full review when publish landed, OR early preview after local render.
 */
export function isSessionPreviewReady(
  videos: MarketingVideoRecord[],
  sessionPackFolderUrl: string | null | undefined,
  progress: { steps?: Array<{ id: string; status: string }> } | null | undefined
): boolean {
  return isSessionPublishComplete(videos, sessionPackFolderUrl) || isSessionRenderComplete(progress);
}

/**
 * Create-page gate: review tabs only unlock when THIS session's pack has
 * both cuts uploaded and a QA report (not stale assets from a prior run).
 */
export function isSessionPublishComplete(
  videos: MarketingVideoRecord[],
  sessionPackFolderUrl: string | null | undefined
): boolean {
  const packUrl = sessionPackFolderUrl?.trim();
  if (!packUrl) return false;

  const sessionVideos = videos.filter((v) => videoMatchesPackFolder(v, packUrl));
  if (sessionVideos.length === 0) return false;

  return (
    sessionVideos.every(isVideoRendered) &&
    sessionVideos.some(hasQaReview)
  );
}

export function filterVideosForSessionPack(
  videos: MarketingVideoRecord[],
  sessionPackFolderUrl: string | null | undefined
): MarketingVideoRecord[] {
  const packUrl = sessionPackFolderUrl?.trim();
  if (!packUrl) return videos;
  return videos.filter((v) => videoMatchesPackFolder(v, packUrl));
}

export function sortByVariant(videos: MarketingVideoRecord[]): MarketingVideoRecord[] {
  const order = { long: 0, "30s": 1 };
  return [...videos].sort(
    (a, b) => (order[a.variant as keyof typeof order] ?? 9) - (order[b.variant as keyof typeof order] ?? 9)
  );
}
