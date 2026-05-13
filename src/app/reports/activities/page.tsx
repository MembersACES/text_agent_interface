"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
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

function activityRowKey(a: ActivityItem): string {
  if (a.manual_activity_id != null) return `cm-${a.manual_activity_id}`;
  if (a.task_id) return `task-${a.task_id}-${a.id}`;
  return `${a.activity_type}-${a.id}`;
}

/** Label for activity type (including notes and tasks when merged) */
function activityTypeLabel(type: string): string {
  if (type === "note_added") return "Note added";
  if (type === "task_created") return "Task created";
  if (type === "task_edited") return "Task edited";
  if (type === "task_completed") return "Task completed";
  if (type === "testimonial_activity") return "Testimonial activity";
  if (type === "client_manual_activity") return "Manual activity (client)";
  return OFFER_ACTIVITY_LABELS[type as OfferActivityType] ?? type;
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

function documentLinkHref(link: string | null | undefined): string | undefined {
  if (!link || typeof link !== "string") return undefined;
  let s = link.trim();
  if (s.startsWith("=")) s = s.slice(1).trim();
  if (s.startsWith("https:/") && !s.startsWith("https://")) s = "https://" + s.slice(7);
  if (s.startsWith("http:/") && !s.startsWith("http://")) s = "http://" + s.slice(6);
  return s.startsWith("http://") || s.startsWith("https://") ? s : undefined;
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
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

  return (
    <>
      <PageHeader
        pageName="Activity report"
        description="Offer activities, tasks, testimonials, and client-level manual entries. Log manual work without linking to an offer."
      />
      <div className="mt-4">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={filterClientId}
              onChange={(e) => setFilters({ client_id: e.target.value })}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.business_name}</option>
              ))}
            </select>
            <select
              value={filterActivityType}
              onChange={(e) => setFilters({ activity_type: e.target.value })}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="">All types</option>
              <option value="note_added">Note added</option>
              <option value="task_created">Task created</option>
              <option value="task_edited">Task edited</option>
              <option value="task_completed">Task completed</option>
              <option value="testimonial_activity">Testimonial activity</option>
              <option value="client_manual_activity">Manual activity (client)</option>
              {OFFER_ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{OFFER_ACTIVITY_LABELS[t as OfferActivityType] ?? t}</option>
              ))}
            </select>
            <input
              type="date"
              value={filterCreatedAfter || defaultRange.after}
              onChange={(e) => setFilters({ created_after: e.target.value })}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
            <input
              type="date"
              value={filterCreatedBefore || defaultRange.before}
              onChange={(e) => setFilters({ created_before: e.target.value })}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
            {hasAnyFilter && (
              <button
                type="button"
                onClick={() => {
                  const { after, before } = defaultDateRange();
                  const next = new URLSearchParams();
                  next.set("created_after", after);
                  next.set("created_before", before);
                  router.replace(`?${next.toString()}`, { scroll: false });
                }}
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear filters
              </button>
            )}
            <button
              type="button"
              disabled={!token}
              onClick={openAddActivityModal}
              className="px-3 py-2 rounded-md bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Add activity
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading…</div>
        ) : activities.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            No activities found.
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Showing {activities.length} activities (max {MAX_ACTIVITIES}).
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Client</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Details</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Created by</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Document</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {activities.map((a) => (
                    <tr key={activityRowKey(a)}>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(a.created_at)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {activityTypeLabel(a.activity_type)}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {a.client_id ? (
                          <Link href={`/crm-members/${a.client_id}`} className="text-primary hover:underline">
                            {a.business_name ?? `Client ${a.client_id}`}
                          </Link>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {a.offer_id > 0 ? (
                          <Link href={`/offers/${a.offer_id}`} className="text-primary hover:underline max-w-md break-words inline-block">
                            {a.offer_display ? (
                              <>{a.offer_display} <span className="text-gray-500 dark:text-gray-400">(Offer #{a.offer_id})</span></>
                            ) : (
                              <>Offer #{a.offer_id}</>
                            )}
                          </Link>
                        ) : a.task_id ? (
                          <Link href={`/tasks?task_id=${a.task_id}`} className="text-primary hover:underline">
                            {a.offer_display ? (
                              <>{a.offer_display} <span className="text-gray-500 dark:text-gray-400">(Task #{a.task_id})</span></>
                            ) : (
                              <>Task #{a.task_id}</>
                            )}
                          </Link>
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300 max-w-md break-words inline-block">
                            {a.offer_display ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {a.created_by ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {documentLinkHref(a.document_link) ? (
                          <a
                            href={documentLinkHref(a.document_link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {a.manual_activity_id != null ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget({ kind: "client_manual", id: a.manual_activity_id! });
                            }}
                            className="text-red-600 hover:underline dark:text-red-400"
                          >
                            Delete
                          </button>
                        ) : a.offer_id > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget({ kind: "offer_activity", id: a.id });
                            }}
                            className="text-red-600 hover:underline dark:text-red-400"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {addActivityOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-activity-title"
          >
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                  <input
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
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
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
                      className="absolute z-[60] mt-1 w-full max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
                    >
                      {clientSearchResults.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={addActivitySelectedClient?.id === c.id}
                            className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
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
                  <select
                    id="add-activity-offer-type"
                    value={addActivityOfferPreset}
                    onChange={(e) => setAddActivityOfferPreset(e.target.value)}
                    disabled={!addActivitySelectedClient}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm disabled:opacity-50"
                  >
                    {CLIENT_MANUAL_OFFER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="add-activity-offer-custom"
                    className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Custom type (if not in list)
                  </label>
                  <input
                    id="add-activity-offer-custom"
                    type="text"
                    value={addActivityOfferCustom}
                    onChange={(e) => setAddActivityOfferCustom(e.target.value)}
                    placeholder="e.g. steam retrofit, multi-site gas…"
                    disabled={!addActivitySelectedClient}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                  <textarea
                    value={addActivityNote}
                    onChange={(e) => setAddActivityNote(e.target.value)}
                    rows={3}
                    placeholder="What was done manually?"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Document link (optional)
                  </label>
                  <input
                    type="url"
                    value={addActivityLink}
                    onChange={(e) => setAddActivityLink(e.target.value)}
                    placeholder="https://…"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
              </div>
              {addActivityError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{addActivityError}</p>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
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
                  className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  disabled={addActivitySaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddActivity}
                  disabled={addActivitySaving}
                  className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {addActivitySaving ? "Saving…" : "Save activity"}
                </button>
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
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full mx-2">
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
