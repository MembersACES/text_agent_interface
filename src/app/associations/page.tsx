"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
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
import { Textarea } from "@/components/ui/textarea";
import { TESTIMONIAL_STATUSES } from "@/constants/crm";
import {
  ASSOCIATION_STATUS_OPTIONS,
  associationStatusLabel,
  createAssociation,
  fetchAssociationDocuments,
  fetchAssociationTestimonials,
  fetchAssociations,
  syncAssociationsFromDrive,
  updateAssociation,
  uploadAssociationDocument,
  type Association,
  type AssociationFile,
  type AssociationPathItem,
  type AssociationStatus,
  type AssociationTestimonial,
} from "@/lib/associations-api";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-dark focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white";

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

function canPreviewFile(file: AssociationFile | null): boolean {
  if (!file?.preview_url) return false;
  return ["pdf", "image", "sheet", "doc", "slides"].includes(file.file_type);
}

function splitFilename(name: string): { stem: string; ext: string } {
  const base = name.split(/[/\\]/).pop() || name;
  const lastDot = base.lastIndexOf(".");
  if (lastDot <= 0) return { stem: base, ext: "" };
  return { stem: base.slice(0, lastDot), ext: base.slice(lastDot) };
}

function statusClass(status: string): string {
  if (status === "working_with") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200";
  }
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
}

function AssociationsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { accessToken?: string } | null)?.accessToken ??
    "";
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? "";

  const urlAssociationId = Number(searchParams.get("id") || "");
  const urlFolderId = searchParams.get("folder")?.trim() || null;

  const [associations, setAssociations] = useState<Association[]>([]);
  const [parentFolderUrl, setParentFolderUrl] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isFinite(urlAssociationId) && urlAssociationId > 0 ? urlAssociationId : null,
  );
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(urlFolderId);

  const [files, setFiles] = useState<AssociationFile[]>([]);
  const [subfolders, setSubfolders] = useState<AssociationFile[]>([]);
  const [folderPath, setFolderPath] = useState<AssociationPathItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<AssociationPathItem | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const [testimonials, setTestimonials] = useState<AssociationTestimonial[]>([]);
  const [testimonialsError, setTestimonialsError] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [registerTestimonial, setRegisterTestimonial] = useState(false);
  const [testimonialSavings, setTestimonialSavings] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createStatus, setCreateStatus] = useState<AssociationStatus>("targeting");
  const [createContact, setCreateContact] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  const [savingDetails, setSavingDetails] = useState(false);
  const [draftStatus, setDraftStatus] = useState<AssociationStatus>("targeting");
  const [draftContact, setDraftContact] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftResults, setDraftResults] = useState("");
  const [syncing, setSyncing] = useState(false);

  const selected = useMemo(
    () => associations.find((row) => row.id === selectedId) ?? null,
    [associations, selectedId],
  );

  const loadAssociations = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchAssociations(token);
      setAssociations(data.associations);
      setParentFolderUrl(data.parent_folder_url);
    } catch (err: unknown) {
      setListError(err instanceof Error ? err.message : String(err));
      setAssociations([]);
    } finally {
      setListLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    void loadAssociations();
  }, [sessionStatus, loadAssociations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return associations;
    return associations.filter((row) => {
      const haystack = [
        row.name,
        associationStatusLabel(row.status),
        row.contact_name,
        row.contact_email,
        row.notes,
        row.results_note,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [associations, query]);

  useEffect(() => {
    if (associations.length === 0) return;
    const match = selectedId ? associations.find((row) => row.id === selectedId) : undefined;
    if (match) {
      if (!currentFolderId && match.drive_folder_id) {
        setCurrentFolderId(urlFolderId || match.drive_folder_id);
      }
      return;
    }
    const fromUrl =
      Number.isFinite(urlAssociationId) && urlAssociationId > 0
        ? associations.find((row) => row.id === urlAssociationId)
        : undefined;
    const next = fromUrl ?? associations[0];
    setSelectedId(next.id);
    setCurrentFolderId(fromUrl && urlFolderId ? urlFolderId : next.drive_folder_id);
  }, [associations, selectedId, currentFolderId, urlAssociationId, urlFolderId]);

  useEffect(() => {
    const currentId = searchParams.get("id")?.trim() || "";
    const urlFolderParam = searchParams.get("folder")?.trim() || "";
    const nextId = selectedId ? String(selectedId) : "";
    const rootId = selected?.drive_folder_id || "";
    const nextFolder =
      currentFolderId && rootId && currentFolderId !== rootId ? currentFolderId : "";
    if (currentId === nextId && urlFolderParam === nextFolder) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextId) params.set("id", nextId);
    else params.delete("id");
    if (nextFolder) params.set("folder", nextFolder);
    else params.delete("folder");
    const qs = params.toString();
    router.replace(qs ? `/associations?${qs}` : "/associations", { scroll: false });
  }, [selectedId, currentFolderId, selected?.drive_folder_id, router, searchParams]);

  const draftSourceId = selected?.id;
  const draftSourceUpdatedAt = selected?.updated_at;
  const draftSourceStatus = selected?.status;
  const draftSourceContact = selected?.contact_name;
  const draftSourceEmail = selected?.contact_email;
  const draftSourceNotes = selected?.notes;
  const draftSourceResults = selected?.results_note;

  useEffect(() => {
    if (!draftSourceId) return;
    setDraftStatus(draftSourceStatus === "working_with" ? "working_with" : "targeting");
    setDraftContact(draftSourceContact ?? "");
    setDraftEmail(draftSourceEmail ?? "");
    setDraftNotes(draftSourceNotes ?? "");
    setDraftResults(draftSourceResults ?? "");
  }, [
    draftSourceId,
    draftSourceUpdatedAt,
    draftSourceStatus,
    draftSourceContact,
    draftSourceEmail,
    draftSourceNotes,
    draftSourceResults,
  ]);

  const loadDocuments = useCallback(async () => {
    if (!token || !selectedId) {
      setFiles([]);
      setSubfolders([]);
      setFolderPath([]);
      setCurrentFolder(null);
      setSelectedFileId(null);
      return;
    }
    setDocsLoading(true);
    setDocsError(null);
    try {
      const data = await fetchAssociationDocuments(token, selectedId, currentFolderId, accessToken);
      setFiles(data.files);
      setSubfolders(data.folders);
      setFolderPath(data.path);
      setCurrentFolder(data.current_folder ?? null);
      setSelectedFileId(data.files.length > 0 ? data.files[0].id : null);
    } catch (err: unknown) {
      setDocsError(err instanceof Error ? err.message : String(err));
      setFiles([]);
      setSubfolders([]);
      setFolderPath([]);
      setCurrentFolder(null);
      setSelectedFileId(null);
    } finally {
      setDocsLoading(false);
    }
  }, [token, selectedId, currentFolderId, accessToken]);

  const loadTestimonials = useCallback(async () => {
    if (!token || !selectedId) {
      setTestimonials([]);
      return;
    }
    setTestimonialsError(null);
    try {
      setTestimonials(await fetchAssociationTestimonials(token, selectedId));
    } catch (err: unknown) {
      setTestimonialsError(err instanceof Error ? err.message : String(err));
      setTestimonials([]);
    }
  }, [token, selectedId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    void loadTestimonials();
  }, [loadTestimonials]);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? null,
    [files, selectedFileId],
  );
  const testimonialFileIds = useMemo(
    () => new Set(testimonials.map((item) => item.file_id).filter(Boolean)),
    [testimonials],
  );

  const openAssociation = (row: Association) => {
    setSelectedId(row.id);
    setCurrentFolderId(row.drive_folder_id);
    setSelectedFileId(null);
    setUploadError(null);
    setNotice(null);
    setPageError(null);
  };

  const handleCreate = async () => {
    if (!token || !createName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createAssociation(
        token,
        {
          name: createName.trim(),
          status: createStatus,
          contact_name: createContact.trim() || undefined,
          contact_email: createEmail.trim() || undefined,
          notes: createNotes.trim() || undefined,
        },
        accessToken,
      );
      setAssociations((prev) =>
        [...prev.filter((row) => row.id !== created.id), created].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setSelectedId(created.id);
      setCurrentFolderId(created.drive_folder_id);
      setCreateOpen(false);
      setCreateName("");
      setCreateContact("");
      setCreateEmail("");
      setCreateNotes("");
      setCreateStatus("targeting");
      setNotice(
        created.warnings.length
          ? `Created ${created.name}. ${created.warnings.join(" ")}`
          : `Created ${created.name} and its Drive folder.`,
      );
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!token || !selected) return;
    setSavingDetails(true);
    setPageError(null);
    try {
      const updated = await updateAssociation(
        token,
        selected.id,
        {
          status: draftStatus,
          contact_name: draftContact,
          contact_email: draftEmail,
          notes: draftNotes,
          results_note: draftResults,
        },
        accessToken,
      );
      setAssociations((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setNotice(`Saved ${updated.name}.`);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSync = async () => {
    if (!token) return;
    setSyncing(true);
    setPageError(null);
    try {
      const data = await syncAssociationsFromDrive(token, accessToken);
      setAssociations(data.associations);
      setParentFolderUrl(data.parent_folder_url);
      const parts = [`Adopted ${data.adopted} folder${data.adopted === 1 ? "" : "s"}`];
      if (data.linked) parts.push(`linked ${data.linked}`);
      if (data.skipped.length) parts.push(data.skipped.join(" "));
      setNotice(parts.join(". ") + ".");
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  };

  const handleUpload = async (file: File, displayName: string) => {
    if (!token || !selectedId) return;
    setUploading(true);
    setUploadError(null);
    setNotice(null);
    try {
      const result = await uploadAssociationDocument(
        token,
        selectedId,
        registerTestimonial ? selected?.testimonials_folder_id || currentFolderId : currentFolderId,
        file,
        accessToken,
        displayName,
        registerTestimonial,
        testimonialSavings,
      );
      setNotice(
        result.testimonial
          ? `Uploaded ${result.name} and added it to the testimonial register as a draft.`
          : `Uploaded ${result.name}`,
      );
      setPendingFile(null);
      setRegisterTestimonial(false);
      setTestimonialSavings("");
      if (result.testimonial && result.folder_id) {
        setCurrentFolderId(result.folder_id);
      }
      await Promise.all([loadDocuments(), loadTestimonials(), loadAssociations()]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const onPickFiles = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    const { stem } = splitFilename(file.name);
    setPendingFile(file);
    setUploadName(stem);
    setUploadError(null);
    setRegisterTestimonial(false);
    setTestimonialSavings("");
  };

  const confirmUpload = () => {
    if (!pendingFile || !uploadName.trim()) return;
    const { ext } = splitFilename(pendingFile.name);
    const typed = uploadName.trim();
    const displayName =
      ext && !typed.toLowerCase().endsWith(ext.toLowerCase()) ? `${typed}${ext}` : typed;
    void handleUpload(pendingFile, displayName);
  };

  const updateTestimonialStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPageError(typeof data.error === "string" ? data.error : "Failed to update testimonial status.");
        return;
      }
      setTestimonials((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      await loadAssociations();
    } catch {
      setPageError("Failed to update testimonial status.");
    }
  };

  const canPreview = canPreviewFile(selectedFile);
  const driveFolderUrl = currentFolder?.folder_url || selected?.drive_folder_url || "";
  const nested = Boolean(
    selected?.drive_folder_id && currentFolderId && currentFolderId !== selected.drive_folder_id,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        pageName="Associations"
        title="Associations"
        description="Associations we are targeting or working with. Creating one adds a folder in the shared Drive, with a Testimonials folder for endorsements."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void loadAssociations();
                void loadDocuments();
                void loadTestimonials();
              }}
              disabled={listLoading || docsLoading || !token}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleSync()}
              disabled={!token || syncing}
              loading={syncing}
              leftIcon={<FolderOpen className="h-4 w-4" />}
            >
              Adopt Drive folders
            </Button>
            <Button
              onClick={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
              leftIcon={<FolderPlus className="h-4 w-4" />}
            >
              New association
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

      <div className="relative min-w-[220px] max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search associations…"
          className="pl-9"
        />
      </div>

      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
          {notice}
        </p>
      ) : null}
      {pageError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {pageError}
        </p>
      ) : null}

      {sessionStatus === "unauthenticated" || !token ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          Sign in to view associations.
        </p>
      ) : listLoading && associations.length === 0 ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : listError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-medium">{listError}</p>
          <Button className="mt-2" variant="secondary" onClick={() => void loadAssociations()}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-10 w-10" />}
          title={query.trim() ? "No matching associations" : "No associations yet"}
          description={
            query.trim()
              ? "Try another search."
              : "Create an association to add its Drive folder, or adopt folders that are already in the shared Drive."
          }
          action={
            query.trim() ? undefined : (
              <Button onClick={() => setCreateOpen(true)} leftIcon={<FolderPlus className="h-4 w-4" />}>
                New association
              </Button>
            )
          }
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
          <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
            <div className="border-b border-stroke px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-dark-3 dark:text-gray-400">
              {filtered.length} association{filtered.length === 1 ? "" : "s"}
            </div>
            <ul className="max-h-[min(70vh,720px)] divide-y divide-stroke overflow-y-auto dark:divide-dark-3">
              {filtered.map((row) => {
                const isActive = selectedId === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => openAssociation(row)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 font-semibold text-primary dark:bg-primary/20"
                          : "text-dark hover:bg-gray-50 dark:text-white dark:hover:bg-dark-2",
                      )}
                    >
                      <FolderOpen className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate" title={row.name}>
                          {row.name}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1">
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                              statusClass(row.status),
                            )}
                          >
                            {associationStatusLabel(row.status)}
                          </span>
                          {row.endorsed ? (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                              Endorsed
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <ChevronRight
                        className={cn("h-4 w-4 shrink-0 opacity-40", isActive && "text-primary opacity-100")}
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected ? (
            <div className="min-w-0 space-y-4">
              <div className="rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-dark dark:text-white">{selected.name}</h2>
                    {folderPath.length > 0 ? (
                      <nav className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        {folderPath.map((crumb, index) => {
                          const isLast = index === folderPath.length - 1;
                          const label = index === 0 ? selected.name : crumb.name;
                          return (
                            <span key={crumb.id} className="inline-flex min-w-0 items-center gap-1">
                              {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-50" /> : null}
                              {isLast ? (
                                <span className="truncate font-medium text-dark dark:text-white">{label}</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentFolderId(crumb.id);
                                    setUploadError(null);
                                  }}
                                  className="truncate hover:text-primary hover:underline"
                                >
                                  {label}
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </nav>
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

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-dark dark:text-white">Status</span>
                    <select
                      className={SELECT_CLASS}
                      value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value as AssociationStatus)}
                    >
                      {ASSOCIATION_STATUS_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Contact"
                    value={draftContact}
                    onChange={(e) => setDraftContact(e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                  />
                  <Textarea
                    label="Notes"
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    rows={2}
                  />
                  <Textarea
                    label="Results for the membership"
                    hint="Used when writing the association endorsement."
                    value={draftResults}
                    onChange={(e) => setDraftResults(e.target.value)}
                    rows={2}
                    wrapperClassName="sm:col-span-2"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => void handleSaveDetails()} loading={savingDetails}>
                    Save details
                  </Button>
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
                    dragOver ? "border-primary bg-primary/5" : "border-stroke dark:border-dark-3",
                  )}
                >
                  <Upload className="mb-2 h-5 w-5 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">Drop a document here, or</p>
                  <Button
                    className="mt-2"
                    size="sm"
                    disabled={!selected.drive_folder_id || uploading}
                    loading={uploading}
                    leftIcon={<Upload className="h-4 w-4" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload document
                  </Button>
                  <p className="mt-2 text-xs text-gray-400">
                    {nested && currentFolder
                      ? `Saves into ${currentFolder.name}. Mark it as a testimonial to file it under Testimonials.`
                      : "You can rename the file before it is saved. PDF, Word, Excel, images — max 50 MB."}
                  </p>
                </div>
                {uploadError ? (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
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
                <div className="grid items-start gap-4 xl:grid-cols-[minmax(220px,280px)_1fr]">
                  <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
                    <div className="border-b border-stroke px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-dark-3 dark:text-gray-400">
                      {currentFolder?.name || "Documents"}
                    </div>
                    {subfolders.length === 0 && files.length === 0 ? (
                      <p className="px-3 py-8 text-center text-sm text-gray-500">No files in this folder yet.</p>
                    ) : (
                      <ul className="max-h-[min(50vh,480px)] divide-y divide-stroke overflow-y-auto dark:divide-dark-3">
                        {subfolders.map((folder) => (
                          <li key={folder.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentFolderId(folder.id);
                                setSelectedFileId(null);
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
                          const isTestimonial = testimonialFileIds.has(file.id);
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
                                {isTestimonial ? (
                                  <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                    Testimonial
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-[10px] font-medium uppercase text-gray-400">
                                    {fileTypeLabel(file.file_type)}
                                  </span>
                                )}
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

              <div className="rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-dark dark:text-white">Testimonials</h3>
                  <Link href="/resources/testimonial-content" className="text-xs font-medium text-primary hover:underline">
                    Open testimonial register
                  </Link>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Endorsements are filed as Association Endorsement and use the same approval steps as member testimonials.
                </p>
                {testimonialsError ? (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">{testimonialsError}</p>
                ) : testimonials.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    No testimonials yet. Upload a file and mark it as a testimonial.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-stroke dark:divide-dark-3">
                    {testimonials.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <a
                            href={`https://drive.google.com/file/d/${item.file_id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-sm font-medium text-dark hover:text-primary hover:underline dark:text-white"
                          >
                            {item.file_name}
                          </a>
                          <p className="truncate text-xs text-gray-500">{item.testimonial_savings || "No results note"}</p>
                        </div>
                        <select
                          aria-label={`Status for ${item.file_name}`}
                          value={item.status}
                          onChange={(e) => void updateTestimonialStatus(item.id, e.target.value)}
                          className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                        >
                          {TESTIMONIAL_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          if (!creating) setCreateOpen(false);
        }}
        title="New association"
        id="create-association"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={!createName.trim() || creating} loading={creating}>
              Create
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This creates the association and a matching folder in the shared Drive, including a Testimonials subfolder.
          </p>
          <Input label="Name" value={createName} onChange={(e) => setCreateName(e.target.value)} autoFocus />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-dark dark:text-white">Status</span>
            <select
              className={SELECT_CLASS}
              value={createStatus}
              onChange={(e) => setCreateStatus(e.target.value as AssociationStatus)}
            >
              {ASSOCIATION_STATUS_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Input label="Contact" value={createContact} onChange={(e) => setCreateContact(e.target.value)} />
          <Input label="Email" type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
          <Textarea label="Notes" value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} rows={2} />
          {createError ? <p className="text-sm text-red-600 dark:text-red-400">{createError}</p> : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingFile)}
        onClose={() => {
          if (!uploading) setPendingFile(null);
        }}
        title="Upload file"
        id="association-upload"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingFile(null)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={confirmUpload} disabled={!uploadName.trim() || uploading} loading={uploading}>
              Upload
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {registerTestimonial
              ? "This file will be saved in Testimonials and added to the testimonial register as a draft Association Endorsement."
              : `Saving into ${currentFolder?.name || selected?.name || "this folder"}.`}
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
              wrapperClassName="flex-1"
            />
            {pendingFile && splitFilename(pendingFile.name).ext ? (
              <span className="mb-px shrink-0 rounded-md border border-gray-300 bg-gray-50 px-2 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {splitFilename(pendingFile.name).ext}
              </span>
            ) : null}
          </div>
          <label className="flex items-start gap-2 text-sm text-dark dark:text-white">
            <input
              type="checkbox"
              className="mt-1"
              checked={registerTestimonial}
              onChange={(e) => setRegisterTestimonial(e.target.checked)}
            />
            <span>
              Register as an association testimonial
              <span className="mt-0.5 block text-xs font-normal text-gray-500">
                On behalf of this association&apos;s experience working with us.
              </span>
            </span>
          </label>
          {registerTestimonial ? (
            <Input
              label="Results summary"
              value={testimonialSavings}
              onChange={(e) => setTestimonialSavings(e.target.value)}
              placeholder="What changed for their membership"
            />
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

export default function AssociationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader pageName="Associations" title="Associations" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <AssociationsPageInner />
    </Suspense>
  );
}
