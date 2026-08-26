"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAutonomousApiBaseUrl } from "@/lib/utils";
import type { AutonomousSequenceLink } from "@/lib/autonomous-sequence-keys";
import { templateCoversFlow } from "@/lib/autonomous-sequence-keys";

type TemplateRow = {
  sequence_type: string;
  display_name: string;
  is_active: boolean;
  linked_flow_keys?: string[];
};

let cacheToken = "";
let cacheRows: TemplateRow[] | null = null;
let inflight: Promise<TemplateRow[]> | null = null;

function loadTemplates(token: string): Promise<TemplateRow[]> {
  if (cacheToken === token && cacheRows) return Promise.resolve(cacheRows);
  if (inflight && cacheToken === token) return inflight;
  cacheToken = token;
  inflight = (async () => {
    const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/templates`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      throw new Error(typeof data?.detail === "string" ? data.detail : "Failed to load templates");
    }
    const rows: TemplateRow[] = Array.isArray(data)
      ? data.map((t: { sequence_type?: string; display_name?: string; is_active?: boolean; linked_flow_keys?: string[] }) => ({
          sequence_type: String(t.sequence_type || ""),
          display_name: String(t.display_name || t.sequence_type || ""),
          is_active: t.is_active !== false,
          linked_flow_keys: Array.isArray(t.linked_flow_keys)
            ? t.linked_flow_keys.map((k) => String(k || "").trim()).filter(Boolean)
            : [],
        }))
      : [];
    cacheRows = rows;
    return rows;
  })();
  void inflight.finally(() => {
    inflight = null;
  });
  return inflight;
}

export function LinkedAutonomousFollowupBar({
  links,
}: {
  links: readonly AutonomousSequenceLink[];
}) {
  const { data: session } = useSession();
  const token = (session as { id_token?: string } | null)?.id_token;
  const [templates, setTemplates] = useState<TemplateRow[]>(cacheRows ?? []);
  const [loading, setLoading] = useState(!cacheRows);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || links.length === 0) return;
    let cancelled = false;
    void (async () => {
      setLoading(!cacheRows);
      try {
        const rows = await loadTemplates(token);
        if (!cancelled) {
          setTemplates(rows);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load templates");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, links.length]);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
        Linked follow-up
      </span>
      {loading ? (
        <span className="text-[11px] text-gray-400">Loading…</span>
      ) : error ? (
        <span className="text-[11px] text-amber-700">{error}</span>
      ) : (
        links.map((link) => {
          const tpl = templates.find((t) => templateCoversFlow(t, link.sequence_type));
          return (
            <span
              key={link.sequence_type}
              className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-indigo-100 bg-white/90 px-2 py-1 dark:border-indigo-900/50 dark:bg-gray-900/60"
              title={`${link.startsWhen} · ${link.sequence_type}`}
            >
              <span className="truncate text-[12px] font-medium text-gray-800 dark:text-gray-100">
                {tpl?.display_name || link.label}
              </span>
              {tpl ? (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold ${
                    tpl.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tpl.is_active ? "Active" : "Inactive"}
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-medium text-amber-700">Missing</span>
              )}
              <Link
                href={
                  tpl
                    ? `/autonomous-agent?tab=templates&type=${encodeURIComponent(link.sequence_type)}`
                    : "/autonomous-agent?tab=templates"
                }
                className="shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
              >
                {tpl ? "Edit" : "Create"}
              </Link>
            </span>
          );
        })
      )}
    </div>
  );
}
