import { getApiBaseUrl } from "@/lib/utils";

export const PLUS_ES_DMA_FOLDER_URL =
  "https://drive.google.com/drive/folders/1Y4GEr3ZVmvrfM9Jb3ZHeYFAH6WFKpQqO";

export type PlusEsDmaPdf = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  previewUrl: string;
  createdTime?: string;
};

/** Strip OF- id / date / time prefix so only the business name is shown. */
export function dmaBusinessDisplayName(fileName: string): string {
  const withoutExt = fileName.replace(/\.pdf$/i, "").trim();

  // e.g. "OF-011003 2026-07-01 01_45pm Warragul Country Club"
  // or   "OF-011003 2026-07-01 01_45pm - Energy Australia"
  const stripped = withoutExt.replace(
    /^OF-[\w-]+\s+\d{4}-\d{2}-\d{2}\s+[\d_]+[ap]m(?:\s*-\s*|\s+)/i,
    "",
  );
  if (stripped !== withoutExt && stripped.length > 0) return stripped.trim();

  const dashIdx = withoutExt.lastIndexOf(" - ");
  if (dashIdx !== -1) return withoutExt.slice(dashIdx + 3).trim();

  return withoutExt;
}

function authHeaders(token: string | undefined): HeadersInit {
  return { Authorization: `Bearer ${token ?? ""}` };
}

export async function fetchPlusEsDmaPdfs(
  token: string | undefined
): Promise<{ folder_url: string; pdfs: PlusEsDmaPdf[] }> {
  const res = await fetch(`${getApiBaseUrl()}/api/base1/plus-es-dma`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Failed to load DMA PDFs (${res.status})`);
  return {
    folder_url: data.folder_url || PLUS_ES_DMA_FOLDER_URL,
    pdfs: Array.isArray(data.pdfs) ? data.pdfs : [],
  };
}
