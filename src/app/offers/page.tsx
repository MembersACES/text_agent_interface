"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { OfferStatus, OFFER_STATUSES, OFFER_STATUS_LABELS } from "@/constants/crm";

interface Offer {
  id: number;
  client_id?: number | null;
  business_name?: string | null;
  utility_type?: string | null;
  utility_type_identifier?: string | null;
  identifier?: string | null;
  status: OfferStatus;
  created_at: string;
  is_existing_client?: boolean;
}

interface ClientOption {
  id: number;
  business_name: string;
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

export default function OffersPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [offers, setOffers] = useState<Offer[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterClientId, setFilterClientId] = useState<string>("");
  const [filterCreatedAfter, setFilterCreatedAfter] = useState<string>("");
  const [filterCreatedBefore, setFilterCreatedBefore] = useState<string>("");
  const [filterMine, setFilterMine] = useState(false);
  const [createOfferOpen, setCreateOfferOpen] = useState(false);
  const [createOfferForm, setCreateOfferForm] = useState({
    client_id: "" as string | number,
    business_name: "",
    utility_type: "",
    utility_type_identifier: "",
    identifier: "",
    estimated_value: "",
  });
  const [createOfferSubmitting, setCreateOfferSubmitting] = useState(false);
  const [createOfferError, setCreateOfferError] = useState<string | null>(null);
  const [totalOffers, setTotalOffers] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const clientIdNum = createOfferForm.client_id === "" || createOfferForm.client_id === "unlinked"
      ? undefined
      : Number(createOfferForm.client_id);
    const businessName = createOfferForm.business_name.trim()
      || (clientIdNum ? clients.find((c) => c.id === clientIdNum)?.business_name : undefined)
      || undefined;
    try {
      setCreateOfferSubmitting(true);
      setCreateOfferError(null);
      const res = await fetch(`${getApiBaseUrl()}/api/offers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientIdNum ?? null,
          business_name: businessName ?? null,
          utility_type: createOfferForm.utility_type.trim() || undefined,
          utility_type_identifier: createOfferForm.utility_type_identifier.trim() || undefined,
          identifier: createOfferForm.identifier.trim() || undefined,
          estimated_value: createOfferForm.estimated_value.trim() ? parseInt(createOfferForm.estimated_value, 10) : undefined,
          status: "requested",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Failed to create offer");
      }
      const created = await res.json();
      setCreateOfferOpen(false);
      setCreateOfferForm({ client_id: "", business_name: "", utility_type: "", utility_type_identifier: "", identifier: "", estimated_value: "" });
      setOffers((prev) => [{ ...created, status: created.status }, ...prev]);
      window.location.href = `/offers/${created.id}`;
    } catch (e: unknown) {
      setCreateOfferError(e instanceof Error ? e.message : "Failed to create offer");
    } finally {
      setCreateOfferSubmitting(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const fetchClients = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/clients`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
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
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchOffers = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", "0");
        if (filterStatus) params.set("status", filterStatus);
        if (filterClientId) params.set("client_id", filterClientId);
        if (filterCreatedAfter) params.set("created_after", filterCreatedAfter);
        if (filterCreatedBefore) params.set("created_before", filterCreatedBefore);
        if (filterMine) params.set("mine", "1");
        const url = `${getApiBaseUrl()}/api/offers?${params.toString()}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Failed to load offers");
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setOffers(data);
          setTotalOffers(data.length);
        } else if (data && typeof data.items !== "undefined" && typeof data.total === "number") {
          setOffers(Array.isArray(data.items) ? data.items : []);
          setTotalOffers(data.total);
        } else {
          setOffers([]);
          setTotalOffers(0);
        }
      } catch (e: unknown) {
        console.error("Error loading offers", e);
        setError(e instanceof Error ? e.message : "Failed to load offers");
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [token, filterStatus, filterClientId, filterCreatedAfter, filterCreatedBefore, filterMine]);

  const loadMoreOffers = async () => {
    if (!token || loadingMore || offers.length >= totalOffers) return;
    try {
      setLoadingMore(true);
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offers.length));
      if (filterStatus) params.set("status", filterStatus);
      if (filterClientId) params.set("client_id", filterClientId);
      if (filterCreatedAfter) params.set("created_after", filterCreatedAfter);
      if (filterCreatedBefore) params.set("created_before", filterCreatedBefore);
      if (filterMine) params.set("mine", "1");
      const res = await fetch(`${getApiBaseUrl()}/api/offers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to load more");
      const data = await res.json();
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setOffers((prev) => [...prev, ...nextItems]);
    } catch (e) {
      console.error("Load more offers", e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <PageHeader pageName="Offers" title="Offers & Quote Requests" description="Track offers you have sent to market." />
      <div className="mt-4">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterMine}
                  onChange={(e) => setFilterMine(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">My offers</span>
              </label>
              <button
                type="button"
                onClick={async () => {
                  if (!token) return;
                  const params = new URLSearchParams();
                  if (filterStatus) params.set("status", filterStatus);
                  if (filterClientId) params.set("client_id", filterClientId);
                  if (filterCreatedAfter) params.set("created_after", filterCreatedAfter);
                  if (filterCreatedBefore) params.set("created_before", filterCreatedBefore);
                  if (filterMine) params.set("mine", "1");
                  const url = `${getApiBaseUrl()}/api/offers/export?${params.toString()}`;
                  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                  if (!res.ok) return;
                  const blob = await res.blob();
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "offers_export.csv";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
                className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => { setCreateOfferOpen(true); setCreateOfferError(null); setCreateOfferForm({ client_id: "", business_name: "", utility_type: "", utility_type_identifier: "", identifier: "", estimated_value: "" }); }}
                className="px-3 py-1.5 rounded-md bg-primary text-white text-sm font-medium hover:opacity-90"
              >
                Create offer
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
              >
                <option value="">All</option>
                {OFFER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {OFFER_STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Client</span>
              <select
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 min-w-[180px]"
              >
                <option value="">All</option>
                {clients.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.business_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">From</span>
              <input
                type="date"
                value={filterCreatedAfter}
                onChange={(e) => setFilterCreatedAfter(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">To</span>
              <input
                type="date"
                value={filterCreatedBefore}
                onChange={(e) => setFilterCreatedBefore(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
              />
            </label>
            {(filterStatus || filterClientId || filterCreatedAfter || filterCreatedBefore || filterMine) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("");
                  setFilterClientId("");
                  setFilterCreatedAfter("");
                  setFilterCreatedBefore("");
                  setFilterMine(false);
                }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            Loading offers...
          </div>
        ) : offers.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            No offers recorded yet.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Utility
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Identifier
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {offers.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-900 dark:text-gray-100">
                            {o.business_name || "—"}
                          </span>
                          {o.is_existing_client && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                              Existing member
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-gray-900 dark:text-gray-100">
                          {o.utility_type_identifier || o.utility_type || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {o.identifier || "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {OFFER_STATUS_LABELS[o.status] ?? o.status}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatDate(o.created_at)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link
                          href={`/offers/${o.id}`}
                          className="text-primary text-xs font-medium hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && offers.length > 0 && offers.length < totalOffers && (
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={loadMoreOffers}
              disabled={loadingMore}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : `Load more (${offers.length} of ${totalOffers})`}
            </button>
          </div>
        )}

        {createOfferOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="create-offer-title">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg max-w-md w-full mx-2 max-h-[90vh] overflow-y-auto">
              <h3 id="create-offer-title" className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Create offer
              </h3>
              {createOfferError && (
                <div className="mb-3 p-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                  {createOfferError}
                </div>
              )}
              <form onSubmit={handleCreateOffer} className="space-y-3">
                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Client</span>
                  <select
                    value={createOfferForm.client_id === "" ? "" : createOfferForm.client_id === "unlinked" ? "unlinked" : String(createOfferForm.client_id)}
                    onChange={(e) => {
                      const v = e.target.value;
                      const client = v && v !== "unlinked" ? clients.find((c) => c.id === Number(v)) : null;
                      setCreateOfferForm((f) => ({
                        ...f,
                        client_id: v === "unlinked" ? "unlinked" : v === "" ? "" : Number(v),
                        business_name: client?.business_name ?? f.business_name,
                      }));
                    }}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  >
                    <option value="">Select client (optional)</option>
                    <option value="unlinked">Unlinked</option>
                    {clients.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.business_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {createOfferForm.client_id === "unlinked" || createOfferForm.client_id === ""
                      ? "Business name (optional for unlinked)"
                      : "Business name (optional override)"}
                  </span>
                  <input
                    type="text"
                    value={createOfferForm.business_name}
                    onChange={(e) => setCreateOfferForm((f) => ({ ...f, business_name: e.target.value }))}
                    placeholder={createOfferForm.client_id && createOfferForm.client_id !== "unlinked" ? "Leave blank to use member name" : "e.g. Acme Pty Ltd"}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  />
                </label>
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
                    onClick={() => { setCreateOfferOpen(false); setCreateOfferError(null); }}
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
      </div>
    </>
  );
}

