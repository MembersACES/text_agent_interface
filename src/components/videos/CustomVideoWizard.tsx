"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Download, Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { VideoCreateResultSection } from "@/components/videos/VideoCreateResultSection";
import type { VideoPipelineResult } from "@/lib/video-pipeline";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Phase = "setup" | "scope" | "review";

function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function CustomVideoWizard() {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken;
  const { showToast } = useToast();
  const [phase, setPhase] = useState<Phase>("setup");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sourceExcerpt, setSourceExcerpt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewHtml, setReviewHtml] = useState<string | null>(null);
  const [resultSlug, setResultSlug] = useState("");
  const [pipelineResult, setPipelineResult] = useState<VideoPipelineResult | null>(null);

  const autoSlug = useMemo(() => slugifyTitle(title), [title]);
  const effectiveSlug = slug.trim() || autoSlug || "custom-video";

  const startScoping = async () => {
    if (!title.trim()) {
      showToast("Enter a project title", "error");
      return;
    }
    if (!file) {
      showToast("Upload a source document", "error");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/videos/custom/extract-text", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not read file");

      setSourceExcerpt(data.text || "");
      setPhase("scope");
      setMessages([]);
      setReadyToGenerate(false);

      const scopeRes = await fetch("/api/videos/custom/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "",
          history: [],
          title: title.trim(),
          slug: effectiveSlug,
          sourceExcerpt: data.text,
        }),
      });
      const scopeData = await scopeRes.json().catch(() => ({}));
      if (!scopeRes.ok) throw new Error(scopeData.error || "Scoping failed");
      setMessages([{ role: "assistant", content: scopeData.reply }]);
      setReadyToGenerate(Boolean(scopeData.readyToGenerate));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to start", "error");
    } finally {
      setBusy(false);
    }
  };

  const sendScopeMessage = async () => {
    if (!draft.trim() || busy) return;
    const userMsg = draft.trim();
    setDraft("");
    const nextHistory = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(nextHistory);
    setBusy(true);
    try {
      const res = await fetch("/api/videos/custom/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: nextHistory,
          title: title.trim(),
          slug: effectiveSlug,
          sourceExcerpt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Message failed");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setReadyToGenerate(Boolean(data.readyToGenerate));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const generateReview = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title.trim());
      fd.append("slug", effectiveSlug);
      fd.append("sourceExcerpt", sourceExcerpt);
      fd.append("scopeHistory", JSON.stringify(messages));

      const res = await fetch("/api/videos/custom/generate-review", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Generate failed");

      setReviewHtml(data.html || null);
      setResultSlug(data.slug || effectiveSlug);
      setPhase("review");
      const videos = Array.isArray(data.videos) ? data.videos : [];
      const result: VideoPipelineResult = {
        slug: data.slug || effectiveSlug,
        packFolderUrl: data.pack_folder_url,
        packFolderName: data.pack_folder_name,
        packParentFolderUrl: data.pack_parent_folder_url,
        packError: data.pack_error,
        packWarnings: Array.isArray(data.pack_warnings) ? data.pack_warnings : [],
        videoIds: videos.map((v: { id?: number }) => v.id).filter(Boolean),
        cli: Array.isArray(data.cli) ? data.cli : [],
      };
      setPipelineResult(result);
      showToast("Slide review ready", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Generate failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const downloadHtml = () => {
    if (!reviewHtml) return;
    const blob = new Blob([reviewHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resultSlug || "custom-video"}-review.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {phase === "setup" && (
        <section className="rounded-xl border border-stroke dark:border-dark-3 p-4 space-y-4 bg-white dark:bg-gray-dark">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload any brief, case study, or notes. The assistant will ask a few scoping questions, then
            generate a slide review HTML you can edit before local render.
          </p>
          <div>
            <label className="block text-xs font-medium mb-1">Project title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug) setSlug(slugifyTitle(e.target.value));
              }}
              placeholder="e.g. Peninsula Villages — solar overview"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Video slug</label>
            <input
              type="text"
              value={slug || autoSlug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="peninsula-villages-solar"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Source material</label>
            <input
              type="file"
              accept=".docx,.doc,.pdf,.txt,.md,.markdown"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-1">Word, PDF, or plain text — not limited to CRM testimonials.</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={startScoping}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Start scoping chat
          </button>
        </section>
      )}

      {phase === "scope" && (
        <section className="rounded-xl border border-stroke dark:border-dark-3 p-4 space-y-3 bg-white dark:bg-gray-dark">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Scope this video</h2>
            <span className="text-[11px] font-mono text-gray-500">{effectiveSlug}</span>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-dark-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm rounded-lg px-3 py-2 max-w-[90%]",
                  m.role === "assistant"
                    ? "bg-white dark:bg-gray-dark border border-gray-200 dark:border-gray-700"
                    : "bg-primary/10 ml-auto"
                )}
              >
                {m.content}
              </div>
            ))}
            {busy && messages.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendScopeMessage()}
              placeholder="Answer or add context…"
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={sendScopeMessage}
              className="rounded-lg bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-3 py-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={generateReview}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate slide review
            </button>
            {readyToGenerate && (
              <span className="text-xs text-emerald-600 self-center">Assistant has enough detail — ready when you are.</span>
            )}
            <button
              type="button"
              onClick={() => setPhase("setup")}
              className="text-xs text-gray-500 hover:underline self-center ml-auto"
            >
              ← Back to setup
            </button>
          </div>
          {busy && (
            <VideoCreateResultSection loading loadingMessage="Generating slides and creating Drive pack…" />
          )}
        </section>
      )}

      {phase === "review" && reviewHtml && (
        <section className="space-y-3">
          {pipelineResult && (
            <VideoCreateResultSection
              result={pipelineResult}
              token={token}
              videoLabel={title.trim() || undefined}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold">Slide review — {title}</p>
            <button
              type="button"
              onClick={downloadHtml}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Download className="h-4 w-4" />
              Download HTML
            </button>
            <Link href={`/videos?slug=${encodeURIComponent(resultSlug)}`} className="text-sm text-primary hover:underline">
              Open in video library →
            </Link>
          </div>
          <div className="rounded-xl border border-stroke dark:border-dark-3 overflow-hidden bg-black">
            <iframe
              title="Custom video slide review"
              srcDoc={reviewHtml}
              className="w-full h-[520px] border-0 bg-white"
              sandbox="allow-scripts"
            />
          </div>
          <p className="text-xs text-gray-500">
            Edit the downloaded HTML or export a script.yaml in claude-videos, then render locally. Draft rows are
            registered under slug <code className="font-mono">{resultSlug}</code>.
          </p>
        </section>
      )}
    </div>
  );
}
