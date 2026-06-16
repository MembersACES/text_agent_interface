import { getApiBaseUrl } from "@/lib/utils";

/** Parent shared folder for Interface Video Creation Packs on Drive */
export const VIDEO_CREATION_PACKS_FOLDER_URL =
  "https://drive.google.com/drive/folders/1Cv-7grIhrXynAhgU8Ketd-dDE74DN6_9";

export type MarketingVideoRecord = {
  id: number;
  slug: string;
  kind: string;
  variant: string;
  file_id: string;
  file_name: string;
  preview_url?: string | null;
  web_view_link?: string | null;
  crm_solution_type_id?: string | null;
  testimonial_id?: number | null;
  business_name?: string | null;
  client_id?: number | null;
  status: string;
  source_doc_file_id?: string | null;
  qa_review_path?: string | null;
  tool_output_zip_path?: string | null;
  render_job_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type DriveVideoItem = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  previewUrl: string;
  createdTime?: string;
  slug?: string | null;
  kind?: string | null;
  variant?: string | null;
  crm_solution_type_id?: string | null;
  in_db?: boolean;
};

export type VideoRegistryEntry = {
  slug: string;
  kind: string;
  composition_id?: string;
  video_id?: string;
  cuts?: string[];
  crm_solution_type_id?: string | null;
  solution_range_ids?: string[];
};

function authHeaders(token: string | undefined): HeadersInit {
  return { Authorization: `Bearer ${token ?? ""}` };
}

export async function fetchDriveVideos(
  token: string | undefined,
  kind?: string
): Promise<{ folder_url: string; videos: DriveVideoItem[] }> {
  const q = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  const res = await fetch(`${getApiBaseUrl()}/api/resources/drive-videos${q}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Failed to load videos (${res.status})`);
  return {
    folder_url: data.folder_url || "",
    videos: Array.isArray(data.videos) ? data.videos : [],
  };
}

export async function fetchMarketingVideos(
  token: string | undefined,
  params?: Record<string, string>
): Promise<MarketingVideoRecord[]> {
  const sp = new URLSearchParams(params);
  const qs = sp.toString() ? `?${sp}` : "";
  const res = await fetch(`${getApiBaseUrl()}/api/videos${qs}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Failed to load video records (${res.status})`);
  return Array.isArray(data) ? data : [];
}

export async function fetchMarketingVideo(
  token: string | undefined,
  id: number
): Promise<MarketingVideoRecord> {
  const res = await fetch(`${getApiBaseUrl()}/api/videos/${id}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Video not found");
  return data;
}

export async function fetchVideoRegistry(
  token: string | undefined
): Promise<{ entries: VideoRegistryEntry[] }> {
  const res = await fetch(`${getApiBaseUrl()}/api/videos/registry`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to load registry");
  return data;
}

export async function patchMarketingVideo(
  token: string | undefined,
  id: number,
  body: Partial<Pick<MarketingVideoRecord, "status" | "notes">>
): Promise<MarketingVideoRecord> {
  const res = await fetch(`${getApiBaseUrl()}/api/videos/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Update failed");
  return data;
}

export type CreationPackLinks = {
  pack_folder_id?: string;
  pack_folder_url: string;
  pack_folder_name?: string | null;
  slug?: string;
  pack_subfolders_empty?: boolean;
  linked_assets_outside_pack?: boolean;
  linked_assets?: {
    qa_review_url?: string | null;
    cuts?: Array<{
      variant: string;
      file_id: string;
      file_name: string;
      preview_url?: string | null;
      web_view_link?: string | null;
    }>;
  };
  subfolders?: Record<
    string,
    { folder_id: string; folder_url: string; file_count?: number; files?: Array<{ id: string; name: string; view_url: string }> }
  >;
};

export async function fetchCreationPackLinks(
  token: string | undefined,
  videoId: number
): Promise<CreationPackLinks> {
  const res = await fetch(`/api/videos/${videoId}/creation-pack`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to load pack links");
  return data as CreationPackLinks;
}

export function videoQaPreviewPath(videoId: number): string {
  return `/api/videos/${videoId}/qa-html`;
}

/** Proxied MP4 stream — plays in-browser without Drive transcoding. */
export function videoStreamPath(videoId: number): string {
  return `/api/videos/${videoId}/stream`;
}

/** Local render on disk (claude-videos) — available right after render, before Drive upload finishes. */
export function videoLocalStreamPath(slug: string, variant: string, kind = "testimonial"): string {
  const params = new URLSearchParams({
    slug,
    variant: variant === "30s" ? "30s" : "long",
    kind,
  });
  return `/api/videos/local-stream?${params}`;
}

export const VIDEOS_DRIVE_FOLDER_URL =
  "https://drive.google.com/drive/folders/1VmTut-4mztUiz95g2BqnZTMoeCVMhsb9";

export const VIDEO_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  qa_pending: "QA pending",
  approved: "Approved",
  published: "Published",
};

/** Show dev-only video tooling (Regenerate all). Local dev always; prod requires NEXT_PUBLIC_VIDEO_DEV_TOOLS=true */
export function isVideoDevToolsEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_VIDEO_DEV_TOOLS === "true";
}

export async function requestDevRegenerateAll(): Promise<{
  warning?: string;
  cli?: string[];
  registry_count?: number;
}> {
  const res = await fetch("/api/videos/dev/regenerate-all", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail || "Regenerate-all failed");
  return data;
}
