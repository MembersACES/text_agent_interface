"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  fetchSupplierDocuments,
  fetchSupplierFolders,
  uploadSupplierDocument,
  type SupplierCategory,
  type SupplierFile,
  type SupplierFolder,
  type SupplierPathItem,
} from "@/lib/suppliers-api";

const CATEGORY_FILTERS: { id: "all" | SupplierCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "energy", label: "Energy" },
  { id: "waste", label: "Waste" },
  { id: "other", label: "Other" },
];

const CATEGORY_LABEL: Record<SupplierCategory, string> = {
  energy: "Energy",
  waste: "Waste",
  other: "Other",
};

function formatDriveDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
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
    case "slides":
      return "Slides";
    case "folder":
      return "Folder";
    default:
      return "File";
  }
}

function canPreviewFile(file: SupplierFile | null): boolean {
  if (!file?.preview_url) return false;
  return ["pdf", "image", "sheet", "doc", "slides"].includes(file.file_type);
}

function splitFilename(name: string): { stem: string; ext: string } {
  const base = name.split(/[/\\]/).pop() || name;
  const lastDot = base.lastIndexOf(".");
  if (lastDot <= 0) return { stem: base, ext: "" };
  return { stem: base.slice(0, lastDot), ext: base.slice(lastDot) };
}

function SuppliersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { accessToken?: string } | null)?.accessToken ??
    "";
  const accessToken =
    (session as { accessToken?: string } | null)?.accessToken ?? "";

  const urlSupplierId = searchParams.get("id")?.trim() || null;
  const urlFolderId = searchParams.get("folder")?.trim() || null;

  const [suppliers, setSuppliers] = useState<SupplierFolder[]>([]);
  const [parentFolderUrl, setParentFolderUrl] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | SupplierCategory>("all");
  const [selectedId, setSelectedId] = useState<string | null>(urlSupplierId);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    urlFolderId || urlSupplierId,
  );

  const [files, setFiles] = useState<SupplierFile[]>([]);
  const [subfolders, setSubfolders] = useState<SupplierFile[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<SupplierFolder | null>(null);
  const [folderPath, setFolderPath] = useState<SupplierPathItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<SupplierPathItem | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSuppliers = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchSupplierFolders(token);
      setSuppliers(data.suppliers);
      setParentFolderUrl(data.parent_folder_url);
    } catch (err: unknown) {
      setListError(err instanceof Error ? err.message : String(err));
      setSuppliers([]);
    } finally {
      setListLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    void loadSuppliers();
  }, [sessionStatus, loadSuppliers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (!q) return true;
      return row.name.toLowerCase().includes(q);
    });
  }, [suppliers, query, category]);

  const grouped = useMemo(() => {
    const order: SupplierCategory[] = ["energy", "waste", "other"];
    return order
      .map((key) => ({
        key,
        label: CATEGORY_LABEL[key],
        rows: filtered.filter((row) => row.category === key),
      }))
      .filter((group) => group.rows.length > 0);
  }, [filtered]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      setCurrentFolderId(null);
      return;
    }
    if (selectedId && filtered.some((row) => row.id === selectedId)) return;
    const fromUrl = urlSupplierId && filtered.find((row) => row.id === urlSupplierId);
    const next = fromUrl?.id ?? filtered[0].id;
    setSelectedId(next);
    setCurrentFolderId(fromUrl && urlFolderId ? urlFolderId : next);
  }, [filtered, selectedId, urlSupplierId, urlFolderId]);

  useEffect(() => {
    const currentId = searchParams.get("id")?.trim() || "";
    const urlFolderParam = searchParams.get("folder")?.trim() || "";
    const nextId = selectedId ?? "";
    const nextFolder =
      currentFolderId && selectedId && currentFolderId !== selectedId ? currentFolderId : "";
    if (currentId === nextId && urlFolderParam === nextFolder) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextId) params.set("id", nextId);
    else params.delete("id");
    if (nextFolder) params.set("folder", nextFolder);
    else params.delete("folder");
    const qs = params.toString();
    router.replace(qs ? `/suppliers?${qs}` : "/suppliers", { scroll: false });
  }, [selectedId, currentFolderId, router, searchParams]);

  const loadDocuments = useCallback(async () => {
    if (!token || !currentFolderId) {
      setFiles([]);
      setSubfolders([]);
      setSelectedMeta(null);
      setFolderPath([]);
      setCurrentFolder(null);
      setSelectedFileId(null);
      return;
    }
    setDocsLoading(true);
    setDocsError(null);
    setUploadError(null);
    try {
      const data = await fetchSupplierDocuments(token, currentFolderId);
      setFiles(data.files);
      setSubfolders(data.folders);
      setSelectedMeta(data.supplier);
      setFolderPath(data.path);
      setCurrentFolder(data.current_folder ?? null);
      setSelectedFileId(data.files.length > 0 ? data.files[0].id : null);
    } catch (err: unknown) {
      setDocsError(err instanceof Error ? err.message : String(err));
      setFiles([]);
      setSubfolders([]);
      setSelectedMeta(null);
      setFolderPath([]);
      setCurrentFolder(null);
      setSelectedFileId(null);
    } finally {
      setDocsLoading(false);
    }
  }, [token, currentFolderId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) ?? null,
    [files, selectedFileId],
  );

  const handleUpload = useCallback(
    async (file: File, displayName: string) => {
      if (!token || !currentFolderId) return;
      setUploading(true);
      setUploadError(null);
      setUploadNotice(null);
      try {
        const result = await uploadSupplierDocument(
          token,
          currentFolderId,
          file,
          accessToken,
          displayName,
        );
        setUploadNotice(`Uploaded ${result.name}`);
        setPendingFile(null);
        await loadDocuments();
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
      }
    },
    [token, currentFolderId, accessToken, loadDocuments],
  );

  const onPickFiles = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    const { stem } = splitFilename(file.name);
    setPendingFile(file);
    setUploadName(stem);
    setUploadError(null);
    setUploadNotice(null);
  };

  const closeRenameModal = () => {
    if (uploading) return;
    setPendingFile(null);
  };

  const confirmUpload = () => {
    if (!pendingFile || !uploadName.trim()) return;
    const { ext } = splitFilename(pendingFile.name);
    const typed = uploadName.trim();
    const displayName =
      ext && !typed.toLowerCase().endsWith(ext.toLowerCase()) ? `${typed}${ext}` : typed;
    void handleUpload(pendingFile, displayName);
  };

  const openSupplier = (id: string) => {
    setSelectedId(id);
    setCurrentFolderId(id);
    setSelectedFileId(null);
    setUploadNotice(null);
    setUploadError(null);
  };

  const canPreview = canPreviewFile(selectedFile);
  const driveFolderUrl = currentFolder?.folder_url || selectedMeta?.folder_url;
  const nested = Boolean(selectedId && currentFolderId && currentFolderId !== selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        pageName="Suppliers"
        title="Suppliers"
        description="Energy, waste, and other supplier folders from Google Drive. Open a supplier to view forms and upload new documents."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void loadSuppliers();
                void loadDocuments();
              }}
              disabled={listLoading || docsLoading || !token}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
            {parentFolderUrl ? (
              <a
                href={parentFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-2"
              >
                Open Drive folder
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suppliers…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                category === item.id
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-2 dark:text-gray-300 dark:hover:bg-dark-3",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {sessionStatus === "unauthenticated" || !token ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          Sign in to view supplier folders.
        </p>
      ) : listLoading && suppliers.length === 0 ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : listError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-medium">{listError}</p>
          <Button className="mt-2" variant="secondary" onClick={() => void loadSuppliers()}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-10 w-10" />}
          title={query.trim() || category !== "all" ? "No matching suppliers" : "No supplier folders"}
          description={
            query.trim() || category !== "all"
              ? "Try another search or category."
              : "Share 005-Suppliers → Supplier Folders with the service account, then set SUPPLIER_FOLDERS_PARENT_ID if Drive search cannot find it."
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr] lg:items-start">
          <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
            <div className="border-b border-stroke px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-dark-3 dark:text-gray-400">
              {filtered.length} supplier{filtered.length === 1 ? "" : "s"}
            </div>
            <div className="max-h-[min(70vh,720px)] overflow-y-auto">
              {grouped.map((group) => (
                <div key={group.key}>
                  <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-dark-2 dark:text-gray-400">
                    {group.label}
                  </div>
                  <ul className="divide-y divide-stroke dark:divide-dark-3">
                    {group.rows.map((row) => {
                      const isActive = selectedId === row.id;
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            onClick={() => openSupplier(row.id)}
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                              isActive
                                ? "bg-primary/10 font-semibold text-primary dark:bg-primary/20"
                                : "text-dark hover:bg-gray-50 dark:text-white dark:hover:bg-dark-2",
                            )}
                          >
                            <FolderOpen className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                            <span className="min-w-0 flex-1 truncate" title={row.name}>
                              {row.name}
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
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-dark dark:text-white">
                    {selectedMeta?.name || "Supplier"}
                  </h2>
                  {folderPath.length > 0 ? (
                    <nav className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      {folderPath.map((crumb, index) => {
                        const isLast = index === folderPath.length - 1;
                        return (
                          <span key={crumb.id} className="inline-flex min-w-0 items-center gap-1">
                            {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-50" /> : null}
                            {isLast ? (
                              <span className="truncate font-medium text-dark dark:text-white">
                                {crumb.name}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentFolderId(crumb.id);
                                  setUploadNotice(null);
                                  setUploadError(null);
                                }}
                                className="truncate hover:text-primary hover:underline"
                              >
                                {crumb.name}
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </nav>
                  ) : selectedMeta ? (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {CATEGORY_LABEL[selectedMeta.category]} · click a folder to browse files
                    </p>
                  ) : null}
                </div>
                {driveFolderUrl ? (
                  <a
                    href={driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Open in Drive
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  onPickFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onPickFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-stroke dark:border-dark-3",
                )}
              >
                <Upload className="mb-2 h-5 w-5 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Drop a document here, or
                </p>
                <Button
                  className="mt-2"
                  size="sm"
                  disabled={!currentFolderId || uploading}
                  loading={uploading}
                  leftIcon={<Upload className="h-4 w-4" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload document
                </Button>
                <p className="mt-2 text-xs text-gray-400">
                  {nested && currentFolder
                    ? `Saves into ${currentFolder.name}. You can rename it before upload.`
                    : "You can rename the file before it is saved. PDF, Word, Excel, images — max 50 MB"}
                </p>
              </div>
              {uploadError ? (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
              ) : null}
              {uploadNotice ? (
                <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{uploadNotice}</p>
              ) : null}
            </div>

            {docsLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Loading documents…
              </div>
            ) : docsError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {docsError}
                <button
                  type="button"
                  onClick={() => void loadDocuments()}
                  className="ml-2 font-medium text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[minmax(220px,280px)_1fr] xl:items-start">
                <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
                  <div className="border-b border-stroke px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-dark-3 dark:text-gray-400">
                    {currentFolder?.name || "Documents"}
                  </div>
                  {subfolders.length === 0 && files.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-gray-500">
                      No files in this folder yet.
                    </p>
                  ) : (
                    <ul className="max-h-[min(50vh,480px)] divide-y divide-stroke overflow-y-auto dark:divide-dark-3">
                      {subfolders.map((folder) => (
                        <li key={folder.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentFolderId(folder.id);
                              setSelectedFileId(null);
                              setUploadNotice(null);
                              setUploadError(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-dark hover:bg-gray-50 dark:text-white dark:hover:bg-dark-2"
                          >
                            <FolderOpen className="h-4 w-4 shrink-0 opacity-60" />
                            <span className="min-w-0 flex-1 truncate" title={folder.name}>
                              {folder.name}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 opacity-40" />
                          </button>
                        </li>
                      ))}
                      {files.map((file) => {
                        const isActive = selectedFile?.id === file.id;
                        return (
                          <li key={file.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedFileId(file.id)}
                              className={cn(
                                "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                                isActive
                                  ? "bg-primary/10 font-semibold text-primary dark:bg-primary/20"
                                  : "text-dark hover:bg-gray-50 dark:text-white dark:hover:bg-dark-2",
                              )}
                            >
                              <FileText className="h-4 w-4 shrink-0 opacity-60" />
                              <span className="min-w-0 flex-1 truncate" title={file.name}>
                                {file.name}
                              </span>
                              <span className="shrink-0 text-[10px] font-medium uppercase text-gray-400">
                                {fileTypeLabel(file.file_type)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {selectedFile ? (
                  <div className="flex min-h-[min(50vh,480px)] flex-col overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stroke px-4 py-3 dark:border-dark-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-dark dark:text-white">
                          {selectedFile.name}
                        </h3>
                        {formatDriveDate(selectedFile.modified_time || selectedFile.created_time) ? (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            Updated {formatDriveDate(selectedFile.modified_time || selectedFile.created_time)}
                          </p>
                        ) : null}
                      </div>
                      <a
                        href={selectedFile.web_view_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Open in Drive
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {canPreview ? (
                      <div className="relative min-h-[420px] flex-1 bg-gray-100 dark:bg-dark-2">
                        <iframe
                          key={selectedFile.id}
                          title={selectedFile.name}
                          src={selectedFile.preview_url || ""}
                          className="absolute inset-0 h-full w-full border-0"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center px-4 py-12 text-center text-sm text-gray-500">
                        Preview is not available for this file type. Open it in Drive to view it.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-stroke px-4 py-10 text-center text-sm text-gray-500 dark:border-dark-3">
                    {subfolders.length > 0
                      ? "Click a folder to browse, or a file to preview it here."
                      : "No document selected."}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={Boolean(pendingFile)}
        onClose={closeRenameModal}
        title="Rename upload"
        id="supplier-rename-upload"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeRenameModal} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={confirmUpload}
              disabled={!uploadName.trim() || uploading}
              loading={uploading}
            >
              Upload
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Saving into{" "}
            <span className="font-medium text-dark dark:text-white">
              {currentFolder?.name || selectedMeta?.name || "this folder"}
            </span>
            . Change the name if you want, then upload.
          </p>
          {pendingFile ? (
            <p className="truncate text-xs text-gray-400" title={pendingFile.name}>
              Original: {pendingFile.name}
            </p>
          ) : null}
          <div className="flex items-end gap-2">
            <Input
              label="File name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmUpload();
                }
              }}
              wrapperClassName="flex-1"
            />
            {pendingFile && splitFilename(pendingFile.name).ext ? (
              <span className="mb-px shrink-0 rounded-md border border-gray-300 bg-gray-50 px-2 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {splitFilename(pendingFile.name).ext}
              </span>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader pageName="Suppliers" title="Suppliers" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <SuppliersPageInner />
    </Suspense>
  );
}
