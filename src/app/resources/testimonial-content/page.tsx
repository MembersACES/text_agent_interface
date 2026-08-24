"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_TESTIMONIAL_SOLUTION_CONTENT,
  SOLUTION_TYPE_LABELS,
  type TestimonialSolutionContentItem,
} from "@/lib/testimonial-solution-content";
import { useToast } from "@/components/ui/toast";

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
];

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 focus:border-primary";

const ALLOWED_UPLOAD_EXT = [".pdf", ".docx", ".doc"];

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

export default function TestimonialContentPage() {
  const [list, setList] = useState<TestimonialSolutionContentItem[]>(DEFAULT_TESTIMONIAL_SOLUTION_CONTENT);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedSolutionType, setSelectedSolutionType] = useState<string>("ci_electricity");
  const [examples, setExamples] = useState<ExampleItem[]>([]);
  const [examplesLoading, setExamplesLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusinessName, setUploadBusinessName] = useState("");
  const [uploadSavings, setUploadSavings] = useState("");
  const [uploadStatus, setUploadStatus] = useState("Approved");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const selectedLabel = SOLUTION_TYPE_LABELS[selectedSolutionType] ?? selectedSolutionType;

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
      showToast("Choose a PDF or Word file to upload.", "error");
      return;
    }
    const name = file.name.toLowerCase();
    if (!ALLOWED_UPLOAD_EXT.some((ext) => name.endsWith(ext))) {
      showToast("File must be a PDF or Word document (.pdf, .docx, .doc).", "error");
      return;
    }
    if (!uploadBusinessName.trim()) {
      showToast("Enter the member / business name so this record appears on their dashboard.", "error");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("business_name", uploadBusinessName.trim());
      form.append("status", uploadStatus);
      form.append("testimonial_solution_type_id", selectedSolutionType);
      form.append("testimonial_type", selectedLabel);
      if (uploadSavings.trim()) {
        form.append("testimonial_savings", uploadSavings.trim());
      }
      const res = await fetch("/api/testimonials/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Upload failed", "error");
        return;
      }
      showToast("Testimonial uploaded and recorded against this solution type.", "success");
      setUploadFile(null);
      setUploadBusinessName("");
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

  const selectedItem = list.find((item) => item.solution_type === selectedSolutionType);

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
          <div>
            <label
              htmlFor="solution-type-select"
              className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5"
            >
              Solution type
            </label>
            <select
              id="solution-type-select"
              value={selectedSolutionType}
              onChange={(e) => setSelectedSolutionType(e.target.value)}
              className={`${INPUT_CLASS} max-w-md`}
            >
              {DROPDOWN_ORDER.map((id) => (
                <option key={id} value={id}>
                  {SOLUTION_TYPE_LABELS[id] ?? id}
                </option>
              ))}
            </select>
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
                        Upload an existing PDF or Word file
                      </p>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          File
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                          Member / business name
                        </label>
                        <input
                          id="upload-business-name"
                          type="text"
                          value={uploadBusinessName}
                          onChange={(e) => setUploadBusinessName(e.target.value)}
                          placeholder="As it appears in CRM"
                          className={INPUT_CLASS}
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
                        None recorded yet for this solution type. Upload a previous PDF or Word file above.
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
    </div>
  );
}
