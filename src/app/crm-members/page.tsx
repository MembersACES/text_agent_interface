"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/crm-member/shared/StageBadge";
import {
  CLIENT_STAGES,
  CLIENT_STAGE_LABELS,
  ClientStage,
} from "@/constants/crm";

interface Client {
  id: number;
  business_name: string;
  external_business_id?: string | null;
  primary_contact_email?: string | null;
  gdrive_folder_url?: string | null;
  stage: ClientStage;
  owner_email?: string | null;
  created_at: string;
  updated_at: string;
  // TODO: display "Last activity: X ago" when API returns last_activity_at (or equivalent) per client
}

export default function ClientsPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterStage, setFilterStage] = useState<string>("");
  const [filterCreatedAfter, setFilterCreatedAfter] = useState<string>("");
  const [filterCreatedBefore, setFilterCreatedBefore] = useState<string>("");
  const [filterMine, setFilterMine] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addClientForm, setAddClientForm] = useState({
    business_name: "",
    primary_contact_email: "",
    stage: "lead" as ClientStage,
    owner_email: "",
  });
  const [addClientSubmitting, setAddClientSubmitting] = useState(false);
  const [addClientError, setAddClientError] = useState<string | null>(null);
  const [offerCountByClientId, setOfferCountByClientId] = useState<Record<string, number>>({});
  const [totalClients, setTotalClients] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkOwnerOpen, setBulkOwnerOpen] = useState(false);
  const [bulkOwnerEmail, setBulkOwnerEmail] = useState("");
  const [bulkOwnerSubmitting, setBulkOwnerSubmitting] = useState(false);
  const [bulkStageOpen, setBulkStageOpen] = useState(false);
  const [bulkStage, setBulkStage] = useState<ClientStage>("lead");
  const [bulkStageSubmitting, setBulkStageSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cardStageClientId, setCardStageClientId] = useState<number | null>(null);
  const [cardStageValue, setCardStageValue] = useState<ClientStage>("lead");
  const [cardStageSubmitting, setCardStageSubmitting] = useState(false);

  const PAGE_SIZE = 20;

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (searchParams.get("openAdd") === "1") {
      setAddClientOpen(true);
      setAddClientForm((f) => ({ ...f, stage: "lead", owner_email: (session as any)?.user?.email ?? "" }));
    }
  }, [searchParams, session]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", "0");
        if (searchDebounced.trim()) params.set("query", searchDebounced.trim());
        if (filterStage) params.set("stage", filterStage);
        if (filterCreatedAfter) params.set("created_after", filterCreatedAfter);
        if (filterCreatedBefore) params.set("created_before", filterCreatedBefore);
        if (filterMine) params.set("mine", "1");
        const qs = params.toString();
        const url = `${getApiBaseUrl()}/api/clients?${qs}`;

        const res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.status === 401) {
          setError("Authentication required. Please log in again.");
          setClients([]);
          setTotalClients(0);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || data.message || "Failed to load members");
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setClients(data);
          setTotalClients(data.length);
        } else if (data && typeof data.items !== "undefined" && typeof data.total === "number") {
          setClients(Array.isArray(data.items) ? data.items : []);
          setTotalClients(data.total);
        } else {
          setClients([]);
          setTotalClients(0);
        }

        const countsRes = await fetch(`${getApiBaseUrl()}/api/reports/clients/offer-counts`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (countsRes.ok) {
          const counts: Record<string, number> = await countsRes.json();
          setOfferCountByClientId(counts);
        } else {
          setOfferCountByClientId({});
        }
        // TODO: show task count when /api/reports/clients/task-counts (or similar) exists
      } catch (e: unknown) {
        console.error("Error fetching clients", e);
        setError(e instanceof Error ? e.message : "Failed to load members");
        setClients([]);
        setTotalClients(0);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [token, searchDebounced, filterStage, filterCreatedAfter, filterCreatedBefore, filterMine]);

  const loadMoreClients = async () => {
    if (!token || loadingMore || clients.length >= totalClients) return;
    try {
      setLoadingMore(true);
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(clients.length));
      if (searchDebounced.trim()) params.set("query", searchDebounced.trim());
      if (filterStage) params.set("stage", filterStage);
      if (filterCreatedAfter) params.set("created_after", filterCreatedAfter);
      if (filterCreatedBefore) params.set("created_before", filterCreatedBefore);
      if (filterMine) params.set("mine", "1");
      const res = await fetch(`${getApiBaseUrl()}/api/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to load more");
      const data = await res.json();
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setClients((prev) => [...prev, ...nextItems]);
    } catch (e) {
      console.error("Load more clients", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !addClientForm.business_name.trim()) return;
    setAddClientSubmitting(true);
    setAddClientError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_name: addClientForm.business_name.trim(),
          primary_contact_email: addClientForm.primary_contact_email.trim() || undefined,
          stage: addClientForm.stage || "lead",
          owner_email: addClientForm.owner_email.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create member");
      }
      const created: Client = await res.json();
      setAddClientOpen(false);
      setAddClientForm({ business_name: "", primary_contact_email: "", stage: "lead", owner_email: "" });
      setClients((prev) => [created, ...prev]);
      window.location.href = `/crm-members/${created.id}`;
    } catch (err: any) {
      setAddClientError(err.message || "Failed to create member");
    } finally {
      setAddClientSubmitting(false);
    }
  };

  const groupedByStage = useMemo(() => {
    const groups: Record<ClientStage, Client[]> = {} as Record<
      ClientStage,
      Client[]
    >;
    for (const c of clients) {
      const s = (c.stage || "lead") as ClientStage;
      if (!groups[s]) groups[s] = [];
      groups[s].push(c);
    }
    for (const s of Object.keys(groups) as ClientStage[]) {
      groups[s].sort((a, b) =>
        a.business_name.localeCompare(b.business_name),
      );
    }
    return groups;
  }, [clients]);

  const toggleSelectClient = (id: number | string) => {
    const numericId = Number(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(numericId)) next.delete(numericId);
      else next.add(numericId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === clients.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(clients.map((c) => Number(c.id))));
  };

  const handleBulkAssignOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || selectedIds.size === 0) return;
    const email = bulkOwnerEmail.trim();
    if (!email) return;
    setBulkOwnerSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/client-bulk-update`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_ids: Array.from(selectedIds),
          owner_email: email,
        }),
      });
      if (!res.ok) throw new Error("Failed to update owners");
      const updated: Client[] = await res.json();
      setClients((prev) =>
        prev.map((c) => {
          const u = updated.find((x) => x.id === c.id);
          return u ? { ...c, owner_email: u.owner_email } : c;
        })
      );
      setBulkOwnerOpen(false);
      setBulkOwnerEmail("");
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update owners");
    } finally {
      setBulkOwnerSubmitting(false);
    }
  };

  const handleBulkUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || selectedIds.size === 0) return;
    const stage = bulkStage;
    if (!stage) return;
    const clientIds = Array.from(selectedIds).map((id) => Number(id));
    console.log("[CRM] Bulk stage update → request", {
      clientIds,
      stage,
      tokenPresent: !!token,
    });
    setBulkStageSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/client-bulk-update`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_ids: clientIds,
          stage,
        }),
      });
      if (!res.ok) {
        let message = "Failed to update status";
        try {
          const text = await res.text();
          let parsed: any = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            // ignore JSON parse errors; we'll log raw text below
          }

          console.error("[CRM] Bulk stage update → non-OK response", {
            url: `${getApiBaseUrl()}/api/client-bulk-update`,
            status: res.status,
            statusText: res.statusText,
            rawBody: text,
            parsedBody: parsed,
          });

          if (parsed) {
            if (typeof parsed.detail === "string") {
              message = parsed.detail;
            } else if (Array.isArray(parsed.detail) && parsed.detail.length) {
              const msgs = parsed.detail
                .map((d: any) => d?.msg || d?.detail)
                .filter(Boolean);
              if (msgs.length) {
                message = msgs.join("; ");
              }
            } else if (typeof parsed.message === "string") {
              message = parsed.message;
            }
          } else if (res.status === 401) {
            message = "Authentication required. Please log in again.";
          }
        } catch (parseErr) {
          console.error("Error reading bulk status update error response", parseErr);
        }
        throw new Error(message);
      }
      const updated: Client[] = await res.json();
      setClients((prev) =>
        prev.map((c) => {
          const u = updated.find((x) => x.id === c.id);
          return u ? { ...c, stage: u.stage } : c;
        }),
      );
      setBulkStageOpen(false);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBulkStageSubmitting(false);
    }
  };

  const handleDeleteSelectedClients = async () => {
    if (!token || selectedIds.size === 0) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`${getApiBaseUrl()}/api/clients/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(
              typeof data.detail === "string"
                ? data.detail
                : `Failed to delete member ${id}`,
            );
          }
        }),
      );
      setClients((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setTotalClients((prev) =>
        Math.max(0, prev - selectedIds.size),
      );
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete selected members",
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleCardStageChange = async (clientId: number, newStage: ClientStage) => {
    if (!token) return;
    setCardStageSubmitting(true);
    setCardStageClientId(clientId);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Failed to update stage");
      }
      const updated: Client = await res.json();
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, stage: updated.stage } : c)),
      );
      setCardStageClientId(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to update stage");
      setCardStageClientId(null);
    } finally {
      setCardStageSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSearchDebounced("");
    setFilterStage("");
    setFilterCreatedAfter("");
    setFilterCreatedBefore("");
    setFilterMine(false);
  };

  return (
    <>
      <PageHeader pageName="Members" description="Browse and open member records across the pipeline." />
      <div className="mt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div />
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search by business name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-48 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All stages</option>
              {CLIENT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {CLIENT_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            <input
              type="date"
              placeholder="Created after"
              value={filterCreatedAfter}
              onChange={(e) => setFilterCreatedAfter(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="date"
              placeholder="Created before"
              value={filterCreatedBefore}
              onChange={(e) => setFilterCreatedBefore(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterMine}
                onChange={(e) => setFilterMine(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">My clients</span>
            </label>
            <button
              type="button"
              onClick={async () => {
                if (!token) return;
                const params = new URLSearchParams();
                if (searchDebounced.trim()) params.set("query", searchDebounced.trim());
                if (filterStage) params.set("stage", filterStage);
                if (filterCreatedAfter) params.set("created_after", filterCreatedAfter);
                if (filterCreatedBefore) params.set("created_before", filterCreatedBefore);
                if (filterMine) params.set("mine", "1");
                const url = `${getApiBaseUrl()}/api/clients/export?${params.toString()}`;
                const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) return;
                const blob = await res.blob();
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "members_export.csv";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setAddClientOpen(true);
                setAddClientForm({
                  business_name: "",
                  primary_contact_email: "",
                  stage: "lead",
                  owner_email: (session as any)?.user?.email ?? "",
                });
              }}
              className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Add client
            </button>
          </div>
        </div>

        {addClientOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full mx-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Add client</h3>
              <form onSubmit={handleAddClient} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Business name *</label>
                  <input
                    type="text"
                    required
                    value={addClientForm.business_name}
                    onChange={(e) => setAddClientForm((f) => ({ ...f, business_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Primary contact email</label>
                  <input
                    type="email"
                    value={addClientForm.primary_contact_email}
                    onChange={(e) => setAddClientForm((f) => ({ ...f, primary_contact_email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Stage</label>
                  <select
                    value={addClientForm.stage}
                    onChange={(e) => setAddClientForm((f) => ({ ...f, stage: e.target.value as ClientStage }))}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  >
                    {CLIENT_STAGES.map((s) => (
                      <option key={s} value={s}>{CLIENT_STAGE_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Owner email</label>
                  <input
                    type="email"
                    value={addClientForm.owner_email}
                    onChange={(e) => setAddClientForm((f) => ({ ...f, owner_email: e.target.value }))}
                    placeholder="Current user if left blank"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
                {addClientError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{addClientError}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setAddClientOpen(false); setAddClientError(null); }}
                    className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addClientSubmitting}
                    className="px-3 py-1.5 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50"
                  >
                    {addClientSubmitting ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
            {error}
          </div>
        )}

        {selectedIds.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-3">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedIds.size} selected
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === clients.length}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Select all on page</span>
            </label>
            <button
              type="button"
              onClick={() => setBulkOwnerOpen(true)}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-sm font-medium hover:opacity-90"
            >
              Assign owner
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkStage("lead");
                setBulkStageOpen(true);
              }}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Change status
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeleteConfirmOpen(true);
              }}
              className="px-3 py-1.5 rounded-md border border-red-300 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Clear selection
            </button>
          </div>
        )}

        {bulkOwnerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full mx-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Assign owner to {selectedIds.size} clients</h3>
              <form onSubmit={handleBulkAssignOwner} className="space-y-3">
                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Owner email</span>
                  <input
                    type="email"
                    value={bulkOwnerEmail}
                    onChange={(e) => setBulkOwnerEmail(e.target.value)}
                    placeholder="user@acesolutions.com.au"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                    required
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setBulkOwnerOpen(false); setBulkOwnerEmail(""); }}
                    className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkOwnerSubmitting}
                    className="px-3 py-1.5 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50"
                  >
                    {bulkOwnerSubmitting ? "Saving…" : "Assign"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {bulkStageOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full mx-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Change status for {selectedIds.size} member{selectedIds.size === 1 ? "" : "s"}
              </h3>
              <form onSubmit={handleBulkUpdateStage} className="space-y-3">
                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Select status</span>
                  <select
                    value={bulkStage}
                    onChange={(e) => setBulkStage(e.target.value as ClientStage)}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                  >
                    {/* Limit bulk status changes to early lifecycle stages; post-offer
                       lifecycle (won/existing/lost) should primarily be driven by offers. */}
                    {(["lead", "qualified"] as ClientStage[]).map((s) => (
                      <option key={s} value={s}>
                        {CLIENT_STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setBulkStageOpen(false); }}
                    className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkStageSubmitting}
                    className="px-3 py-1.5 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50"
                  >
                    {bulkStageSubmitting ? "Saving…" : "Update status"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
          >
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full mx-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Delete {selectedIds.size} member
                {selectedIds.size === 1 ? "" : "s"}?
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                This will remove the selected member records from the CRM,
                including their offers, tasks, and status notes. This action
                cannot be undone.
              </p>
              {deleteError && (
                <p className="mb-2 text-xs text-red-600 dark:text-red-400">
                  {deleteError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (deleteSubmitting) return;
                    setDeleteConfirmOpen(false);
                    setDeleteError(null);
                  }}
                  className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  disabled={deleteSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedClients}
                  disabled={deleteSubmitting}
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteSubmitting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            {CLIENT_STAGES.map((stage) => (
              <section key={stage}>
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={`${stage}-${i}`} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-3 w-1/3 mt-2" />
                          </div>
                          <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                        </div>
                        <Skeleton className="h-3 w-20 mt-1" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No members match your filters.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddClientOpen(true);
                  setAddClientForm({
                    business_name: "",
                    primary_contact_email: "",
                    stage: "lead",
                    owner_email: (session as any)?.user?.email ?? "",
                  });
                }}
                className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:opacity-90"
              >
                Add a client
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {CLIENT_STAGES.filter((stage) => groupedByStage[stage]?.length)
              .map((stage) => {
                const list = groupedByStage[stage] || [];
                return (
                  <section key={stage}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                          {CLIENT_STAGE_LABELS[stage] ?? stage}
                        </h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {list.length}
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {list.map((client) => (
                        <div key={client.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(Number(client.id))}
                            onChange={() => toggleSelectClient(client.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-4 shrink-0 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                            aria-label={`Select ${client.business_name}`}
                          />
                          <div className="flex-1 min-w-0">
                            <Card className="h-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                              <CardContent className="p-4 space-y-2">
                                <Link
                                  href={`/crm-members/${client.id}`}
                                  className="block group"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:underline">
                                        {client.business_name}
                                      </h3>
                                      {client.primary_contact_email && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {client.primary_contact_email}
                                        </p>
                                      )}
                                      {client.owner_email && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                          Owner:{" "}
                                          <span className="font-medium">
                                            {client.owner_email.split("@")[0]}
                                          </span>
                                        </p>
                                      )}
                                      {(offerCountByClientId[String(client.id)] ?? 0) > 0 && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          {offerCountByClientId[String(client.id)]} offer{offerCountByClientId[String(client.id)] !== 1 ? "s" : ""}
                                        </p>
                                      )}
                                    </div>
                                    <StageBadge stage={client.stage} />
                                  </div>
                                </Link>
                                {client.gdrive_folder_url && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      window.open(client.gdrive_folder_url!, "_blank", "noreferrer");
                                    }}
                                    className="inline-flex items-center text-xs text-primary hover:underline mt-1"
                                  >
                                    Open Drive
                                  </button>
                                )}
                                <div
                                  className="pt-2 border-t border-gray-100 dark:border-gray-800"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <label className="text-xs text-gray-500 dark:text-gray-400 mr-2">Change stage:</label>
                                  <select
                                    value={client.stage}
                                    onChange={(e) => {
                                      const v = e.target.value as ClientStage;
                                      handleCardStageChange(client.id, v);
                                    }}
                                    disabled={cardStageSubmitting && cardStageClientId === client.id}
                                    className="mt-1 text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  >
                                    {CLIENT_STAGES.map((s) => (
                                      <option key={s} value={s}>
                                        {CLIENT_STAGE_LABELS[s]}
                                      </option>
                                    ))}
                                  </select>
                                  {cardStageSubmitting && cardStageClientId === client.id && (
                                    <span className="ml-2 text-xs text-gray-500">Saving…</span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            {clients.length < totalClients && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={loadMoreClients}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : `Load more (${clients.length} of ${totalClients})`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}