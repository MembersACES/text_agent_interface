"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Button } from "@/components/ui/button";
import { SurfacePanel, FilterInput, FilterSelect, FilterTextarea } from "@/components/ui/surface-panel";
import { ActivityReportSummary } from "@/components/reports/activity-report-summary";
import { ActivityReportTable } from "@/components/reports/activity-report-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";
import {
  OFFER_ACTIVITY_TYPES,
  OFFER_ACTIVITY_LABELS,
  type OfferActivityType,
} from "@/constants/crm";

const MAX_ACTIVITIES = 100;
const CUSTOM_ACTIVITY_TYPES = new Set([
  "note_added",
  "task_created",
  "task_edited",
  "task_completed",
  "testimonial_activity",
  "client_manual_activity",
]);

/** Offer / utility category for client manual activities (must match backend keys). */
const CLIENT_MANUAL_OFFER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Not specified" },
  { value: "electricity", label: "Electricity" },
  { value: "gas", label: "Gas" },
  { value: "waste", label: "Waste" },
  { value: "oil", label: "Oil" },
  { value: "cleaning", label: "Cleaning" },
  { value: "solar_cleaning", label: "Solar cleaning" },
  { value: "ghg", label: "GHG" },
  { value: "other", label: "Other (describe below)" },
];

function defaultDateRange(): { after: string; before: string } {
  const now = new Date();
  const before = now.toISOString().slice(0, 10);
  const d = new Date(now);
  d.setDate(d.getDate() - 30);
  const after = d.toISOString().slice(0, 10);
  return { after, before };
}

interface ActivityItem {
  id: number;
  offer_id: number;
  task_id?: number | null;
  client_id?: number | null;
  business_name?: string | null;
  activity_type: string;
  document_link?: string | null;
  created_at: string;
  created_by?: string | null;
  offer_display?: string | null;
  manual_activity_id?: number | null;
}

interface ClientOption {
  id: number;
  business_name: string;
}

function parseClientListResponse(data: unknown): ClientOption[] {
  if (Array.isArray(data)) {
    return data.map((row: { id: number; business_name?: string | null }) => ({
      id: row.id,
      business_name: (row.business_name && String(row.business_name).trim()) || `Client ${row.id}`,
    }));
  }
  if (data && typeof data === "object" && "items" in data && Array.isArray((data as { items: unknown }).items)) {
    return parseClientListResponse((data as { items: unknown[] }).items);
  }
  return [];
}

export default function ActivityReportPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "offer_activity"; id: number } | { kind: "client_manual"; id: number } | null
  >(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [addActivitySelectedClient, setAddActivitySelectedClient] = useState<ClientOption | null>(null);
  const [clientSearchInput, setClientSearchInput] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<ClientOption[]>([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const clientSearchReq = useRef(0);
  const [addActivityOfferPreset, setAddActivityOfferPreset] = useState("");
  const [addActivityOfferCustom, setAddActivityOfferCustom] = useState("");
  const [addActivityNote, setAddActivityNote] = useState("");
  const [addActivityLink, setAddActivityLink] = useState("");
  const [addActivitySaving, setAddActivitySaving] = useState(false);
  const [addActivityError, setAddActivityError] = useState<string | null>(null);
  const [activitiesVersion, setActivitiesVersion] = useState(0);

  const filterClientId = searchParams.get("client_id") ?? "";
  const filterActivityType = searchParams.get("activity_type") ?? "";
  const filterCreatedAfter = searchParams.get("created_after") ?? "";
  const filterCreatedBefore = searchParams.get("created_before") ?? "";

  const defaultRange = defaultDateRange();
  const effectiveAfter = filterCreatedAfter || defaultRange.after;
  const effectiveBefore = filterCreatedBefore || defaultRange.before;

  const setFilters = useCallback(
    (updates: { client_id?: string; activity_type?: string; created_after?: string; created_before?: string }) => {
      const next = new URLSearchParams(searchParams.toString());
      if (updates.client_id !== undefined) {
        if (updates.client_id) next.set("client_id", updates.client_id);
        else next.delete("client_id");
      }
      if (updates.activity_type !== undefined) {
        if (updates.activity_type) next.set("activity_type", updates.activity_type);
        else next.delete("activity_type");
      }
      if (updates.created_after !== undefined) {
        if (updates.created_after) next.set("created_after", updates.created_after);
        else next.delete("created_after");
      }
      if (updates.created_before !== undefined) {
        if (updates.created_before) next.set("created_before", updates.created_before);
        else next.delete("created_before");
      }
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const hasAnyFilter = !!(filterClientId || filterActivityType || filterCreatedAfter || filterCreatedBefore);

  const handleDeleteActivity = useCallback(async () => {
    if (!token || !deleteTarget) return;
    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      const url =
        deleteTarget.kind === "offer_activity"
          ? `${getApiBaseUrl()}/api/reports/activities/${deleteTarget.id}`
          : `${getApiBaseUrl()}/api/reports/activities/client-manual/${deleteTarget.id}`;
      const res = await fetch(url, {
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
            : "Failed to delete activity"
        );
      }
      setActivities((prev) =>
        prev.filter((a) => {
          if (deleteTarget.kind === "client_manual") {
            return a.manual_activity_id !== deleteTarget.id;
          }
          return !(
            (a.manual_activity_id == null || a.manual_activity_id === undefined) &&
            a.offer_id > 0 &&
            a.id === deleteTarget.id
          );
        })
      );
      setDeleteTarget(null);
    } catch (e: unknown) {
      setDeleteError(
        e instanceof Error ? e.message : "Failed to delete activity"
      );
    } finally {
      setDeleteSubmitting(false);
    }
  }, [token, deleteTarget]);

  useEffect(() => {
    if (!addActivityOpen || !token) return;
    const q = clientSearchInput.trim();
    if (q.length < 2) {
      setClientSearchResults([]);
      setClientSearchLoading(false);
      return;
    }
    if (addActivitySelectedClient && q === addActivitySelectedClient.business_name) {
      setClientSearchResults([]);
      setClientSearchLoading(false);
      return;
    }
    const reqId = ++clientSearchReq.current;
    setClientSearchLoading(true);
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams();
          params.set("query", q);
          params.set("limit", "30");
          const res = await fetch(`${getApiBaseUrl()}/api/clients?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          });
          if (reqId !== clientSearchReq.current) return;
          if (!res.ok) {
            setClientSearchResults([]);
            return;
          }
          const data = await res.json();
          setClientSearchResults(parseClientListResponse(data));
        } catch {
          if (reqId === clientSearchReq.current) setClientSearchResults([]);
        } finally {
          if (reqId === clientSearchReq.current) setClientSearchLoading(false);
        }
      })();
    }, 300);
    return () => {
      window.clearTimeout(t);
    };
  }, [addActivityOpen, token, clientSearchInput, addActivitySelectedClient]);

  const openAddActivityModal = useCallback(() => {
    setAddActivityError(null);
    setAddActivityOfferPreset("");
    setAddActivityOfferCustom("");
    setAddActivityNote("");
    setAddActivityLink("");
    setClientSearchResults([]);
    setAddActivitySelectedClient(null);
    setClientSearchInput("");

    const fidStr = filterClientId?.trim();
    if (fidStr && token) {
      const fid = parseInt(fidStr, 10);
      if (Number.isFinite(fid)) {
        const from = clients.find((c) => c.id === fid);
        if (from) {
          setAddActivitySelectedClient(from);
          setClientSearchInput(from.business_name);
        } else {
          void (async () => {
            try {
              const res = await fetch(`${getApiBaseUrl()}/api/clients/${fid}`, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              });
              if (!res.ok) return;
              const j = (await res.json()) as { id: number; business_name?: string | null };
              const name =
                (j.business_name && String(j.business_name).trim()) || `Client ${j.id}`;
              setAddActivitySelectedClient({ id: j.id, business_name: name });
              setClientSearchInput(name);
            } catch {
              /* keep empty */
            }
          })();
        }
      }
    }
    setAddActivityOpen(true);
  }, [filterClientId, clients, token]);

  const handleAddActivity = useCallback(async () => {
    if (!token) return;
    if (!addActivitySelectedClient) {
      setAddActivityError("Select a client from the search results.");
      return;
    }
    const note = addActivityNote.trim();
    const link = addActivityLink.trim();
    const custom = addActivityOfferCustom.trim();
    const preset = addActivityOfferPreset.trim();
    if (!note) {
      setAddActivityError("Enter a note describing what was done.");
      return;
    }
    if (preset === "other" && !custom) {
      setAddActivityError('When offer type is "Other", add a short description in the custom field.');
      return;
    }
    try {
      setAddActivitySaving(true);
      setAddActivityError(null);
      const res = await fetch(`${getApiBaseUrl()}/api/reports/activities/client-manual`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: addActivitySelectedClient.id,
          note,
          document_link: link || undefined,
          offer_type_preset: preset || undefined,
          offer_type_custom: custom || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Failed to add activity");
      }
      setAddActivityOpen(false);
      setAddActivitySelectedClient(null);
      setClientSearchInput("");
      setClientSearchResults([]);
      setAddActivityOfferPreset("");
      setAddActivityOfferCustom("");
      setAddActivityNote("");
      setAddActivityLink("");
      setActivitiesVersion((v) => v + 1);
    } catch (e: unknown) {
      setAddActivityError(e instanceof Error ? e.message : "Failed to add activity");
    } finally {
      setAddActivitySaving(false);
    }
  }, [token, addActivitySelectedClient, addActivityOfferPreset, addActivityOfferCustom, addActivityNote, addActivityLink]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const fetchClients = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/clients`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          setClients(Array.isArray(data) ? data : []);
        }
      } catch {
        setClients([]);
      }
    };
    fetchClients();
  }, [token]);

  useEffect(() => {
    if (!searchParams.has("created_after") && !searchParams.has("created_before")) {
      const { after, before } = defaultDateRange();
      const next = new URLSearchParams(searchParams.toString());
      next.set("created_after", after);
      next.set("created_before", before);
      router.replace(`?${next.toString()}`, { scroll: false });
      return;
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(MAX_ACTIVITIES));
        if (filterClientId) params.set("client_id", filterClientId);
        if (filterActivityType && !CUSTOM_ACTIVITY_TYPES.has(filterActivityType)) {
          params.set("activity_type", filterActivityType);
        }
        params.set("created_after", effectiveAfter);
        params.set("created_before", effectiveBefore);
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        const [offerRes, testimonialsRes, tasksHistoryRes, manualRes] = await Promise.all([
          fetch(`${getApiBaseUrl()}/api/reports/activities/list?${params.toString()}`, { headers }),
          fetch(`${getApiBaseUrl()}/api/reports/activities/testimonials?${params.toString()}`, { headers }),
          fetch(`${getApiBaseUrl()}/api/reports/activities/tasks?${params.toString()}`, { headers }),
          fetch(`${getApiBaseUrl()}/api/reports/activities/client-manual?${params.toString()}`, { headers }),
        ]);

        if (!offerRes.ok) {
          const data = await offerRes.json().catch(() => ({}));
          throw new Error(data.detail || "Failed to load activities");
        }
        const [offerData, testimonialsData, tasksHistoryData, manualData] = await Promise.all([
          offerRes.json().catch(() => []),
          testimonialsRes.ok ? testimonialsRes.json().catch(() => []) : Promise.resolve([]),
          tasksHistoryRes.ok ? tasksHistoryRes.json().catch(() => []) : Promise.resolve([]),
          manualRes.ok ? manualRes.json().catch(() => []) : Promise.resolve([]),
        ]);
        let list: ActivityItem[] = [
          ...(Array.isArray(offerData) ? offerData : []),
          ...(Array.isArray(testimonialsData) ? testimonialsData : []),
          ...(Array.isArray(tasksHistoryData) ? tasksHistoryData : []),
          ...(Array.isArray(manualData) ? manualData : []),
        ];

        const clientIdNum = filterClientId ? parseInt(filterClientId, 10) : 0;
        let clientName: string | null = clientIdNum ? clients.find((c) => c.id === clientIdNum)?.business_name ?? null : null;
        if (clientIdNum && !clientName) {
          try {
            const cr = await fetch(`${getApiBaseUrl()}/api/clients/${clientIdNum}`, {
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
            if (cr.ok) {
              const client = await cr.json();
              clientName = client?.business_name ?? "—";
            }
          } catch {
            clientName = "—";
          }
        }

        if (clientIdNum && clientName) {
          const notesRes = await fetch(`${getApiBaseUrl()}/api/clients/${clientIdNum}/notes`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          });
          const afterDate = new Date(effectiveAfter);
          const beforeEnd = new Date(effectiveBefore);
          beforeEnd.setDate(beforeEnd.getDate() + 1);

          if (notesRes.ok) {
            const notes: Array<{ id: number; note: string; user_email: string; created_at: string }> = await notesRes.json();
            (Array.isArray(notes) ? notes : []).forEach((n) => {
              const created = new Date(n.created_at);
              if (created >= afterDate && created < beforeEnd && (!filterActivityType || filterActivityType === "note_added")) {
                list.push({
                  id: -n.id,
                  offer_id: 0,
                  client_id: clientIdNum,
                  business_name: clientName,
                  activity_type: "note_added",
                  document_link: null,
                  created_at: n.created_at,
                  created_by: n.user_email ?? null,
                  offer_display: n.note?.split("\n")[0]?.slice(0, 50) ?? "Note",
                });
              }
            });
          }
          list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          if (filterActivityType === "note_added") list = list.filter((a) => a.activity_type === "note_added");
        }
        if (filterActivityType && CUSTOM_ACTIVITY_TYPES.has(filterActivityType)) {
          list = list.filter((a) => a.activity_type === filterActivityType);
        }
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setActivities(list);
      } catch (e: any) {
        setError(e.message || "Failed to load activities");
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [token, filterClientId, filterActivityType, effectiveAfter, effectiveBefore, activitiesVersion, clients]);

  const summaryStats = useMemo(() => {
    const clientIds = new Set<number>();
    const types = new Set<string>();
    for (const a of activities) {
      types.add(a.activity_type);
      if (a.client_id) clientIds.add(a.client_id);
    }
    return {
      total: activities.length,
      clientCount: clientIds.size,
      typeCount: types.size,
    };
  }, [activities]);

  return (
    <>
      <PageHeader
        pageName="Activity report"
        description="Offer activities, tasks, testimonials, and client-level manual entries. Log manual work without linking to an offer."
      />

      <div className="mt-5 space-y-4">
        <ActivityReportSummary
          total={summaryStats.total}
          clientCount={summaryStats.clientCount}
          typeCount={summaryStats.typeCount}
          loading={loading}
        />

        <SurfacePanel className="pg-fade-up pg-stagger-2 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <FilterSelect
              value={filterClientId}
              onChange={(e) => setFilters({ client_id: e.target.value })}
              aria-label="Filter by client"
              className="min-w-[10rem] flex-1 sm:flex-none"
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.business_name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={filterActivityType}
              onChange={(e) => setFilters({ activity_type: e.target.value })}
              aria-label="Filter by activity type"
              className="min-w-[10rem] flex-1 sm:flex-none"
            >
              <option value="">All types</option>
              <option value="note_added">Note added</option>
              <option value="task_created">Task created</option>
              <option value="task_edited">Task edited</option>
              <option value="task_completed">Task completed</option>
              <option value="testimonial_activity">Testimonial activity</option>
              <option value="client_manual_activity">Manual activity (client)</option>
              {OFFER_ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {OFFER_ACTIVITY_LABELS[t as OfferActivityType] ?? t}
                </option>
              ))}
            </FilterSelect>
            <FilterInput
              type="date"
              value={filterCreatedAfter || defaultRange.after}
              onChange={(e) => setFilters({ created_after: e.target.value })}
              aria-label="From date"
            />
            <FilterInput
              type="date"
              value={filterCreatedBefore || defaultRange.before}
              onChange={(e) => setFilters({ created_before: e.target.value })}
              aria-label="To date"
            />
            {hasAnyFilter && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const { after, before } = defaultDateRange();
                  const next = new URLSearchParams();
                  next.set("created_after", after);
                  next.set("created_before", before);
                  router.replace(`?${next.toString()}`, { scroll: false });
                }}
              >
                Clear filters
              </Button>
            )}
            <Button
              type="button"
              disabled={!token}
              onClick={openAddActivityModal}
              size="sm"
              className="sm:ml-auto"
            >
              Add activity
            </Button>
          </div>
        </SurfacePanel>

        {error && (
          <div className="rounded-xl bg-semantic-block/10 px-4 py-3 text-sm text-semantic-block">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : activities.length === 0 ? (
          <SurfacePanel className="flex flex-col items-center px-6 py-14 text-center">
            <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Inbox className="size-6" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-dark dark:text-white">No activities in this range</p>
            <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
              Try widening the date range, clearing filters, or log manual work with Add activity.
            </p>
          </SurfacePanel>
        ) : (
          <>
            <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
              Showing <span className="font-semibold text-dark dark:text-white">{activities.length}</span>{" "}
              activities · max {MAX_ACTIVITIES} per load
            </p>
            <ActivityReportTable
              rows={activities}
              onDelete={(target) => {
                setDeleteError(null);
                setDeleteTarget(target);
              }}
            />
          </>
        )}
        {addActivityOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-activity-title"
          >
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-lg dark:bg-gray-dark">
              <h3 id="add-activity-title" className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Add manual activity
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Logs work for the selected client without linking to a CRM offer. Choose an offer type from the list or describe it below if it is not listed.
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <label
                    htmlFor="add-activity-client-search"
                    className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Client
                  </label>
                  <FilterInput
                    id="add-activity-client-search"
                    type="search"
                    autoComplete="off"
                    placeholder="Type at least 2 letters to search by name…"
                    value={clientSearchInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setClientSearchInput(v);
                      if (
                        addActivitySelectedClient &&
                        v.trim() !== addActivitySelectedClient.business_name.trim()
                      ) {
                        setAddActivitySelectedClient(null);
                      }
                    }}
                    className="w-full"
                  />
                  {clientSearchLoading && clientSearchInput.trim().length >= 2 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Searching…</p>
                  )}
                  {!clientSearchLoading &&
                    clientSearchInput.trim().length >= 2 &&
                    clientSearchResults.length === 0 &&
                    (!addActivitySelectedClient ||
                      clientSearchInput.trim() !== addActivitySelectedClient.business_name.trim()) && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No matching clients.</p>
                    )}
                  {clientSearchResults.length > 0 && (
                    <ul
                      role="listbox"
                      className="absolute z-[60] mt-1 max-h-48 w-full overflow-auto rounded-lg border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark"
                    >
                      {clientSearchResults.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={addActivitySelectedClient?.id === c.id}
                            className="w-full px-3 py-2 text-left text-sm text-dark transition-colors hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:text-white dark:hover:bg-dark-3"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setAddActivitySelectedClient(c);
                              setClientSearchInput(c.business_name);
                              setClientSearchResults([]);
                            }}
                          >
                            {c.business_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {addActivitySelectedClient && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Selected: {addActivitySelectedClient.business_name}{" "}
                      <span className="text-gray-500">(#{addActivitySelectedClient.id})</span>
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="add-activity-offer-type"
                    className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Offer / utility type
                  </label>
                  <FilterSelect
                    id="add-activity-offer-type"
                    value={addActivityOfferPreset}
                    onChange={(e) => setAddActivityOfferPreset(e.target.value)}
                    disabled={!addActivitySelectedClient}
                    className="w-full disabled:opacity-50"
                  >
                    {CLIENT_MANUAL_OFFER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FilterSelect>
                </div>
                <div>
                  <label
                    htmlFor="add-activity-offer-custom"
                    className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Custom type (if not in list)
                  </label>
                  <FilterInput
                    id="add-activity-offer-custom"
                    type="text"
                    value={addActivityOfferCustom}
                    onChange={(e) => setAddActivityOfferCustom(e.target.value)}
                    placeholder="e.g. steam retrofit, multi-site gas…"
                    disabled={!addActivitySelectedClient}
                    className="w-full disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                  <FilterTextarea
                    value={addActivityNote}
                    onChange={(e) => setAddActivityNote(e.target.value)}
                    rows={3}
                    placeholder="What was done manually?"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Document link (optional)
                  </label>
                  <FilterInput
                    type="url"
                    value={addActivityLink}
                    onChange={(e) => setAddActivityLink(e.target.value)}
                    placeholder="https://…"
                    className="w-full"
                  />
                </div>
              </div>
              {addActivityError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{addActivityError}</p>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (addActivitySaving) return;
                    setAddActivitySelectedClient(null);
                    setClientSearchInput("");
                    setClientSearchResults([]);
                    setAddActivityOfferPreset("");
                    setAddActivityOfferCustom("");
                    setAddActivityNote("");
                    setAddActivityLink("");
                    setAddActivityOpen(false);
                    setAddActivityError(null);
                  }}
                  disabled={addActivitySaving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddActivity}
                  disabled={addActivitySaving}
                  loading={addActivitySaving}
                >
                  Save activity
                </Button>
              </div>
            </div>
          </div>
        )}
        {deleteTarget != null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-2 w-full max-w-md rounded-2xl bg-white p-5 shadow-lg dark:bg-gray-dark">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Delete activity?
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                This will permanently remove this activity record from the database.
                This action cannot be undone.
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
                    setDeleteTarget(null);
                    setDeleteError(null);
                  }}
                  className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  disabled={deleteSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteActivity}
                  disabled={deleteSubmitting}
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteSubmitting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
