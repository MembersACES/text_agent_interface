"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import BusinessInfoDisplay from "@/components/BusinessInfoDisplay";
import {
  CLIENT_STAGES,
  CLIENT_STAGE_LABELS,
  OFFER_ACTIVITY_LABELS,
  ClientStage,
  type OfferActivityType,
} from "@/constants/crm";

interface Client {
  id: number;
  business_name: string;
  external_business_id?: string | null;
  primary_contact_email?: string | null;
  gdrive_folder_url?: string | null;
  stage: ClientStage;
  owner_email?: string | null;
}

interface Note {
  id: number;
  business_name: string;
  client_id?: number | null;
  note: string;
  user_email: string;
  note_type: string;
  created_at: string;
}

interface Task {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: string;
  assigned_to: string;
}

interface Offer {
  id: number;
  client_id?: number | null;
  business_name?: string | null;
  utility_type?: string | null;
  utility_type_identifier?: string | null;
  identifier?: string | null;
  status: string;
  created_at: string;
}

interface ClientActivity {
  id: number;
  offer_id: number;
  activity_type: string;
  document_link?: string | null;
  external_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  created_by?: string | null;
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
      {stage}
    </span>
  );
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    if (Array.isArray(raw)) return parseInt(raw[0], 10);
    return parseInt(raw, 10);
  }, [params]);

  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [client, setClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [businessInfo, setBusinessInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStage, setSavingStage] = useState(false);
  const [stageValue, setStageValue] = useState<ClientStage | undefined>();
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState<string>("general");
  const [creatingNote, setCreatingNote] = useState(false);

  const NOTE_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: "general", label: "General" },
    { value: "call", label: "Call" },
    { value: "email", label: "Email" },
    { value: "meeting", label: "Meeting" },
  ];
  const [error, setError] = useState<string | null>(null);
  const [businessInfoOpen, setBusinessInfoOpen] = useState(true);
  const [createOfferOpen, setCreateOfferOpen] = useState(false);
  const [createOfferSubmitting, setCreateOfferSubmitting] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskForm, setAddTaskForm] = useState({ title: "", description: "", due_date: "" });
  const [addTaskSubmitting, setAddTaskSubmitting] = useState(false);
  const [createOfferForm, setCreateOfferForm] = useState({
    utility_type: "",
    utility_type_identifier: "",
    identifier: "",
    estimated_value: "",
  });
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    business_name: "",
    primary_contact_email: "",
    gdrive_folder_url: "",
    owner_email: "",
  });
  const [editProfileSubmitting, setEditProfileSubmitting] = useState(false);

  const timelineEvents = useMemo(() => {
    const stageNotes = notes
      .filter((n) => n.note_type === "status_update")
      .map((n) => ({ type: "stage_change" as const, id: `n-${n.id}`, created_at: n.created_at, note: n.note, user_email: n.user_email }));
    const actEvents = activities.map((a) => ({
      type: "offer_activity" as const,
      id: `a-${a.id}`,
      created_at: a.created_at,
      activity_type: a.activity_type,
      offer_id: a.offer_id,
      document_link: a.document_link,
      created_by: a.created_by,
    }));
    return [...stageNotes, ...actEvents].sort(
      (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
    );
  }, [notes, activities]);

  useEffect(() => {
    if (!clientId || !token) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);

        const base = getApiBaseUrl();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [clientRes, notesRes, tasksRes, offersRes, activitiesRes] = await Promise.all([
          fetch(`${base}/api/clients/${clientId}`, { headers }),
          fetch(`${base}/api/clients/${clientId}/notes`, { headers }),
          fetch(`${base}/api/clients/${clientId}/tasks`, { headers }),
          fetch(`${base}/api/offers?client_id=${clientId}`, { headers }),
          fetch(`${base}/api/clients/${clientId}/activities`, { headers }),
        ]);

        if (!clientRes.ok) {
          const data = await clientRes.json().catch(() => ({}));
          throw new Error(data.detail || "Failed to load client");
        }

        const clientData: Client = await clientRes.json();
        setClient(clientData);
        setStageValue(clientData.stage);

        if (notesRes.ok) {
          const notesData: Note[] = await notesRes.json();
          setNotes(Array.isArray(notesData) ? notesData : []);
        } else {
          setNotes([]);
        }

        if (tasksRes.ok) {
          const taskData: Task[] = await tasksRes.json();
          setTasks(Array.isArray(taskData) ? taskData : []);
        } else {
          setTasks([]);
        }

        if (offersRes.ok) {
          const offerData: Offer[] = await offersRes.json();
          setOffers(Array.isArray(offerData) ? offerData : []);
        } else {
          setOffers([]);
        }

        if (activitiesRes.ok) {
          const activitiesData: ClientActivity[] = await activitiesRes.json();
          setActivities(Array.isArray(activitiesData) ? activitiesData : []);
        } else {
          setActivities([]);
        }

        if (clientData.business_name) {
          const biRes = await fetch(`${base}/api/get-business-info`, {
            method: "POST",
            headers,
            body: JSON.stringify({ business_name: clientData.business_name }),
          });
          if (biRes.ok) {
            const biData = await biRes.json();
            setBusinessInfo(biData);
          }
        }
      } catch (e: any) {
        console.error("Error loading client view", e);
        setError(e.message || "Failed to load client");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [clientId, token]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !token || !client) return;
    try {
      setCreateOfferSubmitting(true);
      setError(null);
      const res = await fetch(`${getApiBaseUrl()}/api/offers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: client.id,
          business_name: client.business_name,
          utility_type: createOfferForm.utility_type.trim() || undefined,
          utility_type_identifier: createOfferForm.utility_type_identifier.trim() || undefined,
          identifier: createOfferForm.identifier.trim() || undefined,
          estimated_value: createOfferForm.estimated_value.trim() ? parseInt(createOfferForm.estimated_value, 10) : undefined,
          status: "requested",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create offer");
      }
      const created = await res.json();
      setCreateOfferOpen(false);
      setCreateOfferForm({ utility_type: "", utility_type_identifier: "", identifier: "", estimated_value: "" });
      setOffers((prev) => [{ ...created, status: created.status }, ...prev]);
      window.location.href = `/offers/${created.id}`;
    } catch (e: any) {
      setError(e.message || "Failed to create offer");
    } finally {
      setCreateOfferSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !token || !client) return;
    try {
      setEditProfileSubmitting(true);
      setError(null);
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_name: editProfileForm.business_name.trim() || undefined,
          primary_contact_email: editProfileForm.primary_contact_email.trim() || undefined,
          gdrive_folder_url: editProfileForm.gdrive_folder_url.trim() || undefined,
          owner_email: editProfileForm.owner_email.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to update client");
      }
      const updated: Client = await res.json();
      setClient(updated);
      setEditProfileOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update client");
    } finally {
      setEditProfileSubmitting(false);
    }
  };

  const handleStageChange = async (value: ClientStage) => {
    if (!clientId || !token) return;
    setStageValue(value);
    try {
      setSavingStage(true);
      setError(null);
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}/stage`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stage: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to update stage");
      }
      const updated: Client = await res.json();
      setClient(updated);
      setStageValue(updated.stage);
    } catch (e: any) {
      console.error("Failed to update stage", e);
      setError(e.message || "Failed to update stage");
    } finally {
      setSavingStage(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !token || !addTaskForm.title.trim() || !client) return;
    setAddTaskSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: addTaskForm.title.trim(),
          description: addTaskForm.description.trim() || undefined,
          due_date: addTaskForm.due_date || undefined,
          status: "not_started",
          client_id: clientId,
          assigned_by: (session as any)?.user?.email,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create task");
      }
      const created: Task = await res.json();
      setAddTaskOpen(false);
      setAddTaskForm({ title: "", description: "", due_date: "" });
      setTasks((prev) => [created, ...prev]);
    } catch (e: any) {
      setError(e.message || "Failed to create task");
    } finally {
      setAddTaskSubmitting(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !token || !newNote.trim() || !client) return;
    try {
      setCreatingNote(true);
      setError(null);
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_name: client.business_name,
          note: newNote.trim(),
          note_type: newNoteType || "general",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create note");
      }
      const created: Note = await res.json();
      setNotes((prev) => [created, ...prev]);
      setNewNote("");
    } catch (e: any) {
      console.error("Failed to create note", e);
      setError(e.message || "Failed to create note");
    } finally {
      setCreatingNote(false);
    }
  };

  if (!clientId) {
    return (
      <div className="mt-4 text-sm text-red-600 dark:text-red-400">
        Invalid client id.
      </div>
    );
  }

  return (
    <>
      <PageHeader pageName="Client" title={client?.business_name ?? "Client"} description="Client record and activity overview." />
      <div className="mt-4 space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !client ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            Loading client...
          </div>
        ) : client ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Stage
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={stageValue}
                      onChange={(e) =>
                        handleStageChange(e.target.value as ClientStage)
                      }
                      className="text-sm px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      disabled={savingStage}
                    >
                      {CLIENT_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {CLIENT_STAGE_LABELS[s] ?? s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    {stageValue && <StageBadge stage={stageValue} />}
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Owner
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {client.owner_email ? (
                      <span title={client.owner_email}>{client.owner_email.split("@")[0]}</span>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                {client.gdrive_folder_url && (
                  <a
                    href={client.gdrive_folder_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Open Drive
                  </a>
                )}
                <a
                  href={`/base-2?businessName=${encodeURIComponent(client.business_name)}&clientId=${clientId}${offers.length > 0 ? `&offerId=${offers[0].id}` : ""}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Open in Base 2
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setEditProfileForm({
                      business_name: client.business_name ?? "",
                      primary_contact_email: client.primary_contact_email ?? "",
                      gdrive_folder_url: client.gdrive_folder_url ?? "",
                      owner_email: client.owner_email ?? "",
                    });
                    setEditProfileOpen(true);
                    setError(null);
                  }}
                  className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Edit profile
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <CardContent className="p-0">
                    <button
                      type="button"
                      onClick={() => setBusinessInfoOpen((o) => !o)}
                      className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-lg"
                      aria-expanded={businessInfoOpen}
                    >
                      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Business Information
                      </h2>
                      <span className="flex items-center gap-2 shrink-0">
                        {businessInfo ? (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Loaded
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Not loaded
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${businessInfoOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                    {businessInfoOpen ? (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-800">
                        {businessInfo ? (
                          <BusinessInfoDisplay
                            info={businessInfo}
                            onLinkUtility={undefined}
                            setInfo={setBusinessInfo}
                          />
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 pt-3">
                            No detailed business information loaded yet.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-sm text-gray-500 dark:text-gray-400 pt-3 truncate">
                          {businessInfo
                            ? (businessInfo?.business_details?.name || client?.business_name || "Business information loaded")
                            : "No business information loaded yet."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Tasks
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAddTaskOpen(true)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Add task
                        </button>
                        <a
                          href="/tasks"
                          className="text-xs text-primary hover:underline"
                        >
                          Open Tasks
                        </a>
                      </div>
                    </div>
                    {tasks.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No tasks linked to this client yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {tasks.slice(0, 5).map((t) => (
                          <li
                            key={t.id}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {t.title}
                              </p>
                              {t.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {t.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {t.due_date && (
                                <div>Due {formatDate(t.due_date)}</div>
                              )}
                              <div className="mt-0.5">{t.status}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Offers & Quote Requests
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCreateOfferOpen(true)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Create offer
                        </button>
                        <a
                          href="/offers"
                          className="text-xs text-primary hover:underline"
                        >
                          View All Offers
                        </a>
                      </div>
                    </div>
                    {offers.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No offers recorded for this client yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {offers.slice(0, 5).map((o) => (
                          <li
                            key={o.id}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <div className="min-w-0">
                              <a
                                href={`/offers/${o.id}`}
                                className="font-medium text-gray-900 dark:text-gray-100 hover:underline truncate"
                              >
                                {o.utility_type_identifier || o.utility_type || "Offer"}{" "}
                                {o.identifier ? `· ${o.identifier}` : ""}
                              </a>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Created {formatDate(o.created_at)}
                              </p>
                            </div>
                            <div className="text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {o.status}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <CardContent className="p-4 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      Activity
                    </h2>
                    {activities.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No offer activities recorded yet.
                      </p>
                    ) : (
                      <ul className="space-y-3 max-h-[280px] overflow-y-auto">
                        {activities.map((a) => {
                          const label =
                            OFFER_ACTIVITY_LABELS[a.activity_type as OfferActivityType] ??
                            a.activity_type.replace(/_/g, " ");
                          const comparisonType =
                            a.activity_type === "comparison" && a.metadata?.comparison_type
                              ? String(a.metadata.comparison_type)
                              : null;
                          return (
                            <li
                              key={a.id}
                              className="flex flex-col gap-1 text-sm border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-1"
                            >
                              <span className="font-medium text-gray-800 dark:text-gray-100">
                                {a.activity_type === "comparison" && comparisonType
                                  ? `Comparison (${comparisonType})`
                                  : label}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(a.created_at)}
                                {a.created_by && ` · ${a.created_by}`}
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <a
                                  href={`/offers/${a.offer_id}`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  View offer
                                </a>
                                {a.document_link && (
                                  <a
                                    href={a.document_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                  >
                                    Open document
                                  </a>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <CardContent className="p-4 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      Timeline
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Stage changes and offer activities in one place.
                    </p>
                    {timelineEvents.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No timeline events yet.
                      </p>
                    ) : (
                      <ul className="space-y-3 max-h-[280px] overflow-y-auto">
                        {timelineEvents.map((ev) => (
                          <li
                            key={ev.id}
                            className="flex flex-col gap-1 text-sm border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-1"
                          >
                            {ev.type === "stage_change" ? (
                              <>
                                <span className="font-medium text-gray-800 dark:text-gray-100">
                                  Stage change
                                </span>
                                <p className="text-gray-700 dark:text-gray-300">{ev.note}</p>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(ev.created_at)}
                                  {ev.user_email && ` · ${ev.user_email.split("@")[0]}`}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium text-gray-800 dark:text-gray-100">
                                  {OFFER_ACTIVITY_LABELS[ev.activity_type as OfferActivityType] ?? ev.activity_type.replace(/_/g, " ")}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(ev.created_at)}
                                  {ev.created_by && ` · ${ev.created_by}`}
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link
                                    href={`/offers/${ev.offer_id}`}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    View offer
                                  </Link>
                                  {ev.document_link && (
                                    <a
                                      href={ev.document_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      Document
                                    </a>
                                  )}
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <CardContent className="p-4 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      Notes & Activity
                    </h2>
                    <form onSubmit={handleCreateNote} className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type:</label>
                        <select
                          value={newNoteType}
                          onChange={(e) => setNewNoteType(e.target.value)}
                          className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        >
                          {NOTE_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                        placeholder="Add a note about this client..."
                        className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={creatingNote || !newNote.trim()}
                          className="px-3 py-1.5 rounded-md bg-primary text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingNote ? "Saving..." : "Add Note"}
                        </button>
                      </div>
                    </form>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2 max-h-[320px] overflow-y-auto">
                      {notes.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No notes yet. Start by adding one above.
                        </p>
                      ) : (
                        notes.map((n) => (
                          <div
                            key={n.id}
                            className="p-2 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
                                {n.note_type || "general"}
                              </span>
                            </div>
                            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                              {n.note}
                            </p>
                            <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>{n.user_email.split("@")[0]}</span>
                              <span>{formatDate(n.created_at)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {editProfileOpen && client && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full mx-2 max-h-[90vh] overflow-y-auto">
                  <h3 id="edit-profile-title" className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Edit client profile
                  </h3>
                  <form onSubmit={handleSaveProfile} className="space-y-3">
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Business name</span>
                      <input
                        type="text"
                        value={editProfileForm.business_name}
                        onChange={(e) => setEditProfileForm((f) => ({ ...f, business_name: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Primary contact email</span>
                      <input
                        type="email"
                        value={editProfileForm.primary_contact_email}
                        onChange={(e) => setEditProfileForm((f) => ({ ...f, primary_contact_email: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Google Drive folder URL</span>
                      <input
                        type="url"
                        value={editProfileForm.gdrive_folder_url}
                        onChange={(e) => setEditProfileForm((f) => ({ ...f, gdrive_folder_url: e.target.value }))}
                        placeholder="https://drive.google.com/..."
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Owner email</span>
                      <input
                        type="email"
                        value={editProfileForm.owner_email}
                        onChange={(e) => setEditProfileForm((f) => ({ ...f, owner_email: e.target.value }))}
                        placeholder="ACES team member"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditProfileOpen(false)}
                        className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editProfileSubmitting}
                        className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {editProfileSubmitting ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {createOfferOpen && client && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full mx-2">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Create offer
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Client: {client.business_name}
                  </p>
                  <form onSubmit={handleCreateOffer} className="space-y-3">
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Utility type</span>
                      <input
                        type="text"
                        value={createOfferForm.utility_type}
                        onChange={(e) => setCreateOfferForm((f) => ({ ...f, utility_type: e.target.value }))}
                        placeholder="e.g. electricity_ci, gas"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Utility type label (optional)</span>
                      <input
                        type="text"
                        value={createOfferForm.utility_type_identifier}
                        onChange={(e) => setCreateOfferForm((f) => ({ ...f, utility_type_identifier: e.target.value }))}
                        placeholder="e.g. C&I Electricity"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Identifier (NMI, MRIN, etc.)</span>
                      <input
                        type="text"
                        value={createOfferForm.identifier}
                        onChange={(e) => setCreateOfferForm((f) => ({ ...f, identifier: e.target.value }))}
                        placeholder="e.g. NMI or MRIN"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated value (optional)</span>
                      <input
                        type="number"
                        value={createOfferForm.estimated_value}
                        onChange={(e) => setCreateOfferForm((f) => ({ ...f, estimated_value: e.target.value }))}
                        placeholder="e.g. 50000"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => { setCreateOfferOpen(false); setCreateOfferForm({ utility_type: "", utility_type_identifier: "", identifier: "", estimated_value: "" }); }}
                        className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createOfferSubmitting}
                        className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {createOfferSubmitting ? "Creating…" : "Create"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {addTaskOpen && client && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full mx-2">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Add task</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Client: {client.business_name}</p>
                  <form onSubmit={handleAddTask} className="space-y-3">
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Title *</span>
                      <input
                        type="text"
                        required
                        value={addTaskForm.title}
                        onChange={(e) => setAddTaskForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                        placeholder="Task title"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Description (optional)</span>
                      <textarea
                        value={addTaskForm.description}
                        onChange={(e) => setAddTaskForm((f) => ({ ...f, description: e.target.value }))}
                        rows={2}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Due date (optional)</span>
                      <input
                        type="date"
                        value={addTaskForm.due_date}
                        onChange={(e) => setAddTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => { setAddTaskOpen(false); setAddTaskForm({ title: "", description: "", due_date: "" }); }}
                        className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addTaskSubmitting}
                        className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {addTaskSubmitting ? "Creating…" : "Create"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            Client not found.
          </div>
        )}
      </div>
    </>
  );
}

