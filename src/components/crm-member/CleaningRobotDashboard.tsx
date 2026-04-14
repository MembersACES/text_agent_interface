"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getApiBaseUrl } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type HubTrialReportControls = {
  shopId: string;
  shopName: string;
  startDate: string;
  onStartDateChange: (date: string) => void;
  onGenerate: () => void;
  loading: boolean;
  error: string | null;
  success: string | null;
};

export type CleaningRobotDashboardProps = {
  robotSerial: string;
  initialShopId?: string | null;
  idToken: string | null | undefined;
  businessName?: string;
  hideShopIdField?: boolean;
  variant?: "utility" | "hub";
  /** Robot hub only: site-level PDF report; rendered below Period summary once data is loaded and the section is scrolled into view. */
  hubTrialReport?: HubTrialReportControls | null;
};

type DashboardPayload = {
  sn: string;
  shop_id: string | null;
  timezone_offset: number;
  start_time: number;
  end_time: number;
  degraded: { mode?: boolean; paging?: boolean; executions?: boolean };
  errors: Array<{ layer: string; detail: string }>;
  mode: unknown;
  paging: unknown;
  paging_list: unknown[];
  executions: { list: unknown[]; offset: number; used_lim: number };
  execution_next_offset: number;
  execution_has_more: boolean;
  cached?: boolean;
};

function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToUnix(s: string): number {
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? Math.floor(Date.now() / 1000) : Math.floor(t / 1000);
}

function formatLocalDatetimeLabel(input: string): string {
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function pickReportId(row: Record<string, unknown>): string | null {
  for (const k of ["report_id", "reportId", "clean_report_id", "task_report_id", "id"]) {
    const v = row[k];
    if (v != null && String(v).trim().length > 0) return String(v);
  }
  return null;
}

function firstNumericInObject(obj: Record<string, unknown>): number | null {
  for (const v of Object.values(obj)) {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

const JSON_TREE_MAX_TABLE_KEYS = 16;
const JSON_TREE_MAX_TABLE_ROWS = 100;

function tryParseJsonString(s: string): unknown | null {
  const t = s.trim();
  if (!(t.startsWith("{") && t.endsWith("}")) && !(t.startsWith("[") && t.endsWith("]"))) return null;
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

/** Structured view for execution payloads (tables for uniform object arrays, collapsible depth, embedded JSON strings). */
function JsonValueView({
  value,
  depth = 0,
  compact = false,
}: {
  value: unknown;
  depth?: number;
  compact?: boolean;
}) {
  if (value === null) return <span className="text-slate-400">null</span>;
  if (typeof value === "boolean") return <span className="text-amber-300">{value ? "true" : "false"}</span>;
  if (typeof value === "number")
    return (
      <span className="tabular-nums text-cyan-300">
        {Number.isFinite(value) ? String(value) : JSON.stringify(value)}
      </span>
    );
  if (typeof value === "string") {
    const parsed = tryParseJsonString(value);
    if (parsed !== null && typeof parsed === "object") {
      return (
        <div className="space-y-2">
          <JsonValueView value={parsed} depth={depth} compact={compact} />
          <details className="rounded-lg border border-white/10 bg-black/25">
            <summary className="cursor-pointer select-none px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Raw string
            </summary>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all p-2 font-mono text-[10px] leading-snug text-slate-500">
              {value}
            </pre>
          </details>
        </div>
      );
    }
    if (value.length > 400) {
      return (
        <details className="rounded-lg border border-white/10 bg-black/20">
          <summary className="cursor-pointer px-2 py-1 text-[11px] text-emerald-200/90">
            String ({value.length} chars)
          </summary>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all p-2 font-mono text-[11px] text-emerald-200/80">
            {value}
          </pre>
        </details>
      );
    }
    return <span className="break-words text-emerald-200/90">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-500">Empty list</span>;
    if (value.every(isRecord)) {
      const keySet = new Set<string>();
      for (const row of value) for (const k of Object.keys(row)) keySet.add(k);
      const keys = [...keySet].sort((a, b) => a.localeCompare(b)).slice(0, JSON_TREE_MAX_TABLE_KEYS);
      const truncatedKeys = keySet.size > JSON_TREE_MAX_TABLE_KEYS;
      return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-indigo-200/90">
                <th className="whitespace-nowrap px-2 py-2 font-mono text-[10px] font-semibold">#</th>
                {keys.map((k) => (
                  <th key={k} className="whitespace-nowrap px-2 py-2 font-mono text-[10px] font-semibold">
                    {k}
                  </th>
                ))}
                {truncatedKeys && (
                  <th className="px-2 py-2 font-mono text-[10px] font-semibold text-slate-500">…</th>
                )}
              </tr>
            </thead>
            <tbody>
              {value.slice(0, JSON_TREE_MAX_TABLE_ROWS).map((row, i) => (
                <tr key={i} className="border-b border-white/5 align-top hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[10px] text-slate-500">{i + 1}</td>
                  {keys.map((k) => (
                    <td key={k} className="max-w-[min(240px,28vw)] px-2 py-1.5 align-top text-slate-200">
                      <JsonValueView value={row[k]} depth={depth + 1} compact />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {value.length > JSON_TREE_MAX_TABLE_ROWS && (
            <p className="border-t border-white/10 px-3 py-2 text-[10px] text-slate-500">
              Showing first {JSON_TREE_MAX_TABLE_ROWS} of {value.length} rows.
            </p>
          )}
        </div>
      );
    }
    return (
      <ul className="space-y-1.5">
        {value.map((item, i) => (
          <li key={i} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <span className="mr-2 inline-block min-w-[1.5rem] font-mono text-[10px] text-slate-500">{i}</span>
            <JsonValueView value={item} depth={depth + 1} compact={compact} />
          </li>
        ))}
      </ul>
    );
  }
  if (isRecord(value)) {
    if (compact) {
      return (
        <details className="rounded border border-white/10 bg-black/20 p-1.5">
          <summary className="cursor-pointer font-mono text-[10px] text-indigo-200/90">
            {`${Object.keys(value).length} keys`}
          </summary>
          <div className="mt-2 max-h-40 overflow-auto border-l border-white/10 pl-2">
            {Object.keys(value)
              .sort((a, b) => a.localeCompare(b))
              .map((k) => (
                <div key={k} className="mb-2 last:mb-0">
                  <div className="font-mono text-[9px] font-bold text-indigo-300/80">{k}</div>
                  <JsonValueView value={value[k]} depth={depth + 1} compact={false} />
                </div>
              ))}
          </div>
        </details>
      );
    }
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    const useFold = depth >= 2 || keys.length > 24;
    const inner = (
      <div className="space-y-2 border-l-2 border-indigo-500/25 pl-3">
        {keys.map((k) => (
          <div key={k} className="rounded-lg bg-white/[0.03] px-3 py-2">
            <div className="font-mono text-[11px] font-semibold tracking-wide text-indigo-200/90">{k}</div>
            <div className="mt-1.5 text-[12px]">
              <JsonValueView value={value[k]} depth={depth + 1} compact={false} />
            </div>
          </div>
        ))}
      </div>
    );
    if (useFold) {
      return (
        <details className="rounded-lg border border-white/10 bg-white/[0.02] p-2" open={depth < 2}>
          <summary className="cursor-pointer font-mono text-[11px] text-indigo-200">
            Object ({keys.length} keys)
          </summary>
          <div className="mt-2">{inner}</div>
        </details>
      );
    }
    return inner;
  }
  return <span className="text-slate-400">{String(value)}</span>;
}

function ExecutionPayloadViewer({ data }: { data: unknown }) {
  return <JsonValueView value={data} depth={0} compact={false} />;
}

function humanizeMetricKey(key: string): string {
  return key.replace(/_/g, " ");
}

function metricHint(key: string): string | null {
  const u = key.toUpperCase();
  if (u === "WATER_CONSUMPTION") return "Vendor units: millilitres (mL). Divide by 1000 for litres.";
  if (u === "POWER_CONSUMPTION") return "Energy used over the selected window (vendor units).";
  if (u === "AREA" || u === "PLAN_AREA") return "Floor area covered / planned for the period.";
  if (u === "DURATION") return "Total runtime hours for the period.";
  if (u === "TASK_COUNT") return "Number of cleaning task runs recorded.";
  return null;
}

// ── icon map for well-known metric keys ───────────────────────────────────────
function metricIcon(key: string): string {
  const u = key.toUpperCase();
  if (u === "AREA") return "⬛";
  if (u === "PLAN_AREA") return "📐";
  if (u === "DURATION") return "⏱";
  if (u === "POWER_CONSUMPTION") return "⚡";
  if (u === "TASK_COUNT") return "✅";
  if (u === "WATER_CONSUMPTION") return "💧";
  return "📊";
}

// ── accent colour per metric (maps to Tailwind classes) ───────────────────────
function metricAccent(key: string): { bar: string; bg: string; text: string } {
  const u = key.toUpperCase();
  if (u === "AREA" || u === "PLAN_AREA")
    return { bar: "bg-violet-500", bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300" };
  if (u === "DURATION")
    return { bar: "bg-sky-500", bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-700 dark:text-sky-300" };
  if (u === "POWER_CONSUMPTION")
    return { bar: "bg-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300" };
  if (u === "TASK_COUNT")
    return { bar: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300" };
  if (u === "WATER_CONSUMPTION")
    return { bar: "bg-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-700 dark:text-cyan-300" };
  return { bar: "bg-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-300" };
}

// ── tiny inline sparkline-style bar ───────────────────────────────────────────
function MetricCard({ label, value, hint }: { label: string; value: unknown; hint: string | null }) {
  const accent = metricAccent(label);
  const icon = metricIcon(label);
  return (
    <div
      className={`relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-stroke/60 ${accent.bg} p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-dark-3`}
    >
      {/* top-right decorative circle */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 rounded-full opacity-10 blur-xl"
        style={{ background: "currentColor" }}
      />
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{icon}</span>
        <span className={`text-[11px] font-bold uppercase tracking-widest ${accent.text}`}>
          {humanizeMetricKey(label)}
        </span>
      </div>
      <div className="text-2xl font-black tabular-nums tracking-tight text-dark dark:text-white">
        {typeof value === "object" ? JSON.stringify(value) : String(value)}
      </div>
      {/* thin accent bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl">
        <div className={`h-full w-full ${accent.bar} opacity-60`} />
      </div>
      {hint && (
        <p className="mt-auto text-[11px] leading-snug text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
}

export function CleaningRobotDashboard({
  robotSerial,
  initialShopId,
  idToken,
  businessName,
  hideShopIdField = false,
  variant = "utility",
  hubTrialReport,
}: CleaningRobotDashboardProps) {
  const [shopId, setShopId] = useState("");
  const [fromLocal, setFromLocal] = useState("");
  const [toLocal, setToLocal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [executionRows, setExecutionRows] = useState<unknown[]>([]);
  const [nextExecOffset, setNextExecOffset] = useState(0);
  const [hasMoreExec, setHasMoreExec] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailJson, setDetailJson] = useState<unknown>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const nextExecOffsetRef = useRef(0);
  const periodSummarySectionRef = useRef<HTMLElement | null>(null);
  const [hubTrialReportReveal, setHubTrialReportReveal] = useState(false);

  useEffect(() => {
    nextExecOffsetRef.current = nextExecOffset;
  }, [nextExecOffset]);

  const resetRangeToLast24h = useCallback(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    setToLocal(toDatetimeLocalValue(now));
    setFromLocal(toDatetimeLocalValue(now - day));
  }, []);

  const fetchDashboard = useCallback(
    async (
      opts: {
        appendExecutions?: boolean;
        onlyExecutions?: boolean;
        from?: string;
        to?: string;
        refresh?: boolean;
      } = {}
    ) => {
      if (!idToken || !robotSerial.trim()) {
        setError("Not signed in or missing robot serial.");
        return;
      }
      const append = opts.appendExecutions ?? false;
      const onlyExec = opts.onlyExecutions ?? false;
      const fromStr = opts.from ?? fromLocal;
      const toStr = opts.to ?? toLocal;
      if (append) setLoadMoreLoading(true);
      else setLoading(true);
      setError(null);
      try {
        const st = localInputToUnix(fromStr);
        const et = localInputToUnix(toStr);
        const execOff = append ? nextExecOffsetRef.current : 0;
        const params = new URLSearchParams({
          sn: robotSerial.trim(),
          start_time: String(st),
          end_time: String(et),
          execution_offset: String(execOff),
          only_executions: onlyExec ? "true" : "false",
        });
        const sid = shopId.trim();
        if (sid) params.set("shop_id", sid);
        if (opts.refresh && !append) params.set("refresh", "true");
        const res = await fetch(`${getApiBaseUrl()}/api/pudu/dashboard?${params.toString()}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const msg =
            (errBody as { detail?: string }).detail ??
            (errBody as { message?: string }).message ??
            res.statusText;
          throw new Error(msg || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as DashboardPayload;
        const newRows = json.executions?.list ?? [];
        if (append) {
          setExecutionRows((prev) => [...prev, ...newRows]);
          setNextExecOffset(json.execution_next_offset ?? 0);
          setHasMoreExec(!!json.execution_has_more);
          if (json.errors?.length) {
            setData((prev) =>
              prev
                ? { ...prev, errors: [...prev.errors, ...json.errors], degraded: { ...prev.degraded, ...json.degraded } }
                : prev
            );
          }
        } else {
          setData(json);
          setExecutionRows(newRows);
          setNextExecOffset(json.execution_next_offset ?? 0);
          setHasMoreExec(!!json.execution_has_more);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        if (!append) {
          setData(null);
          setExecutionRows([]);
        }
      } finally {
        setLoading(false);
        setLoadMoreLoading(false);
      }
    },
    [idToken, robotSerial, fromLocal, toLocal, shopId]
  );

  useEffect(() => {
    if (!robotSerial.trim()) return;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const fl = toDatetimeLocalValue(now - day);
    const tl = toDatetimeLocalValue(now);
    setShopId((initialShopId ?? "").trim());
    setFromLocal(fl);
    setToLocal(tl);
    setError(null);
    setData(null);
    setExecutionRows([]);
    setNextExecOffset(0);
    nextExecOffsetRef.current = 0;
    setHasMoreExec(false);
    setDetailOpen(false);
    setDetailJson(null);
    setSelectedReportId(null);
    void fetchDashboard({ from: fl, to: tl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robotSerial, initialShopId]);

  const modeSummary = useMemo(() => {
    const m = data?.mode;
    if (!isRecord(m)) return null;
    const s = m.summary;
    if (isRecord(s)) return s;
    return m;
  }, [data?.mode]);

  useEffect(() => {
    setHubTrialReportReveal(false);
  }, [robotSerial, initialShopId, hubTrialReport?.shopId]);

  useEffect(() => {
    if (loading && variant === "hub" && (hubTrialReport?.shopId ?? "").trim()) {
      setHubTrialReportReveal(false);
    }
  }, [loading, variant, hubTrialReport?.shopId]);

  const hubTrialReportPeriodReady =
    variant === "hub" &&
    hubTrialReport != null &&
    hubTrialReport.shopId.trim().length > 0 &&
    modeSummary != null &&
    !loading &&
    data != null;

  useEffect(() => {
    if (!hubTrialReportPeriodReady) return;
    const el = periodSummarySectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        const ratio = entry.intersectionRatio;
        const top = entry.boundingClientRect.top;
        const vh = window.innerHeight || 800;
        const scrolledIntoDash = top < vh * 0.78;
        if (ratio >= 0.15 || scrolledIntoDash) {
          setHubTrialReportReveal(true);
        }
      },
      { threshold: [0, 0.08, 0.15, 0.3], rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hubTrialReportPeriodReady, modeSummary, loading, data, robotSerial]);

  const pagingBars = useMemo(() => {
    const list = data?.paging_list ?? [];
    const nums: { label: string; value: number }[] = [];
    list.forEach((row, i) => {
      if (!isRecord(row)) return;
      const n = firstNumericInObject(row);
      if (n != null) {
        const label =
          (typeof row.time === "string" && row.time) ||
          (typeof row.date === "string" && row.date) ||
          (typeof row.bucket === "string" && row.bucket) ||
          `Row ${i + 1}`;
        nums.push({ label: String(label), value: Math.abs(n) });
      }
    });
    const max = nums.reduce((a, b) => Math.max(a, b.value), 0) || 1;
    return nums.map((x) => ({ ...x, pct: Math.round((x.value / max) * 100) }));
  }, [data?.paging_list]);

  const tableColumns = useMemo(() => {
    const first = executionRows.find(isRecord);
    if (!first) return [] as string[];
    return Object.keys(first).slice(0, 8);
  }, [executionRows]);

  const loadedPeriodLabel = useMemo(() => {
    if (!fromLocal || !toLocal) return null;
    return `${formatLocalDatetimeLabel(fromLocal)} -> ${formatLocalDatetimeLabel(toLocal)}`;
  }, [fromLocal, toLocal]);

  async function openDetail(reportId: string) {
    if (!idToken) return;
    setSelectedReportId(reportId);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailJson(null);
    try {
      const st = localInputToUnix(fromLocal);
      const et = localInputToUnix(toLocal);
      const params = new URLSearchParams({
        sn: robotSerial.trim(),
        report_id: reportId,
        start_time: String(st),
        end_time: String(et),
      });
      if (shopId.trim()) params.set("shop_id", shopId.trim());
      const res = await fetch(`${getApiBaseUrl()}/api/pudu/clean-task-detail?${params.toString()}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { detail?: string }).detail ?? res.statusText);
      }
      const body = await res.json();
      setDetailJson((body as { data?: unknown }).data ?? body);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetailLoading(false);
    }
  }

  if (!robotSerial.trim()) {
    return (
      <Card variant="elevated" className="p-6">
        <CardDescription>
          {variant === "hub" ? (
            <>Choose a site and robot from the directory above to load analytics for that serial.</>
          ) : (
            <>
              Add a{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-dark dark:bg-dark-2 dark:text-white">
                robot_number
              </code>{" "}
              query parameter to the URL to load this dashboard.
            </>
          )}
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-7 text-sm text-gray-800 dark:text-gray-100">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0a0e1a] px-7 py-8 shadow-xl ring-1 ring-white/10">
        {/* mesh gradient blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-indigo-700/30 blur-3xl" />
          <div className="absolute -bottom-10 right-10 h-56 w-56 rounded-full bg-cyan-600/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-700/20 blur-2xl" />
        </div>

        {/* subtle grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative text-center">
          {/* eyebrow */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200/90">
              {variant === "hub" ? "Pudu directory" : "Pudu · cleaning analytics"}
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Robot cleaning data
          </h1>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {/* serial badge */}
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2 font-mono text-sm font-semibold text-white backdrop-blur-sm">
              <span aria-hidden className="text-cyan-400">⬡</span>
              {robotSerial}
            </span>

            {businessName && (
              <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                <span className="text-slate-500">Member</span> · {businessName}
              </span>
            )}

            {data?.timezone_offset != null && (
              <span className="rounded-xl border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm">
                UTC{data.timezone_offset >= 0 ? "+" : ""}{data.timezone_offset}h
              </span>
            )}

            {data?.cached && (
              <span className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
                ⏾ Cached · ~45s TTL
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── DEGRADED WARNING ──────────────────────────────────────────────── */}
      {(data?.degraded?.mode || data?.degraded?.paging || data?.degraded?.executions) && (
        <div className="flex gap-3 rounded-2xl border border-amber-300/40 bg-amber-50/90 px-5 py-4 text-sm text-amber-950 shadow-sm dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100">
          <span className="mt-px text-xl leading-none">⚠</span>
          <div>
            <p className="font-bold">Partial data</p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {[
                data.degraded.mode && "period summary (mode)",
                data.degraded.paging && "trend strip (paging)",
                data.degraded.executions && "execution list",
              ]
                .filter(Boolean)
                .join(" · ")}{" "}
              did not load. Try a shorter range, use Hard refresh, or retry later — Pudu sometimes returns{" "}
              <code className="rounded bg-black/10 px-1 font-mono text-[11px] dark:bg-white/10">DM_SYSTEM_ERROR</code> on heavy queries.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900 shadow-sm dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      )}

      {data?.errors && data.errors.length > 0 && (
        <Card className="border-red-200/80 dark:border-red-900/40">
          <CardHeader>
            <CardTitle className="text-base text-red-800 dark:text-red-200">Technical details</CardTitle>
            <CardDescription>Messages returned while assembling this dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.errors.map((e, i) => (
                <li key={i} className="rounded-xl border border-stroke bg-gray-2/50 p-3 text-xs dark:border-dark-3 dark:bg-dark-2/50">
                  <span className="font-semibold text-primary">{e.layer}</span>
                  {e.detail.length > 160 ? (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer select-none text-gray-600 hover:text-dark dark:text-gray-400 dark:hover:text-white">Show full message</summary>
                      <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-white p-2 font-mono text-[11px] text-dark dark:bg-gray-dark dark:text-gray-200">{e.detail}</pre>
                    </details>
                  ) : (
                    <span className="mt-1 block text-gray-700 dark:text-gray-300">{e.detail}</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── FILTERS ───────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-stroke/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-dark-3 dark:bg-gray-dark/80">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-base dark:bg-indigo-900/50">🔍</span>
          <div>
            <p className="text-sm font-bold text-dark dark:text-white">Filters</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Default load is the last 24 hours. Change the window below, then apply. Hard refresh bypasses a short
              server cache (~45s).
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200/70 bg-indigo-50/70 px-3 py-2 text-[11px] dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Default
          </span>
          <span className="text-indigo-800 dark:text-indigo-200">Initial load window: Last 24 hours</span>
          {loadedPeriodLabel && (
            <span className="text-indigo-700 dark:text-indigo-300">
              • Current loaded period: <span className="font-semibold">{loadedPeriodLabel}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* From */}
          <div className="min-w-[11rem] flex-1">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              From
            </label>
            <input
              type="datetime-local"
              value={fromLocal}
              onChange={(e) => setFromLocal(e.target.value)}
              className="w-full rounded-xl border border-stroke bg-gray-2/50 px-3 py-2.5 text-sm text-dark shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          {/* To */}
          <div className="min-w-[11rem] flex-1">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              To
            </label>
            <input
              type="datetime-local"
              value={toLocal}
              onChange={(e) => setToLocal(e.target.value)}
              className="w-full rounded-xl border border-stroke bg-gray-2/50 px-3 py-2.5 text-sm text-dark shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          {/* Shop scope */}
          {!hideShopIdField ? (
            <div className="min-w-[9rem] flex-1">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Shop ID (optional)</label>
              <input
                type="text"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                placeholder="Pudu shop_id"
                className="w-full rounded-xl border border-stroke bg-gray-2/50 px-3 py-2.5 font-mono text-sm text-dark shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
            </div>
          ) : (
            <div className="min-w-[12rem] flex-1 rounded-xl border border-dashed border-stroke bg-gray-2/30 px-4 py-3 dark:border-dark-3 dark:bg-dark-2/30">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Shop scope</p>
              <p className="mt-1 font-mono text-xs text-dark dark:text-gray-200">
                {shopId.trim() ? shopId.trim() : "None — robot-only calls"}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchDashboard()}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 hover:shadow-indigo-500/30 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Loading…
                </span>
              ) : "Apply range"}
            </button>

            <button
              type="button"
              onClick={() => {
                resetRangeToLast24h();
                const now = Date.now();
                const day = 24 * 60 * 60 * 1000;
                void fetchDashboard({ from: toDatetimeLocalValue(now - day), to: toDatetimeLocalValue(now) });
              }}
              className="rounded-xl border border-stroke bg-white px-4 py-2.5 text-sm font-semibold text-dark shadow-sm transition hover:bg-gray-50 active:scale-[.98] dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-2"
            >
              Last 24h
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchDashboard({ refresh: true })}
              className="rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-xs font-semibold text-gray-500 transition hover:border-indigo-400 hover:text-indigo-600 active:scale-[.98] dark:border-gray-600 dark:text-gray-400"
              title="Bypass ~45s server cache"
            >
              Hard refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── PERIOD SUMMARY ────────────────────────────────────────────────── */}
      {modeSummary && (
        <section ref={periodSummarySectionRef}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-base dark:bg-violet-900/40">📊</span>
            <div>
              <p className="text-sm font-bold text-dark dark:text-white">Period summary</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Aggregates for the selected range (Pudu clean/mode).</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(modeSummary).map(([k, v]) => (
              <MetricCard key={k} label={k} value={v} hint={metricHint(k)} />
            ))}
          </div>

          {hubTrialReport &&
            variant === "hub" &&
            hubTrialReportPeriodReady &&
            hubTrialReportReveal && (
              <div className="mt-6 rounded-2xl border border-stroke/80 bg-white/95 p-5 shadow-sm dark:border-dark-3 dark:bg-gray-dark/90">
                <p className="text-sm font-bold text-dark dark:text-white">Trial summary report</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  PDF for the whole site (all robots under this shop). Start date uses the same Melbourne calendar convention
                  as the backend report. This block appears after the period summary finishes loading and you scroll it into view,
                  so you can confirm the selected window has metrics before generating.
                </p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="min-w-[11rem]">
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Report start date
                    </label>
                    <input
                      type="date"
                      value={hubTrialReport.startDate}
                      onChange={(e) => hubTrialReport.onStartDateChange(e.target.value)}
                      disabled={hubTrialReport.loading}
                      className="w-full rounded-xl border border-stroke bg-gray-2/50 px-3 py-2.5 text-sm text-dark shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={hubTrialReport.loading || !hubTrialReport.shopId.trim()}
                    onClick={() => hubTrialReport.onGenerate()}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 hover:shadow-indigo-500/30 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {hubTrialReport.loading ? "Generating…" : "Generate report"}
                  </button>
                </div>
                {hubTrialReport.error && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">{hubTrialReport.error}</p>
                )}
                {hubTrialReport.success && (
                  <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{hubTrialReport.success}</p>
                )}
              </div>
            )}
        </section>
      )}

      {/* ── EXECUTIONS TABLE ──────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-base dark:bg-emerald-900/40">🗂</span>
          <div>
            <p className="text-sm font-bold text-dark dark:text-white">Executions</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Cleaning runs from Pudu clean_task/query_list for this window.</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
              <svg className="h-5 w-5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-sm">Loading executions…</span>
            </div>
          ) : executionRows.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">No execution rows in this window.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-stroke bg-gray-50/80 dark:border-dark-3 dark:bg-dark-2/60">
                    {tableColumns.map((c) => (
                      <th
                        key={c}
                        className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400"
                      >
                        {c}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke/60 dark:divide-dark-3">
                  {executionRows.map((row, ri) => {
                    if (!isRecord(row)) {
                      return (
                        <tr key={ri}>
                          <td colSpan={tableColumns.length + 1} className="px-4 py-3 text-gray-400">
                            {String(row)}
                          </td>
                        </tr>
                      );
                    }
                    const rid = pickReportId(row);
                    return (
                      <tr
                        key={ri}
                        className="group transition-colors duration-100 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20"
                      >
                        {tableColumns.map((c) => (
                          <td
                            key={c}
                            className="max-w-[10rem] truncate px-4 py-3 font-mono text-[11px] text-dark dark:text-gray-300"
                            title={String(row[c] ?? "")}
                          >
                            {row[c] != null && typeof row[c] === "object"
                              ? JSON.stringify(row[c])
                              : String(row[c] ?? "")}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          {rid ? (
                            <button
                              type="button"
                              className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                              onClick={() => void openDetail(rid)}
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {hasMoreExec && (
            <div className="border-t border-stroke px-4 py-3 dark:border-dark-3">
              <button
                type="button"
                disabled={loadMoreLoading}
                onClick={() => void fetchDashboard({ appendExecutions: true, onlyExecutions: true })}
                className="rounded-xl border border-stroke bg-white px-4 py-2 text-xs font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50 dark:border-dark-3 dark:bg-gray-dark dark:text-indigo-400 dark:hover:bg-dark-2 disabled:opacity-50"
              >
                {loadMoreLoading ? "Loading…" : "Load more executions"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── EXECUTION DETAIL MODAL ────────────────────────────────────────── */}
      <ExecutionDetailModal
        open={detailOpen}
        reportId={selectedReportId}
        loading={detailLoading}
        error={detailError}
        json={detailJson}
        onClose={() => {
          setDetailOpen(false);
          setDetailJson(null);
          setDetailError(null);
          setSelectedReportId(null);
        }}
      />
    </div>
  );
}

// ── Modal component ────────────────────────────────────────────────────────────
function ExecutionDetailModal({
  open,
  reportId,
  loading,
  error,
  json,
  onClose,
}: {
  open: boolean;
  reportId: string | null;
  loading: boolean;
  error: string | null;
  json: unknown;
  onClose: () => void;
}) {
  // Escape key + body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  const formatted = json != null ? JSON.stringify(json, null, 2) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-8"
      aria-modal="true"
      role="dialog"
      aria-label="Execution detail"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative z-[1] flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-[#0d0f1c] shadow-2xl ring-1 ring-white/10"
        style={{ maxHeight: "min(92dvh, calc(100vh - 2rem))" }}
      >
        {/* header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-xs text-indigo-300">⬡</span>
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-300/80">
                Execution payload
              </p>
            </div>
            <p className="font-mono text-sm font-semibold text-white">
              {reportId ?? "—"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Payload from clean_task/query for this run
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            {/* × icon */}
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center gap-3 py-8 text-slate-400">
              <svg className="h-5 w-5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-sm">Fetching execution data…</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && json != null && (
            <div className="space-y-4">
              <ExecutionPayloadViewer data={json} />
              {formatted != null && (
                <details className="rounded-xl border border-white/10 bg-black/20">
                  <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold text-slate-400">
                    Raw JSON (copy-friendly)
                  </summary>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border-t border-white/10 p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90">
                    {formatted}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-6 py-4">
          <p className="text-[11px] text-slate-500">Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">Esc</kbd> or click outside to close</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/8 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/15 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}