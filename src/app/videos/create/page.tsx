"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, ExternalLink, FileText, Film, Loader2, RefreshCw, Search, Sparkles, Upload, User } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useToast } from "@/components/ui/toast";
import { CustomVideoWizard } from "@/components/videos/CustomVideoWizard";
import { VideoCreateResultSection } from "@/components/videos/VideoCreateResultSection";
import { type VideoPipelineResult } from "@/lib/video-pipeline";
import { cn, getApiBaseUrl } from "@/lib/utils";
import { SOLUTION_TYPE_LABELS } from "@/lib/testimonial-solution-content";
import {
  buildMarketingSolutionCatalog,
  marketingVideoBadge,
  type CrmClientPick,
  type MarketingSolutionPick,
  type TestimonialPick,
  testimonialDocumentUrl,
} from "@/lib/video-create-catalog";
import {
  fetchDriveVideos,
  fetchMarketingVideos,
  fetchVideoRegistry,
  type VideoRegistryEntry,
} from "@/lib/video-api";

type CreateMode = "member" | "marketing" | "custom";

export default function VideoCreatePage() {
  const searchParams = useSearchParams();
  const initialTestimonialId = searchParams.get("testimonial_id");
  const initialClientId = searchParams.get("client_id");
  const initialMode = searchParams.get("mode");
  const resumeSlug = searchParams.get("slug")?.trim().toLowerCase() || "";

  const { data: session } = useSession();
  const { showToast } = useToast();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken;

  const [mode, setMode] = useState<CreateMode>(
    initialMode === "custom" || initialMode === "marketing" ? initialMode : "member"
  );
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [clients, setClients] = useState<CrmClientPick[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    initialClientId ? Number(initialClientId) : null
  );
  const [testimonials, setTestimonials] = useState<TestimonialPick[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(false);
  const [selectedTestimonialId, setSelectedTestimonialId] = useState<number | null>(
    initialTestimonialId ? Number(initialTestimonialId) : null
  );

  const [businessName, setBusinessName] = useState("");
  const [solutionTypeId, setSolutionTypeId] = useState("");
  const [slugHint, setSlugHint] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<VideoPipelineResult | null>(null);

  const [registry, setRegistry] = useState<VideoRegistryEntry[]>([]);
  const [allVideos, setAllVideos] = useState<Awaited<ReturnType<typeof fetchMarketingVideos>>>([]);
  const [driveVideos, setDriveVideos] = useState<Awaited<ReturnType<typeof fetchDriveVideos>>["videos"]>([]);
  const [selectedMarketing, setSelectedMarketing] = useState<MarketingSolutionPick | null>(null);
  const [marketingSearch, setMarketingSearch] = useState("");

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const selectedTestimonial = useMemo(
    () => testimonials.find((t) => t.id === selectedTestimonialId) ?? null,
    [testimonials, selectedTestimonialId]
  );

  const crmTestimonialsHref = selectedClientId
    ? `/crm-members/${selectedClientId}?tab=testimonials`
    : "/crm-members";

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients.slice(0, 50);
    return clients.filter((c) => c.business_name.toLowerCase().includes(q)).slice(0, 50);
  }, [clients, clientSearch]);

  const marketingCatalog = useMemo(
    () => buildMarketingSolutionCatalog(registry, allVideos, driveVideos),
    [registry, allVideos, driveVideos]
  );

  const filteredMarketing = useMemo(() => {
    const q = marketingSearch.trim().toLowerCase();
    if (!q) return marketingCatalog;
    return marketingCatalog.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.videoSlug.includes(q) ||
        m.category.includes(q)
    );
  }, [marketingCatalog, marketingSearch]);

  const loadMeta = useCallback(async () => {
    if (!token) {
      setLoadingMeta(false);
      return;
    }
    setLoadingMeta(true);
    try {
      const [clientsRes, reg, vids, drive] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/clients?limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchVideoRegistry(token),
        fetchMarketingVideos(token),
        fetchDriveVideos(token, "marketing").catch(() => ({ folder_url: "", videos: [] })),
      ]);
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        const list = Array.isArray(data) ? data : data.items || data.clients || [];
        setClients(
          list.map((c: CrmClientPick) => ({
            id: c.id,
            business_name: c.business_name,
            gdrive_folder_url: c.gdrive_folder_url,
          }))
        );
      }
      setRegistry(reg.entries || []);
      setAllVideos(vids);
      setDriveVideos(drive.videos || []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load CRM data", "error");
    } finally {
      setLoadingMeta(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!token || !resumeSlug || pipelineResult) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchMarketingVideos(token, { slug: resumeSlug });
        if (cancelled || rows.length === 0) return;
        const primary = rows.find((r) => r.variant === "long") ?? rows[0];
        if (!primary.tool_output_zip_path) return;
        setSlugHint(resumeSlug);
        setPipelineResult({
          slug: resumeSlug,
          packFolderUrl: primary.tool_output_zip_path,
          packFolderName: primary.render_job_id,
          videoIds: rows.map((r) => r.id),
          cli: [],
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, resumeSlug, pipelineResult]);

  const loadTestimonials = useCallback(
    async (name: string, quiet = false) => {
      if (!name.trim()) {
        setTestimonials([]);
        return;
      }
      setLoadingTestimonials(true);
      try {
        const res = await fetch(
          `/api/testimonials?business_name=${encodeURIComponent(name.trim())}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load testimonials");
        const list = (Array.isArray(data) ? data : []) as TestimonialPick[];
        setTestimonials(list.filter((t) => t.id > 0));
        if (!quiet) showToast("Testimonials refreshed", "success");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Failed to load testimonials", "error");
        setTestimonials([]);
      } finally {
        setLoadingTestimonials(false);
      }
    },
    [showToast]
  );

  const refreshTestimonials = useCallback(() => {
    if (!selectedClient) {
      showToast("Select a CRM member first", "error");
      return;
    }
    loadTestimonials(selectedClient.business_name);
  }, [selectedClient, loadTestimonials, showToast]);

  useEffect(() => {
    if (selectedClient) {
      setBusinessName(selectedClient.business_name);
      loadTestimonials(selectedClient.business_name, true);
      setSlugEdited(false);
      setSlugHint("");
    }
  }, [selectedClient, loadTestimonials]);

  useEffect(() => {
    setSlugEdited(false);
    setSlugHint("");
  }, [solutionTypeId]);

  useEffect(() => {
    if (!businessName.trim() || !token || slugEdited) return;
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ business_name: businessName.trim() });
        if (solutionTypeId) params.set("solution_type_id", solutionTypeId);
        const res = await fetch(`${getApiBaseUrl()}/api/videos/suggest-slug?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.slug) setSlugHint(data.slug);
        }
      } catch {
        /* optional */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [businessName, solutionTypeId, token, slugEdited]);

  useEffect(() => {
    if (selectedTestimonialId && testimonials.length) {
      const t = testimonials.find((x) => x.id === selectedTestimonialId);
      if (t?.testimonial_solution_type_id) setSolutionTypeId(t.testimonial_solution_type_id);
    }
  }, [selectedTestimonialId, testimonials]);

  const applyTestimonial = (t: TestimonialPick) => {
    setSelectedTestimonialId(t.id);
    if (t.testimonial_solution_type_id) setSolutionTypeId(t.testimonial_solution_type_id);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      showToast("Select a CRM member", "error");
      return;
    }
    if (!selectedTestimonialId) {
      showToast("Select a testimonial — upload new documents in CRM first", "error");
      return;
    }

    setSubmitting(true);
    setPipelineResult(null);
    try {
      const fd = new FormData();
      fd.append("testimonial_id", String(selectedTestimonialId));
      if (slugHint) fd.append("slug_hint", slugHint);
      fd.append("client_id", String(selectedClientId));
      const res = await fetch("/api/videos/start-from-testimonial", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Start failed");

      const videos = Array.isArray(data.videos) ? data.videos : [];
      const result: VideoPipelineResult = {
        slug: data.slug || slugHint,
        packFolderUrl: data.pack_folder_url,
        packFolderName: data.pack_folder_name,
        packParentFolderUrl: data.pack_parent_folder_url,
        packError: data.pack_error,
        packWarnings: Array.isArray(data.pack_warnings) ? data.pack_warnings : [],
        videoIds: videos.map((v: { id?: number }) => v.id).filter(Boolean),
        renderJob: data.render_job ?? null,
        czaVideosApiUrl: data.cza_videos_api_url ?? null,
        progress: data.progress ?? null,
        cli: Array.isArray(data.cli) ? data.cli : [],
      };
      setPipelineResult(result);
      if (data.slug) setSlugHint(data.slug);

      requestAnimationFrame(() => {
        document.getElementById("video-pipeline-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarketingSelect = (m: MarketingSolutionPick) => {
    setSelectedMarketing(m);
    setSlugHint(m.videoSlug);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumb />
      <div>
        <Link href="/videos" className="text-sm text-primary hover:underline">
          ← Videos
        </Link>
        <h1 className="text-heading-4 font-bold text-dark dark:text-white mt-2">Create video</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Start from a CRM testimonial, pick a solution-range marketing video, or scope a custom project.
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark">
        <button
          type="button"
          onClick={() => setMode("member")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs sm:text-sm font-semibold",
            mode === "member" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-3"
          )}
        >
          <User className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Member</span> testimonial
        </button>
        <button
          type="button"
          onClick={() => setMode("marketing")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs sm:text-sm font-semibold",
            mode === "marketing" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-3"
          )}
        >
          <Film className="h-4 w-4 shrink-0" />
          Marketing
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs sm:text-sm font-semibold",
            mode === "custom" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-3"
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          Custom
        </button>
      </div>

      {loadingMeta && mode !== "custom" && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading CRM &amp; video catalog…
        </div>
      )}

      {mode === "member" && !loadingMeta && (
        <form onSubmit={handleMemberSubmit} className="space-y-5">
          {pipelineResult && (
            <VideoCreateResultSection
              loading={submitting}
              result={pipelineResult}
              videoLabel={selectedClient?.business_name ?? businessName}
              token={token}
              onDismiss={() => {
                setPipelineResult(null);
              }}
            />
          )}

          {!pipelineResult && selectedTestimonial && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Video source testimonial
              </p>
              <p className="text-sm font-medium text-dark dark:text-white truncate">
                {selectedTestimonial.file_name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {selectedTestimonial.status}
                {selectedTestimonial.testimonial_solution_type_id
                  ? ` · ${SOLUTION_TYPE_LABELS[selectedTestimonial.testimonial_solution_type_id] || selectedTestimonial.testimonial_solution_type_id}`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={testimonialDocumentUrl(selectedTestimonial)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Open testimonial document
                  <ExternalLink className="h-3 w-3" />
                </a>
                {selectedClientId && (
                  <Link
                    href={crmTestimonialsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-primary hover:underline"
                  >
                    View in CRM
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {!pipelineResult && (
            <>
          <section className="rounded-xl border border-stroke dark:border-dark-3 p-4 space-y-3 bg-white dark:bg-gray-dark">
            <h2 className="text-sm font-semibold">1. Select CRM member</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search members…"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full pl-9 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
              {filteredClients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedClientId(c.id);
                    setClientSearch("");
                    setSelectedTestimonialId(null);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-primary/5",
                    selectedClientId === c.id && "bg-primary/10 font-medium"
                  )}
                >
                  {c.business_name}
                </button>
              ))}
              {filteredClients.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-500">No members match</p>
              )}
            </div>
            {selectedClient && (
              <p className="text-xs text-violet-600">
                Selected: <strong>{selectedClient.business_name}</strong>
                {selectedClient.gdrive_folder_url ? " · Drive folder linked" : " · no member Drive folder"}
              </p>
            )}
          </section>

          {selectedClient && (
            <section className="rounded-xl border border-stroke dark:border-dark-3 p-4 space-y-3 bg-white dark:bg-gray-dark">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">2. Select CRM testimonial</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={refreshTestimonials}
                    disabled={loadingTestimonials || !selectedClient}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-primary disabled:opacity-50"
                    title="Reload testimonials from CRM after uploading in another tab"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", loadingTestimonials && "animate-spin")} />
                    Refresh list
                  </button>
                  <Link
                    href={crmTestimonialsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Upload in CRM
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              {loadingTestimonials ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : testimonials.length > 0 ? (
                <div className="space-y-2">
                  {testimonials.map((t) => (
                    <label
                      key={t.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer",
                        selectedTestimonialId === t.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <input
                        type="radio"
                        name="testimonial"
                        checked={selectedTestimonialId === t.id}
                        onChange={() => applyTestimonial(t)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.file_name}</p>
                        <p className="text-xs text-gray-500">
                          {t.status}
                          {t.testimonial_solution_type_id
                            ? ` · ${SOLUTION_TYPE_LABELS[t.testimonial_solution_type_id] || t.testimonial_solution_type_id}`
                            : ""}
                          {t.video_long_file_id ? " · long video linked" : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center space-y-2">
                  <p className="text-sm text-gray-600">No testimonials for this member yet.</p>
                  <Link
                    href={crmTestimonialsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-3 py-2 text-sm font-semibold hover:bg-primary/15"
                  >
                    Add testimonial in CRM
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
              <p className="text-[11px] text-gray-500">
                Uploads happen on the CRM Testimonials tab (opens in a new tab). This list is not live — click{" "}
                <strong>Refresh list</strong> after adding a document there.
              </p>
            </section>
          )}

          <section className="rounded-xl border border-stroke dark:border-dark-3 p-4 space-y-3 bg-white dark:bg-gray-dark">
            <h2 className="text-sm font-semibold">3. Video details</h2>
            <div>
              <label className="block text-xs font-medium mb-1">Solution type</label>
              <select
                value={solutionTypeId}
                onChange={(e) => setSolutionTypeId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800"
              >
                <option value="">— Optional —</option>
                {Object.entries(SOLUTION_TYPE_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Video slug</label>
              <input
                type="text"
                value={slugHint}
                onChange={(e) => {
                  setSlugHint(e.target.value);
                  setSlugEdited(true);
                }}
                placeholder="Auto-suggested e.g. peninsula-villages-ci-electricity"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Registry slug if one exists; otherwise generated from member + solution type. Edit before starting if needed.
              </p>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting || !selectedClientId || !selectedTestimonialId}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Start from CRM testimonial
          </button>
            </>
          )}

          {submitting && !pipelineResult && (
            <div id="video-pipeline-result">
              <VideoCreateResultSection
                loading
                videoLabel={selectedClient?.business_name ?? businessName}
              />
            </div>
          )}
        </form>
      )}

      {mode === "marketing" && !loadingMeta && (
        <div className="space-y-4">
          <section className="rounded-xl border border-stroke dark:border-dark-3 p-4 space-y-3 bg-white dark:bg-gray-dark">
            <h2 className="text-sm font-semibold">Solution range videos</h2>
            <input
              type="search"
              placeholder="Filter solutions…"
              value={marketingSearch}
              onChange={(e) => setMarketingSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
            <div className="max-h-72 overflow-y-auto space-y-2">
              {filteredMarketing.map((m) => {
                const badge = marketingVideoBadge(m);
                return (
                  <button
                    key={m.videoSlug}
                    type="button"
                    onClick={() => handleMarketingSelect(m)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      selectedMarketing?.videoSlug === m.videoSlug
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 dark:border-gray-700 hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{m.name}</span>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{m.videoSlug}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedMarketing && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 dark:bg-violet-900/20 p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                {selectedMarketing.name}
              </p>
              {selectedMarketing.hasPublishedVideo ? (
                <Link
                  href={`/videos?slug=${encodeURIComponent(selectedMarketing.videoSlug)}`}
                  className="text-sm text-primary hover:underline"
                >
                  View published video in library →
                </Link>
              ) : selectedMarketing.onDrive ? (
                <p className="text-xs text-gray-600">
                  MP4 on Drive — publish to library with{" "}
                  <code className="bg-white/80 px-1 rounded">
                    python tools/publish_to_interface.py --slug {selectedMarketing.videoSlug}
                  </code>
                </p>
              ) : selectedMarketing.inRegistry ? (
                <p className="text-xs text-gray-600">
                  In claude-videos catalog — render locally:{" "}
                  <code className="bg-white/80 px-1 rounded">
                    npm run render:only -- {selectedMarketing.videoSlug}
                  </code>
                </p>
              ) : (
                <p className="text-xs text-gray-600">No registry entry yet for this solution.</p>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "custom" && (
        <CustomVideoWizard />
      )}
    </div>
  );
}
