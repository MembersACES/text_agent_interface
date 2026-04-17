"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn, getApiBaseUrl } from "@/lib/utils";
import { CleaningRobotDashboard } from "@/components/crm-member/CleaningRobotDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ShopRow = Record<string, unknown>;
type RobotRow = Record<string, unknown>;
type ConsumableStatusRow = {
  id?: number;
  mode_name?: string;
  name?: string;
  hours?: number | null;
  last_replaced_at?: string | null;
  replacement_interval_days?: number | null;
  item_type?: string;
  notes?: string;
};

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
  const canon = String((r as { sn_canonical?: unknown }).sn_canonical ?? "").trim();
  if (canon) return canon;
  return String(
    r.machine_sn ??
      (r as { machineSn?: unknown }).machineSn ??
      r.robot_sn ??
      (r as { robotSn?: unknown }).robotSn ??
      r.device_sn ??
      (r as { deviceSn?: unknown }).deviceSn ??
      r.serial_number ??
      (r as { serialNumber?: unknown }).serialNumber ??
      r.sn ??
      (r as { SN?: unknown }).SN ??
      ""
  ).trim();
}

function robotProductCodeFromRecord(r: RobotRow): string {
  return String(r.product_code ?? r.productCode ?? r.model ?? r.robot_model ?? r.machine_model ?? r.type ?? "").trim();
}

function shopDisplayName(r: ShopRow): string {
  return String(r.shop_name ?? r.name ?? r.shopName ?? "").trim();
}

function parseOptionalNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeConsumableStatus(
  row: ConsumableStatusRow,
  lifetimeRuntimeHours: number | null
): { status: "Due now" | "Due soon" | "OK" | "N/A"; detail: string } {
  let hoursStatus: "Due now" | "Due soon" | "OK" | "N/A" = "N/A";
  let hoursDetail = "No hour target";
  const hLimit = parseOptionalNumber(row.hours);
  if (hLimit != null && hLimit > 0 && lifetimeRuntimeHours != null) {
    const remaining = hLimit - lifetimeRuntimeHours;
    if (remaining <= 0) {
      hoursStatus = "Due now";
      hoursDetail = `Exceeded by ${Math.abs(remaining).toFixed(1)}h`;
    } else if (remaining <= Math.max(25, hLimit * 0.1)) {
      hoursStatus = "Due soon";
      hoursDetail = `${remaining.toFixed(1)}h remaining`;
    } else {
      hoursStatus = "OK";
      hoursDetail = `${remaining.toFixed(1)}h remaining`;
    }
  }

  let dateStatus: "Due now" | "Due soon" | "OK" | "N/A" = "N/A";
  let dateDetail = "No interval target";
  const intervalDays = parseOptionalNumber(row.replacement_interval_days);
  if (intervalDays != null && intervalDays > 0) {
    if (!row.last_replaced_at) {
      dateStatus = "Due soon";
      dateDetail = "Last replaced missing";
    } else {
      const d = new Date(row.last_replaced_at);
      if (!Number.isNaN(d.getTime())) {
        const due = new Date(d);
        due.setDate(due.getDate() + Math.round(intervalDays));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDay = new Date(due);
        dueDay.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
        if (diffDays < 0) {
          dateStatus = "Due now";
          dateDetail = `${Math.abs(diffDays)}d overdue`;
        } else if (diffDays <= Math.max(7, Math.round(intervalDays / 10))) {
          dateStatus = "Due soon";
          dateDetail = `${diffDays}d remaining`;
        } else {
          dateStatus = "OK";
          dateDetail = `${diffDays}d remaining`;
        }
      }
    }
  }

  const rank = (s: "Due now" | "Due soon" | "OK" | "N/A") =>
    s === "Due now" ? 4 : s === "Due soon" ? 3 : s === "OK" ? 2 : 1;
  const status = rank(hoursStatus) >= rank(dateStatus) ? hoursStatus : dateStatus;
  return { status, detail: `${hoursDetail}; ${dateDetail}` };
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
  const [hasManualRobotSelection, setHasManualRobotSelection] = useState(false);
  const [siteQuery, setSiteQuery] = useState("");
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [consumablesLoading, setConsumablesLoading] = useState(false);
  const [consumablesError, setConsumablesError] = useState<string | null>(null);
  const [consumablesRows, setConsumablesRows] = useState<ConsumableStatusRow[]>([]);
  const [consumablesBaselineDate, setConsumablesBaselineDate] = useState<string>("");
  const [consumablesLifetimeRuntimeH, setConsumablesLifetimeRuntimeH] = useState<number | null>(null);

  const effectiveSn = useMemo(() => robotSelect.trim(), [robotSelect]);
  const selectedShopName = useMemo(() => {
    const selected = shops.find((s) => shopIdFromRecord(s) === shopFilter.trim());
    if (!selected) return "";
    return String(selected.shop_name ?? selected.name ?? selected.shopName ?? "").trim();
  }, [shops, shopFilter]);
  const selectedRobotProductCode = useMemo(() => {
    if (!effectiveSn) return "";
    const robot = robots.find((r) => robotSnFromRecord(r) === effectiveSn);
    return robot ? robotProductCodeFromRecord(robot) : "";
  }, [robots, effectiveSn]);

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

  useEffect(() => {
    if (!shopFilter.trim() || robotsLoading || robotSelect.trim()) return;
    const firstSn = robots.map((r) => robotSnFromRecord(r)).find((sn) => sn.length > 0);
    if (!firstSn) return;
    setRobotSelect(firstSn);
    setHasManualRobotSelection(false);
  }, [shopFilter, robots, robotsLoading, robotSelect]);

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

  const loadConsumablesStatus = useCallback(async () => {
    if (!token || !shopFilter.trim() || !effectiveSn) {
      setConsumablesRows([]);
      setConsumablesError(null);
      setConsumablesBaselineDate("");
      setConsumablesLifetimeRuntimeH(null);
      return;
    }
    setConsumablesLoading(true);
    setConsumablesError(null);
    try {
      const params = new URLSearchParams({
        shop_id: shopFilter.trim(),
        sn: effectiveSn,
      });
      if (selectedRobotProductCode.trim()) params.set("product_code", selectedRobotProductCode.trim());
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/consumables?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail ?? res.statusText);
      const items = Array.isArray((body as { items?: unknown[] }).items)
        ? ((body as { items: ConsumableStatusRow[] }).items)
        : [];
      setConsumablesRows(items);
      setConsumablesBaselineDate(String((body as { baseline_start_date?: string }).baseline_start_date ?? ""));
      setConsumablesLifetimeRuntimeH(parseOptionalNumber((body as { lifetime_runtime_h?: unknown }).lifetime_runtime_h));
    } catch (e) {
      setConsumablesRows([]);
      setConsumablesError(e instanceof Error ? e.message : String(e));
    } finally {
      setConsumablesLoading(false);
    }
  }, [token, shopFilter, effectiveSn, selectedRobotProductCode]);

  useEffect(() => {
    void loadConsumablesStatus();
  }, [loadConsumablesStatus]);

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

  const robotTabs = useMemo(
    () =>
      robots
        .map((r, i) => ({
          sn: robotSnFromRecord(r),
          product: robotProductCodeFromRecord(r) || "Robot",
          idx: i,
        }))
        .filter((r) => r.sn.length > 0),
    [robots]
  );

  const consumablesStatusRows = useMemo(() => {
    const ranked = consumablesRows.map((r) => {
      const computed = computeConsumableStatus(r, consumablesLifetimeRuntimeH);
      const score =
        computed.status === "Due now" ? 4 : computed.status === "Due soon" ? 3 : computed.status === "OK" ? 2 : 1;
      return {
        row: r,
        status: computed.status,
        detail: computed.detail,
        score,
      };
    });
    ranked.sort((a, b) => b.score - a.score || String(a.row.name || "").localeCompare(String(b.row.name || "")));
    return ranked;
  }, [consumablesRows, consumablesLifetimeRuntimeH]);

  const selectSite = useCallback((shopId: string) => {
    setShopFilter(shopId);
    setRobotSelect("");
    setHasManualRobotSelection(false);
  }, []);

  const selectRobotSerial = useCallback((sn: string) => {
    const t = sn.trim();
    if (!t) return;
    setRobotSelect(t);
    setHasManualRobotSelection(true);
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
                Choose a site to load site analytics, then pick a robot tab under period summary to drill into that
                serial&apos;s runs.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
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
              <Link
                href="/robot-dashboard/consumables"
                className="shrink-0 rounded-xl border border-indigo-300/40 bg-indigo-500/25 px-4 py-2.5 text-sm font-semibold text-indigo-50 backdrop-blur-sm transition hover:bg-indigo-500/35"
              >
                Consumables tracking
              </Link>
            </div>
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
              {shopFilter.trim() ? (
                hasManualRobotSelection && effectiveSn ? (
                  <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-mono font-medium text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100">
                    Robot: {effectiveSn}
                  </span>
                ) : (
                  <span className="rounded-lg bg-slate-200 px-2.5 py-1 font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                    Robot scope: All robots (site default)
                  </span>
                )
              ) : (
                <span className="text-gray-500 dark:text-gray-400">No robot selected</span>
              )}
            </div>
          )}

          <div className="space-y-4">
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

            {/* Trial PDF — only after a site is selected */}
            {shopFilter.trim() ? (
              <Card variant="elevated" className="mt-4 border-stroke/80 dark:border-dark-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Trial summary report</CardTitle>
                    <CardDescription>
                      Site-wide PDF for every robot returned for this shop (same roster as robot tabs). The reporting
                      window starts on the date below at midnight <span className="font-semibold">Australia/Melbourne</span>{" "}
                      and runs through the end of yesterday. Cumulative and weekly charts use Pudu analytics; the PDF
                      also lists <span className="font-semibold">every task name</span> seen in execution logs for the
                      most recent seven days, per robot (same <span className="font-mono">clean_task/query_list</span>{" "}
                      source as the dashboard).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-[11rem]">
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Report start date
                        </label>
                        <input
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          disabled={reportLoading}
                          className="w-full rounded-xl border border-stroke bg-gray-2/50 px-3 py-2.5 text-sm text-dark shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white disabled:opacity-50"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={reportLoading || !shopFilter.trim()}
                        onClick={() => void generateTrialSummaryReport()}
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 hover:shadow-indigo-500/30 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {reportLoading ? "Generating…" : "Generate report"}
                      </button>
                    </div>
                    {reportError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{reportError}</p>}
                    {reportSuccess && (
                      <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{reportSuccess}</p>
                    )}
                  </CardContent>
                </Card>
            ) : null}
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
        hubRobotTabs={
          shopFilter.trim() && robotTabs.length > 0
            ? {
                tabs: robotTabs.map((r) => ({ sn: r.sn, product: r.product })),
                activeSn: effectiveSn,
                hasManualSelection: hasManualRobotSelection,
                onSelect: (sn) => selectRobotSerial(sn),
              }
            : undefined
        }
        hideShopIdField={Boolean(shopFilter.trim())}
      />

      {shopFilter.trim() && effectiveSn ? (
        <Card variant="elevated">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Consumables status</CardTitle>
                <CardDescription>
                  Baseline {consumablesBaselineDate || "—"}; lifetime runtime{" "}
                  {consumablesLifetimeRuntimeH != null ? `${consumablesLifetimeRuntimeH.toFixed(2)} h` : "—"}.
                </CardDescription>
              </div>
              <Link
                href="/robot-dashboard/consumables"
                className="rounded-lg border border-indigo-300 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
              >
                Manage consumables
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {consumablesLoading ? (
              <p className="text-sm text-gray-500">Loading consumables status…</p>
            ) : consumablesError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{consumablesError}</p>
            ) : consumablesStatusRows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No consumables configured for this robot yet.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stroke dark:border-dark-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-dark-2">
                      <tr>
                        {["Item", "Mode", "Type", "Hours", "Last replaced", "Interval (days)", "Status", "Detail"].map((c) => (
                          <th key={c} className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke dark:divide-dark-3">
                      {consumablesStatusRows.slice(0, 20).map(({ row, status, detail }, i) => (
                        <tr key={`${row.id ?? row.name ?? "row"}-${i}`} className="bg-white dark:bg-gray-dark">
                          <td className="px-3 py-2 font-medium">{row.name || "—"}</td>
                          <td className="px-3 py-2">{row.mode_name || "—"}</td>
                          <td className="px-3 py-2">{row.item_type || "—"}</td>
                          <td className="px-3 py-2">{row.hours ?? "—"}</td>
                          <td className="px-3 py-2">{row.last_replaced_at || "—"}</td>
                          <td className="px-3 py-2">{row.replacement_interval_days ?? "—"}</td>
                          <td className="px-3 py-2">
                            <span
                              className={
                                status === "Due now"
                                  ? "rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                  : status === "Due soon"
                                    ? "rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                    : status === "OK"
                                      ? "rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                      : "rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
