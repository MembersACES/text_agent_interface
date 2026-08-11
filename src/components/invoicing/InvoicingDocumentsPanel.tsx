"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_INVOICING_DRIVE_CATEGORY,
  INVOICING_DRIVE_CATEGORIES,
  type InvoicingDriveCategoryKey,
} from "@/lib/invoicing-drive-categories";
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

function fileTypeLabel(fileType: string): string {
  switch (fileType) {
    case "pdf":
      return "PDF";
    case "doc":
      return "Doc";
    case "sheet":
      return "Sheet";
    case "image":
      return "Image";
    default:
      return "File";
  }
}

type Props = {
  token: string | undefined;
};

export function InvoicingDocumentsPanel({ token }: Props) {
  const [category, setCategory] = useState<InvoicingDriveCategoryKey>(
    DEFAULT_INVOICING_DRIVE_CATEGORY
  );
  const [businessSearch, setBusinessSearch] = useState("");
  const [businesses, setBusinesses] = useState<InvoicingDriveBusiness[]>([]);
  const [businessesStatus, setBusinessesStatus] = useState<LoadState>("idle");
  const [businessesError, setBusinessesError] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null
  );

  const [documents, setDocuments] = useState<InvoicingDriveDocument[]>([]);
  const [documentsStatus, setDocumentsStatus] = useState<LoadState>("idle");
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [selectedBusinessMeta, setSelectedBusinessMeta] = useState<{
    name: string;
    folder_url: string;
  } | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );

  const loadBusinesses = useCallback(async () => {
    if (!token) {
      setBusinessesStatus("error");
      setBusinessesError("Sign in required to load invoice documents.");
      setBusinesses([]);
      setSelectedBusinessId(null);
      setDocuments([]);
      setDocumentsStatus("idle");
      setSelectedDocumentId(null);
      setSelectedBusinessMeta(null);
      return;
    }

    setBusinessesStatus("loading");
    setBusinessesError(null);
    setBusinesses([]);
    setSelectedBusinessId(null);
    setDocuments([]);
    setDocumentsStatus("idle");
    setDocumentsError(null);
    setSelectedBusinessMeta(null);
    setSelectedDocumentId(null);

    try {
      const data = await fetchInvoicingDriveBusinesses(token, category);
      setBusinesses(data.businesses);
      setBusinessesStatus("ready");
      setSelectedBusinessId(
        data.businesses.length > 0 ? data.businesses[0].id : null
      );
    } catch (e) {
      setBusinessesStatus("error");
      setBusinessesError(
        e instanceof Error ? e.message : "Failed to load businesses"
      );
    }
  }, [token, category]);

  const loadDocuments = useCallback(async () => {
    if (!token || !selectedBusinessId) {
      setDocuments([]);
      setDocumentsStatus("idle");
      setSelectedDocumentId(null);
      setSelectedBusinessMeta(null);
      setDocumentsError(null);
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
      setDocuments(data.documents);
      setSelectedBusinessMeta({
        name: data.business.name,
        folder_url: data.business.folder_url,
      });
      setDocumentsStatus("ready");
      setSelectedDocumentId(
        data.documents.length > 0 ? data.documents[0].id : null
      );
    } catch (e) {
      setDocumentsStatus("error");
      setDocumentsError(
        e instanceof Error ? e.message : "Failed to load documents"
      );
      setSelectedBusinessMeta(null);
    }
  }, [token, category, selectedBusinessId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        if (!cancelled) {
          setBusinessesStatus("error");
          setBusinessesError("Sign in required to load invoice documents.");
          setBusinesses([]);
          setSelectedBusinessId(null);
        }
        return;
      }
      if (!cancelled) {
        setBusinessesStatus("loading");
        setBusinessesError(null);
        setBusinesses([]);
        setSelectedBusinessId(null);
        setDocuments([]);
        setDocumentsStatus("idle");
        setDocumentsError(null);
        setSelectedBusinessMeta(null);
        setSelectedDocumentId(null);
      }
      try {
        const data = await fetchInvoicingDriveBusinesses(token, category);
        if (cancelled) return;
        setBusinesses(data.businesses);
        setBusinessesStatus("ready");
        setSelectedBusinessId(
          data.businesses.length > 0 ? data.businesses[0].id : null
        );
      } catch (e) {
        if (cancelled) return;
        setBusinessesStatus("error");
        setBusinessesError(
          e instanceof Error ? e.message : "Failed to load businesses"
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, category]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || !selectedBusinessId) {
        if (!cancelled) {
          setDocuments([]);
          setDocumentsStatus("idle");
          setSelectedDocumentId(null);
          setSelectedBusinessMeta(null);
          setDocumentsError(null);
        }
        return;
      }
      if (!cancelled) {
        setDocumentsStatus("loading");
        setDocumentsError(null);
        setDocuments([]);
        setSelectedDocumentId(null);
      }
      try {
        const data = await fetchInvoicingDriveDocuments(
          token,
          category,
          selectedBusinessId
        );
        if (cancelled) return;
        setDocuments(data.documents);
        setSelectedBusinessMeta({
          name: data.business.name,
          folder_url: data.business.folder_url,
        });
        setDocumentsStatus("ready");
        setSelectedDocumentId(
          data.documents.length > 0 ? data.documents[0].id : null
        );
      } catch (e) {
        if (cancelled) return;
        setDocumentsStatus("error");
        setDocumentsError(
          e instanceof Error ? e.message : "Failed to load documents"
        );
        setSelectedBusinessMeta(null);
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

  const canPreviewPdf =
    selectedDocument?.file_type === "pdf" && !!selectedDocument.preview_url;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {INVOICING_DRIVE_CATEGORIES.map((cat) => {
          const isActive = cat.key === category;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setCategory(cat.key);
                setBusinessSearch("");
              }}
              title={cat.label}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                isActive
                  ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30 ring-offset-1 dark:ring-offset-dark"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-2 dark:text-gray-300 dark:hover:bg-dark-3"
              )}
            >
              {cat.shortLabel}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(200px,260px)_minmax(240px,1fr)_minmax(280px,1.2fr)] lg:items-start">
        <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
          <div className="border-b border-stroke px-3 py-2 dark:border-dark-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Businesses
            </div>
            <input
              type="search"
              value={businessSearch}
              onChange={(e) => setBusinessSearch(e.target.value)}
              placeholder="Search businesses…"
              className="mt-2 w-full rounded-lg border border-stroke bg-white px-2.5 py-1.5 text-xs text-dark placeholder:text-gray-400 focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          {businessesStatus === "loading" && (
            <div className="flex items-center gap-2 px-3 py-6 text-xs text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading businesses…
            </div>
          )}

          {businessesStatus === "error" && (
            <div className="px-3 py-4 text-xs text-red-600 dark:text-red-400">
              <p>{businessesError}</p>
              <button
                type="button"
                onClick={() => void loadBusinesses()}
                className="mt-2 font-medium text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {businessesStatus === "ready" && filteredBusinesses.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-gray-500">
              {businessSearch.trim()
                ? "No businesses match your search."
                : "No businesses found in this category."}
            </div>
          )}

          {businessesStatus === "ready" && filteredBusinesses.length > 0 && (
            <ul className="max-h-[min(70vh,640px)] divide-y divide-stroke overflow-y-auto dark:divide-dark-3">
              {filteredBusinesses.map((biz) => {
                const isActive = biz.id === selectedBusinessId;
                return (
                  <li key={biz.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedBusinessId(biz.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 font-semibold text-primary dark:bg-primary/20"
                          : "text-dark hover:bg-gray-50 dark:text-white dark:hover:bg-dark-2"
                      )}
                    >
                      <FolderOpen
                        className="h-4 w-4 shrink-0 opacity-60"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate" title={biz.name}>
                        {biz.name}
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 opacity-40",
                          isActive && "text-primary opacity-100"
                        )}
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
          <div className="border-b border-stroke px-3 py-2 dark:border-dark-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Documents
            </div>
            {selectedBusinessMeta ? (
              <p className="mt-0.5 truncate text-xs font-medium text-dark dark:text-white">
                {selectedBusinessMeta.name}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-gray-500">
                Select a business to view invoices
              </p>
            )}
          </div>

          {!selectedBusinessId && documentsStatus === "idle" && (
            <div className="px-3 py-8 text-center text-xs text-gray-500">
              Select a business from the list.
            </div>
          )}

          {documentsStatus === "loading" && (
            <div className="flex items-center gap-2 px-3 py-6 text-xs text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading documents…
            </div>
          )}

          {documentsStatus === "error" && (
            <div className="px-3 py-4 text-xs text-red-600 dark:text-red-400">
              <p>{documentsError}</p>
              <button
                type="button"
                onClick={() => void loadDocuments()}
                className="mt-2 font-medium text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {documentsStatus === "ready" && documents.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-center text-xs text-gray-500">
              <FileText className="h-8 w-8 opacity-40" />
              <p>No invoice files in this folder.</p>
            </div>
          )}

          {documentsStatus === "ready" && documents.length > 0 && (
            <ul className="max-h-[min(70vh,640px)] divide-y divide-stroke overflow-y-auto dark:divide-dark-3">
              {documents.map((doc) => {
                const isActive = doc.id === selectedDocumentId;
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedDocumentId(doc.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/30"
                          : "hover:bg-gray-50 dark:hover:bg-dark-2"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <FileText
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            isActive ? "text-indigo-600" : "opacity-50"
                          )}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-sm leading-snug",
                            isActive
                              ? "font-semibold text-indigo-900 dark:text-indigo-100"
                              : "text-dark dark:text-white"
                          )}
                          title={doc.name}
                        >
                          {doc.name}
                        </span>
                      </div>
                      <div className="ml-6 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                        <span>{fileTypeLabel(doc.file_type)}</span>
                        <span>Created {formatDriveDate(doc.created_time)}</span>
                        <span>Modified {formatDriveDate(doc.modified_time)}</span>
                        {doc.inferred_invoice_number ? (
                          <span className="font-medium text-gray-600 dark:text-gray-300">
                            #{doc.inferred_invoice_number}
                          </span>
                        ) : null}
                      </div>
                      <div className="ml-6">
                        <a
                          href={doc.web_view_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          Open in Drive
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
          {selectedDocument ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stroke px-4 py-3 dark:border-dark-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-dark dark:text-white">
                    {selectedDocument.name}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                    {fileTypeLabel(selectedDocument.file_type)}
                    {selectedDocument.inferred_invoice_number
                      ? ` · #${selectedDocument.inferred_invoice_number}`
                      : ""}
                    {` · Modified ${formatDriveDate(selectedDocument.modified_time)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={selectedDocument.web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Open in Drive
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {selectedBusinessMeta?.folder_url ? (
                    <a
                      href={selectedBusinessMeta.folder_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Open folder
                    </a>
                  ) : null}
                </div>
              </div>
              {canPreviewPdf ? (
                <div className="relative min-h-[480px] flex-1 bg-gray-100 dark:bg-dark-2">
                  <iframe
                    key={selectedDocument.id}
                    title={selectedDocument.name}
                    src={selectedDocument.preview_url}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="autoplay"
                  />
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                  <FileText className="h-10 w-10 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Preview is not available for this file type.
                  </p>
                  <a
                    href={selectedDocument.web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Open in Google Drive
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm text-gray-500">
              <FileText className="h-10 w-10 opacity-40" />
              <p>Select a document to preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
