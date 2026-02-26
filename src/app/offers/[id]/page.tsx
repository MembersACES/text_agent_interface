"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import {
  CLIENT_STAGE_LABELS,
  OFFER_STATUSES,
  OFFER_STATUS_LABELS,
  OFFER_ACTIVITY_LABELS,
  OfferStatus,
  type OfferActivityType,
} from "@/constants/crm";

interface Offer {
  id: number;
  client_id?: number | null;
  business_name?: string | null;
  utility_type?: string | null;
  utility_type_identifier?: string | null;
  identifier?: string | null;
  status: OfferStatus;
  estimated_value?: number | null;
  document_link?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  is_existing_client?: boolean;
}

interface ClientSummary {
  id: number;
  business_name: string;
  stage: string;
}

/** Matches backend OfferActivityResponse */
interface OfferActivity {
  id: number;
  offer_id: number;
  client_id?: number | null;
  activity_type: string;
  document_link?: string | null;
  external_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  created_by?: string | null;
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

/** Normalize document_link for use as href: strip leading =, fix https:/ → https://. */
function documentLinkHref(link: string | null | undefined): string | undefined {
  if (!link || typeof link !== "string") return undefined;
  let s = link.trim();
  if (s.startsWith("=")) s = s.slice(1).trim();
  if (s.startsWith("https:/") && !s.startsWith("https://")) s = "https://" + s.slice(7);
  if (s.startsWith("http:/") && !s.startsWith("http://")) s = "http://" + s.slice(6);
  return s.startsWith("http://") || s.startsWith("https://") ? s : undefined;
}

export default function OfferDetailPage() {
  const params = useParams();
  const offerId = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    if (Array.isArray(raw)) return parseInt(raw[0], 10);
    return parseInt(raw, 10);
  }, [params]);

  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [activities, setActivities] = useState<OfferActivity[]>([]);
  const [statusValue, setStatusValue] = useState<OfferStatus | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discrepancyModalOpen, setDiscrepancyModalOpen] = useState(false);
  const [discrepancySummary, setDiscrepancySummary] = useState("");
  const [loggingDiscrepancy, setLoggingDiscrepancy] = useState(false);
  const [clientsList, setClientsList] = useState<{ id: number; business_name: string }[]>([]);
  const [savingClient, setSavingClient] = useState(false);

  const documents = useMemo(() => {
    const items: {
      href: string;
      label: string;
      created_at?: string;
      created_by?: string | null;
    }[] = [];
    const seen = new Set<string>();

    const addItem = (href: string | undefined, label: string, created_at?: string, created_by?: string | null) => {
      if (!href) return;
      if (seen.has(href)) return;
      seen.add(href);
      items.push({ href, label, created_at, created_by });
    };

    if (offer?.document_link) {
      addItem(
        documentLinkHref(offer.document_link),
        offer.utility_type ? `${offer.utility_type} – Offer document` : "Offer document",
        offer.created_at,
        offer.created_by ?? null,
      );
    }

    for (const a of activities) {
      if (!a.document_link) continue;
      const href = documentLinkHref(a.document_link);
      if (!href) continue;
      const meta = (a.metadata || {}) as Record<string, unknown>;
      const rawUtility = typeof meta.utility_type === "string" ? meta.utility_type : undefined;
      const utility =
        rawUtility === "electricity"
          ? "Electricity"
          : rawUtility === "gas"
          ? "Gas"
          : rawUtility === "waste"
          ? "Waste"
          : rawUtility === "oil"
          ? "Oil"
          : rawUtility === "cleaning"
          ? "Cleaning"
          : rawUtility
          ? String(rawUtility)
          : undefined;

      let baseLabel =
        OFFER_ACTIVITY_LABELS[a.activity_type as OfferActivityType] ??
        a.activity_type.replace(/_/g, " ");

      if (a.activity_type === "comparison") {
        const comparisonType = meta.comparison_type ? String(meta.comparison_type) : undefined;
        if (comparisonType) {
          baseLabel = `Comparison (${comparisonType.replace(/_/g, " ")})`;
        }
      } else if (a.activity_type === "dma_review_generated") {
        baseLabel = "DMA review";
      } else if (a.activity_type === "dma_email_sent") {
        baseLabel = "DMA email";
      }

      const label = utility ? `${utility} – ${baseLabel}` : baseLabel;
      addItem(href, label, a.created_at, a.created_by ?? null);
    }

    items.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    return items;
  }, [offer, activities]);

  useEffect(() => {
    if (!offerId || !token) {
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

        const [offerRes, activitiesRes, clientsRes] = await Promise.all([
          fetch(`${base}/api/offers/${offerId}`, { headers }),
          fetch(`${base}/api/offers/${offerId}/activities`, { headers }),
          fetch(`${base}/api/clients`, { headers }),
        ]);
        if (!offerRes.ok) {
          const data = await offerRes.json().catch(() => ({}));
          throw new Error(data.detail || "Failed to load offer");
        }
        const offerData: Offer = await offerRes.json();
        setOffer(offerData);
        setStatusValue(offerData.status);

        if (activitiesRes.ok) {
          const list: OfferActivity[] = await activitiesRes.json();
          setActivities(list);
        }
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClientsList(Array.isArray(clientsData) ? clientsData : []);
        } else {
          setClientsList([]);
        }

        if (offerData.client_id) {
          const clientRes = await fetch(
            `${base}/api/clients/${offerData.client_id}`,
            { headers },
          );
          if (clientRes.ok) {
            const c: ClientSummary = await clientRes.json();
            setClient(c);
          }
        }
      } catch (e: any) {
        console.error("Error loading offer", e);
        setError(e.message || "Failed to load offer");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [offerId, token]);

  const handleLogDiscrepancyEmail = async () => {
    if (!offerId || !token) return;
    try {
      setLoggingDiscrepancy(true);
      setError(null);
      const res = await fetch(
        `${getApiBaseUrl()}/api/offers/${offerId}/activities`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activity_type: "discrepancy_email_sent",
            metadata: discrepancySummary.trim()
              ? { summary: discrepancySummary.trim() }
              : undefined,
            created_by: (session as any)?.user?.email,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to log discrepancy email");
      }
      setDiscrepancyModalOpen(false);
      setDiscrepancySummary("");
      // Refetch activities
      const listRes = await fetch(
        `${getApiBaseUrl()}/api/offers/${offerId}/activities`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (listRes.ok) {
        const list: OfferActivity[] = await listRes.json();
        setActivities(list);
      }
    } catch (e: any) {
      setError(e.message || "Failed to log discrepancy email");
    } finally {
      setLoggingDiscrepancy(false);
    }
  };

  const handleClientChange = async (newClientId: number | null) => {
    if (!offerId || !token || !offer) return;
    try {
      setSavingClient(true);
      setError(null);
      const res = await fetch(`${getApiBaseUrl()}/api/offers/${offerId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_id: newClientId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Failed to update member link");
      }
      const updated: Offer = await res.json();
      setOffer(updated);
      if (updated.client_id) {
        const c = clientsList.find((x) => x.id === updated.client_id);
        setClient(c ? { id: c.id, business_name: c.business_name, stage: "" } : { id: updated.client_id, business_name: updated.business_name ?? "", stage: "" });
      } else {
        setClient(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update member link");
    } finally {
      setSavingClient(false);
    }
  };

  const handleStatusChange = async (value: OfferStatus) => {
    if (!offerId || !token) return;
    setStatusValue(value);
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(
        `${getApiBaseUrl()}/api/offers/${offerId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: value }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to update status");
      }
      const updated: Offer = await res.json();
      setOffer(updated);
      setStatusValue(updated.status);
    } catch (e: any) {
      console.error("Failed to update offer status", e);
      setError(e.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  if (!offerId) {
    return (
      <div className="mt-4 text-sm text-red-600 dark:text-red-400">
        Invalid offer id.
      </div>
    );
  }

  const offerTitle = offer
    ? `${offer.utility_type_identifier || offer.utility_type || "Offer"}${offer.identifier ? ` · ${offer.identifier}` : ""}`
    : "Offer";
  const offerDescription = offer
    ? `${offer.business_name || "Unlinked member"}${client ? ` – ${CLIENT_STAGE_LABELS[client.stage as keyof typeof CLIENT_STAGE_LABELS] ?? client.stage}` : ""}`
    : undefined;

  return (
    <>
      <PageHeader pageName="Offer" title={offerTitle} description={offerDescription} />
      <div className="mt-4 space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !offer ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            Loading offer...
          </div>
        ) : offer ? (
          <>
            {offer.is_existing_client && (
              <p className="text-xs text-slate-600 dark:text-slate-400 -mt-2">
                This offer is for an existing member.
              </p>
            )}
            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Member
                  </label>
                  <select
                    value={offer.client_id ?? "unlinked"}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "unlinked") {
                        handleClientChange(null);
                      } else {
                        const id = parseInt(v, 10);
                        if (!Number.isNaN(id)) handleClientChange(id);
                      }
                    }}
                    disabled={savingClient}
                    className="text-sm px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-w-[180px]"
                  >
                    <option value="unlinked">Unlinked</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.business_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <select
                    value={statusValue}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as OfferStatus)
                    }
                    disabled={saving}
                    className="text-sm px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    {OFFER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {OFFER_STATUS_LABELS[s] ?? s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                {client && (
                  <a
                    href={`/clients/${client.id}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    View Client
                  </a>
                )}
                <a
                  href={`/base-2?businessName=${encodeURIComponent(offer.business_name || "")}&offerId=${offerId}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Open in Base 2
                </a>
                <button
                  type="button"
                  onClick={() => setDiscrepancyModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Log discrepancy email
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Offer Details
                  </h2>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500 dark:text-gray-400">
                        Client
                      </dt>
                      <dd className="text-gray-900 dark:text-gray-100 text-right">
                        {offer.business_name || "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500 dark:text-gray-400">
                        Utility
                      </dt>
                      <dd className="text-gray-900 dark:text-gray-100 text-right">
                        {offer.utility_type_identifier ||
                          offer.utility_type ||
                          "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500 dark:text-gray-400">
                        Identifier
                      </dt>
                      <dd className="text-gray-900 dark:text-gray-100 text-right">
                        {offer.identifier || "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500 dark:text-gray-400">
                        Created
                      </dt>
                      <dd className="text-gray-900 dark:text-gray-100 text-right">
                        {formatDate(offer.created_at)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500 dark:text-gray-400">
                        Last Updated
                      </dt>
                      <dd className="text-gray-900 dark:text-gray-100 text-right">
                        {formatDate(offer.updated_at)}
                      </dd>
                    </div>
                    {offer.estimated_value != null && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500 dark:text-gray-400">
                          Estimated Value
                        </dt>
                        <dd className="text-gray-900 dark:text-gray-100 text-right">
                          {offer.estimated_value.toLocaleString("en-AU")}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Documents & Links
                  </h2>
                  {documents.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No documents recorded yet for this offer.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500 dark:text-gray-400">
                            <th className="py-1 pr-2 font-medium">Document</th>
                            <th className="py-1 pr-2 font-medium whitespace-nowrap">Created</th>
                            <th className="py-1 pr-2 font-medium whitespace-nowrap">By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map((doc) => (
                            <tr key={doc.href} className="border-t border-gray-100 dark:border-gray-800">
                              <td className="py-1 pr-2">
                                <a
                                  href={doc.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {doc.label}
                                </a>
                              </td>
                              <td className="py-1 pr-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {doc.created_at ? formatDate(doc.created_at) : "—"}
                              </td>
                              <td className="py-1 pr-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {doc.created_by || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Log discrepancy email modal */}
            {discrepancyModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full mx-2">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    Log discrepancy email
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Record that a discrepancy email was sent for this offer. Add an optional summary below.
                  </p>
                  <textarea
                    value={discrepancySummary}
                    onChange={(e) => setDiscrepancySummary(e.target.value)}
                    placeholder="Optional summary (e.g. what was sent or to whom)"
                    rows={3}
                    className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 mb-3"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setDiscrepancyModalOpen(false); setDiscrepancySummary(""); }}
                      className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleLogDiscrepancyEmail}
                      disabled={loggingDiscrepancy}
                      className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {loggingDiscrepancy ? "Logging…" : "Log"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Activities timeline */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Activity
              </h2>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No activities recorded yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activities.map((a) => {
                    const meta = (a.metadata || {}) as Record<string, unknown>;
                    const rawUtility = typeof meta.utility_type === "string" ? meta.utility_type : undefined;
                    const utility =
                      rawUtility === "electricity"
                        ? "Electricity"
                        : rawUtility === "gas"
                        ? "Gas"
                        : rawUtility === "waste"
                        ? "Waste"
                        : rawUtility === "oil"
                        ? "Oil"
                        : rawUtility === "cleaning"
                        ? "Cleaning"
                        : rawUtility
                        ? String(rawUtility)
                        : undefined;

                    let baseLabel =
                      OFFER_ACTIVITY_LABELS[a.activity_type as OfferActivityType] ??
                      a.activity_type.replace(/_/g, " ");

                    if (a.activity_type === "comparison") {
                      const comparisonType = meta.comparison_type ? String(meta.comparison_type) : undefined;
                      if (comparisonType) {
                        baseLabel = `Comparison (${comparisonType.replace(/_/g, " ")})`;
                      }
                    } else if (a.activity_type === "dma_review_generated") {
                      baseLabel = "DMA review generated";
                    } else if (a.activity_type === "dma_email_sent") {
                      baseLabel = "DMA email sent";
                    }

                    const title = utility ? `${utility} – ${baseLabel}` : baseLabel;

                    return (
                      <li
                        key={a.id}
                        className="flex flex-col gap-1 text-sm border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-1"
                      >
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(a.created_at)}
                          {a.created_by && ` · ${a.created_by}`}
                        </span>
                        {documentLinkHref(a.document_link) && (
                          <a
                            href={documentLinkHref(a.document_link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Open document
                          </a>
                        )}
                        {a.activity_type === "discrepancy_email_sent" && meta.summary != null ? (
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {String(meta.summary)}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            Offer not found.
          </div>
        )}
      </div>
    </>
  );
}

