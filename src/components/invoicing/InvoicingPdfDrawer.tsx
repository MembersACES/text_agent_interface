"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvoicingDriveCategoryKey } from "@/lib/invoicing-drive-categories";
import {
  fetchInvoicingDriveBusinesses,
  fetchInvoicingDriveDocuments,
  type InvoicingDriveBusiness,
  type InvoicingDriveDocument,
} from "@/lib/invoicing-drive-api";

type LoadState = "idle" | "loading" | "ready" | "error";

function formatDriveDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  token: string | undefined;
  category: InvoicingDriveCategoryKey;
  layout?: "drawer" | "full";
};

export function InvoicingPdfDrawer({ token, category, layout = "drawer" }: Props) {
  const isFull = layout === "full";
  const [businesses, setBusinesses] = useState<InvoicingDriveBusiness[]>([]);
  const [businessesStatus, setBusinessesStatus] = useState<LoadState>("idle");
  const [businessesError, setBusinessesError] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [businessSearch, setBusinessSearch] = useState("");
  const [folderUrl, setFolderUrl] = useState<string | null>(null);

  const [documents, setDocuments] = useState<InvoicingDriveDocument[]>([]);
  const [documentsStatus, setDocumentsStatus] = useState<LoadState>("idle");
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const loadBusinesses = useCallback(async () => {
    if (!token) {
      setBusinessesStatus("error");
      setBusinessesError("Sign in required to load invoice documents.");
      return;
    }
    setBusinessesStatus("loading");
    setBusinessesError(null);
    setBusinesses([]);
    setSelectedBusinessId(null);
    setDocuments([]);
    setDocumentsStatus("idle");
    setSelectedDocumentId(null);
    setFolderUrl(null);
    try {
      const data = await fetchInvoicingDriveBusinesses(token, category);
      setBusinesses(data.businesses);
      setFolderUrl(data.business_parent_folder_url || null);
      setBusinessesStatus("ready");
      setSelectedBusinessId(data.businesses.length > 0 ? data.businesses[0].id : null);
    } catch (e) {
      setBusinessesStatus("error");
      setBusinessesError(e instanceof Error ? e.message : "Failed to load businesses");
    }
  }, [token, category]);

  useEffect(() => {
    void loadBusinesses();
  }, [loadBusinesses]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || !selectedBusinessId) {
        if (!cancelled) {
          setDocuments([]);
          setDocumentsStatus("idle");
          setSelectedDocumentId(null);
        }
        return;
      }
      setDocumentsStatus("loading");
      setDocumentsError(null);
      setDocuments([]);
      setSelectedDocumentId(null);
      try {
        const data = await fetchInvoicingDriveDocuments(
          token,
          category,
          selectedBusinessId
        );
        if (cancelled) return;
        setDocuments(data.documents);
        setFolderUrl(data.business.folder_url || null);
        setDocumentsStatus("ready");
        setSelectedDocumentId(data.documents.length > 0 ? data.documents[0].id : null);
      } catch (e) {
        if (cancelled) return;
        setDocumentsStatus("error");
        setDocumentsError(e instanceof Error ? e.message : "Failed to load documents");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, category, selectedBusinessId]);

  const filteredBusinesses = useMemo(() => {
    const q = businessSearch.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter((b) => b.name.toLowerCase().includes(q));
  }, [businesses, businessSearch]);

  const selectedDocument = useMemo(() => {
    if (!selectedDocumentId) return null;
    return documents.find((d) => d.id === selectedDocumentId) ?? null;
  }, [documents, selectedDocumentId]);

  const showBusinessPicker = businesses.length > 1;
  const canPreviewPdf =
    selectedDocument?.file_type === "pdf" && !!selectedDocument.preview_url;

  const listPane = (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border-stroke dark:border-dark-3",
        isFull
          ? "h-full rounded-xl border bg-white dark:bg-gray-dark"
          : "h-full border-b"
      )}
    >
      <div className="border-b border-stroke px-3 py-2 dark:border-dark-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Issued PDFs
          </p>
          {folderUrl ? (
            <a
              href={folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              Folder
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        {showBusinessPicker ? (
          <input
            type="search"
            value={businessSearch}
            onChange={(e) => setBusinessSearch(e.target.value)}
            placeholder="Search businesses…"
            className="mt-2 w-full rounded-lg border border-stroke bg-white px-2.5 py-1.5 text-xs text-dark placeholder:text-gray-400 focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        ) : null}
      </div>

      {showBusinessPicker ? (
        <div className="max-h-36 overflow-y-auto border-b border-stroke dark:border-dark-3">
          {businessesStatus === "loading" ? (
            <p className="flex items-center gap-2 px-3 py-3 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </p>
          ) : businessesStatus === "error" ? (
            <div className="px-3 py-3 text-xs text-red-600 dark:text-red-400">
              <p>{businessesError}</p>
              <button
                type="button"
                onClick={() => void loadBusinesses()}
                className="mt-1 font-medium text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-500">No businesses found.</p>
          ) : (
            <ul>
              {filteredBusinesses.map((biz) => {
                const isActive = biz.id === selectedBusinessId;
                return (
                  <li key={biz.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedBusinessId(biz.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs",
                        isActive
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-dark hover:bg-gray-50 dark:text-white dark:hover:bg-dark-2"
                      )}
                    >
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{biz.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {documentsStatus === "loading" && (
          <p className="flex items-center gap-2 px-3 py-4 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading documents…
          </p>
        )}
        {documentsStatus === "error" && (
          <div className="px-3 py-3 text-xs text-red-600 dark:text-red-400">
            <p>{documentsError}</p>
          </div>
        )}
        {documentsStatus === "ready" && documents.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-gray-500">
            No invoice files in this folder.
          </p>
        )}
        {documentsStatus === "ready" && documents.length > 0 && (
          <ul className="divide-y divide-stroke dark:divide-dark-3">
            {documents.map((doc) => {
              const isActive = doc.id === selectedDocumentId;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDocumentId(doc.id)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left",
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/30"
                        : "hover:bg-gray-50 dark:hover:bg-dark-2"
                    )}
                  >
                    <span
                      className={cn(
                        "truncate text-xs leading-snug",
                        isActive
                          ? "font-semibold text-indigo-900 dark:text-indigo-100"
                          : "text-dark dark:text-white"
                      )}
                      title={doc.name}
                    >
                      {doc.name}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {formatDriveDate(doc.created_time || doc.modified_time)}
                      {doc.inferred_invoice_number
                        ? ` · #${doc.inferred_invoice_number}`
                        : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  const previewPane = (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col",
        isFull && "overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark"
      )}
    >
      {selectedDocument ? (
        <>
          <div className="flex items-start justify-between gap-2 border-b border-stroke px-3 py-2 dark:border-dark-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-dark dark:text-white">
                {selectedDocument.name}
              </p>
              <p className="text-[10px] text-gray-500">
                Modified {formatDriveDate(selectedDocument.modified_time)}
              </p>
            </div>
            <a
              href={selectedDocument.web_view_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              Drive
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {canPreviewPdf ? (
            <div className={cn("relative flex-1 bg-gray-100 dark:bg-dark-2", isFull ? "min-h-[70vh]" : "min-h-[240px]")}>
              <iframe
                key={selectedDocument.id}
                title={selectedDocument.name}
                src={selectedDocument.preview_url}
                className="absolute inset-0 h-full w-full border-0"
                allow="autoplay"
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center text-xs text-gray-500">
              <FileText className="h-8 w-8 opacity-40" />
              <p>Preview is not available for this file type.</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center text-xs text-gray-500">
          <FileText className="h-8 w-8 opacity-40" />
          <p>Select a PDF to preview.</p>
        </div>
      )}
    </div>
  );

  if (isFull) {
    return (
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] lg:items-stretch">
        {listPane}
        {previewPane}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-gray-dark">
      <div className="flex max-h-[48%] min-h-0 shrink-0 flex-col overflow-hidden">
        {listPane}
      </div>
      <div className="min-h-0 flex-1">{previewPane}</div>
    </div>
  );
}
