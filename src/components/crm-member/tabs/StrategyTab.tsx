"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { StrategyItem, StrategySection, Client, ClientReferral } from "../types";

export interface StrategyTabProps {
  clientId: number;
  client: Client | null;
  onSaveAdvocateMeeting: (params: {
    advocacy_meeting_date: string;
    advocacy_meeting_time: string;
    advocacy_meeting_completed: boolean;
  }) => Promise<void>;
  savingAdvocateMeeting?: boolean;
}

interface EditableItem {
  id?: number;
  section: StrategySection;
  member_level_solutions: string;
  details: string;
  solution_type: string;
  sdg: string;
  key_results: string;
  saving_achieved: string;
  new_revenue_achieved: string;
  est_saving_pa: string;
  est_revenue_pa: string;
  est_sav_rev_over_duration: string;
  est_start_date: string;
  est_sav_kpi_achieved: string;
  priority: string;
  status: string;
}

const SECTIONS: { key: StrategySection; label: string; description: string }[] = [
  {
    key: "past_achievements_annual",
    label: "Past Achievements (Annual)",
    description: "Historic achievements and results for this member by year.",
  },
  {
    key: "in_progress",
    label: "In Progress",
    description: "Current initiatives and work in progress for this member.",
  },
  {
    key: "objective",
    label: "Objectives",
    description: "Upcoming objectives and planned initiatives.",
  },
  {
    key: "advocate",
    label: "Advocate",
    description: "Link this member to the member who provided the lead, or track a business name if the lead hasn’t eventuated yet.",
  },
  {
    key: "summary",
    label: "Summary",
    description: "High-level summary of strategy, priority and status.",
  },
];

export function StrategyTab({ clientId, client, onSaveAdvocateMeeting, savingAdvocateMeeting = false }: StrategyTabProps) {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken;
  const { showToast } = useToast();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [items, setItems] = useState<StrategyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncFromCrmLoading, setSyncFromCrmLoading] = useState(false);
  const [downloadCsvLoading, setDownloadCsvLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemovedFromWip, setShowRemovedFromWip] = useState(false);
  const [removedItems, setRemovedItems] = useState<StrategyItem[]>([]);
  const [removedLoading, setRemovedLoading] = useState(false);

  const [activeSection, setActiveSection] = useState<StrategySection>("in_progress");
  const [form, setForm] = useState<EditableItem | null>(null);

  // Advocate / referrals (multiple per client)
  const [referrals, setReferrals] = useState<ClientReferral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [clientList, setClientList] = useState<Client[]>([]);
  const [clientListLoading, setClientListLoading] = useState(false);
  const [savingReferralId, setSavingReferralId] = useState<number | null>(null);
  const [addingReferral, setAddingReferral] = useState(false);
  const [referralDrafts, setReferralDrafts] = useState<
    Record<number, { advocate_client_id: number | ""; advocate_business_name: string; active: boolean }>
  >({});

  // Advocacy meeting details (above linked businesses)
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingCompleted, setMeetingCompleted] = useState(false);
  useEffect(() => {
    if (!client) return;
    setMeetingDate(client.advocacy_meeting_date ?? "");
    setMeetingTime(client.advocacy_meeting_time ?? "");
    setMeetingCompleted(client.advocacy_meeting_completed === true);
  }, [client?.id, client?.advocacy_meeting_date, client?.advocacy_meeting_time, client?.advocacy_meeting_completed]);

  const hasToken = !!token;
  const baseUrl = useMemo(() => getApiBaseUrl(), []);

  const fetchReferrals = useCallback(async () => {
    if (!clientId || !token) return;
    setReferralsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/clients/${clientId}/referrals`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to load referrals");
      const data: ClientReferral[] = await res.json();
      setReferrals(Array.isArray(data) ? data : []);
    } catch {
      setReferrals([]);
    } finally {
      setReferralsLoading(false);
    }
  }, [clientId, token, baseUrl]);

  useEffect(() => {
    if (!clientId || !token) return;
    fetchReferrals();
  }, [clientId, token, fetchReferrals]);

  useEffect(() => {
    if (!token || !clientId) return;
    setClientListLoading(true);
    fetch(`${baseUrl}/api/clients?limit=500`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.items ?? []);
        setClientList(Array.isArray(list) ? list.filter((c: Client) => c.id !== clientId) : []);
      })
      .catch(() => setClientList([]))
      .finally(() => setClientListLoading(false));
  }, [token, clientId, baseUrl]);

  const fetchItems = useCallback(async () => {
    if (!clientId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (year) params.set("year", String(year));
      const res = await fetch(
        `${baseUrl}/api/clients/${clientId}/strategy-items?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Failed to load strategy items");
      }
      const data: StrategyItem[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load strategy items";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [clientId, token, year, baseUrl, showToast]);

  useEffect(() => {
    if (!clientId || !hasToken) return;
    fetchItems();
  }, [clientId, hasToken, fetchItems]);

  const handleSyncFromCrm = useCallback(async () => {
    if (!clientId || !token) return;
    setSyncFromCrmLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (year) params.set("year", String(year));
      const res = await fetch(
        `${baseUrl}/api/clients/${clientId}/strategy-items/sync-from-crm?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Sync failed");
      }
      const data = (await res.json()) as { created?: number; message?: string };
      const count = data.created ?? 0;
      showToast(count > 0 ? `Added ${count} row(s) from existing offers and activities.` : "No new rows to add; already in sync.", "success");
      await fetchItems();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sync from CRM failed";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSyncFromCrmLoading(false);
    }
  }, [clientId, token, year, baseUrl, showToast, fetchItems]);

  const fetchRemovedItems = useCallback(async () => {
    if (!clientId || !token) return;
    setRemovedLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("year", String(year));
      params.set("excluded", "1");
      const res = await fetch(
        `${baseUrl}/api/clients/${clientId}/strategy-items?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) return;
      const data: StrategyItem[] = await res.json();
      setRemovedItems(Array.isArray(data) ? data : []);
    } finally {
      setRemovedLoading(false);
    }
  }, [clientId, token, year, baseUrl]);

  const handleIncludeInWip = useCallback(
    async (item: StrategyItem) => {
      if (!token) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/api/strategy-items/${item.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ excluded_from_wip: false }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to include in WIP");
        }
        await fetchItems();
        setRemovedItems((prev) => prev.filter((r) => r.id !== item.id));
        showToast("Back in Strategy & WIP", "success");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to include in WIP";
        showToast(msg, "error");
      } finally {
        setSaving(false);
      }
    },
    [token, baseUrl, fetchItems, showToast]
  );

  const handleDownloadCsv = useCallback(async () => {
    if (!clientId || !token) return;
    setDownloadCsvLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("year", String(year));
      const res = await fetch(
        `${baseUrl}/api/clients/${clientId}/strategy-items/export-csv?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Download failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = filenameMatch ? filenameMatch[1].trim() : `Strategy-WIP-${clientId}-${year}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("CSV downloaded.", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Download failed";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setDownloadCsvLoading(false);
    }
  }, [clientId, token, year, baseUrl, showToast]);

  const sectionItems = useMemo(() => {
    const bySection: Record<string, StrategyItem[]> = {};
    for (const s of SECTIONS) {
      bySection[s.key] = [];
    }
    for (const item of items) {
      const key = item.section as string;
      if (!bySection[key]) bySection[key] = [];
      bySection[key].push(item);
    }
    Object.keys(bySection).forEach((k) => {
      bySection[k] = bySection[k].slice().sort((a, b) => a.row_index - b.row_index || a.id - b.id);
    });
    return bySection;
  }, [items]);

  const openCreateForm = (section: StrategySection) => {
    setActiveSection(section);
    setForm({
      section,
      member_level_solutions: "",
      details: section === "past_achievements_annual" ? String(year) : "",
      solution_type: "",
      sdg: "",
      key_results: "",
      saving_achieved: "",
      new_revenue_achieved: "",
      est_saving_pa: "",
      est_revenue_pa: "",
      est_sav_rev_over_duration: "",
      est_start_date: "",
      est_sav_kpi_achieved: "",
      priority: "",
      status: "",
    });
  };

  const openEditForm = (item: StrategyItem) => {
    const fmtDate = (value?: string | null) =>
      value && value.length >= 10 ? value.slice(0, 10) : "";
    setActiveSection(item.section as StrategySection);
    setForm({
      id: item.id,
      section: item.section as StrategySection,
      member_level_solutions: item.member_level_solutions ?? "",
      details: item.details ?? "",
      solution_type: item.solution_type ?? "",
      sdg: item.sdg ?? "",
      key_results: item.key_results ?? "",
      saving_achieved: item.saving_achieved != null ? String(item.saving_achieved) : "",
      new_revenue_achieved:
        item.new_revenue_achieved != null ? String(item.new_revenue_achieved) : "",
      est_saving_pa: item.est_saving_pa != null ? String(item.est_saving_pa) : "",
      est_revenue_pa: item.est_revenue_pa != null ? String(item.est_revenue_pa) : "",
      est_sav_rev_over_duration:
        item.est_sav_rev_over_duration != null ? String(item.est_sav_rev_over_duration) : "",
      est_start_date: fmtDate(item.est_start_date),
      est_sav_kpi_achieved: item.est_sav_kpi_achieved ?? "",
      priority: item.priority ?? "",
      status: item.status ?? "",
    });
  };

  const resetForm = () => setForm(null);

  const handleFormChange = (field: keyof EditableItem, value: string) => {
    if (!form) return;
    setForm({ ...form, [field]: value });
  };

  const parseNumber = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const num = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(num) ? num : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !token) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        year,
        section: form.section,
        row_index: sectionItems[form.section]?.length ?? 0,
        member_level_solutions: form.member_level_solutions || null,
        details: form.details || null,
        solution_type: form.solution_type || null,
        sdg: form.sdg || null,
        key_results: form.key_results || null,
        saving_achieved: parseNumber(form.saving_achieved),
        new_revenue_achieved: parseNumber(form.new_revenue_achieved),
        est_saving_pa: parseNumber(form.est_saving_pa),
        est_revenue_pa: parseNumber(form.est_revenue_pa),
        est_sav_rev_over_duration: parseNumber(form.est_sav_rev_over_duration),
        est_start_date: form.est_start_date
          ? new Date(form.est_start_date).toISOString()
          : null,
        est_sav_kpi_achieved: form.est_sav_kpi_achieved || null,
        priority: form.priority || null,
        status: form.status || null,
      };

      let updatedItem: StrategyItem;

      if (form.id != null) {
        const res = await fetch(`${baseUrl}/api/strategy-items/${form.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to update item");
        }
        updatedItem = (await res.json()) as StrategyItem;
        setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
        showToast("Strategy row updated", "success");
      } else {
        const res = await fetch(`${baseUrl}/api/clients/${clientId}/strategy-items`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to create item");
        }
        updatedItem = (await res.json()) as StrategyItem;
        setItems((prev) => [...prev, updatedItem]);
        showToast("Strategy row added", "success");
      }

      resetForm();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save strategy row";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: StrategyItem) => {
    if (!token) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this row?")) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/strategy-items/${item.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Failed to delete item");
      }
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      showToast("Strategy row deleted", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete strategy row";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromWip = useCallback(
    async (item: StrategyItem) => {
      if (!token || item.offer_id == null) return;
      if (typeof window !== "undefined" && !window.confirm("Remove this row from Strategy & WIP? The offer will still be tracked; you can add it back later via Sync from CRM or Show removed.")) return;

      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/api/strategy-items/${item.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ excluded_from_wip: true }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to remove from WIP");
        }
        await fetchItems();
        showToast("Removed from Strategy & WIP; offer is still tracked.", "success");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to remove from WIP";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setSaving(false);
      }
    },
    [token, baseUrl, fetchItems, showToast]
  );

  const handleAddReferral = useCallback(async () => {
    if (!clientId || !token) return;
    setAddingReferral(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/clients/${clientId}/referrals`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ advocate_client_id: null, advocate_business_name: "", active: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Failed to add referral");
      }
      const created: ClientReferral = await res.json();
      setReferrals((prev) => [...prev, created]);
      showToast("Referral added", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add referral";
      showToast(msg, "error");
    } finally {
      setAddingReferral(false);
    }
  }, [clientId, token, baseUrl, showToast]);

  const handleSaveReferral = useCallback(
    async (ref: ClientReferral, advocateClientId: number | "", advocateBusinessName: string, active: boolean) => {
      if (!token) return;
      setSavingReferralId(ref.id);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/api/client-referrals/${ref.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            advocate_client_id: advocateClientId === "" ? null : advocateClientId,
            advocate_business_name: advocateBusinessName,
            active,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to update referral");
        }
        const updated: ClientReferral = await res.json();
        setReferrals((prev) => prev.map((r) => (r.id === ref.id ? updated : r)));
        setReferralDrafts((prev) => {
          const next = { ...prev };
          delete next[ref.id];
          return next;
        });
        showToast("Referral updated", "success");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to update referral";
        showToast(msg, "error");
      } finally {
        setSavingReferralId(null);
      }
    },
    [token, baseUrl, showToast]
  );

  const handleDeleteReferral = useCallback(
    async (ref: ClientReferral) => {
      if (!token) return;
      if (typeof window !== "undefined" && !window.confirm("Remove this advocate/referral entry?")) return;
      setSavingReferralId(ref.id);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/api/client-referrals/${ref.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to delete referral");
        setReferrals((prev) => prev.filter((r) => r.id !== ref.id));
        setReferralDrafts((prev) => {
          const next = { ...prev };
          delete next[ref.id];
          return next;
        });
        showToast("Referral removed", "success");
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : "Failed to delete", "error");
      } finally {
        setSavingReferralId(null);
      }
    },
    [token, baseUrl, showToast]
  );

  const totalsBySection: Record<string, { saving: number; revenue: number }> = useMemo(() => {
    const totals: Record<string, { saving: number; revenue: number }> = {};
    for (const s of SECTIONS) {
      totals[s.key] = { saving: 0, revenue: 0 };
    }
    for (const item of items) {
      const key = item.section as string;
      if (!totals[key]) totals[key] = { saving: 0, revenue: 0 };
      totals[key].saving += item.saving_achieved ?? item.est_saving_pa ?? 0;
      totals[key].revenue += item.new_revenue_achieved ?? item.est_revenue_pa ?? 0;
    }
    return totals;
  }, [items]);

  if (!hasToken) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You must be logged in to view and edit Strategy &amp; WIP.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Strategy &amp; WIP
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Structured view of this member&apos;s Strategy &amp; WIP template, with full
              manual control over rows.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="strategy-year">
              Year
            </label>
            <input
              id="strategy-year"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value || String(currentYear), 10))}
              className="w-20 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={handleSyncFromCrm}
              disabled={syncFromCrmLoading || loading}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              {syncFromCrmLoading ? "Syncing…" : "Sync from CRM"}
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={downloadCsvLoading || loading}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              {downloadCsvLoading ? "Downloading…" : "Download CSV"}
            </button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <CardContent className="p-4 text-sm text-gray-500 dark:text-gray-400">
            Loading strategy items...
          </CardContent>
        </Card>
      ) : (
        SECTIONS.map((section) => {
          const rows = sectionItems[section.key] ?? [];
          const totals = totalsBySection[section.key] ?? { saving: 0, revenue: 0 };
          const isActive = form?.section === section.key || activeSection === section.key;
          const isAdvocateSection = section.key === "advocate";

          // Advocate section: show referral linkage UI instead of strategy rows
          // Advocate section: multiple referral entries (dropdown + business name + active per row)
          if (isAdvocateSection) {
            const getRefValues = (ref: ClientReferral) =>
              referralDrafts[ref.id] ?? {
                advocate_client_id: ref.advocate_client_id ?? "",
                advocate_business_name: ref.advocate_business_name ?? "",
                active: ref.active !== false,
              };
            const setRefDraft = (
              ref: ClientReferral,
              update: Partial<{ advocate_client_id: number | ""; advocate_business_name: string; active: boolean }>
            ) => {
              setReferralDrafts((prev) => ({
                ...prev,
                [ref.id]: { ...getRefValues(ref), ...update },
              }));
            };
            return (
              <Card
                key={section.key}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {section.label}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {section.description}
                    </p>
                  </div>

                  {/* Advocacy Meeting Details - above linked businesses */}
                  <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-800/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Advocacy Meeting Details
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      To qualify for advocacy referral benefits, an advocacy meeting must be organized and completed.
                    </p>
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Meeting Date
                        </label>
                        <input
                          type="date"
                          value={meetingDate}
                          onChange={(e) => setMeetingDate(e.target.value)}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Meeting Time
                        </label>
                        <input
                          type="time"
                          value={meetingTime}
                          onChange={(e) => setMeetingTime(e.target.value)}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm px-3 py-2"
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={meetingCompleted}
                          onChange={(e) => setMeetingCompleted(e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Meeting Completed
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          onSaveAdvocateMeeting({
                            advocacy_meeting_date: meetingDate,
                            advocacy_meeting_time: meetingTime,
                            advocacy_meeting_completed: meetingCompleted,
                          })
                        }
                        disabled={savingAdvocateMeeting}
                        className="ml-auto px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {savingAdvocateMeeting ? "Saving…" : "Save Meeting Details"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      Linked advocate / referral businesses
                    </h4>
                  {referralsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading referrals…</p>
                  ) : (
                    <div className="space-y-4">
                      {referrals.map((ref) => {
                        const v = getRefValues(ref);
                        return (
                          <div
                            key={ref.id}
                            className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3 bg-gray-50/50 dark:bg-gray-800/30"
                          >
                            <div className="flex-1 min-w-[140px]">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                  Member
                                </label>
                                {v.advocate_client_id !== "" && ref.advocate_display_name && (
                                  <Link
                                    href={`/crm-members/${v.advocate_client_id}`}
                                    className="text-xs text-primary hover:underline shrink-0"
                                  >
                                    View member →
                                  </Link>
                                )}
                              </div>
                              <select
                                value={v.advocate_client_id === "" ? "" : String(v.advocate_client_id)}
                                onChange={(e) =>
                                  setRefDraft(ref, {
                                    advocate_client_id: e.target.value === "" ? "" : Number(e.target.value),
                                  })
                                }
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm px-3 py-2"
                                disabled={clientListLoading}
                              >
                                <option value="">— None / use business name —</option>
                                {clientList.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.business_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1 min-w-[140px]">
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                Business name (if lead not in CRM)
                              </label>
                              <input
                                type="text"
                                value={v.advocate_business_name}
                                onChange={(e) =>
                                  setRefDraft(ref, { advocate_business_name: e.target.value })
                                }
                                placeholder="e.g. business name"
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm px-3 py-2"
                              />
                            </div>
                            <label className="flex items-center gap-2 shrink-0 pb-2">
                              <input
                                type="checkbox"
                                checked={v.active}
                                onChange={(e) => setRefDraft(ref, { active: e.target.checked })}
                                className="rounded border-gray-300 dark:border-gray-600 text-primary"
                              />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active</span>
                            </label>
                            <div className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveReferral(ref, v.advocate_client_id, v.advocate_business_name, v.active)
                                }
                                disabled={savingReferralId === ref.id}
                                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                              >
                                {savingReferralId === ref.id ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReferral(ref)}
                                disabled={savingReferralId !== null}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={handleAddReferral}
                        disabled={addingReferral}
                        className="px-4 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        {addingReferral ? "Adding…" : "Add advocate / referral"}
                      </button>
                    </div>
                  )}
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card
              key={section.key}
              className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {section.label}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {section.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Rows:</span> {rows.length}
                      <span className="mx-2">·</span>
                      <span className="font-semibold">Net saving:</span>{" "}
                      {totals.saving.toLocaleString("en-AU", {
                        style: "currency",
                        currency: "AUD",
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateForm(section.key)}
                      className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Add row
                    </button>
                  </div>
                </div>

                {rows.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No rows yet for this section.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border border-gray-100 dark:border-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                          <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200">
                            Member / Solution
                          </th>
                          <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200">
                            Key results
                          </th>
                          <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200">
                            Saving
                          </th>
                          <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200">
                            Revenue
                          </th>
                          <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200">
                            Priority
                          </th>
                          <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200">
                            Status
                          </th>
                          <th className="px-2 py-1 text-right font-semibold text-gray-700 dark:text-gray-200">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40"
                          >
                            <td className="px-2 py-1 align-top text-gray-800 dark:text-gray-100">
                              <div className="font-medium">
                                {row.member_level_solutions || "—"}
                              </div>
                              {row.details && (
                                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                  {row.details}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1 align-top text-gray-800 dark:text-gray-100">
                              <div className="whitespace-pre-wrap">
                                {row.key_results || "—"}
                              </div>
                            </td>
                            <td className="px-2 py-1 align-top text-gray-800 dark:text-gray-100">
                              {row.saving_achieved != null || row.est_saving_pa != null
                                ? (row.saving_achieved ?? row.est_saving_pa ?? 0).toLocaleString(
                                    "en-AU",
                                    {
                                      style: "currency",
                                      currency: "AUD",
                                    }
                                  )
                                : "—"}
                            </td>
                            <td className="px-2 py-1 align-top text-gray-800 dark:text-gray-100">
                              {row.new_revenue_achieved != null || row.est_revenue_pa != null
                                ? (
                                    row.new_revenue_achieved ?? row.est_revenue_pa ?? 0
                                  ).toLocaleString("en-AU", {
                                    style: "currency",
                                    currency: "AUD",
                                  })
                                : "—"}
                            </td>
                            <td className="px-2 py-1 align-top text-gray-800 dark:text-gray-100">
                              {row.priority || "—"}
                            </td>
                            <td className="px-2 py-1 align-top text-gray-800 dark:text-gray-100">
                              {row.status || "—"}
                            </td>
                            <td className="px-2 py-1 align-top text-right">
                              {row.offer_id != null && (
                                <>
                                  <Link
                                    href={`/offers/${row.offer_id}`}
                                    className="text-[11px] text-primary hover:underline mr-2"
                                  >
                                    View offer
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromWip(row)}
                                    disabled={saving}
                                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline mr-2"
                                    title="Remove from this view; offer stays tracked"
                                  >
                                    Remove from WIP
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditForm(row)}
                                className="text-[11px] text-primary hover:underline mr-2"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(row)}
                                className="text-[11px] text-red-600 dark:text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {form && isActive && (
                  <form
                    onSubmit={handleSubmit}
                    className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                          Member level / solution
                        </label>
                        <input
                          type="text"
                          value={form.member_level_solutions}
                          onChange={(e) =>
                            handleFormChange("member_level_solutions", e.target.value)
                          }
                          className="w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                          Details / year
                        </label>
                        <input
                          type="text"
                          value={form.details}
                          onChange={(e) => handleFormChange("details", e.target.value)}
                          className="w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                          Solution type / SDG
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Solution type"
                            value={form.solution_type}
                            onChange={(e) => handleFormChange("solution_type", e.target.value)}
                            className="flex-1 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                          />
                          <input
                            type="text"
                            placeholder="SDG"
                            value={form.sdg}
                            onChange={(e) => handleFormChange("sdg", e.target.value)}
                            className="w-20 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                        Key results
                      </label>
                      <textarea
                        value={form.key_results}
                        onChange={(e) => handleFormChange("key_results", e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                          Saving achieved / est. p.a.
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 15000"
                          value={form.saving_achieved}
                          onChange={(e) => handleFormChange("saving_achieved", e.target.value)}
                          className="w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                          Revenue achieved / est. p.a.
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 5000"
                          value={form.new_revenue_achieved}
                          onChange={(e) =>
                            handleFormChange("new_revenue_achieved", e.target.value)
                          }
                          className="w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                          Est. sav/rev over duration
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 45000"
                          value={form.est_sav_rev_over_duration}
                          onChange={(e) =>
                            handleFormChange("est_sav_rev_over_duration", e.target.value)
                          }
                          className="w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                          Est. start date
                        </label>
                        <input
                          type="date"
                          value={form.est_start_date}
                          onChange={(e) => handleFormChange("est_start_date", e.target.value)}
                          className="w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                          KPI achieved
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 50% or On track"
                          value={form.est_sav_kpi_achieved}
                          onChange={(e) =>
                            handleFormChange("est_sav_kpi_achieved", e.target.value)
                          }
                          className="w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                            Priority
                          </label>
                          <input
                            type="text"
                            placeholder="High / Medium / Low"
                            value={form.priority}
                            onChange={(e) => handleFormChange("priority", e.target.value)}
                            className="w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">
                            Status
                          </label>
                          <input
                            type="text"
                            placeholder="Completed / On-Track / To be completed"
                            value={form.status}
                            onChange={(e) => handleFormChange("status", e.target.value)}
                            className="w-full px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium shadow-sm hover:bg-primary/90 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : form.id != null ? "Save changes" : "Add row"}
                      </button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <div className="flex items-center gap-2 mt-2">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showRemovedFromWip}
            onChange={(e) => {
              setShowRemovedFromWip(e.target.checked);
              if (e.target.checked) fetchRemovedItems();
            }}
          />
          Show removed from WIP
        </label>
      </div>

      {showRemovedFromWip && (
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Removed from WIP (offer still tracked)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowRemovedFromWip(false);
                }}
                className="text-xs text-gray-500 hover:underline"
              >
                Hide
              </button>
            </div>
            {removedLoading ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">Loading...</p>
            ) : removedItems.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">None removed.</p>
            ) : (
              <ul className="space-y-1">
                {removedItems.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300"
                  >
                    <span className="truncate">
                      {r.member_level_solutions || r.key_results || `Row #${r.id}`}
                      {r.offer_id != null && (
                        <Link
                          href={`/offers/${r.offer_id}`}
                          className="ml-2 text-primary hover:underline"
                        >
                          View offer
                        </Link>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleIncludeInWip(r)}
                      disabled={saving}
                      className="text-primary hover:underline shrink-0"
                    >
                      Include in WIP
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

