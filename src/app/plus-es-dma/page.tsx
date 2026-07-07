"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronRight, ExternalLink, FileText, FolderOpen, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { cn } from "@/lib/utils";
import {
  dmaBusinessDisplayName,
  fetchPlusEsDmaPdfs,
  PLUS_ES_DMA_FOLDER_URL,
  type PlusEsDmaPdf,
} from "@/lib/plus-es-dma-api";

type DmaListItem = PlusEsDmaPdf & { businessName: string };

function formatCreatedTime(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function PlusEsDmaPage() {
  const { data: session, status: sessionStatus } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken;

  const [pdfs, setPdfs] = useState<PlusEsDmaPdf[]>([]);
  const [folderUrl, setFolderUrl] = useState(PLUS_ES_DMA_FOLDER_URL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlusEsDmaPdfs(token);
      setFolderUrl(data.folder_url || PLUS_ES_DMA_FOLDER_URL);
      setPdfs(data.pdfs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load DMA PDFs");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    load();
  }, [sessionStatus, load]);

  const items = useMemo<DmaListItem[]>(
    () =>
      pdfs.map((pdf) => ({
        ...pdf,
        businessName: dmaBusinessDisplayName(pdf.name),
      })),
    [pdfs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.businessName.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q),
    );
  }, [items, search]);

  const selected = useMemo(() => {
    if (filtered.length === 0) return null;
    if (selectedId && filtered.some((p) => p.id === selectedId)) {
      return filtered.find((p) => p.id === selectedId) ?? filtered[0];
    }
    return filtered[0];
  }, [filtered, selectedId]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((p) => p.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selectedCreated = formatCreatedTime(selected?.createdTime);

  return (
    <>
      <PageHeader
        pageName="Plus ES DMA"
        title="Plus ES DMA"
        description="DMA PDFs from the Plus ES shared Google Drive folder."
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <FolderOpen className="h-4 w-4" />
            Open Plus ES DMA folder
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? "…" : `${filtered.length} PDF${filtered.length === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="max-w-md">
          <label htmlFor="dma-search" className="sr-only">
            Search DMA PDFs
          </label>
          <input
            id="dma-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name…"
            className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark placeholder:text-gray-400 focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>

        {sessionStatus === "unauthenticated" && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            Sign in to load DMA PDFs.
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading PDFs…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
            <button type="button" onClick={load} className="ml-2 font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-gray-500">
            <FileText className="h-10 w-10 opacity-40" />
            <p>{search ? "No PDFs match your search." : "No PDFs found in this folder."}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr] lg:items-start">
            <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
              <div className="border-b border-stroke px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-dark-3 dark:text-gray-400">
                Businesses
              </div>
              <ul className="max-h-[min(70vh,640px)] divide-y divide-stroke overflow-y-auto dark:divide-dark-3">
                {filtered.map((pdf) => {
                  const isActive = selected?.id === pdf.id;
                  return (
                    <li key={pdf.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(pdf.id)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 font-semibold text-primary dark:bg-primary/20"
                            : "text-dark hover:bg-gray-50 dark:text-white dark:hover:bg-dark-2",
                        )}
                      >
                        <FileText className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                        <span className="min-w-0 flex-1 truncate" title={pdf.businessName}>
                          {pdf.businessName}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 opacity-40",
                            isActive && "text-primary opacity-100",
                          )}
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {selected && (
              <div className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stroke px-4 py-3 dark:border-dark-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-dark dark:text-white">
                      {selected.businessName}
                    </h2>
                    {selectedCreated && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Added {selectedCreated}
                      </p>
                    )}
                  </div>
                  <a
                    href={selected.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Open in Drive
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="relative min-h-[480px] flex-1 bg-gray-100 dark:bg-dark-2">
                  <iframe
                    key={selected.id}
                    title={selected.businessName}
                    src={selected.previewUrl}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="autoplay"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
