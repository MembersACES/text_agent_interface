"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type BaselineRunSiteResult = {
  shop_id: string;
  shop_name?: string;
  updated_count: number;
  total_count: number;
  error?: string;
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

  const loadBaselineRefreshStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/consumables/baseline-refresh-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const latestGlobal = (body as { latest_global?: BaselineRunMeta | null }).latest_global ?? null;
      setLastGlobalRun(latestGlobal);
    } catch {
      // Silent: status card is supplementary.
    }
  }, [token]);

  useEffect(() => {
    if (status !== "authenticated" || !token) return;
    void loadShops();
    void loadBaselineRefreshStatus();
  }, [status, token, loadShops, loadBaselineRefreshStatus]);

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
      setBaselineRunLog([
        {
          shop_id: shopId.trim(),
          shop_name: selectedShopName || undefined,
          updated_count: updated,
          total_count: total,
        },
      ]);
      setSuccess(`Baseline re-detected for ${updated}/${total} robot(s) in this site.`);
      await loadConsumables();
      await loadBaselineRefreshStatus();
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
      setSuccess(`Global baseline re-detect completed: ${updated}/${total} robot(s) across ${sites} site(s).`);
      await loadConsumables();
      await loadBaselineRefreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
              <p className="mt-1">
                Status: <span className="font-semibold">{lastGlobalRun.status}</span> · Updated{" "}
                <span className="font-semibold">{lastGlobalRun.updated_count}</span> of{" "}
                <span className="font-semibold">{lastGlobalRun.total_count}</span> robots across{" "}
                <span className="font-semibold">{lastGlobalRun.site_count}</span> site(s)
              </p>
              <p className="mt-0.5">
                Started {formatDateTimeLabel(lastGlobalRun.started_at)} · Finished{" "}
                {formatDateTimeLabel(lastGlobalRun.finished_at)}
              </p>
            </div>
          )}

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
            {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
            {success && <span className="text-xs text-emerald-700 dark:text-emerald-300">{success}</span>}
          </div>

          {baselineRunLog.length > 0 && (
            <div className="rounded-xl border border-stroke dark:border-dark-3">
              <div className="border-b border-stroke bg-gray-50 px-3 py-2 dark:border-dark-3 dark:bg-dark-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Baseline re-detect progress log
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
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-dark-3">
                    {baselineRunLog.map((r, i) => (
                      <tr key={`${r.shop_id}-${i}`} className="bg-white dark:bg-gray-dark">
                        <td className="px-3 py-2">{r.shop_name || "—"}</td>
                        <td className="px-3 py-2 font-mono">{r.shop_id}</td>
                        <td className="px-3 py-2 font-semibold text-emerald-700 dark:text-emerald-300">{r.updated_count}</td>
                        <td className="px-3 py-2">{r.total_count}</td>
                        <td className="px-3 py-2 text-red-600 dark:text-red-400">{r.error || "—"}</td>
                      </tr>
                    ))}
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
