"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/utils";

type ShopRow = Record<string, unknown>;
type RobotRow = Record<string, unknown>;

type ConsumableRow = {
  id?: number;
  mode_name: string;
  sku: string;
  name: string;
  quantity: string;
  unit: string;
  rrp: string;
  lifespan_per_unit: string;
  hours: string;
  last_replaced_at: string;
  replacement_interval_days: string;
  item_type: string;
  notes: string;
};

type BaselineRunRobotResult = {
  sn: string;
  product_hint?: string | null;
  baseline_start_date?: string | null;
  baseline_source?: string | null;
  status: "ok" | "no_baseline" | "error";
  error?: string | null;
};

type BaselineRunSiteResult = {
  shop_id: string;
  shop_name?: string;
  updated_count: number;
  total_count: number;
  error?: string;
  warning?: string;
  robot_results?: BaselineRunRobotResult[];
};

type BaselineRunDetails = {
  sites?: BaselineRunSiteResult[];
  robot_detail_summary?: { ok?: number; no_baseline?: number; error?: number };
};

type BaselineRunMeta = {
  id: number;
  run_scope: string;
  status: string;
  updated_count: number;
  total_count: number;
  site_count: number;
  started_at?: string | null;
  finished_at?: string | null;
  initiated_by?: string | null;
  error_message?: string | null;
  run_details?: BaselineRunDetails | null;
};

type HubItemStatus = "overdue" | "due_soon" | "ok" | "unknown";

type ConsumablesHubSummary = {
  total_items: number;
  total_robots: number;
  overdue_items: number;
  due_soon_items: number;
  ok_items: number;
  unknown_items: number;
  overdue_robots: number;
  due_soon_robots: number;
  unknown_robots: number;
  due_soon_days: number;
};

type ConsumablesHubItem = {
  id: number;
  shop_id: string;
  shop_name?: string | null;
  robot_sn: string;
  robot_label: string;
  mode_name: string;
  sku: string;
  name: string;
  item_type: string;
  lifespan_per_unit: string;
  replacement_interval_days?: number | null;
  last_replaced_at?: string | null;
  baseline_start_date?: string | null;
  due_date?: string | null;
  days_until_due?: number | null;
  status: HubItemStatus;
  status_reason: string;
  notes: string;
};

function shopIdFromRecord(r: ShopRow): string {
  return String(r.shop_id ?? r.id ?? r.shopId ?? "").trim();
}

function shopNameFromRecord(r: ShopRow): string {
  return String(r.shop_name ?? r.name ?? r.shopName ?? "").trim();
}

function robotSnFromRecord(r: RobotRow): string {
  return String(
    r.sn_canonical ??
      r.sn ??
      r.SN ??
      r.machine_sn ??
      r.robot_sn ??
      r.serial_number ??
      ""
  ).trim();
}

function robotProductCodeFromRecord(r: RobotRow): string {
  return String(r.product_code ?? r.productCode ?? r.model ?? r.robot_model ?? r.type ?? "").trim();
}

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalInt(raw: string): number | null {
  const n = parseOptionalNumber(raw);
  if (n == null) return null;
  return Math.round(n);
}

function formatDateTimeLabel(raw: string | null | undefined): string {
  if (!raw) return "—";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleString();
}

function statusBadgeClass(status: HubItemStatus): string {
  if (status === "overdue") return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  if (status === "due_soon") return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  if (status === "ok") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  return "bg-gray-100 text-gray-700 dark:bg-dark-2 dark:text-gray-300";
}

/** Turns useless browser "Failed to fetch" into something actionable for long-running jobs. */
function formatBaselineFetchError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.trim();
  const looksNetwork =
    m === "Failed to fetch" ||
    m === "Load failed" ||
    m === "NetworkError when attempting to fetch resource." ||
    /failed to fetch/i.test(m) ||
    (e instanceof TypeError && /fetch|network/i.test(m));
  if (looksNetwork) {
    return [
      "The browser lost the HTTP response (timeouts and reverse proxies often cut long requests).",
      "If the API still finished, refresh this page: the progress log fills from the last saved run, and the card below shows run id for log correlation.",
      `Browser reported: ${m || "network error"}`,
    ].join(" ");
  }
  return m || "Unknown error";
}

export default function RobotConsumablesPage() {
  const { data: session, status } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { accessToken?: string } | null)?.accessToken;

  const [shops, setShops] = useState<ShopRow[]>([]);
  const [robots, setRobots] = useState<RobotRow[]>([]);
  const [shopId, setShopId] = useState("");
  const [sn, setSn] = useState("");
  const [rows, setRows] = useState<ConsumableRow[]>([]);
  const [source, setSource] = useState<string>("");
  const [baselineStartDate, setBaselineStartDate] = useState<string>("");
  const [baselineSource, setBaselineSource] = useState<string>("");
  const [lifetimeRuntimeHours, setLifetimeRuntimeHours] = useState<string>("");
  const [loadingShops, setLoadingShops] = useState(false);
  const [loadingRobots, setLoadingRobots] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [redetectingBaseline, setRedetectingBaseline] = useState(false);
  const [redetectingAllSites, setRedetectingAllSites] = useState(false);
  const [baselineRunLog, setBaselineRunLog] = useState<BaselineRunSiteResult[]>([]);
  const [lastGlobalRun, setLastGlobalRun] = useState<BaselineRunMeta | null>(null);
  const [lastCompletedGlobalRun, setLastCompletedGlobalRun] = useState<BaselineRunMeta | null>(null);
  const [hubSummary, setHubSummary] = useState<ConsumablesHubSummary | null>(null);
  const [hubItems, setHubItems] = useState<ConsumablesHubItem[]>([]);
  const [hubStatusFilter, setHubStatusFilter] = useState<"all" | "actionable" | HubItemStatus>("actionable");
  const [hubSearch, setHubSearch] = useState("");
  const [loadingHub, setLoadingHub] = useState(false);
  const [markingHub, setMarkingHub] = useState(false);
  const [selectedHubItemIds, setSelectedHubItemIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedRobot = useMemo(
    () => robots.find((r) => robotSnFromRecord(r) === sn) ?? null,
    [robots, sn]
  );

  const selectedProductCode = useMemo(() => {
    if (!selectedRobot) return "";
    return robotProductCodeFromRecord(selectedRobot);
  }, [selectedRobot]);

  const selectedShopName = useMemo(() => {
    const shop = shops.find((s) => shopIdFromRecord(s) === shopId);
    return shop ? shopNameFromRecord(shop) : "";
  }, [shops, shopId]);

  /** Prefer this session’s POST response; else last completed global run persisted on the server (survives “Failed to fetch”). */
  const displayBaselineLog = useMemo((): BaselineRunSiteResult[] => {
    if (baselineRunLog.length > 0) return baselineRunLog;
    const currentSites = lastGlobalRun?.run_details?.sites;
    if (Array.isArray(currentSites) && currentSites.length > 0) {
      return currentSites as BaselineRunSiteResult[];
    }
    const completedSites = lastCompletedGlobalRun?.run_details?.sites;
    if (Array.isArray(completedSites) && completedSites.length > 0) {
      return completedSites as BaselineRunSiteResult[];
    }
    return [];
  }, [baselineRunLog, lastGlobalRun, lastCompletedGlobalRun]);

  const showingPreviousCompletedLog =
    baselineRunLog.length === 0 &&
    lastGlobalRun?.status === "running" &&
    (!Array.isArray(lastGlobalRun?.run_details?.sites) || lastGlobalRun.run_details.sites.length === 0) &&
    Array.isArray(lastCompletedGlobalRun?.run_details?.sites) &&
    lastCompletedGlobalRun.run_details.sites.length > 0;

  const filteredHubItems = useMemo(() => {
    const q = hubSearch.trim().toLowerCase();
    return hubItems.filter((row) => {
      if (hubStatusFilter === "actionable") {
        if (!(row.status === "overdue" || row.status === "due_soon")) return false;
      } else if (hubStatusFilter !== "all" && row.status !== hubStatusFilter) {
        return false;
      }
      if (!q) return true;
      const bag = [
        row.shop_name || "",
        row.shop_id,
        row.robot_label,
        row.robot_sn,
        row.mode_name,
        row.name,
        row.sku,
        row.status_reason,
      ]
        .join(" ")
        .toLowerCase();
      return bag.includes(q);
    });
  }, [hubItems, hubStatusFilter, hubSearch]);

  const selectedHubSet = useMemo(() => new Set(selectedHubItemIds), [selectedHubItemIds]);

  const loadHub = useCallback(async () => {
    if (!token) return;
    setLoadingHub(true);
    try {
      const params = new URLSearchParams({ due_soon_days: "30" });
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/consumables/hub?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail ?? res.statusText);
      const summary = ((body as { summary?: ConsumablesHubSummary }).summary ?? null) as ConsumablesHubSummary | null;
      const rows = Array.isArray((body as { items?: unknown[] }).items)
        ? ((body as { items: ConsumablesHubItem[] }).items)
        : [];
      setHubSummary(summary);
      setHubItems(rows);
      setSelectedHubItemIds((prev) => prev.filter((id) => rows.some((r) => r.id === id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingHub(false);
    }
  }, [token]);

  const loadShops = useCallback(async () => {
    if (!token) return;
    setLoadingShops(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/shops`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail ?? res.statusText);
      setShops(Array.isArray((body as { shops?: unknown[] }).shops) ? ((body as { shops: ShopRow[] }).shops) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingShops(false);
    }
  }, [token]);

  const loadRobots = useCallback(async () => {
    if (!token || !shopId.trim()) {
      setRobots([]);
      return;
    }
    setLoadingRobots(true);
    try {
      const params = new URLSearchParams({ shop_id: shopId.trim() });
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/robots?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail ?? res.statusText);
      setRobots(Array.isArray((body as { robots?: unknown[] }).robots) ? ((body as { robots: RobotRow[] }).robots) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRobots(false);
    }
  }, [shopId, token]);

  const loadConsumables = useCallback(async () => {
    if (!token || !shopId.trim() || !sn.trim()) return;
    setLoadingRows(true);
    setError(null);
    setSuccess(null);
    try {
      const params = new URLSearchParams({
        shop_id: shopId.trim(),
        sn: sn.trim(),
      });
      if (selectedProductCode.trim()) params.set("product_code", selectedProductCode.trim());
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/consumables?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail ?? res.statusText);
      const items = Array.isArray((body as { items?: unknown[] }).items) ? ((body as { items: Record<string, unknown>[] }).items) : [];
      const nextRows: ConsumableRow[] = items.map((r) => ({
        id: typeof r.id === "number" ? r.id : undefined,
        mode_name: String(r.mode_name ?? ""),
        sku: String(r.sku ?? ""),
        name: String(r.name ?? ""),
        quantity: r.quantity == null ? "" : String(r.quantity),
        unit: String(r.unit ?? ""),
        rrp: String(r.rrp ?? ""),
        lifespan_per_unit: String(r.lifespan_per_unit ?? ""),
        hours: r.hours == null ? "" : String(r.hours),
        last_replaced_at: String(r.last_replaced_at ?? ""),
        replacement_interval_days: r.replacement_interval_days == null ? "" : String(r.replacement_interval_days),
        item_type: String(r.item_type ?? ""),
        notes: String(r.notes ?? ""),
      }));
      setRows(nextRows);
      setSource(String((body as { source?: string }).source ?? ""));
      setBaselineStartDate(String((body as { baseline_start_date?: string }).baseline_start_date ?? ""));
      setBaselineSource(String((body as { baseline_source?: string }).baseline_source ?? ""));
      const runtimeRaw = (body as { lifetime_runtime_h?: unknown }).lifetime_runtime_h;
      setLifetimeRuntimeHours(runtimeRaw == null ? "" : String(runtimeRaw));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRows(false);
    }
  }, [shopId, sn, token, selectedProductCode]);

  const loadBaselineRefreshStatus = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/consumables/baseline-refresh-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return false;
      const latestGlobal = (body as { latest_global?: BaselineRunMeta | null }).latest_global ?? null;
      const latestGlobalCompleted = (body as { latest_global_completed?: BaselineRunMeta | null }).latest_global_completed ?? null;
      setLastGlobalRun(latestGlobal);
      setLastCompletedGlobalRun(latestGlobalCompleted);
      const currentSites = latestGlobal?.run_details?.sites;
      if (Array.isArray(currentSites) && currentSites.length > 0) return true;
      const completedSites = latestGlobalCompleted?.run_details?.sites;
      return Array.isArray(completedSites) && completedSites.length > 0;
    } catch {
      return false;
    }
  }, [token]);

  useEffect(() => {
    if (status !== "authenticated" || !token) return;
    void loadShops();
    void loadBaselineRefreshStatus();
    void loadHub();
  }, [status, token, loadShops, loadBaselineRefreshStatus, loadHub]);

  useEffect(() => {
    if (status !== "authenticated" || !token) return;
    void loadRobots();
  }, [status, token, loadRobots]);

  useEffect(() => {
    if (sn.trim()) return;
    const first = robots.map((r) => robotSnFromRecord(r)).find((x) => x.length > 0);
    if (first) setSn(first);
  }, [robots, sn]);

  useEffect(() => {
    void loadConsumables();
  }, [loadConsumables]);

  function toggleHubSelection(id: number) {
    setSelectedHubItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function markHubItemsReplaced(itemIds: number[]) {
    if (!token || itemIds.length === 0) return;
    setMarkingHub(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/consumables/mark-replaced`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ item_ids: itemIds }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail ?? res.statusText);
      const updated = Number((body as { updated_count?: unknown }).updated_count ?? 0);
      const replacedAt = String((body as { replaced_at?: unknown }).replaced_at ?? "");
      setSelectedHubItemIds((prev) => prev.filter((id) => !itemIds.includes(id)));
      setSuccess(`Marked ${updated} item(s) replaced at ${replacedAt || "today"}.`);
      await loadHub();
      await loadConsumables();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setMarkingHub(false);
    }
  }

  function updateRow(idx: number, key: keyof ConsumableRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  function addRow() {
    const fallbackMode = rows[rows.length - 1]?.mode_name ?? "";
    setRows((prev) => [
      ...prev,
      {
        mode_name: fallbackMode,
        sku: "",
        name: "",
        quantity: "",
        unit: "",
        rrp: "",
        lifespan_per_unit: "",
        hours: "",
        last_replaced_at: "",
        replacement_interval_days: "",
        item_type: "Consumables",
        notes: "",
      },
    ]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveRows() {
    if (!token || !shopId.trim() || !sn.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        shop_id: shopId.trim(),
        sn: sn.trim(),
        robot_label: selectedProductCode || sn.trim(),
        items: rows
          .map((r) => ({
            id: r.id,
            mode_name: r.mode_name.trim(),
            sku: r.sku.trim(),
            name: r.name.trim(),
            quantity: parseOptionalNumber(r.quantity),
            unit: r.unit.trim(),
            rrp: r.rrp.trim(),
            lifespan_per_unit: r.lifespan_per_unit.trim(),
            hours: parseOptionalNumber(r.hours),
            last_replaced_at: r.last_replaced_at.trim() || null,
            replacement_interval_days: parseOptionalInt(r.replacement_interval_days),
            item_type: r.item_type.trim(),
            notes: r.notes.trim(),
          }))
          .filter((r) => r.name.length > 0),
      };
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/consumables`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail ?? res.statusText);
      setSuccess("Consumables saved.");
      setSource("database");
      await loadConsumables();
      await loadHub();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function redetectBaselineForSite() {
    if (!token || !shopId.trim()) return;
    setRedetectingBaseline(true);
    setError(null);
    setSuccess(null);
    try {
      const params = new URLSearchParams({ shop_id: shopId.trim() });
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/consumables/baseline-redetect?${params.toString()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail ?? res.statusText);
      const updated = Number((body as { updated_count?: unknown }).updated_count ?? 0);
      const total = Number((body as { total_count?: unknown }).total_count ?? 0);
      const rawResults = Array.isArray((body as { results?: unknown[] }).results)
        ? ((body as { results: Record<string, unknown>[] }).results)
        : [];
      const robot_results: BaselineRunRobotResult[] = rawResults.map((row) => {
        const st = row.status;
        const status: BaselineRunRobotResult["status"] =
          st === "error" ? "error" : st === "no_baseline" ? "no_baseline" : "ok";
        const bl = row.baseline_start_date != null ? String(row.baseline_start_date) : null;
        return {
          sn: String(row.sn ?? ""),
          product_hint: row.product_hint != null ? String(row.product_hint) : null,
          baseline_start_date: bl,
          baseline_source: row.baseline_source != null ? String(row.baseline_source) : null,
          status: row.status != null ? status : bl ? "ok" : "no_baseline",
          error: row.error != null ? String(row.error) : null,
        };
      });
      setBaselineRunLog([
        {
          shop_id: shopId.trim(),
          shop_name: selectedShopName || undefined,
          updated_count: updated,
          total_count: total,
          robot_results,
        },
      ]);
      const okC = robot_results.filter((x) => x.status === "ok").length;
      const nbC = robot_results.filter((x) => x.status === "no_baseline").length;
      const erC = robot_results.filter((x) => x.status === "error").length;
      setSuccess(
        `Baseline re-detected for ${updated}/${total} robot(s) in this site. Per-robot: ${okC} ok, ${nbC} no baseline, ${erC} failed.`
      );
      await loadConsumables();
      await loadBaselineRefreshStatus();
      await loadHub();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRedetectingBaseline(false);
    }
  }

  async function redetectBaselineForAllSites() {
    if (!token) return;
    setRedetectingAllSites(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/consumables/baseline-redetect-all-sites`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail ?? res.statusText);
      const updated = Number((body as { updated_count?: unknown }).updated_count ?? 0);
      const total = Number((body as { total_count?: unknown }).total_count ?? 0);
      const sites = Number((body as { site_count?: unknown }).site_count ?? 0);
      const siteRows = Array.isArray((body as { sites?: unknown[] }).sites)
        ? ((body as { sites: BaselineRunSiteResult[] }).sites)
        : [];
      setBaselineRunLog(siteRows);
      const runMeta = (body as { run?: BaselineRunMeta }).run;
      if (runMeta) setLastGlobalRun(runMeta);
      const rd = (body as { robot_detail_summary?: { ok?: number; no_baseline?: number; error?: number } }).robot_detail_summary;
      const rdLine =
        rd != null
          ? ` Per-robot: ${Number(rd.ok ?? 0)} ok, ${Number(rd.no_baseline ?? 0)} no baseline, ${Number(rd.error ?? 0)} failed.`
          : "";
      setSuccess(`Global baseline re-detect completed: ${updated}/${total} robot(s) across ${sites} site(s).${rdLine}`);
      await loadConsumables();
      await loadBaselineRefreshStatus();
      await loadHub();
    } catch (e) {
      setError(formatBaselineFetchError(e));
      const hasStored = await loadBaselineRefreshStatus();
      if (hasStored) {
        setSuccess(
          "Per-site and per-robot rows below are from the last saved global run on the server (visible even when the browser drops the long request)."
        );
      }
    } finally {
      setRedetectingAllSites(false);
    }
  }

  if (status === "loading") return <p className="text-sm text-gray-500">Loading session…</p>;
  if (!token) return <p className="text-sm text-red-600 dark:text-red-400">Sign in to use consumables tracking.</p>;

  return (
    <div className="space-y-6">
      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Consumables tracking</CardTitle>
              <CardDescription>
                Editable consumables and parts per robot. Baseline date auto-detects from first available robot execution data.
              </CardDescription>
            </div>
            <Link href="/robot-dashboard" className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-dark-3 dark:text-indigo-300 dark:hover:bg-dark-2">
              Back to dashboard
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <select value={shopId} onChange={(e) => { setShopId(e.target.value); setSn(""); }} disabled={loadingShops} className="rounded-xl border border-stroke bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2">
              <option value="">Select site…</option>
              {shops.map((s, i) => {
                const id = shopIdFromRecord(s);
                return <option key={`${id}-${i}`} value={id}>{shopNameFromRecord(s) || id} ({id})</option>;
              })}
            </select>
            <select value={sn} onChange={(e) => setSn(e.target.value)} disabled={!shopId.trim() || loadingRobots} className="rounded-xl border border-stroke bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2">
              <option value="">Select robot…</option>
              {robots.map((r, i) => {
                const robotSn = robotSnFromRecord(r);
                const product = robotProductCodeFromRecord(r) || "Robot";
                return <option key={`${robotSn}-${i}`} value={robotSn}>{product} ({robotSn})</option>;
              })}
            </select>
            <div className="rounded-xl border border-dashed border-stroke px-3 py-2 text-xs text-gray-600 dark:border-dark-3 dark:text-gray-300">
              <div>Source: <span className="font-semibold">{source || "—"}</span></div>
              <div>Site: <span className="font-mono">{selectedShopName || shopId || "—"}</span></div>
              <div>Product: <span className="font-mono">{selectedProductCode || "—"}</span></div>
              <div>Baseline start: <span className="font-mono">{baselineStartDate || "Detecting / not found yet"}</span></div>
              <div>Baseline source: <span className="font-mono">{baselineSource || "—"}</span></div>
              <div>Lifetime runtime: <span className="font-mono">{lifetimeRuntimeHours ? `${lifetimeRuntimeHours} h` : "—"}</span></div>
            </div>
          </div>

          {source === "template" && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              Loaded default template for this robot type. Click <span className="font-semibold">Save</span> to persist and start tracking edits.
            </p>
          )}

          {lastGlobalRun && (
            <div className="rounded-xl border border-stroke bg-gray-50/70 px-3 py-2 text-xs text-gray-700 dark:border-dark-3 dark:bg-dark-2/60 dark:text-gray-300">
              <p className="font-semibold text-gray-800 dark:text-gray-100">Last global baseline refresh</p>
              <p className="mt-0.5 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                Run id <span className="font-semibold text-gray-700 dark:text-gray-300">{lastGlobalRun.id}</span> — search API logs for this number alongside &quot;Consumables baseline all-sites&quot;.
              </p>
              <p className="mt-1">
                Status: <span className="font-semibold">{lastGlobalRun.status}</span> · Updated{" "}
                <span className="font-semibold">{lastGlobalRun.updated_count}</span> of{" "}
                <span className="font-semibold">{lastGlobalRun.total_count}</span> robots across{" "}
                <span className="font-semibold">{lastGlobalRun.site_count}</span> site(s)
              </p>
              {showingPreviousCompletedLog ? (
                <p className="mt-1 text-[11px] text-indigo-700 dark:text-indigo-300">
                  A newer run is currently in progress. The table below is showing the previous completed run until this one finishes.
                </p>
              ) : null}
              {lastGlobalRun.error_message ? (
                <p className="mt-1 text-amber-800 dark:text-amber-200">{lastGlobalRun.error_message}</p>
              ) : null}
              {(() => {
                const rd = lastGlobalRun.run_details?.robot_detail_summary;
                if (!rd) return null;
                return (
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Per-robot (saved with this run):{" "}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">{Number(rd.ok ?? 0)} ok</span>
                    {" · "}
                    <span className="font-semibold text-amber-800 dark:text-amber-200">
                      {Number(rd.no_baseline ?? 0)} no baseline
                    </span>
                    {" · "}
                    <span className="font-semibold text-red-600 dark:text-red-400">{Number(rd.error ?? 0)} failed</span>
                  </p>
                );
              })()}
              <p className="mt-0.5">
                Started {formatDateTimeLabel(lastGlobalRun.started_at)} · Finished{" "}
                {formatDateTimeLabel(lastGlobalRun.finished_at)}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-stroke dark:border-dark-3">
            <div className="border-b border-stroke bg-gray-50 px-3 py-2 dark:border-dark-3 dark:bg-dark-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Consumables hub overview (all robots)
                </p>
                <button
                  type="button"
                  onClick={() => void loadHub()}
                  disabled={loadingHub}
                  className="rounded border border-stroke px-2 py-1 text-[11px] font-semibold hover:bg-gray-100 disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
                >
                  {loadingHub ? "Refreshing…" : "Refresh hub"}
                </button>
              </div>
            </div>
            <div className="space-y-3 p-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs dark:border-red-900 dark:bg-red-950/20">
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">Overdue items</p>
                  <p className="font-semibold text-red-700 dark:text-red-300">{hubSummary?.overdue_items ?? 0}</p>
                </div>
                <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs dark:border-amber-900 dark:bg-amber-950/20">
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">Due soon ({hubSummary?.due_soon_days ?? 30}d)</p>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">{hubSummary?.due_soon_items ?? 0}</p>
                </div>
                <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs dark:border-emerald-900 dark:bg-emerald-950/20">
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">Healthy</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">{hubSummary?.ok_items ?? 0}</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs dark:border-dark-3 dark:bg-dark-2">
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">Unknown data</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">{hubSummary?.unknown_items ?? 0}</p>
                </div>
                <div className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-xs dark:border-indigo-900 dark:bg-indigo-950/20">
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">Robots tracked</p>
                  <p className="font-semibold text-indigo-700 dark:text-indigo-300">{hubSummary?.total_robots ?? 0}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["actionable", "all", "overdue", "due_soon", "unknown", "ok"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setHubStatusFilter(f)}
                    className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                      hubStatusFilter === f
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-300"
                        : "border-stroke text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:text-gray-300 dark:hover:bg-dark-2"
                    }`}
                  >
                    {f === "all"
                      ? "All"
                      : f === "actionable"
                        ? "Actionable"
                        : f === "due_soon"
                          ? "Due soon"
                          : f[0].toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedHubItemIds(filteredHubItems.map((r) => r.id))}
                  className="rounded border border-stroke px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:text-gray-300 dark:hover:bg-dark-2"
                >
                  Select visible
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedHubItemIds([])}
                  className="rounded border border-stroke px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 dark:border-dark-3 dark:text-gray-300 dark:hover:bg-dark-2"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={markingHub || selectedHubItemIds.length === 0}
                  onClick={() => void markHubItemsReplaced(selectedHubItemIds)}
                  className="rounded border border-emerald-500 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
                >
                  {markingHub ? "Marking…" : `Mark selected replaced (${selectedHubItemIds.length})`}
                </button>
                <input
                  value={hubSearch}
                  onChange={(e) => setHubSearch(e.target.value)}
                  placeholder="Search site, robot, item…"
                  className="ml-auto w-full max-w-xs rounded border border-stroke px-2 py-1.5 text-xs dark:border-dark-3 dark:bg-dark-2"
                />
              </div>

              <div className="overflow-x-auto rounded border border-stroke dark:border-dark-3">
                <table className="min-w-[1100px] text-xs">
                  <thead className="bg-gray-50 dark:bg-dark-2">
                    <tr>
                      {["", "Status", "Site", "Robot", "Item", "Mode", "Last replaced", "Due date", "Days", "Reason", "Action"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-dark-3">
                    {loadingHub ? (
                      <tr>
                        <td colSpan={11} className="px-3 py-5 text-center text-gray-500">Loading hub…</td>
                      </tr>
                    ) : filteredHubItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-3 py-5 text-center text-gray-500">No matching consumable rows.</td>
                      </tr>
                    ) : (
                      filteredHubItems.map((r, i) => (
                        <tr key={`${r.shop_id}-${r.robot_sn}-${r.sku}-${r.name}-${i}`} className="bg-white dark:bg-gray-dark">
                          <td className="px-2 py-1.5">
                            <input
                              type="checkbox"
                              checked={selectedHubSet.has(r.id)}
                              onChange={() => toggleHubSelection(r.id)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusBadgeClass(r.status)}`}>
                              {r.status === "due_soon" ? "due soon" : r.status}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <div>{r.shop_name || "—"}</div>
                            <div className="font-mono text-[11px] text-gray-500">{r.shop_id}</div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div>{r.robot_label || r.robot_sn}</div>
                            <div className="font-mono text-[11px] text-gray-500">{r.robot_sn}</div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div>{r.name}</div>
                            <div className="font-mono text-[11px] text-gray-500">{r.sku || "—"}</div>
                          </td>
                          <td className="px-2 py-1.5">{r.mode_name || "—"}</td>
                          <td className="px-2 py-1.5 font-mono">{r.last_replaced_at || "—"}</td>
                          <td className="px-2 py-1.5 font-mono">{r.due_date || "—"}</td>
                          <td className="px-2 py-1.5 font-mono">{r.days_until_due == null ? "—" : String(r.days_until_due)}</td>
                          <td className="max-w-[260px] break-words px-2 py-1.5 text-gray-600 dark:text-gray-300">{r.status_reason}</td>
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              disabled={markingHub}
                              onClick={() => void markHubItemsReplaced([r.id])}
                              className="rounded border border-emerald-500 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
                            >
                              Mark replaced
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-stroke dark:border-dark-3">
            <div className="overflow-x-auto">
              <table className="min-w-[1450px] text-xs">
                <thead className="bg-gray-50 dark:bg-dark-2">
                  <tr>
                    {["Mode", "SKU", "Name", "Quantity", "Unit", "RRP", "Lifespan per unit", "Hours", "Last replaced", "Interval (days)", "Type", "Notes", "Action"].map((c) => (
                      <th key={c} className="whitespace-nowrap px-2 py-2 text-left font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-dark-3">
                  {loadingRows ? (
                    <tr><td colSpan={13} className="px-3 py-6 text-center text-gray-500">Loading consumables…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={13} className="px-3 py-6 text-center text-gray-500">No rows yet. Add one below.</td></tr>
                  ) : rows.map((row, idx) => (
                    <tr key={`${row.id ?? "new"}-${idx}`} className="bg-white dark:bg-gray-dark">
                      <td className="px-2 py-1.5"><input value={row.mode_name} onChange={(e) => updateRow(idx, "mode_name", e.target.value)} className="w-40 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input value={row.sku} onChange={(e) => updateRow(idx, "sku", e.target.value)} className="w-28 rounded border border-stroke px-2 py-1 font-mono dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input value={row.name} onChange={(e) => updateRow(idx, "name", e.target.value)} className="w-56 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input value={row.quantity} onChange={(e) => updateRow(idx, "quantity", e.target.value)} className="w-20 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input value={row.unit} onChange={(e) => updateRow(idx, "unit", e.target.value)} className="w-20 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input value={row.rrp} onChange={(e) => updateRow(idx, "rrp", e.target.value)} className="w-28 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input value={row.lifespan_per_unit} onChange={(e) => updateRow(idx, "lifespan_per_unit", e.target.value)} className="w-32 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input value={row.hours} onChange={(e) => updateRow(idx, "hours", e.target.value)} className="w-20 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input type="date" value={row.last_replaced_at} onChange={(e) => updateRow(idx, "last_replaced_at", e.target.value)} className="w-36 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input value={row.replacement_interval_days} onChange={(e) => updateRow(idx, "replacement_interval_days", e.target.value)} className="w-24 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input value={row.item_type} onChange={(e) => updateRow(idx, "item_type", e.target.value)} className="w-24 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5"><input value={row.notes} onChange={(e) => updateRow(idx, "notes", e.target.value)} className="w-72 rounded border border-stroke px-2 py-1 dark:border-dark-3 dark:bg-dark-2" /></td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removeRow(idx)} className="rounded border border-red-300 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={addRow} className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2">Add row</button>
            <button type="button" disabled={saving || !shopId.trim() || !sn.trim()} onClick={() => void saveRows()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
            <button
              type="button"
              disabled={redetectingBaseline || !shopId.trim()}
              onClick={() => void redetectBaselineForSite()}
              className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
            >
              {redetectingBaseline ? "Re-detecting baseline…" : "Re-detect baseline (all site robots)"}
            </button>
            <button
              type="button"
              disabled={redetectingAllSites}
              onClick={() => void redetectBaselineForAllSites()}
              className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/30"
            >
              {redetectingAllSites ? "Re-detecting all sites…" : "Re-detect baseline (all sites + robots)"}
            </button>
            {error && (
              <div className="max-w-3xl text-xs leading-snug text-red-600 dark:text-red-400">{error}</div>
            )}
            {success && (
              <div className="max-w-3xl text-xs leading-snug text-emerald-700 dark:text-emerald-300">{success}</div>
            )}
          </div>

          {displayBaselineLog.length > 0 && (
            <div className="rounded-xl border border-stroke dark:border-dark-3">
              <div className="border-b border-stroke bg-gray-50 px-3 py-2 dark:border-dark-3 dark:bg-dark-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Baseline re-detect progress log
                </p>
                <p className="mt-0.5 text-[11px] font-normal text-gray-500 dark:text-gray-400">
                  {baselineRunLog.length > 0
                    ? "Results from the latest re-detect in this tab. Expand a site for each serial: ok, no baseline, or error."
                    : showingPreviousCompletedLog
                      ? "A new global run is still running, so this log is showing the previous completed run until fresh details are available."
                      : "Loaded from the last completed global run on the server (same data after a browser timeout if the backend finished). Expand a site for each serial."}
                </p>
                <p className="mt-0.5 text-[11px] font-normal text-gray-500 dark:text-gray-400">
                  Failures on one robot do not stop the rest of the run.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50/70 dark:bg-dark-2/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Site
                      </th>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Shop ID
                      </th>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Updated
                      </th>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Total
                      </th>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Site / list issue
                      </th>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Per-robot
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-dark-3">
                    {displayBaselineLog.map((r, i) => {
                      const rr = r.robot_results ?? [];
                      const okC = rr.filter((x) => x.status === "ok").length;
                      const nbC = rr.filter((x) => x.status === "no_baseline").length;
                      const erC = rr.filter((x) => x.status === "error").length;
                      const siteIssue =
                        r.error != null && r.error !== "" ? (
                          <span className="text-red-600 dark:text-red-400">{r.error}</span>
                        ) : r.warning != null && r.warning !== "" ? (
                          <span className="text-amber-800 dark:text-amber-200">{r.warning}</span>
                        ) : (
                          "—"
                        );
                      return (
                        <Fragment key={`${r.shop_id}-${i}`}>
                          <tr className="bg-white dark:bg-gray-dark">
                            <td className="px-3 py-2">{r.shop_name || "—"}</td>
                            <td className="px-3 py-2 font-mono">{r.shop_id}</td>
                            <td className="px-3 py-2 font-semibold text-emerald-700 dark:text-emerald-300">{r.updated_count}</td>
                            <td className="px-3 py-2">{r.total_count}</td>
                            <td className="max-w-[220px] break-words px-3 py-2">{siteIssue}</td>
                            <td className="px-3 py-2">
                              {rr.length === 0 ? (
                                "—"
                              ) : (
                                <span className="text-gray-600 dark:text-gray-400">
                                  {okC} ok · {nbC} no baseline · {erC} error
                                </span>
                              )}
                            </td>
                          </tr>
                          {rr.length > 0 ? (
                            <tr className="bg-gray-50/90 dark:bg-dark-2/40">
                              <td colSpan={6} className="p-0">
                                <details className="group border-t border-stroke dark:border-dark-3">
                                  <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-indigo-700 marker:hidden hover:bg-indigo-50/60 dark:text-indigo-300 dark:hover:bg-indigo-950/20 [&::-webkit-details-marker]:hidden">
                                    <span className="underline decoration-dotted group-open:no-underline">
                                      Show {rr.length} robot(s) for this site
                                    </span>
                                  </summary>
                                  <div className="overflow-x-auto border-t border-stroke px-2 pb-2 dark:border-dark-3">
                                    <table className="min-w-[720px] w-full text-[11px]">
                                      <thead>
                                        <tr className="text-left text-gray-500 dark:text-gray-400">
                                          <th className="px-2 py-1 font-semibold uppercase tracking-wide">Serial</th>
                                          <th className="px-2 py-1 font-semibold uppercase tracking-wide">Product hint</th>
                                          <th className="px-2 py-1 font-semibold uppercase tracking-wide">Status</th>
                                          <th className="px-2 py-1 font-semibold uppercase tracking-wide">Baseline</th>
                                          <th className="px-2 py-1 font-semibold uppercase tracking-wide">Error</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stroke/80 dark:divide-dark-3">
                                        {rr.map((bot) => (
                                          <tr key={bot.sn} className="bg-white dark:bg-gray-dark">
                                            <td className="px-2 py-1 font-mono">{bot.sn}</td>
                                            <td className="px-2 py-1 font-mono">{bot.product_hint || "—"}</td>
                                            <td className="px-2 py-1">
                                              {bot.status === "ok" ? (
                                                <span className="font-semibold text-emerald-700 dark:text-emerald-300">ok</span>
                                              ) : bot.status === "no_baseline" ? (
                                                <span className="font-semibold text-amber-800 dark:text-amber-200">no baseline</span>
                                              ) : (
                                                <span className="font-semibold text-red-600 dark:text-red-400">error</span>
                                              )}
                                            </td>
                                            <td className="px-2 py-1 font-mono">{bot.baseline_start_date || "—"}</td>
                                            <td className="max-w-[320px] break-words px-2 py-1 text-red-600 dark:text-red-400">
                                              {bot.error || "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </details>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
