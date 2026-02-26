"use client";

import { useEffect, useState, useCallback } from "react";
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
  client_id?: number | null;
  business_name?: string | null;
  activity_type: string;
  document_link?: string | null;
  created_at: string;
  created_by?: string | null;
}

interface ClientOption {
  id: number;
  business_name: string;
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
        if (filterActivityType) params.set("activity_type", filterActivityType);
        params.set("created_after", effectiveAfter);
        params.set("created_before", effectiveBefore);
        const res = await fetch(
          `${getApiBaseUrl()}/api/reports/activities/list?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Failed to load activities");
        }
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e.message || "Failed to load activities");
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [token, filterClientId, filterActivityType, effectiveAfter, effectiveBefore]);

  return (
    <>
      <PageHeader pageName="Activity report" description="Recent offer activities. Filter by client, type, or date range." />
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
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Offer</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Created by</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {activities.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(a.created_at)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {OFFER_ACTIVITY_LABELS[a.activity_type as OfferActivityType] ?? a.activity_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {a.client_id ? (
                          <Link href={`/clients/${a.client_id}`} className="text-primary hover:underline">
                            {a.business_name ?? `Client ${a.client_id}`}
                          </Link>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <Link href={`/offers/${a.offer_id}`} className="text-primary hover:underline">
                          Offer #{a.offer_id}
                        </Link>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
