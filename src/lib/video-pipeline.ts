export type VideoProgressStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "failed";
  detail?: string | null;
  updated_at?: string | null;
};

export type VideoPipelineProgress = {
  current_step?: string | null;
  steps?: VideoProgressStep[];
  updated_at?: string | null;
  stale?: boolean;
  stale_message?: string | null;
};

export type VideoRenderJob = {
  id?: string | null;
  status?: string;
  type?: string;
  api_url?: string | null;
  error?: string | null;
  message?: string | null;
  progress?: VideoPipelineProgress | null;
};

/** Result from starting a video creation session (member / custom / marketing). */
export type VideoPipelineResult = {
  slug: string;
  packFolderUrl?: string | null;
  packFolderName?: string | null;
  packParentFolderUrl?: string | null;
  packError?: string | null;
  packWarnings?: string[];
  videoIds?: number[];
  renderJob?: VideoRenderJob | null;
  czaVideosApiUrl?: string | null;
  progress?: VideoPipelineProgress | null;
  /** Operator CLI steps — kept for API parity; not shown in dashboard UI. */
  cli?: string[];
};

/** Render pipeline steps (after pack setup). Must match backend/claude-videos order. */
export const RENDER_PIPELINE_STEPS: { id: string; label: string }[] = [
  { id: "pipeline_queued", label: "Render pipeline queued" },
  { id: "download_source", label: "Testimonial document downloaded from Drive" },
  { id: "parse_document", label: "Reading testimonial document" },
  { id: "analyze_content", label: "Extracting fields and slide plan" },
  { id: "write_presentation", label: "Writing testimonial JSON and narration" },
  { id: "manifest_updated", label: "Render manifest updated" },
  { id: "voice_created", label: "Voiceover generated" },
  { id: "rendering", label: "Rendering long + 30s MP4s (several minutes)" },
  { id: "qa_report", label: "QA review report generated" },
  { id: "publishing", label: "Uploading MP4s and QA to Drive pack" },
  { id: "complete", label: "Ready to review in Interface" },
];

const LEGACY_STEP_ALIASES: Record<string, string> = {
  presentation_built: "write_presentation",
};

export const STEP_HINTS: Record<string, string> = {
  download_source: "Usually a few seconds from Google Drive.",
  parse_document: "Opening the PDF or Word file locally.",
  analyze_content: "Can take 1–3 minutes for scanned PDFs (OCR).",
  write_presentation: "Building slide plan, narration, and JSON.",
  voice_created: "Generating TTS audio for each scene.",
  rendering: "Chrome + Remotion — often 5–15 minutes.",
  qa_report: "Running creative QA checks on this video.",
  publishing: "Uploading MP4s, scripts, and QA to the pack folder.",
};

function normalizeStepId(id: string | null | undefined): string | undefined {
  if (!id) return id;
  return LEGACY_STEP_ALIASES[id] ?? id;
}

function inferCurrentStep(steps: VideoProgressStep[]): string | null {
  const running = steps.find((s) => s.status === "running");
  if (running?.id) return normalizeStepId(running.id) ?? running.id;
  const failed = steps.find((s) => s.status === "failed");
  if (failed?.id) return normalizeStepId(failed.id) ?? failed.id;
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    if (steps[i].status === "done") {
      return normalizeStepId(steps[i].id) ?? steps[i].id;
    }
  }
  return steps[0]?.id ?? null;
}

const STEP_ORDER = [
  "crm_drafts",
  "pack_folder",
  "pack_subfolders",
  "pack_manifest",
  "pack_readme",
  ...RENDER_PIPELINE_STEPS.map((s) => s.id),
];

function stepOrderIndex(id: string): number {
  const idx = STEP_ORDER.indexOf(id);
  return idx >= 0 ? idx : STEP_ORDER.length + 1;
}

/** Merge pack + job progress; overlay updates step status by id. */
export function mergeVideoProgress(
  packProgress: VideoPipelineProgress | null | undefined,
  jobProgress: VideoPipelineProgress | null | undefined
): VideoPipelineProgress | null {
  const byId = new Map<string, VideoProgressStep>();

  for (const step of packProgress?.steps ?? []) {
    byId.set(step.id, { ...step });
  }
  for (const step of jobProgress?.steps ?? []) {
    const id = normalizeStepId(step.id) ?? step.id;
    const prev = byId.get(id);
    byId.set(id, prev ? { ...prev, ...step, id } : { ...step, id });
  }

  const packDone = byId.get("pipeline_queued")?.status === "done";
  const hasLiveProgress = Boolean(
    jobProgress?.updated_at ||
      jobProgress?.steps?.some(
        (s) => s.status === "running" || s.status === "done" || s.status === "failed"
      )
  );

  const inferredCurrent = inferCurrentStep([...byId.values()]);
  const current =
    normalizeStepId(jobProgress?.current_step ?? packProgress?.current_step) ??
    inferredCurrent;

  if (packDone || current || jobProgress?.steps?.length) {
    for (const { id, label } of RENDER_PIPELINE_STEPS) {
      if (id === "pipeline_queued" || byId.has(id)) continue;
      byId.set(id, {
        id,
        label,
        status: hasLiveProgress && id === current ? "running" : "pending",
      });
    }
  }

  const steps = [...byId.values()].sort(
    (a, b) => stepOrderIndex(a.id) - stepOrderIndex(b.id)
  );

  if (!steps.length) return null;

  return {
    current_step: inferCurrentStep(steps) ?? current,
    steps,
    updated_at: jobProgress?.updated_at ?? packProgress?.updated_at ?? null,
    stale: jobProgress?.stale ?? packProgress?.stale,
    stale_message: jobProgress?.stale_message ?? packProgress?.stale_message,
  };
}
