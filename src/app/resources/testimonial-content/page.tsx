"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_TESTIMONIAL_SOLUTION_CONTENT,
  SOLUTION_TYPE_LABELS,
  emptyItem,
  type TestimonialSolutionContentItem,
} from "@/lib/testimonial-solution-content";
import { useToast } from "@/components/ui/toast";
import { cn, getApiBaseUrl } from "@/lib/utils";

const FIELDS: { key: keyof TestimonialSolutionContentItem; label: string; multiline?: boolean }[] = [
  { key: "key_outcome_metrics", label: "Key outcome metrics (headline)", multiline: false },
  { key: "key_approach_of_solution", label: "The Service Received", multiline: true },
  { key: "key_challenge_of_solution", label: "The Problem We Solved", multiline: true },
  { key: "key_outcome_of_solution", label: "What Made the Experience Great", multiline: true },
  { key: "key_outcome_dotpoints_1", label: "Key outcome dot point 1", multiline: false },
  { key: "key_outcome_dotpoints_2", label: "Key outcome dot point 2", multiline: false },
  { key: "key_outcome_dotpoints_3", label: "Key outcome dot point 3", multiline: false },
  { key: "key_outcome_dotpoints_4", label: "Key outcome dot point 4", multiline: false },
  { key: "key_outcome_dotpoints_5", label: "Key outcome dot point 5", multiline: false },
  { key: "conclusion", label: "Conclusion", multiline: true },
  { key: "esg_scope_for_solution", label: "ESG / SCOPE", multiline: false },
  { key: "sdg_impact_for_solution", label: "SDG impact", multiline: false },
];

const DROPDOWN_ORDER = [
  "ci_electricity",
  "sme_electricity",
  "ci_gas",
  "sme_gas",
  "waste",
  "resource_recovery",
  "dma",
  "automated_cleaning_robot",
  "solar_panel_cleaning",
  "client_endorsement",
  "ghg_roadmap",
  "solar_review",
  "gas_discrepancy",
  "electricity_discrepancy",
  "demand_reset",
  "cds",
];

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 focus:border-primary";

const ALLOWED_UPLOAD_EXT = [".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg"];

type ExampleItem = {
  id: number;
  business_name: string;
  file_name: string;
  file_id: string;
  file_link?: string | null;
  testimonial_savings?: string | null;
  status?: string | null;
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

function MemberSearchSelect({
  members,
  loading,
  value,
  onChange,
}: {
  members: CrmMember[];
  loading: boolean;
  value: CrmMember | null;
  onChange: (member: CrmMember | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? members.filter((m) => m.business_name.toLowerCase().includes(q))
      : members;
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
        value={displayValue}
        placeholder={loading ? "Loading members…" : "Search CRM members…"}
        disabled={loading}
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
      {open && !loading ? (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-500">No members match</li>
          ) : (
            filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(m);
                    setQuery(m.business_name);
                    setOpen(false);
                    inputRef.current?.blur();
                  }}
                  className={cn(
                    "w-full truncate px-3 py-2 text-left text-sm hover:bg-primary/5",
                    value?.id === m.id && "bg-primary/10 font-medium"
                  )}
                >
                  {m.business_name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function CreateTypeModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (item: TestimonialSolutionContentItem) => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<TestimonialSolutionContentItem>(() => emptyItem("", ""));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(emptyItem("", ""));
  }, [open]);

  if (!open) return null;

  const setField = (key: keyof TestimonialSolutionContentItem, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    const label = form.solution_type_label.trim();
    if (!label) {
      showToast("Enter a solution type name.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/testimonials/solution-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solution_type_label: label,
          key_outcome_metrics: form.key_outcome_metrics,
          key_challenge_of_solution: form.key_challenge_of_solution,
          key_approach_of_solution: form.key_approach_of_solution,
          key_outcome_of_solution: form.key_outcome_of_solution,
          key_outcome_dotpoints_1: form.key_outcome_dotpoints_1,
          key_outcome_dotpoints_2: form.key_outcome_dotpoints_2,
          key_outcome_dotpoints_3: form.key_outcome_dotpoints_3,
          key_outcome_dotpoints_4: form.key_outcome_dotpoints_4,
          key_outcome_dotpoints_5: form.key_outcome_dotpoints_5,
          conclusion: form.conclusion,
          esg_scope_for_solution: form.esg_scope_for_solution,
          sdg_impact_for_solution: form.sdg_impact_for_solution,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to create type", "error");
        return;
      }
      onCreated(data as TestimonialSolutionContentItem);
      showToast(`Created ${label}.`, "success");
      onClose();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to create type", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Create solution type</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Name the type and fill the same copy fields used when generating a testimonial. You can edit these later.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Close
          </button>
        </div>
        <div className="max-h-[min(70vh,36rem)] space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label htmlFor="create-type-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Solution type name
            </label>
            <input
              id="create-type-name"
              type="text"
              value={form.solution_type_label}
              onChange={(e) => setField("solution_type_label", e.target.value)}
              placeholder="e.g. LED Upgrade"
              className={INPUT_CLASS}
            />
          </div>
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`create-${field.key}`}
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                {field.label}
              </label>
              {field.multiline ? (
                <textarea
                  id={`create-${field.key}`}
                  value={(form[field.key] as string) ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  rows={3}
                  className={INPUT_CLASS}
                />
              ) : (
                <input
                  id={`create-${field.key}`}
                  type="text"
                  value={(form[field.key] as string) ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  className={INPUT_CLASS}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create type"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialContentPage() {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken;
  const [list, setList] = useState<TestimonialSolutionContentItem[]>(DEFAULT_TESTIMONIAL_SOLUTION_CONTENT);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedSolutionType, setSelectedSolutionType] = useState<string>("ci_electricity");
  const [examples, setExamples] = useState<ExampleItem[]>([]);
  const [examplesLoading, setExamplesLoading] = useState(false);
  const [members, setMembers] = useState<CrmMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedMember, setSelectedMember] = useState<CrmMember | null>(null);
  const [uploadSavings, setUploadSavings] = useState("");
  const [uploadStatus, setUploadStatus] = useState("Approved");
  const [uploading, setUploading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const selectedItem = list.find((item) => item.solution_type === selectedSolutionType);
  const selectedLabel = selectedItem?.solution_type_label ?? SOLUTION_TYPE_LABELS[selectedSolutionType] ?? selectedSolutionType;

  const typeOptions = useMemo(() => {
    const byId = new Map(
      list.map((item) => [item.solution_type, item.solution_type_label || item.solution_type])
    );
    const ordered = DROPDOWN_ORDER.map((id) => ({
      id,
      label: byId.get(id) || SOLUTION_TYPE_LABELS[id] || id,
    }));
    const extras = list
      .filter((item) => !DROPDOWN_ORDER.includes(item.solution_type))
      .map((item) => ({
        id: item.solution_type,
        label: item.solution_type_label || item.solution_type,
      }));
    return [...ordered, ...extras];
  }, [list]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/testimonials/solution-content");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setList(data);
      }
    } catch {
      setList(DEFAULT_TESTIMONIAL_SOLUTION_CONTENT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setMembersLoading(true);
    fetch(`${getApiBaseUrl()}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load members");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.items || data.clients || [];
        if (cancelled) return;
        const mapped: CrmMember[] = list
          .map((c: { id?: number; business_name?: string; gdrive_folder_url?: string | null }) => ({
            id: Number(c.id),
            business_name: String(c.business_name ?? "").trim(),
            gdrive_folder_url: c.gdrive_folder_url ?? null,
          }))
          .filter((c: CrmMember) => c.id && c.business_name)
          .sort((a: CrmMember, b: CrmMember) => a.business_name.localeCompare(b.business_name));
        setMembers(mapped);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const fetchExamples = useCallback(async (solutionType: string) => {
    if (!solutionType) {
      setExamples([]);
      return;
    }
    setExamplesLoading(true);
    try {
      const res = await fetch(
        `/api/testimonials/examples?solution_type=${encodeURIComponent(solutionType)}&limit=20`
      );
      const data = await res.json().catch(() => []);
      if (Array.isArray(data)) {
        setExamples(
          data.map((t: Record<string, unknown>) => ({
            id: Number(t.id),
            business_name: String(t.business_name ?? ""),
            file_name: String(t.file_name ?? ""),
            file_id: String(t.file_id ?? ""),
            file_link: (t.file_link as string | null) ?? null,
            testimonial_savings: (t.testimonial_savings as string | null) ?? null,
            status: (t.status as string | null) ?? null,
          }))
        );
      } else {
        setExamples([]);
      }
    } catch {
      setExamples([]);
    } finally {
      setExamplesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExamples(selectedSolutionType);
  }, [selectedSolutionType, fetchExamples]);

  const updateLocal = (
    solutionType: string,
    key: keyof TestimonialSolutionContentItem,
    value: string
  ) => {
    setList((prev) =>
      prev.map((item) => (item.solution_type === solutionType ? { ...item, [key]: value } : item))
    );
  };

  const handleSave = async (item: TestimonialSolutionContentItem) => {
    const solutionType = item.solution_type;
    setSavingId(solutionType);
    try {
      const payload: Record<string, string> = {
        solution_type: solutionType,
        key_outcome_metrics: item.key_outcome_metrics,
        key_challenge_of_solution: item.key_challenge_of_solution,
        key_approach_of_solution: item.key_approach_of_solution,
        key_outcome_of_solution: item.key_outcome_of_solution,
        key_outcome_dotpoints_1: item.key_outcome_dotpoints_1,
        key_outcome_dotpoints_2: item.key_outcome_dotpoints_2,
        key_outcome_dotpoints_3: item.key_outcome_dotpoints_3,
        key_outcome_dotpoints_4: item.key_outcome_dotpoints_4,
        key_outcome_dotpoints_5: item.key_outcome_dotpoints_5,
        conclusion: item.conclusion,
        esg_scope_for_solution: item.esg_scope_for_solution,
        sdg_impact_for_solution: item.sdg_impact_for_solution,
      };
      const res = await fetch("/api/testimonials/solution-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to save", "error");
        return;
      }
      showToast("Saved. Overrides are stored on the server.", "success");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save";
      showToast(message, "error");
    } finally {
      setSavingId(null);
    }
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
      showToast("Select a CRM member so this record appears on their dashboard.", "error");
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
      if (uploadSavings.trim()) {
        form.append("testimonial_savings", uploadSavings.trim());
      }
      if (selectedMember.gdrive_folder_url) {
        form.append("gdrive_folder_url", selectedMember.gdrive_folder_url);
      }
      const res = await fetch("/api/testimonials/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Upload failed", "error");
        return;
      }
      showToast("Testimonial uploaded and recorded against this solution type.", "success");
      setUploadFile(null);
      setSelectedMember(null);
      setUploadSavings("");
      setUploadStatus("Approved");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchExamples(selectedSolutionType);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upload failed";
      showToast(message, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="space-y-3">
        <h1 className="text-heading-3 font-bold text-dark dark:text-white">Testimonial content</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Edit template copy for each solution type, and keep the live record of generated or previously
          created testimonials (PDF / Word) against that type.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] max-w-md flex-1">
              <label
                htmlFor="solution-type-select"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Solution type
              </label>
              <select
                id="solution-type-select"
                value={selectedSolutionType}
                onChange={(e) => setSelectedSolutionType(e.target.value)}
                className={INPUT_CLASS}
              >
                {typeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
            >
              <Plus className="size-3.5" />
              Create type
            </button>
          </div>

          {selectedItem ? (
            <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
              <aside className="order-1 lg:order-2 lg:col-span-2 lg:sticky lg:top-24 space-y-4">
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Testimonials
                      {examples.length > 0 ? (
                        <span className="ml-2 text-xs font-semibold text-primary">{examples.length}</span>
                      ) : null}
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Recorded documents for {selectedLabel}. Generated from a member, or uploaded here.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/40 p-3 space-y-3">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                        Upload an existing PDF, Word, PNG, or JPEG file. Images are converted to PDF on upload.
                      </p>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          File
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                          className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-white dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200 file:border file:border-gray-200 dark:file:border-gray-600"
                        />
                        {uploadFile ? (
                          <p className="mt-1 text-[11px] text-gray-500 truncate">{uploadFile.name}</p>
                        ) : null}
                      </div>
                      <div>
                        <label
                          htmlFor="upload-business-name"
                          className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1"
                        >
                          CRM member
                        </label>
                        <MemberSearchSelect
                          members={members}
                          loading={membersLoading}
                          value={selectedMember}
                          onChange={setSelectedMember}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="upload-savings"
                          className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1"
                        >
                          Savings (optional)
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
                        <label
                          htmlFor="upload-status"
                          className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1"
                        >
                          Status
                        </label>
                        <select
                          id="upload-status"
                          value={uploadStatus}
                          onChange={(e) => setUploadStatus(e.target.value)}
                          className={INPUT_CLASS}
                        >
                          <option value="Approved">Approved</option>
                          <option value="Draft">Draft</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 text-sm"
                      >
                        {uploading ? "Uploading…" : "Upload to this type"}
                      </button>
                    </div>

                    {examplesLoading ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading testimonials...</p>
                    ) : examples.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        None recorded yet for this solution type. Upload a previous PDF, Word, or image file above.
                      </p>
                    ) : (
                      <ul className="space-y-2 text-sm max-h-[min(52vh,28rem)] overflow-y-auto pr-1">
                        {examples.map((ex) => (
                          <li
                            key={ex.id}
                            className="flex items-center justify-between gap-2 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p
                                className="font-medium text-gray-800 dark:text-gray-100 truncate"
                                title={ex.file_name}
                              >
                                {ex.file_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {ex.business_name}
                                {ex.status ? ` · ${ex.status}` : ""}
                                {ex.testimonial_savings ? ` · ${ex.testimonial_savings}` : ""}
                              </p>
                            </div>
                            <a
                              href={driveFileUrl(ex)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-primary hover:underline shrink-0"
                            >
                              Open
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </aside>

              <section className="order-2 lg:order-1 lg:col-span-3">
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{selectedItem.solution_type_label}</CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {selectedItem.solution_type}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {FIELDS.filter((f) => f.key !== "solution_type" && f.key !== "solution_type_label").map(
                      (field) => (
                        <div key={field.key}>
                          <label
                            htmlFor={`${selectedItem.solution_type}-${field.key}`}
                            className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                          >
                            {field.label}
                          </label>
                          {field.multiline ? (
                            <textarea
                              id={`${selectedItem.solution_type}-${field.key}`}
                              value={(selectedItem[field.key] as string) ?? ""}
                              onChange={(e) =>
                                updateLocal(selectedItem.solution_type, field.key, e.target.value)
                              }
                              rows={3}
                              className={INPUT_CLASS}
                            />
                          ) : (
                            <input
                              id={`${selectedItem.solution_type}-${field.key}`}
                              type="text"
                              value={(selectedItem[field.key] as string) ?? ""}
                              onChange={(e) =>
                                updateLocal(selectedItem.solution_type, field.key, e.target.value)
                              }
                              className={INPUT_CLASS}
                            />
                          )}
                        </div>
                      )
                    )}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleSave(selectedItem)}
                        disabled={savingId === selectedItem.solution_type}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        {savingId === selectedItem.solution_type ? "Saving…" : "Save overrides"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No content for the selected solution type. Try another selection.
            </p>
          )}
        </div>
      )}
      <CreateTypeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(item) => {
          setList((prev) => {
            if (prev.some((existing) => existing.solution_type === item.solution_type)) return prev;
            return [...prev, item];
          });
          setSelectedSolutionType(item.solution_type);
        }}
      />
    </div>
  );
}
