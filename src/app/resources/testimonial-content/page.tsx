"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, FileText, Plus, Search, Trash2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DEFAULT_TESTIMONIAL_SOLUTION_CONTENT,
  SOLUTION_TYPE_LABELS,
  emptyItem,
  type TestimonialSolutionContentItem,
} from "@/lib/testimonial-solution-content";
import { TESTIMONIAL_CONTENT_SOURCE_HEADER, type TestimonialContentSource } from "@/lib/testimonial-content-source";
import { DEFAULT_TESTIMONIAL_STATUS, TESTIMONIAL_STATUSES } from "@/constants/crm";
import { useToast } from "@/components/ui/toast";
import { cn, formatDateAustralian, getApiBaseUrl } from "@/lib/utils";
import { useDirtyRecord } from "@/hooks/useDirtyRecord";
import { useRegisterUnsavedGuard } from "@/components/unsaved-changes/nav-guard-context";
import {
  CLOSING_FIELD,
  COPY_KEYS,
  DROPDOWN_ORDER,
  ESG_FIELDS,
  HEADLINE_FIELDS,
  OUTCOME_BULLET_KEYS,
  STORY_FIELDS,
  cloneCopy,
  slugifySolutionType,
  snapshotCopy,
  type CopyFieldDef,
} from "./copy-fields";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 focus:border-primary";

const ALLOWED_UPLOAD_EXT = [".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg"];
const EXAMPLES_LIMIT = 20;

type ExampleItem = {
  id: number;
  business_name: string;
  file_name: string;
  file_id: string;
  file_link?: string | null;
  testimonial_savings?: string | null;
  status?: string | null;
  created_at?: string | null;
};

function driveFileUrl(ex: ExampleItem): string {
  if (ex.file_link) return ex.file_link;
  return `https://drive.google.com/file/d/${ex.file_id}/view`;
}

type CrmMember = {
  id: number;
  business_name: string;
  gdrive_folder_url?: string | null;
};

function copyPayload(item: TestimonialSolutionContentItem): Record<string, string> {
  const payload: Record<string, string> = { solution_type: item.solution_type };
  for (const key of COPY_KEYS) {
    payload[key] = item[key] ?? "";
  }
  return payload;
}

function FieldBlock({
  field,
  idPrefix,
  value,
  onChange,
}: {
  field: CopyFieldDef;
  idPrefix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `${idPrefix}-${field.key}`;
  const over = field.max != null && value.length > field.max;
  return (
    <div>
      <label htmlFor={id} className="mb-0.5 block text-sm font-semibold text-gray-900 dark:text-gray-100">
        {field.label}
      </label>
      <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">{field.hint}</p>
      {field.multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={INPUT_CLASS}
        />
      ) : (
        <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} />
      )}
      {field.max != null ? (
        <p className={cn("mt-0.5 text-right text-[11px] text-gray-400", over && "font-semibold text-amber-600")}>
          {value.length} / ~{field.max} characters
        </p>
      ) : null}
    </div>
  );
}

function MemberSearchSelect({
  members,
  loading,
  error,
  value,
  onChange,
}: {
  members: CrmMember[];
  loading: boolean;
  error: string | null;
  value: CrmMember | null;
  onChange: (member: CrmMember | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? members.filter((m) => m.business_name.toLowerCase().includes(q)) : members;
    return list.slice(0, 80);
  }, [members, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const displayValue = open ? query : value?.business_name ?? "";

  return (
    <div ref={wrapRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        id="upload-business-name"
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="upload-member-list"
        value={displayValue}
        placeholder={loading ? "Loading members…" : error ? "Members unavailable" : "Search CRM members…"}
        disabled={loading || Boolean(error)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value && e.target.value !== value.business_name) onChange(null);
        }}
        onFocus={() => {
          setQuery(value?.business_name ?? "");
          setOpen(true);
        }}
        className={cn(INPUT_CLASS, "pl-9 pr-8")}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
      {open && !loading && !error ? (
        <ul
          id="upload-member-list"
          role="listbox"
          className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-500">
              No members match.{" "}
              <Link href="/crm-members" className="font-semibold text-primary hover:underline">
                Check the CRM
              </Link>
            </li>
          ) : (
            filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.id === m.id}
                  onClick={() => {
                    onChange(m);
                    setQuery(m.business_name);
                    setOpen(false);
                    inputRef.current?.blur();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 truncate px-3 py-2 text-left text-sm hover:bg-primary/5",
                    value?.id === m.id && "bg-primary/10 font-medium"
                  )}
                >
                  <span className="truncate">{m.business_name}</span>
                  {m.gdrive_folder_url ? (
                    <span className="shrink-0 text-[11px] text-gray-400">Drive</span>
                  ) : (
                    <span className="shrink-0 text-[11px] text-amber-600">no Drive folder</span>
                  )}
                </button>
              </li>
            ))
          )}
          {members.length > 80 && query.trim() === "" ? (
            <li className="px-3 py-1.5 text-[11px] text-gray-400">Showing 80 — keep typing to narrow the list</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function PreviewPane({ item, label }: { item: TestimonialSolutionContentItem; label: string }) {
  const bullets = OUTCOME_BULLET_KEYS.map((key) => item[key]?.trim()).filter(Boolean) as string[];
  const empty = (text: string) =>
    text.trim() ? text : <span className="italic text-gray-400">(empty — this section is skipped)</span>;

  return (
    <Card className="border border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Preview</CardTitle>
        <p className="text-xs text-gray-500 dark:text-gray-400">How the wording reads before it is generated for a member.</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {item.key_outcome_metrics.trim() || <span className="italic text-gray-400">(no headline)</span>}
          </p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
        <div>
          <h4 className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">The problem we solved</h4>
          <p>{empty(item.key_challenge_of_solution)}</p>
        </div>
        <div>
          <h4 className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">What we did</h4>
          <p>{empty(item.key_approach_of_solution)}</p>
        </div>
        <div>
          <h4 className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">What made the experience good</h4>
          <p>{empty(item.key_outcome_of_solution)}</p>
        </div>
        <div>
          <h4 className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Key outcomes</h4>
          {bullets.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-4">
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : (
            <p className="italic text-gray-400">(no bullets yet)</p>
          )}
        </div>
        {item.conclusion.trim() ? <p className="italic">{item.conclusion}</p> : null}
        <div>
          <h4 className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">ESG</h4>
          <p>
            {item.esg_scope_for_solution || "—"} · {item.sdg_impact_for_solution || "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TestimonialContentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken;
  const { showToast } = useToast();
  const dirty = useDirtyRecord<TestimonialSolutionContentItem>();

  const [list, setList] = useState<TestimonialSolutionContentItem[]>(DEFAULT_TESTIMONIAL_SOLUTION_CONTENT);
  const [loading, setLoading] = useState(true);
  const [contentSource, setContentSource] = useState<TestimonialContentSource>("backend");
  const [saving, setSaving] = useState(false);
  const [selectedSolutionType, setSelectedSolutionType] = useState("ci_electricity");
  const [tab, setTab] = useState<"copy" | "files">("copy");
  const [justCreated, setJustCreated] = useState(false);

  const [examples, setExamples] = useState<ExampleItem[]>([]);
  const [examplesLoading, setExamplesLoading] = useState(false);
  const [examplesError, setExamplesError] = useState<string | null>(null);

  const [members, setMembers] = useState<CrmMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedMember, setSelectedMember] = useState<CrmMember | null>(null);
  const [uploadSavings, setUploadSavings] = useState("");
  const [uploadStatus, setUploadStatus] = useState(DEFAULT_TESTIMONIAL_STATUS);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [creating, setCreating] = useState(false);

  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [pendingServerList, setPendingServerList] = useState<TestimonialSolutionContentItem[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExampleItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteTypeOpen, setDeleteTypeOpen] = useState(false);
  const [deletingType, setDeletingType] = useState(false);

  const [recSearch, setRecSearch] = useState("");
  const [recFilter, setRecFilter] = useState<"all" | (typeof TESTIMONIAL_STATUSES)[number]>("all");

  const selectedItem = list.find((item) => item.solution_type === selectedSolutionType);
  const selectedLabel =
    selectedItem?.solution_type_label ?? SOLUTION_TYPE_LABELS[selectedSolutionType] ?? selectedSolutionType;
  const selectedSnap = selectedItem ? snapshotCopy(selectedItem) : "";
  const isDirty = selectedItem ? dirty.isDirty(selectedSnap) : false;
  const saveBlocked = contentSource === "defaults";
  const isCustomType = !(selectedSolutionType in SOLUTION_TYPE_LABELS);

  const typeOptions = useMemo(() => {
    const byId = new Map(list.map((item) => [item.solution_type, item.solution_type_label || item.solution_type]));
    const ordered = DROPDOWN_ORDER.map((id) => ({
      id,
      label: byId.get(id) || SOLUTION_TYPE_LABELS[id] || id,
    })).filter((opt) => byId.has(opt.id) || SOLUTION_TYPE_LABELS[opt.id]);
    const extras = list
      .filter((item) => !DROPDOWN_ORDER.includes(item.solution_type))
      .map((item) => ({
        id: item.solution_type,
        label: item.solution_type_label || item.solution_type,
      }));
    return [...ordered, ...extras];
  }, [list]);

  const applyLoadedList = useCallback(
    (data: TestimonialSolutionContentItem[], source: TestimonialContentSource) => {
      setList(data);
      setContentSource(source);
      const exists = data.some((item) => item.solution_type === selectedSolutionType);
      if (!exists && data[0]) setSelectedSolutionType(data[0].solution_type);
      const current = data.find(
        (item) => item.solution_type === (exists ? selectedSolutionType : data[0]?.solution_type)
      );
      if (current) dirty.adopt(cloneCopy(current), snapshotCopy(current));
    },
    [dirty, selectedSolutionType]
  );

  const fetchContent = useCallback(
    async (isRetry = false) => {
      if (!isRetry) setLoading(true);
      try {
        const res = await fetch("/api/testimonials/solution-content");
        const header = (res.headers.get(TESTIMONIAL_CONTENT_SOURCE_HEADER) || "").toLowerCase();
        const source: TestimonialContentSource = header === "defaults" ? "defaults" : "backend";
        if (!res.ok) {
          showToast("Couldn't load wording from the server. Showing standard wording.", "error");
          applyLoadedList(DEFAULT_TESTIMONIAL_SOLUTION_CONTENT, "defaults");
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          showToast("Couldn't load wording from the server. Showing standard wording.", "error");
          applyLoadedList(DEFAULT_TESTIMONIAL_SOLUTION_CONTENT, "defaults");
          return;
        }
        if (isRetry && isDirty && source === "backend") {
          setPendingServerList(data);
          return;
        }
        applyLoadedList(data, source);
        if (isRetry && source === "backend") {
          showToast("Server copy loaded.", "success");
        }
      } catch {
        showToast("Couldn't load wording from the server. Showing standard wording.", "error");
        applyLoadedList(DEFAULT_TESTIMONIAL_SOLUTION_CONTENT, "defaults");
      } finally {
        setLoading(false);
      }
    },
    [applyLoadedList, isDirty, showToast]
  );

  useEffect(() => {
    fetchContent(false);
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!token) return;
    setMembersLoading(true);
    setMembersError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.items || data.clients || [];
      const mapped: CrmMember[] = raw
        .map((c: { id?: number; business_name?: string; gdrive_folder_url?: string | null }) => ({
          id: Number(c.id),
          business_name: String(c.business_name ?? "").trim(),
          gdrive_folder_url: c.gdrive_folder_url ?? null,
        }))
        .filter((c: CrmMember) => c.id && c.business_name)
        .sort((a: CrmMember, b: CrmMember) => a.business_name.localeCompare(b.business_name));
      setMembers(mapped);
    } catch {
      setMembers([]);
      setMembersError("Couldn't load CRM members.");
    } finally {
      setMembersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const fetchExamples = useCallback(async (solutionType: string) => {
    if (!solutionType) {
      setExamples([]);
      setExamplesError(null);
      return;
    }
    setExamplesLoading(true);
    setExamplesError(null);
    try {
      const res = await fetch(
        `/api/testimonials/examples?solution_type=${encodeURIComponent(solutionType)}&limit=${EXAMPLES_LIMIT}`
      );
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setExamples([]);
        setExamplesError(typeof data.error === "string" ? data.error : "Couldn't load testimonials.");
        return;
      }
      if (!Array.isArray(data)) {
        setExamples([]);
        setExamplesError("Couldn't load testimonials.");
        return;
      }
      const mapped: ExampleItem[] = data.map((t: Record<string, unknown>) => ({
        id: Number(t.id),
        business_name: String(t.business_name ?? ""),
        file_name: String(t.file_name ?? ""),
        file_id: String(t.file_id ?? ""),
        file_link: (t.file_link as string | null) ?? null,
        testimonial_savings: (t.testimonial_savings as string | null) ?? null,
        status: (t.status as string | null) ?? null,
        created_at: typeof t.created_at === "string" ? t.created_at : null,
      }));
      mapped.sort((a, b) => {
        if (a.created_at && b.created_at) return b.created_at.localeCompare(a.created_at);
        return 0;
      });
      setExamples(mapped);
    } catch {
      setExamples([]);
      setExamplesError("Couldn't load testimonials.");
    } finally {
      setExamplesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExamples(selectedSolutionType);
  }, [selectedSolutionType, fetchExamples]);

  const updateLocal = (key: keyof TestimonialSolutionContentItem, value: string) => {
    setList((prev) =>
      prev.map((item) => (item.solution_type === selectedSolutionType ? { ...item, [key]: value } : item))
    );
  };

  const restoreBaseline = () => {
    const base = dirty.baseline();
    if (!base) return;
    setList((prev) => prev.map((item) => (item.solution_type === base.solution_type ? cloneCopy(base) : item)));
  };

  const handleSave = async (): Promise<boolean> => {
    if (!selectedItem || saveBlocked) return false;
    setSaving(true);
    try {
      const res = await fetch("/api/testimonials/solution-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(copyPayload(selectedItem)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to save", "error");
        return false;
      }
      dirty.adopt(cloneCopy(selectedItem), snapshotCopy(selectedItem));
      showToast(`Wording saved for ${selectedLabel}.`, "success");
      return true;
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to save", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const selectType = (nextId: string) => {
    setSelectedSolutionType(nextId);
    setJustCreated(false);
    const next = list.find((item) => item.solution_type === nextId);
    if (next) dirty.adopt(cloneCopy(next), snapshotCopy(next));
  };

  const requestType = (nextId: string) => {
    if (nextId === selectedSolutionType) return;
    if (isDirty) {
      setPendingSwitch(nextId);
      return;
    }
    selectType(nextId);
  };

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const onBlockedNavigate = useCallback((href: string) => setPendingNav(href), []);
  useRegisterUnsavedGuard(isDirty, onBlockedNavigate);

  const dirtyDialogOpen = pendingSwitch != null || pendingNav != null;

  const closeDirtyDialog = () => {
    setPendingSwitch(null);
    setPendingNav(null);
  };

  const finishPending = () => {
    if (pendingSwitch) selectType(pendingSwitch);
    if (pendingNav) router.push(pendingNav);
    closeDirtyDialog();
  };

  const handleDirtyDiscard = () => {
    restoreBaseline();
    finishPending();
  };

  const handleDirtySave = async () => {
    const ok = await handleSave();
    if (!ok) return;
    finishPending();
  };

  const handleKeepServerCopy = () => {
    if (!pendingServerList) return;
    applyLoadedList(pendingServerList, "backend");
    setPendingServerList(null);
    showToast("Loaded the server copy.", "success");
  };

  const handleKeepLocalEdits = () => {
    if (!pendingServerList || !selectedItem) return;
    const working = cloneCopy(selectedItem);
    const serverItem = pendingServerList.find((item) => item.solution_type === working.solution_type);
    const merged = pendingServerList.map((item) =>
      item.solution_type === working.solution_type ? working : item
    );
    setList(merged);
    setContentSource("backend");
    if (serverItem) dirty.adopt(cloneCopy(serverItem), snapshotCopy(serverItem));
    setPendingServerList(null);
    showToast("Kept your unsaved edits. Save when you're ready.", "success");
  };

  const handleCreate = async () => {
    const label = newTypeName.trim();
    if (!label) {
      showToast("Give the solution a name first.", "error");
      return;
    }
    if (list.some((item) => item.solution_type_label.trim().toLowerCase() === label.toLowerCase())) {
      showToast("A type with that name already exists.", "error");
      return;
    }
    const seed = emptyItem("", label);
    setCreating(true);
    try {
      const res = await fetch("/api/testimonials/solution-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solution_type_label: label,
          ...Object.fromEntries(COPY_KEYS.map((key) => [key, seed[key] ?? ""])),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to create type", "error");
        return;
      }
      const created = data as TestimonialSolutionContentItem;
      setList((prev) => {
        if (prev.some((existing) => existing.solution_type === created.solution_type)) return prev;
        return [...prev, created];
      });
      setSelectedSolutionType(created.solution_type);
      dirty.adopt(cloneCopy(created), snapshotCopy(created));
      setJustCreated(true);
      setTab("copy");
      setCreateOpen(false);
      setNewTypeName("");
      showToast(`Created ${label}.`, "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to create type", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleResetStandard = () => {
    if (!selectedItem) return;
    const standard =
      DEFAULT_TESTIMONIAL_SOLUTION_CONTENT.find((item) => item.solution_type === selectedItem.solution_type) ??
      emptyItem(selectedItem.solution_type, selectedItem.solution_type_label);
    setList((prev) =>
      prev.map((item) =>
        item.solution_type === selectedItem.solution_type
          ? { ...item, ...copyPayload({ ...standard, solution_type: item.solution_type }) }
          : item
      )
    );
    showToast("Reset to the ACES standard wording. Not saved yet.", "success");
  };

  const handleUpload = async () => {
    const file = uploadFile ?? fileInputRef.current?.files?.[0] ?? null;
    if (!file) {
      showToast("Choose a PDF, Word, PNG, or JPEG file to upload.", "error");
      return;
    }
    const name = file.name.toLowerCase();
    if (!ALLOWED_UPLOAD_EXT.some((ext) => name.endsWith(ext))) {
      showToast("File must be a PDF, Word, PNG, or JPEG.", "error");
      return;
    }
    if (!selectedMember?.business_name) {
      showToast("Pick the member this testimonial belongs to.", "error");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("business_name", selectedMember.business_name);
      form.append("status", uploadStatus);
      form.append("testimonial_solution_type_id", selectedSolutionType);
      form.append("testimonial_type", selectedLabel);
      if (uploadSavings.trim()) form.append("testimonial_savings", uploadSavings.trim());
      if (selectedMember.gdrive_folder_url) {
        form.append("gdrive_folder_url", selectedMember.gdrive_folder_url);
      }
      const res = await fetch("/api/testimonials/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Upload failed", "error");
        return;
      }
      showToast(`Filed against ${selectedLabel}.`, "success");
      setUploadFile(null);
      setSelectedMember(null);
      setUploadSavings("");
      setUploadStatus(DEFAULT_TESTIMONIAL_STATUS);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchExamples(selectedSolutionType);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        showToast("Failed to update status.", "error");
        return;
      }
      setExamples((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
      showToast("Status updated.", "success");
    } catch {
      showToast("Failed to update status.", "error");
    }
  };

  const handleDeleteType = async () => {
    if (!isCustomType) return;
    setDeletingType(true);
    try {
      const res = await fetch(
        `/api/testimonials/solution-content/${encodeURIComponent(selectedSolutionType)}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Failed to delete solution type.", "error");
        return;
      }
      const remaining = list.filter((item) => item.solution_type !== selectedSolutionType);
      setList(remaining);
      const next = remaining[0];
      if (next) {
        selectType(next.solution_type);
      }
      setDeleteTypeOpen(false);
      setJustCreated(false);
      showToast(`${selectedLabel} removed.`, "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to delete solution type.", "error");
    } finally {
      setDeletingType(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/testimonials/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Failed to delete testimonial.", "error");
        return;
      }
      setExamples((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      showToast("Record removed.", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete testimonial.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = recSearch.trim().toLowerCase();
    return examples.filter((row) => {
      if (recFilter !== "all" && row.status !== recFilter) return false;
      if (!q) return true;
      return row.business_name.toLowerCase().includes(q) || row.file_name.toLowerCase().includes(q);
    });
  }, [examples, recFilter, recSearch]);

  const hasCreatedAt = examples.some((row) => row.created_at);

  return (
    <div className={cn("space-y-6", tab === "copy" && "pb-24")}>
      <Breadcrumb />

      <div className="space-y-3">
        <h1 className="text-heading-3 font-bold text-dark dark:text-white">Testimonial content</h1>
        <p className="max-w-[70ch] text-body-sm text-gray-600 dark:text-gray-400">
          Set the wording ACES reuses every time a testimonial is generated for a solution, and keep the file
          record of testimonials already collected from members.
        </p>
        <div className="flex flex-wrap gap-2">
          {["Pick a solution", "Edit the wording it reuses", "File testimonials you already have"].map((label, i) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading wording…</p>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-dark">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[16rem] max-w-md flex-1">
                <label htmlFor="solution-type-select" className="mb-1 block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Solution
                </label>
                <p className="mb-1.5 text-xs text-gray-500">Everything below belongs to this solution.</p>
                <select
                  id="solution-type-select"
                  value={selectedSolutionType}
                  onChange={(e) => requestType(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (isDirty) {
                    showToast("Save or discard your wording first.", "error");
                    return;
                  }
                  setNewTypeName("");
                  setCreateOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                New solution
              </Button>
              {isCustomType ? (
                <Button type="button" variant="danger" onClick={() => setDeleteTypeOpen(true)}>
                  <Trash2 className="size-3.5" />
                  Delete solution
                </Button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Internal id <code className="text-gray-500">{selectedSolutionType}</code> — used by the generator, not
              shown to members.
            </p>
          </div>

          {saveBlocked ? (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <p>
                Showing standard wording — couldn’t reach the server. Save is disabled until Retry succeeds.
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={() => fetchContent(true)}>
                Retry
              </Button>
            </div>
          ) : null}

          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "copy"}
              onClick={() => setTab("copy")}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold",
                tab === "copy"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              )}
            >
              Wording
              {isDirty ? <span className="size-1.5 rounded-full bg-amber-500" title="Unsaved changes" /> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "files"}
              onClick={() => setTab("files")}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold",
                tab === "files"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              )}
            >
              Collected testimonials
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-bold text-gray-500 dark:bg-gray-800">
                {examples.length}
              </span>
            </button>
          </div>

          {tab === "copy" && selectedItem ? (
            <div className="space-y-4">
              {justCreated ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                  <strong>New solution created.</strong> It starts from the standard wording — edit anything that
                  doesn’t fit, then save. Nothing is generated until you save.
                </div>
              ) : null}

              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <details open className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-dark">
                    <summary className="cursor-pointer bg-gray-50 px-4 py-3 text-sm font-semibold dark:bg-gray-800/60">
                      1 · Headline
                    </summary>
                    <div className="space-y-4 px-4 py-4">
                      {HEADLINE_FIELDS.map((field) => (
                        <FieldBlock
                          key={field.key}
                          field={field}
                          idPrefix={selectedItem.solution_type}
                          value={selectedItem[field.key] ?? ""}
                          onChange={(v) => updateLocal(field.key, v)}
                        />
                      ))}
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-dark">
                    <summary className="cursor-pointer bg-gray-50 px-4 py-3 text-sm font-semibold dark:bg-gray-800/60">
                      2 · The story
                    </summary>
                    <div className="space-y-4 px-4 py-4">
                      {STORY_FIELDS.map((field) => (
                        <FieldBlock
                          key={field.key}
                          field={field}
                          idPrefix={selectedItem.solution_type}
                          value={selectedItem[field.key] ?? ""}
                          onChange={(v) => updateLocal(field.key, v)}
                        />
                      ))}
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-dark">
                    <summary className="cursor-pointer bg-gray-50 px-4 py-3 text-sm font-semibold dark:bg-gray-800/60">
                      3 · Key outcomes
                    </summary>
                    <div className="space-y-4 px-4 py-4">
                      <div>
                        <p className="mb-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">Outcome bullets</p>
                        <p className="mb-2 text-xs text-gray-500">Up to five. Blank ones are skipped — you don’t have to fill all five.</p>
                        <div className="space-y-2">
                          {OUTCOME_BULLET_KEYS.map((key, i) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500 dark:bg-gray-800">
                                {i + 1}
                              </span>
                              <input
                                id={`${selectedItem.solution_type}-${key}`}
                                type="text"
                                value={selectedItem[key] ?? ""}
                                onChange={(e) => updateLocal(key, e.target.value)}
                                className={INPUT_CLASS}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <FieldBlock
                        field={CLOSING_FIELD}
                        idPrefix={selectedItem.solution_type}
                        value={selectedItem.conclusion ?? ""}
                        onChange={(v) => updateLocal("conclusion", v)}
                      />
                    </div>
                  </details>

                  <details className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-dark">
                    <summary className="cursor-pointer bg-gray-50 px-4 py-3 text-sm font-semibold dark:bg-gray-800/60">
                      4 · ESG &amp; SDG tags
                    </summary>
                    <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
                      {ESG_FIELDS.map((field) => (
                        <FieldBlock
                          key={field.key}
                          field={field}
                          idPrefix={selectedItem.solution_type}
                          value={selectedItem[field.key] ?? ""}
                          onChange={(v) => updateLocal(field.key, v)}
                        />
                      ))}
                    </div>
                  </details>

                  <button
                    type="button"
                    onClick={handleResetStandard}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Reset to ACES standard wording
                  </button>
                </div>

                <div className="lg:sticky lg:top-24">
                  <PreviewPane item={selectedItem} label={selectedLabel} />
                </div>
              </div>
            </div>
          ) : null}

          {tab === "files" ? (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <input
                    type="search"
                    value={recSearch}
                    onChange={(e) => setRecSearch(e.target.value)}
                    placeholder="Search business or file…"
                    className={cn(INPUT_CLASS, "max-w-xs")}
                  />
                  <button
                    type="button"
                    aria-pressed={recFilter === "all"}
                    onClick={() => setRecFilter("all")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      recFilter === "all"
                        ? "border-transparent bg-primary/10 text-primary"
                        : "border-gray-200 text-gray-600 dark:border-gray-700"
                    )}
                  >
                    All {examples.length}
                  </button>
                  {TESTIMONIAL_STATUSES.map((status) => {
                    const n = examples.filter((row) => row.status === status).length;
                    return (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={recFilter === status}
                        onClick={() => setRecFilter(status)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          recFilter === status
                            ? "border-transparent bg-primary/10 text-primary"
                            : "border-gray-200 text-gray-600 dark:border-gray-700"
                        )}
                      >
                        {status} {n}
                      </button>
                    );
                  })}
                </div>

                {examplesLoading ? (
                  <p className="text-sm text-gray-500">Loading testimonials…</p>
                ) : examplesError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                    <p>{examplesError}</p>
                    <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => fetchExamples(selectedSolutionType)}>
                      Retry
                    </Button>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="size-10" />}
                    title={`No testimonials filed for ${selectedLabel} yet`}
                    description="Add one on the right — a PDF, Word doc or a photo of a signed letter."
                  />
                ) : (
                  <>
                    <div className="mb-1 hidden grid-cols-[minmax(0,1fr)_140px_108px_92px_auto] gap-2 px-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 lg:grid">
                      <span>Member &amp; file</span>
                      <span>Status</span>
                      <span>Savings</span>
                      <span>{hasCreatedAt ? "Added" : ""}</span>
                      <span />
                    </div>
                    <ul className="space-y-2">
                      {filteredRecords.map((ex) => {
                        const known = (TESTIMONIAL_STATUSES as readonly string[]).includes(ex.status ?? "");
                        const statusOptions = known
                          ? TESTIMONIAL_STATUSES
                          : ex.status
                            ? [ex.status, ...TESTIMONIAL_STATUSES]
                            : [...TESTIMONIAL_STATUSES];
                        return (
                          <li
                            key={ex.id}
                            className="grid items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700 lg:grid-cols-[minmax(0,1fr)_140px_108px_92px_auto]"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900 dark:text-gray-100" title={ex.business_name}>
                                {ex.business_name}
                              </p>
                              <p className="truncate text-xs text-gray-500" title={ex.file_name}>
                                {ex.file_name}
                              </p>
                            </div>
                            <select
                              value={ex.status ?? ""}
                              onChange={(e) => handleStatusChange(ex.id, e.target.value)}
                              className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{ex.testimonial_savings || "—"}</p>
                            <p className="text-xs text-gray-400">
                              {hasCreatedAt ? formatDateAustralian(ex.created_at) || "—" : ""}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <a
                                href={driveFileUrl(ex)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full px-2 py-1 text-xs font-semibold text-primary hover:underline"
                              >
                                Open
                              </a>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(ex)}
                                className="rounded-full px-2 py-1 text-xs text-gray-500 hover:text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 text-[11px] text-gray-400">
                      Showing {filteredRecords.length} of {examples.length} filed for {selectedLabel}
                      {examples.length >= EXAMPLES_LIMIT ? ` (newest ${EXAMPLES_LIMIT})` : ""}. Files open in Google Drive.
                    </p>
                  </>
                )}
              </div>

              <div className="lg:sticky lg:top-24">
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Add a testimonial you already have</CardTitle>
                    <p className="text-xs text-gray-500">
                      Files it against <strong>{selectedLabel}</strong> and the member’s CRM record.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      className={cn(
                        "rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 text-center dark:border-gray-600 dark:bg-gray-800/40",
                        uploadFile && "border-solid border-primary bg-primary/5"
                      )}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (!file) return;
                        if (!ALLOWED_UPLOAD_EXT.some((ext) => file.name.toLowerCase().endsWith(ext))) {
                          showToast("That file type isn’t supported — use PDF, Word, PNG or JPEG.", "error");
                          return;
                        }
                        setUploadFile(file);
                      }}
                    >
                      <p className="text-sm font-semibold">Drop a file here</p>
                      <p className="mb-2 mt-1 text-xs text-gray-500">
                        PDF, Word, PNG or JPEG · images become a PDF automatically
                      </p>
                      <label htmlFor="testimonial-upload-file" className="sr-only">
                        File
                      </label>
                      <input
                        ref={fileInputRef}
                        id="testimonial-upload-file"
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                        className="mx-auto block w-full max-w-xs text-xs text-gray-500 file:mr-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:px-3 file:py-1 file:text-xs file:font-medium dark:file:border-gray-600 dark:file:bg-gray-800"
                      />
                      {uploadFile ? <p className="mt-2 truncate text-xs text-gray-600">{uploadFile.name}</p> : null}
                    </div>

                    <div>
                      <label htmlFor="upload-business-name" className="mb-1 block text-sm font-semibold">
                        Member
                      </label>
                      <p className="mb-1.5 text-xs text-gray-500">The CRM record this testimonial belongs to.</p>
                      {membersError ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                          {membersError}{" "}
                          <button type="button" className="font-semibold underline" onClick={() => fetchMembers()}>
                            Retry
                          </button>
                        </div>
                      ) : (
                        <MemberSearchSelect
                          members={members}
                          loading={membersLoading}
                          error={membersError}
                          value={selectedMember}
                          onChange={setSelectedMember}
                        />
                      )}
                      {selectedMember && !selectedMember.gdrive_folder_url ? (
                        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                          This member has no Google Drive folder. The file will be filed in the general testimonials
                          folder —{" "}
                          <Link href={`/crm-members/${selectedMember.id}`} className="font-semibold underline">
                            add a folder to their CRM record
                          </Link>{" "}
                          first if you want it stored with their other documents.
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="upload-savings" className="mb-1 block text-sm font-semibold">
                          Savings shown <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                          id="upload-savings"
                          type="text"
                          value={uploadSavings}
                          onChange={(e) => setUploadSavings(e.target.value)}
                          placeholder="e.g. $3,200 per month"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label htmlFor="upload-status" className="mb-1 block text-sm font-semibold">
                          Status
                        </label>
                        <select
                          id="upload-status"
                          value={uploadStatus}
                          onChange={(e) => setUploadStatus(e.target.value as typeof uploadStatus)}
                          className={INPUT_CLASS}
                        >
                          {TESTIMONIAL_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[11px] text-gray-400">
                          Only <strong>Approved</strong> testimonials can be used in member-facing material.
                        </p>
                      </div>
                    </div>

                    <Button type="button" className="w-full" onClick={handleUpload} disabled={uploading} loading={uploading}>
                      {uploading ? "Uploading…" : `Add to ${selectedLabel}`}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </>
      )}

      {tab === "copy" && selectedItem && !loading ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-6px_20px_rgba(16,24,40,0.07)] dark:border-gray-700 dark:bg-gray-dark md:px-6">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {isDirty ? (
              <>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  Unsaved changes
                </span>
                <span>Edits are only in this browser until you save.</span>
              </>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Saved
              </span>
            )}
            {saveBlocked ? <span>Save is disabled until the server is reachable.</span> : null}
          </div>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" disabled={!isDirty || saving} onClick={restoreBaseline}>
              Discard changes
            </Button>
            <Button
              type="button"
              disabled={!isDirty || saving || saveBlocked}
              loading={saving}
              onClick={() => handleSave()}
            >
              Save wording
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={dirtyDialogOpen}
        onClose={closeDirtyDialog}
        title={`Save changes to ${selectedLabel}?`}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeDirtyDialog}>
              Keep editing
            </Button>
            <Button type="button" variant="danger" onClick={handleDirtyDiscard}>
              Discard
            </Button>
            {saveBlocked ? null : (
              <Button type="button" onClick={handleDirtySave} loading={saving}>
                Save &amp; continue
              </Button>
            )}
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You’ve edited the wording but haven’t saved. Leaving now discards the edits.
          {saveBlocked ? " Save is unavailable until the server is reachable." : null}
        </p>
      </Modal>

      <Modal
        open={pendingServerList != null}
        onClose={handleKeepLocalEdits}
        title="Server copy loaded"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleKeepServerCopy}>
              Take the server’s
            </Button>
            <Button type="button" onClick={handleKeepLocalEdits}>
              Keep my unsaved edits
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The server copy loaded while you still have unsaved edits. Keep your unsaved edits, or take the server’s?
        </p>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New solution"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} loading={creating} disabled={creating}>
              Create &amp; edit wording
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-xs text-gray-500">
          Just the name for now. It opens with the standard ACES wording so you can edit what matters and leave the rest.
        </p>
        <label htmlFor="new-type-name" className="mb-1 block text-sm font-semibold">
          Name
        </label>
        <input
          id="new-type-name"
          type="text"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          placeholder="e.g. LED Lighting Upgrade"
          className={INPUT_CLASS}
        />
        <p className="mt-2 text-[11px] text-gray-400">
          Internal id: <code>{slugifySolutionType(newTypeName) || "—"}</code>
        </p>
      </Modal>

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Remove this testimonial record?"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} loading={deleting}>
              Remove record
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {deleteTarget?.file_name} — removes the CRM record only. The Google Drive file stays where it is.
        </p>
      </Modal>

      <Modal
        open={deleteTypeOpen}
        onClose={() => setDeleteTypeOpen(false)}
        title={`Delete ${selectedLabel}?`}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteTypeOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteType} loading={deletingType}>
              Delete solution
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This removes the wording template for {selectedLabel}. Filed testimonials stay on member
          records. Built-in types (Electricity, Waste, DMA, and so on) cannot be deleted.
        </p>
      </Modal>
    </div>
  );
}
