"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
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
}

function StageBadge({ stage }: { stage: ClientStage }) {
  const base =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  const s = stage.toLowerCase();

  if (s === "won") {
    return (
      <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`}>
        Won
      </span>
    );
  }
  if (s === "existing_client") {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300`}>
        Existing Client
      </span>
    );
  }
  if (s === "lost") {
    return (
      <span className={`${base} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`}>
        Lost
      </span>
    );
  }
  if (s === "offer_sent") {
    return (
      <span className={`${base} bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300`}>
        Offer Sent
      </span>
    );
  }
  if (s === "analysis_in_progress") {
    return (
      <span className={`${base} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`}>
        Analysis In Progress
      </span>
    );
  }

  return (
    <span className={`${base} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200`}>
      {CLIENT_STAGE_LABELS[stage] ?? stage}
    </span>
  );
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
      window.location.href = `/clients/${created.id}`;
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

  const toggleSelectClient = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === clients.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(clients.map((c) => c.id)));
  };

  const handleBulkAssignOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || selectedIds.size === 0) return;
    const email = bulkOwnerEmail.trim();
    if (!email) return;
    setBulkOwnerSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients/bulk`, {
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

        {loading ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            Loading clients...
          </div>
        ) : clients.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            No clients found. Try widening your filters or add a new client using the button above.
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
                            checked={selectedIds.has(client.id)}
                            onChange={() => toggleSelectClient(client.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-4 shrink-0 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                            aria-label={`Select ${client.business_name}`}
                          />
                          <Link
                            href={`/clients/${client.id}`}
                            className="block group flex-1 min-w-0"
                          >
                          <Card className="h-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-0.5">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
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
                              {client.gdrive_folder_url && (
                                <a
                                  href={client.gdrive_folder_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center text-xs text-primary hover:underline mt-1"
                                >
                                  Open Drive
                                </a>
                              )}
                            </CardContent>
                          </Card>
                          </Link>
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

