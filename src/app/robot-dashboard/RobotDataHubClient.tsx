"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
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
  const [manualSn, setManualSn] = useState("");

  const effectiveSn = useMemo(
    () => (manualSn.trim() || robotSelect.trim()).trim(),
    [manualSn, robotSelect]
  );

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
    setRobotsLoading(true);
    setRobotsError(null);
    setRobotsWarning(null);
    try {
      const params = new URLSearchParams();
      if (shopFilter.trim()) params.set("shop_id", shopFilter.trim());
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

  if (status === "loading") {
    return <p className="text-sm text-gray-600 dark:text-gray-400">Loading session…</p>;
  }
  if (!token) {
    return <p className="text-sm text-red-600 dark:text-red-400">Sign in to use the Robot Dashboard.</p>;
  }

  return (
    <div className="space-y-8">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Directory</CardTitle>
          <CardDescription>
            Sites and robots from the Pudu open platform for your tenant. Pick a site to narrow robots, then a serial
            (or type one manually).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Site</label>
              <select
                value={shopFilter}
                onChange={(e) => {
                  setShopFilter(e.target.value);
                  setRobotSelect("");
                }}
                disabled={shopsLoading}
                className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark shadow-sm dark:border-dark-3 dark:bg-gray-dark dark:text-white"
              >
                <option value="">All sites (tenant-wide robots)</option>
                {shops.map((s, i) => {
                  const id = shopIdFromRecord(s);
                  if (!id) return null;
                  return (
                    <option key={`${id}-${i}`} value={id}>
                      {shopLabelFromRecord(s)}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="min-w-[16rem] flex-[2]">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Robot</label>
              <select
                value={robotSelect}
                onChange={(e) => setRobotSelect(e.target.value)}
                disabled={robotsLoading}
                className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark shadow-sm dark:border-dark-3 dark:bg-gray-dark dark:text-white"
              >
                <option value="">Select from list…</option>
                {robots
                  .map((r, i) => {
                    const sn = robotSnFromRecord(r);
                    if (!sn) return null;
                    return (
                      <option key={`${sn}-${i}`} value={sn}>
                        {robotLabelFromRecord(r)}
                      </option>
                    );
                  })
                  .filter(Boolean)}
              </select>
            </div>
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Or enter serial
              </label>
              <input
                type="text"
                value={manualSn}
                onChange={(e) => setManualSn(e.target.value)}
                placeholder="Robot SN"
                className="w-full rounded-lg border border-stroke bg-white px-3 py-2 font-mono text-sm text-dark shadow-sm dark:border-dark-3 dark:bg-gray-dark dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                void loadShops();
                void loadRobots();
              }}
              className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark shadow-sm hover:bg-gray-2 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-2"
            >
              Refresh directory
            </button>
          </div>
          {shopsLoading && <p className="text-xs text-gray-500">Loading sites…</p>}
          {shopsError && <p className="text-sm text-red-600 dark:text-red-400">{shopsError}</p>}
          {shopsWarning && (
            <p className="text-xs text-amber-800 dark:text-amber-200">Sites list note: {shopsWarning}</p>
          )}
          {robotsLoading && <p className="text-xs text-gray-500">Loading robots…</p>}
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
