"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/utils";
import {
  DragState,
  Lead,
  LeadStatus,
  LEAD_STATUSES,
  STATUS_CONFIG,
  groupLeadsByStatus,
  mapRowToLead,
  postLeadStatusUpdate,
} from "./base1Shared";

function StatusPillDropZone({
  status,
  count,
  dragging,
  onDrop,
}: {
  status: LeadStatus;
  count: number;
  dragging: DragState | null;
  onDrop: (s: LeadStatus) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const cfg = STATUS_CONFIG[status];
  const canDrop = dragging && dragging.fromStatus !== status;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors
        ${
          isOver && canDrop
            ? "border-primary bg-primary/5 text-primary"
            : "border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900 text-gray-600 dark:text-gray-300"
        }`}
      onDragOver={(e) => {
        if (dragging) {
          e.preventDefault();
          setIsOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        onDrop(status);
      }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span className="truncate max-w-[120px]">{cfg.label}</span>
      <span className="ml-1 rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 text-[10px] tabular-nums">
        {count}
      </span>
    </div>
  );
}

function MiniLeadCard({
  lead,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const initials = lead.company_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        setTimeout(onDragStart, 0);
      }}
      onDragEnd={onDragEnd}
      className={`min-w-[200px] max-w-xs rounded-lg border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 px-3 py-2.5 text-xs cursor-grab active:cursor-grabbing transition-all
        ${
          isDragging
            ? "opacity-40 scale-[0.97] shadow-sm"
            : "hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
        }`}
      title="Drag to update lead status"
    >
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {lead.company_name}
          </p>
          {lead.contact_name && (
            <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate">
              {lead.contact_name}
            </p>
          )}
          {lead.contact_email && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {lead.contact_email}
            </p>
          )}
          {lead.timestamp && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
              {lead.timestamp}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Base1PipelineMini() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `${getApiBaseUrl()}/api/base1-leads`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.detail || "Failed to load leads");
        }
        const data = await res.json();
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        if (!cancelled) {
          const mapped: Lead[] = rows
            .map((row: any) => mapRowToLead(row))
            .filter((lead: Lead) => lead.company_name.trim().length > 0);
          setLeads(mapped);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load leads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const grouped = useMemo(() => groupLeadsByStatus(leads), [leads]);
  const totalLeads = leads.length;

  const sortedByRecency = useMemo(() => {
    return [...leads].sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return a.company_name.localeCompare(b.company_name);
    });
  }, [leads]);

  const visibleLeads = sortedByRecency.slice(0, 8);

  const handleDragStart = useCallback((leadId: string, fromStatus: LeadStatus) => {
    setDragging({ leadId, fromStatus });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  const handleDrop = useCallback(
    async (toStatus: LeadStatus) => {
      if (!dragging || !token || dragging.fromStatus === toStatus) {
        handleDragEnd();
        return;
      }
      const { leadId } = dragging;
      const prev = leads;
      const movedLead = prev.find((l) => l.id === leadId);
      if (!movedLead) {
        handleDragEnd();
        return;
      }

      setLeads((curr) => curr.map((l) => (l.id === leadId ? { ...l, status: toStatus } : l)));
      handleDragEnd();

      try {
        await postLeadStatusUpdate({
          token,
          companyName: movedLead.company_name,
          toStatus,
        });
      } catch (e: any) {
        setError(e.message || "Failed to update lead status");
        setLeads(prev);
      }
    },
    [dragging, token, leads, handleDragEnd]
  );

  return (
    <section aria-labelledby="base1-mini-pipeline-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="base1-mini-pipeline-heading"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
          >
            Base 1 Lead Pipeline
          </h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Quick view of Base 1 leads; drag to update lead status.
          </p>
        </div>
        <Link
          href="/base-1#pipeline"
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-2 text-xs font-semibold text-primary shadow-sm hover:bg-primary/10 dark:border-primary/40 dark:bg-primary/10 dark:text-primary-foreground dark:hover:bg-primary/20"
        >
          <span>Open full Base 1 hub</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <Card className="bg-white dark:bg-dark-2 border border-gray-200/80 dark:border-dark-3 shadow-sm">
        <CardContent className="p-3 space-y-3">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-6 text-center text-[12px] text-gray-400">
              Loading Base 1 leads…
            </div>
          ) : totalLeads === 0 ? (
            <div className="py-6 text-center text-[12px] text-gray-500 dark:text-gray-400">
              No Base 1 leads found that aren&apos;t already members.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex flex-wrap gap-2">
                  {LEAD_STATUSES.map((status) => (
                    <StatusPillDropZone
                      key={status}
                      status={status}
                      count={grouped[status]?.length ?? 0}
                      dragging={dragging}
                      onDrop={handleDrop}
                    />
                  ))}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Total{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                    {totalLeads}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
                <p className="mb-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  Most recent leads
                </p>
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {visibleLeads.map((lead) => (
                    <MiniLeadCard
                      key={lead.id}
                      lead={lead}
                      isDragging={dragging?.leadId === lead.id}
                      onDragStart={() => handleDragStart(lead.id, lead.status)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

