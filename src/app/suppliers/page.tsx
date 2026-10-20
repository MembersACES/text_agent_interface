"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen,
  FolderPlus,
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
  createSupplierFolder,
  fetchSupplierDocuments,
  fetchSupplierFolders,
  fetchSupplierSheetTabs,
  uploadSupplierDocument,
  type SupplierCategory,
  type SupplierFile,
  type SupplierFolder,
  type SupplierPathItem,
  type SupplierSheetTab,
} from "@/lib/suppliers-api";

const CATEGORY_FILTERS: { id: "all" | SupplierCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "energy", label: "Energy" },
  { id: "waste", label: "Waste" },
  { id: "other", label: "Other" },
];

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

function isGoogleSheet(file: SupplierFile | null): boolean {
  return file?.mime_type === "application/vnd.google-apps.spreadsheet";
}

function sheetPreviewUrl(fileId: string, gid?: string | null): string {
  const base = `https://docs.google.com/spreadsheets/d/${fileId}/preview?rm=minimal`;
  if (!gid) return base;
  return `${base}&gid=${gid}#gid=${gid}`;
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
  const [filesLoading, setFilesLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [sheetTabs, setSheetTabs] = useState<SupplierSheetTab[]>([]);
  const [sheetTabGid, setSheetTabGid] = useState<string | null>(null);
  const [sheetTabsLoading, setSheetTabsLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderRequest = useRef(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  useEffect(() => {
    if (listLoading || !selectedId || suppliers.length === 0) return;
    if (suppliers.some((row) => row.id === selectedId)) return;
    setSelectedId(null);
    setCurrentFolderId(null);
  }, [listLoading, suppliers, selectedId]);

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
      setDocsLoading(false);
      setFilesLoading(false);
      return;
    }
    const requestId = folderRequest.current + 1;
    folderRequest.current = requestId;
    const folderId = currentFolderId;
    setDocsLoading(true);
    setFilesLoading(true);
    setDocsError(null);
    setFilesError(null);
    setUploadError(null);
    setSubfolders([]);
    setFiles([]);
    setFolderPath([]);
    let foldersReady = false;
    try {
      const folderData = await fetchSupplierDocuments(token, folderId, "folders");
      if (folderRequest.current !== requestId) return;
      setSubfolders(folderData.folders);
      setSelectedMeta(folderData.supplier);
      setFolderPath(folderData.path);
      setCurrentFolder(folderData.current_folder ?? null);
      foldersReady = true;
      setDocsLoading(false);
      const fileData = await fetchSupplierDocuments(token, folderId, "files");
      if (folderRequest.current !== requestId) return;
      setFiles(fileData.files);
      setSelectedFileId((current) =>
        current && fileData.files.some((file) => file.id === current) ? current : null,
      );
    } catch (err: unknown) {
      if (folderRequest.current !== requestId) return;
      const message = err instanceof Error ? err.message : String(err);
      if (foldersReady) setFilesError(message);
      else setDocsError(message);
    } finally {
      if (folderRequest.current === requestId) {
        setDocsLoading(false);
        setFilesLoading(false);
      }
    }
  }, [token, currentFolderId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) ?? null,
    [files, selectedFileId],
  );
  const selectedIsSheet = isGoogleSheet(selectedFile);
  const selectedSheetId = selectedIsSheet ? selectedFile?.id ?? null : null;

  useEffect(() => {
    if (!token || !selectedSheetId) {
      setSheetTabs([]);
      setSheetTabGid(null);
      setSheetTabsLoading(false);
      return;
    }
    let cancelled = false;
    setSheetTabsLoading(true);
    (async () => {
      try {
        const tabs = await fetchSupplierSheetTabs(token, selectedSheetId);
        if (cancelled) return;
        setSheetTabs(tabs);
        setSheetTabGid((current) =>
          current && tabs.some((tab) => tab.gid === current) ? current : (tabs[0]?.gid ?? null),
        );
      } catch {
        if (!cancelled) {
          setSheetTabs([]);
          setSheetTabGid(null);
        }
      } finally {
        if (!cancelled) setSheetTabsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, selectedSheetId]);

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
    setQuery("");
    setSelectedId(id);
    setCurrentFolderId(id);
    setSelectedFileId(null);
    setUploadNotice(null);
    setUploadError(null);
  };

  const backToSuppliers = () => {
    setQuery("");
    setSelectedId(null);
    setCurrentFolderId(null);
    setSelectedFileId(null);
    setUploadNotice(null);
    setUploadError(null);
  };

  const openCreateModal = () => {
    setCreateName("");
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
    setCreateError(null);
  };

  const confirmCreate = async () => {
    const name = createName.trim();
    if (!token || !name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createSupplierFolder(token, name, accessToken);
      setCreateOpen(false);
      setCreateName("");
      setCategory("all");
      setQuery("");
      await loadSuppliers();
      setSelectedId(created.id);
      setCurrentFolderId(created.id);
      setUploadNotice(
        created.created
          ? `Created ${created.name}`
          : `${created.name} already exists — opened that folder`,
      );
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const canPreview = canPreviewFile(selectedFile);
  const insideSupplier = Boolean(selectedId);
  const driveLink =
    selectedFile?.web_view_link ||
    currentFolder?.folder_url ||
    selectedMeta?.folder_url ||
    parentFolderUrl;
  const folderQuery = query.trim().toLowerCase();
  const visibleFolders = insideSupplier
    ? subfolders.filter((folder) => !folderQuery || folder.name.toLowerCase().includes(folderQuery))
    : [];
  const visibleFiles = insideSupplier
    ? files.filter((file) => !folderQuery || file.name.toLowerCase().includes(folderQuery))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        pageName="Suppliers"
        title="Suppliers"
        description="Energy, waste, and other supplier folders from Google Drive. Open a supplier to browse folders, preview sheets, and upload documents."
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
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={!token || !currentFolderId || uploading}
              loading={uploading}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              Upload
            </Button>
            <Button
              onClick={openCreateModal}
              disabled={!token}
              leftIcon={<FolderPlus className="h-4 w-4" />}
            >
              New supplier
            </Button>
            {driveLink ? (
              <a
                href={driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-2"
              >
                Open in Drive
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          onPickFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {sessionStatus === "unauthenticated" || !token ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          Sign in to view supplier folders.
        </p>
      ) : listLoading && suppliers.length === 0 && !selectedId ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : listError && !selectedId ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-medium">{listError}</p>
          <Button className="mt-2" variant="secondary" onClick={() => void loadSuppliers()}>
            Retry
          </Button>
        </div>
      ) : suppliers.length === 0 && !selectedId ? (
        <EmptyState
          icon={<FolderOpen className="h-10 w-10" />}
          title="No supplier folders"
          description="Share 005-Suppliers → Supplier Folders with the service account, then set SUPPLIER_FOLDERS_PARENT_ID if Drive search cannot find it."
          action={
            <Button onClick={openCreateModal} leftIcon={<FolderPlus className="h-4 w-4" />}>
              New supplier
            </Button>
          }
        />
      ) : (
        <div className="grid min-h-[calc(100vh-13.5rem)] gap-4 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] lg:items-stretch">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
            {insideSupplier ? (
              <div className="border-b border-stroke px-3 py-2 dark:border-dark-3">
                <button
                  type="button"
                  onClick={backToSuppliers}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-primary dark:text-gray-400"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  All suppliers
                </button>
                <h2 className="mt-1 truncate text-sm font-semibold text-dark dark:text-white">
                  {selectedMeta?.name ||
                    suppliers.find((row) => row.id === selectedId)?.name ||
                    "Supplier"}
                </h2>
                {folderPath.length > 1 ? (
                  <nav className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    {folderPath.map((crumb, index) => {
                      const isLast = index === folderPath.length - 1;
                      return (
                        <span key={crumb.id} className="inline-flex min-w-0 items-center gap-1">
                          {index > 0 ? (
                            <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                          ) : null}
                          {isLast ? (
                            <span className="truncate font-medium text-dark dark:text-white">
                              {crumb.name}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setQuery("");
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
                ) : null}
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search this folder…"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 border-b border-stroke px-3 py-2 dark:border-dark-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search suppliers…"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {CATEGORY_FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id)}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
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
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {insideSupplier ? (
                docsLoading ? (
                  <div className="flex items-center gap-2 px-3 py-6 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Loading…
                  </div>
                ) : docsError ? (
                  <div className="px-3 py-4 text-sm text-red-600 dark:text-red-400">
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
                  <>
                    {uploadError ? (
                      <p className="px-3 pt-2 text-xs text-red-600 dark:text-red-400">{uploadError}</p>
                    ) : null}
                    {uploadNotice ? (
                      <p className="px-3 pt-2 text-xs text-emerald-700 dark:text-emerald-400">
                        {uploadNotice}
                      </p>
                    ) : null}
                    {visibleFolders.length === 0 && visibleFiles.length === 0 && !filesLoading ? (
                      <p className="px-3 py-8 text-center text-sm text-gray-500">
                        {folderQuery ? "Nothing in this folder matches." : "This folder is empty."}
                      </p>
                    ) : (
                      <ul className="divide-y divide-stroke dark:divide-dark-3">
                        {visibleFolders.map((folder) => (
                          <li key={folder.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setQuery("");
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
                        {visibleFiles.map((file) => {
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
                        {filesLoading ? (
                          <li className="flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading files…
                          </li>
                        ) : null}
                      </ul>
                    )}
                    {filesError ? (
                      <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{filesError}</p>
                    ) : null}
                  </>
                )
              ) : filtered.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-gray-500">
                  No matching suppliers.
                </p>
              ) : (
                <ul className="divide-y divide-stroke dark:divide-dark-3">
                  {filtered.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => openSupplier(row.id)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-dark hover:bg-gray-50 dark:text-white dark:hover:bg-dark-2"
                      >
                        <FolderOpen className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                        <span className="min-w-0 flex-1 truncate" title={row.name}>
                          {row.name}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex min-h-[calc(100vh-13.5rem)] min-w-0 flex-col overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
            {selectedFile ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-stroke px-4 py-3 dark:border-dark-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-dark dark:text-white">
                      {selectedFile.name}
                    </h3>
                    {formatDriveDate(selectedFile.modified_time || selectedFile.created_time) ? (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Updated{" "}
                        {formatDriveDate(selectedFile.modified_time || selectedFile.created_time)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {selectedIsSheet && (sheetTabsLoading || sheetTabs.length > 0) ? (
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-stroke bg-white px-3 py-2 dark:border-dark-3 dark:bg-gray-dark">
                    {sheetTabsLoading && sheetTabs.length === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading tabs…
                      </span>
                    ) : (
                      sheetTabs.map((tab) => {
                        const isActive = tab.gid === sheetTabGid;
                        return (
                          <button
                            key={tab.gid}
                            type="button"
                            onClick={() => setSheetTabGid(tab.gid)}
                            title={tab.name}
                            className={cn(
                              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                              isActive
                                ? "bg-dark text-white dark:bg-white dark:text-dark"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-2 dark:text-gray-300 dark:hover:bg-dark-3",
                            )}
                          >
                            {tab.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : null}
                {canPreview ? (
                  <div className="relative min-h-0 flex-1 overflow-hidden bg-gray-100 dark:bg-dark-2">
                    <iframe
                      key={
                        selectedIsSheet
                          ? `${selectedFile.id}-${sheetTabGid ?? "sheet"}`
                          : selectedFile.id
                      }
                      title={selectedFile.name}
                      src={
                        selectedIsSheet
                          ? sheetPreviewUrl(selectedFile.id, sheetTabGid)
                          : selectedFile.preview_url || ""
                      }
                      className={cn(
                        "absolute left-0 w-full border-0",
                        selectedIsSheet ? "top-0 h-[calc(100%+44px)]" : "inset-0 h-full",
                      )}
                    />
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center px-4 py-12 text-center text-sm text-gray-500">
                    Preview is not available for this file type. Open it in Drive to view it.
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
                {insideSupplier
                  ? "Select a file to preview it."
                  : "Select a supplier to browse its folders."}
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

      <Modal
        open={createOpen}
        onClose={closeCreateModal}
        title="New supplier folder"
        id="supplier-create-folder"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeCreateModal} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={() => void confirmCreate()}
              disabled={!createName.trim() || creating}
              loading={creating}
              leftIcon={<FolderPlus className="h-4 w-4" />}
            >
              Create folder
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Creates a folder under Supplier Folders in Drive. You can upload documents into it
            afterwards.
          </p>
          <Input
            label="Supplier name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="e.g. Visy"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void confirmCreate();
              }
            }}
          />
          {createError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
          ) : null}
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
