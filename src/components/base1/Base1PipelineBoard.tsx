"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";

type LeadStatus = "Base 1 Review Conducted" | "Contacted" | "LOA & SFA Recieved" | "Not a fit";

const LEAD_STATUSES: LeadStatus[] = [
  "Base 1 Review Conducted",
  "Contacted",
  "LOA & SFA Recieved",
  "Not a fit",
];

interface Lead {
  id: string;
  company_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_number?: string | null;
  state?: string | null;
  timestamp?: string | null;
  drive_folder_url?: string | null;
  base1_review_url?: string | null;
  utility_types?: string | null;
  status: LeadStatus;
}

interface DragState {
  leadId: string;
  fromStatus: LeadStatus;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; dot: string; accent: string }> = {
  "Base 1 Review Conducted": {
    label: "Base 1 Review Conducted",
    dot: "bg-gray-400",
    accent: "border-t-gray-400",
  },
  Contacted: { label: "Contacted", dot: "bg-blue-400", accent: "border-t-blue-400" },
  "LOA & SFA Recieved": {
    label: "LOA & SFA Recieved",
    dot: "bg-emerald-400",
    accent: "border-t-emerald-400",
  },
  "Not a fit": { label: "Not a fit", dot: "bg-red-400", accent: "border-t-red-400" },
};

function normalizeStatus(raw: unknown): LeadStatus {
  const v = String(raw || "").toLowerCase();
  if (v === "contacted") return "Contacted";
  if (v === "loa & sfa recieved") return "LOA & SFA Recieved";
  if (v === "not a fit" || v === "not_a_fit" || v === "not-fit") return "Not a fit";
  return "Base 1 Review Conducted";
}

function LeadCard({
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
      className={`rounded-lg border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700
        hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm
        transition-all duration-150 p-3 flex items-start gap-2
        ${isDragging ? "opacity-40 scale-[0.97] rotate-1" : ""}`}
    >
      <div
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 -m-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          setTimeout(onDragStart, 0);
        }}
        onDragEnd={onDragEnd}
        title="Drag to move lead status"
        aria-label="Drag to move to another lead status"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {lead.company_name}
            </p>
            {lead.contact_name && (
              <p className="text-[10px] text-gray-600 dark:text-gray-300 truncate">
                {lead.contact_name}
              </p>
            )}
            {lead.contact_email && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                {lead.contact_email}
              </p>
            )}
            {lead.utility_types && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                {lead.utility_types}
              </p>
            )}
            {lead.state && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {lead.state}
                {lead.contact_number ? ` · ${lead.contact_number}` : ""}
              </p>
            )}
            {lead.timestamp && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {lead.timestamp}
              </p>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {lead.base1_review_url && (
            <a
              href={lead.base1_review_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
            >
              Open Base 1 review
            </a>
          )}
          {lead.drive_folder_url && (
            <a
              href={lead.drive_folder_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Drive folder
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadColumn({
  status,
  list,
  dragging,
  onDrop,
  onDragStart,
  onDragEnd,
}: {
  status: LeadStatus;
  list: Lead[];
  dragging: DragState | null;
  onDrop: (s: LeadStatus) => void;
  onDragStart: (id: string, s: LeadStatus) => void;
  onDragEnd: () => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const cfg = STATUS_CONFIG[status];
  const canDrop = dragging && dragging.fromStatus !== status;

  return (
    <div
      className={`flex flex-col rounded-xl border-t-2 min-h-[160px] transition-colors duration-150
        ${cfg.accent}
        ${
          isOver && canDrop
            ? "bg-blue-50 dark:bg-blue-950/20 border-x border-b border-blue-200 dark:border-blue-700"
            : "bg-gray-50 dark:bg-gray-900/60 border-x border-b border-gray-200 dark:border-gray-700/60"
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
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {cfg.label}
          </span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold tabular-nums">
          {list.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
        {list.length === 0 ? (
          <div
            className={`flex items-center justify-center rounded-lg border-2 border-dashed py-6 text-[11px] transition-colors duration-150
            ${
              isOver && canDrop
                ? "border-blue-300 dark:border-blue-600 text-blue-500 dark:text-blue-300"
                : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
            }`}
          >
            {isOver && canDrop ? "Drop here" : "No leads"}
          </div>
        ) : (
          list.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isDragging={dragging?.leadId === lead.id}
              onDragStart={() => onDragStart(lead.id, lead.status)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function Base1PipelineBoard() {
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
            .map(
              (row: any): Lead => ({
                id: String(row.id ?? row.company_name ?? crypto.randomUUID()),
                company_name: String(row.company_name ?? ""),
                contact_name: row.contact_name ?? null,
                contact_email: row.contact_email ?? null,
                contact_number: row.contact_number ?? null,
                state: row.state ?? null,
                timestamp: row.timestamp ?? null,
                drive_folder_url: row.drive_folder_url ?? null,
                base1_review_url: row.base1_review_url ?? null,
                utility_types: row.utility_types ?? null,
                status: normalizeStatus(row.status),
              })
            )
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

  const grouped = useMemo(() => {
    const g: Record<LeadStatus, Lead[]> = {
      "Base 1 Review Conducted": [],
      Contacted: [],
      "LOA & SFA Recieved": [],
      "Not a fit": [],
    };
    for (const lead of leads) {
      g[lead.status].push(lead);
    }
    for (const status of LEAD_STATUSES) {
      g[status].sort((a, b) => a.company_name.localeCompare(b.company_name));
    }
    return g;
  }, [leads]);

  const handleDragStart = useCallback((leadId: string, fromStatus: LeadStatus) => {
    setDragging({ leadId, fromStatus });
  }, []);

  const handleDragEnd = useCallback(() => setDragging(null), []);

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
        const res = await fetch(`${getApiBaseUrl()}/api/client-status`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            business_name: movedLead.company_name,
            note: toStatus,
            note_type: "lead_status",
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.detail || "Failed to update lead status");
        }
      } catch (e: any) {
        setError(e.message || "Failed to update lead status");
        setLeads(prev);
      }
    },
    [dragging, token, leads, handleDragEnd]
  );

  const totalLeads = leads.length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-dark dark:text-white">
            Lead Pipeline (Base 1)
          </h3>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 max-w-xl">
            Leads here come from Base 1 runs that don&apos;t yet have a LOA. Drag cards between
            columns to update their lead status.
          </p>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Total:{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
            {totalLeads}
          </span>{" "}
          leads
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-2 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading lead pipeline…</div>
      ) : totalLeads === 0 ? (
        <div className="py-16 text-center text-gray-500 dark:text-gray-400 text-sm">
          No Base 1 leads found that aren&apos;t already members.
        </div>
      ) : (
        <div className="pb-2">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 min-h-[360px]">
            {LEAD_STATUSES.map((status) => (
              <LeadColumn
                key={status}
                status={status}
                list={grouped[status] ?? []}
                dragging={dragging}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

