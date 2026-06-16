"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { isVideoDevToolsEnabled } from "@/lib/video-api";

type RegenerateAllResponse = {
  warning?: string;
  registry_count?: number;
  marketing_count?: number;
  testimonial_count?: number;
  cli?: string[];
  publish_commands?: string[];
};

export function RegenerateAllButton({ onCliSteps }: { onCliSteps?: (steps: string[]) => void }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);

  if (!isVideoDevToolsEnabled()) return null;

  const close = () => {
    setOpen(false);
    setConfirmed(false);
  };

  const run = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/videos/dev/regenerate-all", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as RegenerateAllResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (Array.isArray(data.cli)) onCliSteps?.(data.cli);
      showToast("Regenerate-all workflow ready — see Local pipeline tab for commands", "success");
      setOpen(false);
      setConfirmed(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
      >
        <RotateCcw className="h-4 w-4" />
        Regenerate all
      </button>

      <Modal
        open={open}
        onClose={close}
        id="regenerate-all-modal"
        size="lg"
        title="Regenerate all videos?"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-dark-3"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!confirmed || running}
              onClick={run}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50",
                "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Regenerate all
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/40">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2 text-sm">
              <p className="font-bold text-amber-900 dark:text-amber-100">
                TESTING &amp; DEVELOPMENT ONLY — Do not run this.
              </p>
              <p className="text-amber-900/90 dark:text-amber-100/90">
                This queues the <strong>full library</strong> regenerate workflow (voiceover + all renders +
                postrender + publish). It can take hours and overwrite QA bundles. Other users must not run this
                on production.
              </p>
              <p className="text-amber-800/80 dark:text-amber-200/80 text-xs">
                The interface does not render videos — confirming returns CLI commands for your claude-videos
                machine.
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            <span>
              I understand this is for local/dev end-to-end testing only and I will run the commands on the
              render machine, not in production.
            </span>
          </label>
        </div>
      </Modal>
    </>
  );
}
