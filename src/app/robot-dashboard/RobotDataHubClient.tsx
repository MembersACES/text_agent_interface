"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { cn, getApiBaseUrl } from "@/lib/utils";
import { CleaningRobotDashboard } from "@/components/crm-member/CleaningRobotDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ShopRow = Record<string, unknown>;
type RobotRow = Record<string, unknown>;

function shopIdFromRecord(r: ShopRow): string {
  return String(r.shop_id ?? r.id ?? r.shopId ?? "").trim();
}

function shopLabelFromRecord(r: ShopRow): string {
  const id = shopIdFromRecord(r);
  const name = String(r.shop_name ?? r.name ?? r.shopName ?? "").trim();
  if (!id) return name || "Unknown shop";
  return name ? `${name} (${id})` : id;
}

function robotSnFromRecord(r: RobotRow): string {
  return String(r.sn ?? r.serial_number ?? r.robot_sn ?? r.machine_sn ?? r.device_sn ?? "").trim();
}

function robotLabelFromRecord(r: RobotRow): string {
  const sn = robotSnFromRecord(r);
  const name = String(r.name ?? r.robot_name ?? r.machine_name ?? "").trim();
  if (!sn) return name || "Unknown robot";
  return name ? `${name} — ${sn}` : sn;
}

function robotProductCodeFromRecord(r: RobotRow): string {
  return String(r.product_code ?? r.productCode ?? r.model ?? r.robot_model ?? r.machine_model ?? r.type ?? "").trim();
}

function robotShopNameFromRecord(r: RobotRow): string {
  return String(r.shop_name ?? r.shopName ?? "").trim();
}

function shopDisplayName(r: ShopRow): string {
  return String(r.shop_name ?? r.name ?? r.shopName ?? "").trim();
}

export default function RobotDataHubClient() {
  const { data: session, status } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { accessToken?: string } | null)?.accessToken;

  const [shops, setShops] = useState<ShopRow[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopsError, setShopsError] = useState<string | null>(null);
  const [shopsWarning, setShopsWarning] = useState<string | null>(null);

  const [shopFilter, setShopFilter] = useState("");
  const [robots, setRobots] = useState<RobotRow[]>([]);
  const [robotsLoading, setRobotsLoading] = useState(false);
  const [robotsError, setRobotsError] = useState<string | null>(null);
  const [robotsWarning, setRobotsWarning] = useState<string | null>(null);

  const [robotSelect, setRobotSelect] = useState("");
  const [siteQuery, setSiteQuery] = useState("");
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [expandedRobotSn, setExpandedRobotSn] = useState<string | null>(null);

  const effectiveSn = useMemo(() => robotSelect.trim(), [robotSelect]);
  const selectedShopName = useMemo(() => {
    const selected = shops.find((s) => shopIdFromRecord(s) === shopFilter.trim());
    if (!selected) return "";
    return String(selected.shop_name ?? selected.name ?? selected.shopName ?? "").trim();
  }, [shops, shopFilter]);

  const [taskData, setTaskData] = useState<unknown>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskOffset, setTaskOffset] = useState(0);
  const taskLimit = 50;

  const loadShops = useCallback(async () => {
    if (!token) return;
    setShopsLoading(true);
    setShopsError(null);
    setShopsWarning(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/shops`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { detail?: string }).detail ?? res.statusText);
      }
      const j = (await res.json()) as { shops?: ShopRow[]; warning?: string | null };
      setShops(Array.isArray(j.shops) ? j.shops : []);
      setShopsWarning(j.warning ?? null);
    } catch (e) {
      setShops([]);
      setShopsError(e instanceof Error ? e.message : String(e));
    } finally {
      setShopsLoading(false);
    }
  }, [token]);

  const loadRobots = useCallback(async () => {
    if (!token) return;
    if (!shopFilter.trim()) {
      setRobots([]);
      setRobotsLoading(false);
      setRobotsError(null);
      setRobotsWarning(null);
      return;
    }
    setRobotsLoading(true);
    setRobotsError(null);
    setRobotsWarning(null);
    try {
      const params = new URLSearchParams();
      params.set("shop_id", shopFilter.trim());
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/robots?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { detail?: string }).detail ?? res.statusText);
      }
      const j = (await res.json()) as { robots?: RobotRow[]; warning?: string | null };
      setRobots(Array.isArray(j.robots) ? j.robots : []);
      setRobotsWarning(j.warning ?? null);
    } catch (e) {
      setRobots([]);
      setRobotsError(e instanceof Error ? e.message : String(e));
    } finally {
      setRobotsLoading(false);
    }
  }, [token, shopFilter]);

  useEffect(() => {
    if (status !== "authenticated" || !token) return;
    void loadShops();
  }, [status, token, loadShops]);

  useEffect(() => {
    if (status !== "authenticated" || !token) return;
    void loadRobots();
  }, [status, token, shopFilter, loadRobots]);

  const loadTaskDefinitions = useCallback(
    async (offset: number) => {
      if (!token || !shopFilter.trim() || !effectiveSn) return;
      setTaskLoading(true);
      setTaskError(null);
      try {
        const params = new URLSearchParams({
          shop_id: shopFilter.trim(),
          sn: effectiveSn,
          limit: String(taskLimit),
          offset: String(offset),
        });
        const res = await fetch(`${getApiBaseUrl()}/api/pudu/task-definitions?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { detail?: string }).detail ?? res.statusText);
        }
        const j = (await res.json()) as { data?: unknown };
        setTaskData(j.data ?? null);
        setTaskOffset(offset);
      } catch (e) {
        setTaskData(null);
        setTaskError(e instanceof Error ? e.message : String(e));
      } finally {
        setTaskLoading(false);
      }
    },
    [token, shopFilter, effectiveSn, taskLimit]
  );

  const generateTrialSummaryReport = useCallback(async () => {
    if (!token || !shopFilter.trim()) return;
    setReportLoading(true);
    setReportError(null);
    setReportSuccess(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/trial-summary-report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_id: shopFilter.trim(),
          shop_name: selectedShopName || undefined,
          start_date: reportStartDate || undefined,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const detail =
          (j as { detail?: string }).detail ??
          (j as { message?: string }).message ??
          `HTTP ${res.status}`;
        throw new Error(detail);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") ?? "";
      const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
      const fallback = `trial-summary-${shopFilter.trim()}.pdf`;
      const filename = match?.[1] ?? fallback;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setReportSuccess("Report downloaded.");
    } catch (e) {
      setReportError(e instanceof Error ? e.message : String(e));
    } finally {
      setReportLoading(false);
    }
  }, [token, shopFilter, selectedShopName, reportStartDate]);

  useEffect(() => {
    if (!shopFilter.trim() || !effectiveSn) {
      setTaskData(null);
      setTaskError(null);
      return;
    }
    void loadTaskDefinitions(0);
  }, [shopFilter, effectiveSn, loadTaskDefinitions]);

  const taskRows = useMemo(() => {
    if (!taskData || typeof taskData !== "object") return [];
    const d = taskData as Record<string, unknown>;
    const list = d.list ?? d.data ?? d.rows;
    if (!Array.isArray(list)) return [];
    return list.filter((x): x is Record<string, unknown> => x != null && typeof x === "object");
  }, [taskData]);

  const taskColumns = useMemo(() => {
    const first = taskRows[0];
    if (!first) return [] as string[];
    return Object.keys(first).slice(0, 10);
  }, [taskRows]);

  const filteredShops = useMemo(() => {
    const q = siteQuery.trim().toLowerCase();
    return shops.filter((s) => {
      const id = shopIdFromRecord(s);
      if (!id) return false;
      if (!q) return true;
      const name = shopDisplayName(s).toLowerCase();
      return id.toLowerCase().includes(q) || name.includes(q);
    });
  }, [shops, siteQuery]);

  const sortedFilteredShops = useMemo(() => {
    return [...filteredShops].sort((a, b) =>
      shopLabelFromRecord(a).localeCompare(shopLabelFromRecord(b), undefined, { sensitivity: "base" })
    );
  }, [filteredShops]);

  const selectSite = useCallback((shopId: string) => {
    setShopFilter(shopId);
    setRobotSelect("");
    setExpandedRobotSn(null);
  }, []);

  const selectRobotSerial = useCallback((sn: string) => {
    const t = sn.trim();
    if (!t) return;
    setRobotSelect(t);
    setExpandedRobotSn(t);
  }, []);

  if (status === "loading") {
    return <p className="text-sm text-gray-600 dark:text-gray-400">Loading session…</p>;
  }
  if (!token) {
    return <p className="text-sm text-red-600 dark:text-red-400">Sign in to use the Robot Dashboard.</p>;
  }

  return (
    <div className="space-y-8">
      <Card variant="elevated" className="overflow-hidden border-stroke/80 p-0 dark:border-dark-3">
        <div className="relative border-b border-stroke/60 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1e1b4b] px-5 py-6 text-white dark:border-white/10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 50% at 20% -20%, rgba(99,102,241,0.45), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(34,211,238,0.2), transparent)",
            }}
          />
          <div className="relative flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col items-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-200/90">Pudu directory</p>
              <CardTitle className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Sites & robots</CardTitle>
              <CardDescription className="mt-2 max-w-xl text-sm text-slate-300">
                Choose a site from the table, then pick a robot (or enter a serial). Robots load only after a site is
                selected.
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadShops();
                void loadRobots();
              }}
              className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              Refresh directory
            </button>
          </div>
        </div>
        <CardContent className="space-y-4 p-4 sm:p-5">
          {(effectiveSn || shopFilter) && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stroke/70 bg-gray-2/40 px-4 py-3 text-xs dark:border-dark-3 dark:bg-dark-2/40">
              <span className="font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Selection</span>
              {shopFilter.trim() ? (
                <span className="rounded-lg bg-indigo-100 px-2.5 py-1 font-medium text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100">
                  Site: {selectedShopName || shopFilter}
                  <span className="ml-1 font-mono text-[10px] opacity-80">({shopFilter})</span>
                </span>
              ) : (
                <span className="rounded-lg bg-slate-200 px-2.5 py-1 font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                  No site selected
                </span>
              )}
              {effectiveSn ? (
                <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-mono font-medium text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100">
                  Robot: {effectiveSn}
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">No robot selected</span>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Sites */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-dark dark:text-white">Sites</h3>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {sortedFilteredShops.length} shown
                  {siteQuery.trim() ? ` · filtered from ${shops.length}` : ` · ${shops.length} total`}
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-stroke shadow-sm dark:border-dark-3">
                <div className="border-b border-stroke bg-gray-50/90 px-3 py-2 dark:border-dark-3 dark:bg-dark-2/80">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Search sites
                  </label>
                  <input
                    type="search"
                    value={siteQuery}
                    onChange={(e) => setSiteQuery(e.target.value)}
                    placeholder="Filter by name or shop ID…"
                    disabled={shopsLoading}
                    className="w-full rounded-lg border border-stroke bg-white px-2.5 py-1.5 text-xs text-dark shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                  />
                </div>
                <div className="max-h-[min(22rem,55vh)] overflow-auto">
                  <table className="min-w-full text-left text-[12px]">
                    <thead className="sticky top-0 z-[1] border-b border-stroke bg-gray-50/95 backdrop-blur-sm dark:border-dark-3 dark:bg-dark-2/95">
                      <tr>
                        <th className="px-3 py-2 font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Site
                        </th>
                        <th className="px-3 py-2 font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Shop ID
                        </th>
                        <th className="w-20 px-3 py-2 text-right font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke bg-white dark:divide-dark-3 dark:bg-gray-dark">
                      {shopsLoading ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                            Loading sites…
                          </td>
                        </tr>
                      ) : sortedFilteredShops.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                            {shops.length === 0 ? "No sites returned for this tenant." : "No sites match your search."}
                          </td>
                        </tr>
                      ) : (
                        sortedFilteredShops.map((s, i) => {
                          const id = shopIdFromRecord(s);
                          const name = shopDisplayName(s) || "—";
                          const selected = shopFilter === id;
                          return (
                            <tr
                              key={`${id}-${i}`}
                              className={cn(
                                "cursor-pointer transition-colors hover:bg-indigo-50/80 dark:hover:bg-indigo-950/25",
                                selected && "bg-indigo-50/90 dark:bg-indigo-950/35"
                              )}
                              onClick={() => selectSite(id)}
                            >
                              <td className="max-w-[10rem] px-3 py-1.5 align-top font-medium text-dark dark:text-white">
                                <span className="line-clamp-2" title={name}>
                                  {name}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 align-top font-mono text-[10px] text-gray-600 dark:text-gray-300">
                                {id}
                              </td>
                              <td className="px-3 py-1.5 text-right align-top">
                                {selected ? (
                                  <span className="text-[10px] font-bold uppercase text-primary">Selected</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectSite(id);
                                    }}
                                    className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
                                  >
                                    Select
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Robots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-dark dark:text-white">Robots</h3>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {!shopFilter.trim() ? "Select a site" : robotsLoading ? "Loading…" : `${robots.length} listed`}
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-stroke shadow-sm dark:border-dark-3">
                <div className="max-h-[min(22rem,55vh)] overflow-auto">
                  <table className="min-w-full text-left text-[11px]">
                    <thead className="sticky top-0 z-[1] border-b border-stroke bg-gray-50/95 backdrop-blur-sm dark:border-dark-3 dark:bg-dark-2/95">
                      <tr>
                        <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Product Code
                        </th>
                        <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Serial
                        </th>
                        <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Shop
                        </th>
                        <th className="w-20 px-3 py-2.5 text-right font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Use
                        </th>
                        <th className="w-24 px-3 py-2.5 text-right font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Payload
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke bg-white dark:divide-dark-3 dark:bg-gray-dark">
                      {!shopFilter.trim() ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                            Select a site to load robots.
                          </td>
                        </tr>
                      ) : robotsLoading ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                            Loading robots…
                          </td>
                        </tr>
                      ) : robots.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                            No robots returned for this site.
                          </td>
                        </tr>
                      ) : (
                        robots.flatMap((r, i) => {
                          const sn = robotSnFromRecord(r);
                          if (!sn) return [];
                          const isActiveRow = effectiveSn === sn;
                          const productCodeText = robotProductCodeFromRecord(r) || "—";
                          const shopText = robotShopNameFromRecord(r) || selectedShopName || "—";
                          const isExpanded = expandedRobotSn === sn;
                          const preferredFields = [
                            "product_code",
                            "productCode",
                            "sn",
                            "serial_number",
                            "robot_sn",
                            "machine_sn",
                            "device_sn",
                            "mac",
                            "name",
                            "robot_name",
                            "machine_name",
                            "shop_id",
                            "shop_name",
                            "model",
                            "status",
                            "robot_status",
                            "online_status",
                            "type",
                          ];
                          return [
                            <tr
                              key={`${sn}-${i}`}
                              className={cn(
                                "cursor-pointer transition-colors hover:bg-emerald-50/70 dark:hover:bg-emerald-950/20",
                                isActiveRow && "bg-emerald-50/90 dark:bg-emerald-950/30"
                              )}
                              onClick={() => selectRobotSerial(sn)}
                            >
                              <td className="max-w-[10rem] px-3 py-2.5 text-dark dark:text-gray-100">
                                <span
                                  className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  title={productCodeText}
                                >
                                  {productCodeText}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-gray-700 dark:text-gray-200">{sn}</td>
                              <td className="max-w-[12rem] px-3 py-2.5 text-gray-700 dark:text-gray-200">
                                <span className="line-clamp-2" title={shopText}>
                                  {shopText}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectRobotSerial(sn);
                                  }}
                                  className={cn(
                                    "rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition",
                                    isActiveRow
                                      ? "border border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100"
                                      : "border border-stroke bg-white text-primary hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
                                  )}
                                >
                                  {isActiveRow ? "Active" : "Use"}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedRobotSn((prev) => (prev === sn ? null : sn));
                                  }}
                                  className={cn(
                                    "rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition",
                                    isExpanded
                                      ? "border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-100"
                                      : "border-stroke bg-white text-primary hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
                                  )}
                                >
                                  {isExpanded ? "Hide" : "View"}
                                </button>
                              </td>
                            </tr>,
                            isExpanded ? (
                              <tr key={`${sn}-${i}-payload`} className="bg-gray-50/60 dark:bg-dark-2/40">
                                <td colSpan={5} className="px-3 py-2">
                                  <div className="grid gap-3 lg:grid-cols-[minmax(220px,320px),1fr]">
                                    <div className="overflow-hidden rounded-xl border border-stroke/80 dark:border-dark-3">
                                      <table className="min-w-full text-left text-[11px]">
                                        <thead className="bg-gray-100/90 dark:bg-dark-2/70">
                                          <tr>
                                            <th className="px-3 py-1.5 font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                                              Field
                                            </th>
                                            <th className="px-3 py-1.5 font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                                              Value
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stroke/70 bg-white dark:divide-dark-3 dark:bg-gray-dark">
                                          {preferredFields.map((key) => {
                                            const value = r[key];
                                            if (value == null || String(value).trim() === "") return null;
                                            return (
                                              <tr key={key}>
                                                <td className="px-3 py-1.5 font-mono text-[10px] text-gray-600 dark:text-gray-300">
                                                  {key}
                                                </td>
                                                <td className="px-3 py-1.5 text-gray-800 dark:text-gray-100">
                                                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                    <details
                                      className="rounded-xl border border-stroke/80 bg-white/80 dark:border-dark-3 dark:bg-dark-2/60"
                                      open
                                    >
                                      <summary className="cursor-pointer px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                                        Full raw JSON
                                      </summary>
                                      <pre className="max-h-64 overflow-auto border-t border-stroke/70 px-3 py-2 font-mono text-[10px] text-gray-800 dark:border-dark-3 dark:text-gray-100">
                                        {JSON.stringify(r, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                </td>
                              </tr>
                            ) : null,
                          ];
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                Click any robot row (or press <span className="font-semibold">Use</span>) to load that serial in the
                dashboard below. Use <span className="font-semibold">View</span> to inspect payload fields inline.
              </p>
            </div>
          </div>

          {shopsError && <p className="text-sm text-red-600 dark:text-red-400">{shopsError}</p>}
          {shopsWarning && (
            <p className="text-xs text-amber-800 dark:text-amber-200">Sites list note: {shopsWarning}</p>
          )}
          {robotsError && <p className="text-sm text-red-600 dark:text-red-400">{robotsError}</p>}
          {robotsWarning && (
            <p className="text-xs text-amber-800 dark:text-amber-200">Robots list note: {robotsWarning}</p>
          )}
        </CardContent>
      </Card>

      <CleaningRobotDashboard
        robotSerial={effectiveSn}
        initialShopId={shopFilter.trim() || null}
        idToken={token}
        variant="hub"
        hideShopIdField={Boolean(shopFilter.trim())}
        hubTrialReport={
          shopFilter.trim()
            ? {
                shopId: shopFilter.trim(),
                shopName: selectedShopName,
                startDate: reportStartDate,
                onStartDateChange: setReportStartDate,
                onGenerate: () => void generateTrialSummaryReport(),
                loading: reportLoading,
                error: reportError,
                success: reportSuccess,
              }
            : undefined
        }
      />

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Task catalog (definitions)</CardTitle>
          <CardDescription>
            Scheduled / named jobs from{" "}
            <code className="rounded bg-gray-2 px-1 font-mono text-xs dark:bg-dark-2">cleanbot … /task/list</code> —
            not the execution log. Requires a site and serial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!shopFilter.trim() ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Select a site to load the task catalog.</p>
          ) : !effectiveSn ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Select or enter a robot serial first.</p>
          ) : taskLoading && !taskData ? (
            <p className="text-sm text-gray-500">Loading task definitions…</p>
          ) : taskError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{taskError}</p>
          ) : taskRows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No task definition rows returned.</p>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-stroke dark:border-dark-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100 dark:bg-dark-2">
                      <tr>
                        {taskColumns.map((c) => (
                          <th
                            key={c}
                            className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300"
                          >
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke dark:divide-dark-3">
                      {taskRows.map((row, ri) => (
                        <tr key={ri} className="bg-white dark:bg-gray-dark">
                          {taskColumns.map((c) => (
                            <td key={c} className="max-w-[12rem] truncate px-3 py-2 font-mono text-[11px]">
                              {row[c] != null && typeof row[c] === "object"
                                ? JSON.stringify(row[c])
                                : String(row[c] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <button
                type="button"
                disabled={taskLoading}
                onClick={() => void loadTaskDefinitions(taskOffset + taskLimit)}
                className="mt-3 rounded-lg border border-stroke px-3 py-2 text-sm font-medium text-primary hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-dark-2 disabled:opacity-50"
              >
                {taskLoading ? "Loading…" : "Next page (definitions)"}
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
