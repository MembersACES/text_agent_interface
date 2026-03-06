"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  { key: "key_challenge_of_solution", label: "Challenge", multiline: true },
  { key: "key_approach_of_solution", label: "Approach", multiline: true },
  { key: "key_outcome_of_solution", label: "Outcome", multiline: true },
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
  "automated_cleaning_robot",
];

export default function TestimonialContentPage() {
  const [list, setList] = useState<TestimonialSolutionContentItem[]>(DEFAULT_TESTIMONIAL_SOLUTION_CONTENT);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedSolutionType, setSelectedSolutionType] = useState<string>("ci_electricity");
  const [examples, setExamples] = useState<
    { id: number; business_name: string; file_name: string; file_id: string; testimonial_savings?: string | null }[]
  >([]);
  const [examplesLoading, setExamplesLoading] = useState(false);
  const { showToast } = useToast();

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

  const fetchExamples = useCallback(
    async (solutionType: string) => {
      if (!solutionType) {
        setExamples([]);
        return;
      }
      setExamplesLoading(true);
      try {
        const res = await fetch(
          `/api/testimonials/examples?solution_type=${encodeURIComponent(solutionType)}&limit=5`
        );
        const data = await res.json().catch(() => []);
        if (Array.isArray(data)) {
          setExamples(
            data.map((t: any) => ({
              id: t.id,
              business_name: t.business_name,
              file_name: t.file_name,
              file_id: t.file_id,
              testimonial_savings: t.testimonial_savings,
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
    },
    []
  );

  useEffect(() => {
    fetchExamples(selectedSolutionType);
  }, [selectedSolutionType, fetchExamples]);

  const updateLocal = (solutionType: string, key: keyof TestimonialSolutionContentItem, value: string) => {
    setList((prev) =>
      prev.map((item) =>
        item.solution_type === solutionType ? { ...item, [key]: value } : item
      )
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
    } catch (e: any) {
      showToast(e.message || "Failed to save", "error");
    } finally {
      setSavingId(null);
    }
  };

  const selectedItem = list.find((item) => item.solution_type === selectedSolutionType);

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="space-y-3">
        <h1 className="text-heading-3 font-bold text-dark dark:text-white">
          Testimonial content
        </h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Edit the copy used to populate the testimonial document template for each solution type.
          Defaults are defined in code; changes are saved as overrides on the server and can be edited
          here without redeploying.
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
              className="w-full max-w-md px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {DROPDOWN_ORDER.map((id) => (
                <option key={id} value={id}>
                  {SOLUTION_TYPE_LABELS[id] ?? id}
                </option>
              ))}
            </select>
          </div>

          {selectedItem ? (
            <>
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
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                        ) : (
                          <input
                            id={`${selectedItem.solution_type}-${field.key}`}
                            type="text"
                            value={(selectedItem[field.key] as string) ?? ""}
                            onChange={(e) =>
                              updateLocal(selectedItem.solution_type, field.key, e.target.value)
                            }
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {savingId === selectedItem.solution_type ? "Saving…" : "Save overrides"}
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent live testimonials for this type</CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Examples of member testimonials where the testimonial type matches this solution.
                  </p>
                </CardHeader>
                <CardContent>
                  {examplesLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading examples...</p>
                  ) : examples.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No testimonials recorded yet for this solution type.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-sm">
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
                              {ex.testimonial_savings ? ` · Savings: ${ex.testimonial_savings}` : ""}
                            </p>
                          </div>
                          <a
                            href={`https://drive.google.com/file/d/${ex.file_id}/view`}
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
            </>
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
