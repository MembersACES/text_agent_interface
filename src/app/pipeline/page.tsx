"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import {
  CLIENT_STAGES,
  CLIENT_STAGE_LABELS,
  ClientStage,
} from "@/constants/crm";

interface Client {
  id: number;
  business_name: string;
  stage: ClientStage;
  owner_email?: string | null;
  primary_contact_email?: string | null;
}

const STAGE_CONFIG: Record<string, { label: string; dot: string; accent: string }> = {
  lead:                 { label: "Lead",            dot: "bg-gray-400",    accent: "border-t-gray-400"    },
  qualified:            { label: "Qualified",       dot: "bg-violet-400",  accent: "border-t-violet-400"  },
  loa_signed:           { label: "LOA Signed",      dot: "bg-yellow-400",  accent: "border-t-yellow-400"  },
  data_collected:       { label: "Data Collected",  dot: "bg-orange-400",  accent: "border-t-orange-400"  },
  analysis_in_progress: { label: "Analysis",        dot: "bg-blue-400",    accent: "border-t-blue-400"    },
  offer_sent:           { label: "Offer Sent",      dot: "bg-indigo-400",  accent: "border-t-indigo-400"  },
  won:                  { label: "Won",             dot: "bg-green-400",   accent: "border-t-green-400"   },
  existing_client:      { label: "Existing Client", dot: "bg-emerald-400", accent: "border-t-emerald-400" },
  lost:                 { label: "Lost",            dot: "bg-red-400",     accent: "border-t-red-400"     },
};

function getCfg(stage: string) {
  return STAGE_CONFIG[stage.toLowerCase()] ?? {
    label: stage.replace(/_/g, " "),
    dot: "bg-gray-400",
    accent: "border-t-gray-400",
  };
}

interface DragState { clientId: number; fromStage: ClientStage; }

function ClientCard({
  client, offerCount, isDragging, onDragStart, onDragEnd,
  selected, onToggleSelect,
}: {
  client: Client; offerCount?: number; isDragging: boolean; onDragStart: () => void; onDragEnd: () => void;
  selected?: boolean; onToggleSelect?: (id: number) => void;
}) {
  const initials = client.business_name
    .split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div
      className={`rounded-lg border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700
        hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm
        transition-all duration-150 p-3 flex items-start gap-2
        ${isDragging ? "opacity-40 scale-[0.97] rotate-1" : ""}`}
    >
      {/* Drag handle: only this area triggers drag so the card can stay a link */}
      <div
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 -m-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          setTimeout(onDragStart, 0);
        }}
        onDragEnd={onDragEnd}
        title="Drag to move stage"
        aria-label="Drag to move to another stage"
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
      <Link href={`/clients/${client.id}`} className="flex-1 min-w-0 block" tabIndex={-1}>
        <div className="flex items-start gap-2.5">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={() => onToggleSelect(client.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 shrink-0 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
              aria-label={`Select ${client.business_name}`}
            />
          )}
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {client.business_name}
            </p>
            {client.primary_contact_email && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {client.primary_contact_email}
              </p>
            )}
            {client.owner_email && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {client.owner_email.split("@")[0]}
              </p>
            )}
            {offerCount != null && offerCount > 0 && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                {offerCount} offer{offerCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

function PipelineColumn({
  stageKey, label, list, offerCountByClientId, dragging, onDrop, onDragStart, onDragEnd,
  selectedIds, onToggleSelect,
}: {
  stageKey: ClientStage; label: string; list: Client[];
  offerCountByClientId: Record<string, number>;
  dragging: DragState | null;
  onDrop: (s: ClientStage) => void;
  onDragStart: (id: number, s: ClientStage) => void;
  onDragEnd: () => void;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const cfg = getCfg(stageKey);
  const canDrop = dragging && dragging.fromStage !== stageKey;
  const totalOffers = list.reduce((sum, c) => sum + (offerCountByClientId[String(c.id)] ?? 0), 0);

  return (
    <div
      className={`flex flex-col rounded-xl border-t-2 min-h-[160px] transition-colors duration-150
        ${cfg.accent}
        ${isOver && canDrop
          ? "bg-blue-50 dark:bg-blue-950/20 border-x border-b border-blue-200 dark:border-blue-700"
          : "bg-gray-50 dark:bg-gray-900/60 border-x border-b border-gray-200 dark:border-gray-700/60"
        }`}
      onDragOver={(e) => { if (dragging) { e.preventDefault(); setIsOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOver(false); }}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(stageKey); }}
    >
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {totalOffers > 0 && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400" title="Offers in column">
              {totalOffers} offer{totalOffers !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold tabular-nums">
            {list.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
        {list.length === 0 ? (
          <div className={`flex items-center justify-center rounded-lg border-2 border-dashed py-6 transition-colors duration-150
            ${isOver && canDrop ? "border-blue-300 dark:border-blue-600" : "border-gray-200 dark:border-gray-700"}`}>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {isOver && canDrop ? "Drop here" : "Empty"}
            </p>
          </div>
        ) : (
          list.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              offerCount={offerCountByClientId[String(client.id)]}
              isDragging={dragging?.clientId === client.id}
              onDragStart={() => onDragStart(client.id, client.stage)}
              onDragEnd={onDragEnd}
              selected={selectedIds?.has(client.id)}
              onToggleSelect={onToggleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [clients, setClients] = useState<Client[]>([]);
  const [offerCountByClientId, setOfferCountByClientId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [filterMine, setFilterMine] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStageValue, setBulkStageValue] = useState<ClientStage>("lead");
  const [bulkStageSubmitting, setBulkStageSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `${getApiBaseUrl()}/api/clients${filterMine ? "?mine=1" : ""}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.detail || "Failed to load clients");
        }
        const data: Client[] = await res.json();
        if (!cancelled) setClients(Array.isArray(data) ? data : []);

        const countsRes = await fetch(`${getApiBaseUrl()}/api/reports/clients/offer-counts`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!cancelled && countsRes.ok) {
          const counts: Record<string, number> = await countsRes.json();
          setOfferCountByClientId(counts);
        } else if (!cancelled) {
          setOfferCountByClientId({});
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load pipeline");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, filterMine]);

  // All pipeline stages in order (source of truth: CLIENT_STAGES); empty stages still get a column/drop target
  const allColumns = useMemo(
    () =>
      CLIENT_STAGES.map((id) => ({
        id,
        label: CLIENT_STAGE_LABELS[id] ?? getCfg(id).label,
      })),
    []
  );

  const grouped = useMemo(() => {
    const g: Record<string, Client[]> = {};
    for (const c of clients) {
      const key = (c.stage || "lead").toLowerCase();
      if (!g[key]) g[key] = [];
      g[key].push(c);
    }
    for (const key of Object.keys(g)) {
      g[key].sort((a, b) => a.business_name.localeCompare(b.business_name));
    }
    return g;
  }, [clients]);

  const handleDragStart = useCallback((clientId: number, fromStage: ClientStage) => {
    setDragging({ clientId, fromStage });
  }, []);

  const handleDragEnd = useCallback(() => setDragging(null), []);

  const toggleSelectClient = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => (prev.size === clients.length ? new Set() : new Set(clients.map((c) => c.id))));
  }, [clients]);

  const handleBulkStageChange = useCallback(async () => {
    if (!token || selectedIds.size === 0) return;
    setBulkStageSubmitting(true);
    const prev = [...clients];
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients/bulk`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ client_ids: Array.from(selectedIds), stage: bulkStageValue }),
      });
      if (!res.ok) throw new Error("Failed to update stages");
      const updated: Client[] = await res.json();
      setClients((curr) =>
        curr.map((c) => {
          const u = updated.find((x) => x.id === c.id);
          return u ? { ...c, stage: u.stage } : c;
        })
      );
      setSelectedIds(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update stages");
      setClients(prev);
    } finally {
      setBulkStageSubmitting(false);
    }
  }, [token, selectedIds, bulkStageValue, clients]);

  const handleDrop = useCallback(async (toStage: ClientStage) => {
    if (!dragging || !token || dragging.fromStage === toStage) { handleDragEnd(); return; }
    const { clientId } = dragging;
    const prev = clients;
    setClients((curr) => curr.map((c) => c.id === clientId ? { ...c, stage: toStage } : c));
    handleDragEnd();
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}/stage`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ stage: toStage }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to update stage");
      }
      const updated: Client = await res.json();
      setClients((curr) => curr.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
    } catch (e: any) {
      setError(e.message || "Failed to update stage");
      setClients(prev);
    }
  }, [dragging, token, clients, handleDragEnd]);

  return (
    <>
      <PageHeader pageName="Pipeline" title="Client Pipeline" description="Drag clients between stages to update their status." />
      <div className="mt-4 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterMine}
              onChange={(e) => setFilterMine(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">My clients</span>
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Total: <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{clients.length}</span> clients
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
          </div>
        )}

        {selectedIds.size > 0 && !loading && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-3">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedIds.size} selected</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === clients.length}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Select all</span>
            </label>
            <select
              value={bulkStageValue}
              onChange={(e) => setBulkStageValue(e.target.value as ClientStage)}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5"
            >
              {CLIENT_STAGES.map((s) => (
                <option key={s} value={s}>{CLIENT_STAGE_LABELS[s] ?? s}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkStageChange}
              disabled={bulkStageSubmitting}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {bulkStageSubmitting ? "Updating…" : "Change stage"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading pipeline…</div>
        ) : (
          <div
            className="overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1"
            style={{ maxHeight: "calc(100vh - 220px)" }}
          >
            <div
              className="grid gap-4 min-h-[420px] w-max"
              style={{
                gridTemplateColumns: `repeat(${allColumns.length}, minmax(260px, 280px))`,
              }}
            >
              {allColumns.map((col) => (
                <PipelineColumn
                  key={col.id}
                  stageKey={col.id}
                  label={col.label}
                  list={grouped[col.id.toLowerCase()] ?? []}
                  offerCountByClientId={offerCountByClientId}
                  dragging={dragging}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelectClient}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}