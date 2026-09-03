import { getApiBaseUrl } from "@/lib/utils";
import { formatBackendErrorBody } from "@/lib/api-errors";

export type SitePhoto = {
  id: string;
  name: string;
  mime_type: string;
  web_view_link: string;
  thumbnail_link?: string | null;
  created_time?: string | null;
  modified_time?: string | null;
};

export type SitePhotosPayload = {
  ok?: boolean;
  exists?: boolean;
  created?: boolean;
  folder_id?: string | null;
  folder_url?: string | null;
  folder_name?: string;
  files: SitePhoto[];
  errors?: Array<{ name: string; error: string }>;
};

const DRIVE_THUMB_FALLBACK = (id: string) =>
  `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w400`;

export function sitePhotoThumbnailUrl(photo: Pick<SitePhoto, "id" | "thumbnail_link">): string {
  if (photo.thumbnail_link && photo.thumbnail_link.trim()) return photo.thumbnail_link;
  return DRIVE_THUMB_FALLBACK(photo.id);
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return formatBackendErrorBody(data) || res.statusText || "Request failed.";
}

export async function fetchSitePhotos(
  businessName: string,
  gdriveUrl: string,
  token: string,
): Promise<SitePhotosPayload> {
  const res = await fetch(`${getApiBaseUrl()}/api/members/site-photos/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      business_name: businessName,
      gdrive_url: gdriveUrl,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const data = (await res.json()) as SitePhotosPayload;
  return {
    ...data,
    files: Array.isArray(data.files) ? data.files : [],
  };
}

export async function uploadSitePhotos(
  files: File[],
  businessName: string,
  gdriveUrl: string,
  token: string,
): Promise<SitePhotosPayload> {
  const fd = new FormData();
  fd.append("business_name", businessName);
  fd.append("gdrive_url", gdriveUrl);
  for (const file of files) {
    fd.append("files", file);
  }
  const res = await fetch(`${getApiBaseUrl()}/api/members/site-photos/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const data = (await res.json()) as SitePhotosPayload;
  return {
    ...data,
    files: Array.isArray(data.files) ? data.files : [],
    errors: Array.isArray(data.errors) ? data.errors : [],
  };
}
