"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiBaseUrl } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type HubRobotTabsControls = {
  tabs: Array<{ sn: string; product: string }>;
  activeSn: string;
  hasManualSelection: boolean;
  onSelect: (sn: string) => void;
};

export type CleaningRobotDashboardProps = {
  robotSerial: string;
  initialShopId?: string | null;
  idToken: string | null | undefined;
  businessName?: string;
  hideShopIdField?: boolean;
  variant?: "utility" | "hub";
  hubRobotTabs?: HubRobotTabsControls | null;
};

type DashboardPayload = {
  sn: string;
  shop_id: string | null;
  timezone_offset: number;
  start_time: number;
  end_time: number;
  degraded: { mode?: boolean; robot_mode?: boolean; paging?: boolean; executions?: boolean };
  errors: Array<{ layer: string; detail: string }>;
  mode: unknown;
  robot_mode?: unknown;
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

function extractSummaryObject(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  const maybeSummary = payload.summary;
  if (isRecord(maybeSummary)) return maybeSummary;
  return payload;
}

function executionSerialFromRow(row: Record<string, unknown>): string {
  const tryVal = (v: unknown) => (v != null ? String(v).trim() : "");
  const direct = tryVal(
    row.sn ??
      row.SN ??
      row.Sn ??
      row["S/N"] ??
      row["s/n"] ??
      row.serial ??
      row.SERIAL ??
      row.serial_number ??
      row.robot_sn ??
      row.machine_sn
  );
  if (direct) return direct;
  for (const [k, v] of Object.entries(row)) {
    const norm = k.toLowerCase().replace(/-/g, "_").replace(/\//g, "_");
    if (
      norm === "sn" ||
      norm === "s_n" ||
      norm.endsWith("_sn") ||
      norm === "serial" ||
      norm === "serial_number" ||
      norm === "robot_sn" ||
      norm === "robotsn" ||
      norm === "machine_sn"
    ) {
      const s = tryVal(v);
      if (s) return s;
    }
  }
  for (const v of Object.values(row)) {
    if (!isRecord(v)) continue;
    const inner = tryVal(
      v.sn ?? v.SN ?? v.serial ?? v.serial_number ?? v.robot_sn
    );
    if (inner) return inner;
  }
  return "";
}

function numericField(row: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

/** Roll up first page of executions for the active serial when Pudu clean/mode is not serial-scoped. */
function rollupExecutionsForSerial(rows: unknown[], serial: string): Record<string, unknown> | null {
  const sn = serial.trim().toLowerCase();
  if (!sn) return null;
  const matched = rows
    .filter(isRecord)
    .filter((r) => executionSerialFromRow(r).trim().toLowerCase() === sn);
  if (matched.length === 0) return null;
  let area = 0;
  let timeRaw = 0;
  for (const r of matched) {
    area += numericField(r, "clean_area", "cleanArea");
    timeRaw += numericField(r, "clean_time", "cleanTime");
  }
  const hours = timeRaw > 0 ? Math.round((timeRaw / 3600) * 100) / 100 : 0;
  return {
    EXEC_TASK_COUNT: matched.length,
    EXEC_AREA: Math.round(area * 100) / 100,
    EXEC_DURATION: hours,
  };
}

/** Visible execution columns (in order). Only keys present on the row are shown. */
const EXECUTION_TABLE_COLUMN_PRIORITY = [
  "task_name",
  "clean_area",
  "clean_time",
  "start_time",
  "end_time",
  "report_id",
  "sn",
  "status",
] as const;

function normalizeExecutionColumnKey(k: string): string {
  return k.replace(/\s/g, "_").toLowerCase();
}

/** Map logical column name to the row's actual property name (handles taskName vs task_name). */
function resolveExecutionRowKey(row: Record<string, unknown>, logical: string): string | null {
  const want = normalizeExecutionColumnKey(logical);
  for (const k of Object.keys(row)) {
    if (normalizeExecutionColumnKey(k) === want) return k;
  }
  return null;
}

function pickExecutionTableColumns(firstRow: Record<string, unknown>): string[] {
  const priority = EXECUTION_TABLE_COLUMN_PRIORITY as readonly string[];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const logical of priority) {
    const k = resolveExecutionRowKey(firstRow, logical);
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

function formatDurationSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** If value looks like Unix seconds in a sensible range, return a local datetime string. */
function formatLikelyUnixSeconds(raw: unknown): string | null {
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 1_000_000_000 || n > 3_000_000_000) return null;
  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function ExecutionTableCell({ column, row }: { column: string; row: Record<string, unknown> }) {
  const raw = row[column];
  const norm = normalizeExecutionColumnKey(column);

  if (raw != null && typeof raw === "object") {
    return (
      <span className="block max-w-[14rem] break-all text-[10px] text-gray-600 dark:text-gray-400">
        {JSON.stringify(raw)}
      </span>
    );
  }

  if (norm === "clean_area" || norm === "cleanarea") {
    const n = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (Number.isFinite(n)) {
      const rounded = Math.round(n * 100) / 100;
      return (
        <span className="block">
          <span className="tabular-nums font-semibold text-dark dark:text-gray-200">{rounded} m²</span>
        </span>
      );
    }
  }

  if (norm === "clean_time" || norm === "cleantime") {
    const n = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (Number.isFinite(n) && n >= 0) {
      return (
        <span className="block">
          <span className="tabular-nums font-semibold text-dark dark:text-gray-200">{formatDurationSeconds(n)}</span>
          <span className="mt-0.5 block text-[10px] font-normal tabular-nums text-gray-500 dark:text-gray-400">
            {n} s
          </span>
        </span>
      );
    }
  }

  if (norm === "create_time" || norm === "createtime") {
    const str = String(raw ?? "");
    const parsed = Date.parse(str.replace(" ", "T"));
    if (!Number.isNaN(parsed)) {
      const human = new Date(parsed).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
      return (
        <span className="block">
          <span className="text-dark dark:text-gray-200">{human}</span>
          {str.trim() !== human ? (
            <span className="mt-0.5 block text-[10px] text-gray-500 dark:text-gray-400">{str}</span>
          ) : null}
        </span>
      );
    }
  }

  if (norm === "end_time" || norm === "endtime" || norm === "start_time" || norm === "starttime") {
    const humanUnix = formatLikelyUnixSeconds(raw);
    if (humanUnix) {
      return (
        <span className="block">
          <span className="text-dark dark:text-gray-200">{humanUnix}</span>
          <span className="mt-0.5 block font-mono text-[10px] text-gray-500 dark:text-gray-400">{String(raw)}</span>
        </span>
      );
    }
    if (norm === "start_time" || norm === "starttime") {
      const str = String(raw ?? "");
      const parsed = Date.parse(str.replace(" ", "T"));
      if (!Number.isNaN(parsed)) {
        const human = new Date(parsed).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
        return (
          <span className="block">
            <span className="text-dark dark:text-gray-200">{human}</span>
            {str.trim() !== human ? (
              <span className="mt-0.5 block text-[10px] text-gray-500 dark:text-gray-400">{str}</span>
            ) : null}
          </span>
        );
      }
    }
  }

  const str = raw == null ? "" : String(raw);
  return <span className="block max-w-[12rem] break-words">{str || "—"}</span>;
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

function parseEmbeddedJson(v: unknown): unknown {
  if (typeof v === "string") {
    const t = v.trim();
    if (
      (t.startsWith("[") && t.endsWith("]")) ||
      (t.startsWith("{") && t.endsWith("}"))
    ) {
      try {
        return JSON.parse(t) as unknown;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function roundNum(n: number, d: number): number {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function displayRunFieldValue(key: string, raw: unknown): string {
  if (raw == null) return "—";
  const s = String(raw).trim();
  if (key === "clean_time") {
    const n = Number(s);
    if (Number.isFinite(n) && n > 60 && n < 86400000 && /^\d+(\.\d+)?$/.test(s)) {
      return `${Math.round(n)} s (~${roundNum(n / 3600, 2)} h)`;
    }
  }
  if (key === "start_time" || key === "end_time") {
    const n = Number(s);
    if (Number.isFinite(n) && n > 1e9 && n < 2e10 && /^\d+$/.test(s)) {
      try {
        return new Date(n * 1000).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        });
      } catch {
        return s;
      }
    }
  }
  if (key === "clean_area" || key === "task_area" || key === "average_area") {
    const n = Number(raw);
    if (Number.isFinite(n)) return `${roundNum(n, 2)} m²`;
  }
  if (key === "cost_water") {
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) return `${roundNum(n, 0)} mL (~${roundNum(n / 1000, 2)} L)`;
  }
  if (key === "battery" || key === "percentage") {
    const n = Number(s);
    if (Number.isFinite(n) && s.length <= 4) return `${n}%`;
  }
  return s;
}

/** Shown as headline cards — omitted from dense “Technical details” tables to avoid duplication. */
const RUN_DETAIL_HERO_KEYS = new Set([
  "task_name",
  "clean_area",
  "clean_time",
  "battery",
  "cost_water",
  "percentage",
  "status",
  "create_time",
]);

const RUN_DETAIL_GROUP_SPECS: { title: string; keys: string[] }[] = [
  { title: "Timing", keys: ["start_time", "end_time"] },
  { title: "Run totals", keys: ["task_area", "average_area"] },
  { title: "Resources", keys: ["cost_battery", "power_consumption", "remaining_time"] },
  { title: "Counts", keys: ["break_count", "charge_count", "elevator_count", "floor_count"] },
  { title: "Task / device", keys: ["task_id", "task_version", "mode", "sub_mode", "mac"] },
  { title: "Identifiers", keys: ["report_id", "sn"] },
];

function buildRunScalarMap(payload: Record<string, unknown>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === "floor_list" || k === "config") continue;
    if (v == null) {
      m[k] = v;
      continue;
    }
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") m[k] = v;
  }
  return m;
}

function RunFieldMiniTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; value: string }>;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
      <div className="overflow-hidden rounded-xl border border-stroke dark:border-dark-3">
        <table className="min-w-full divide-y divide-stroke text-left dark:divide-dark-3">
          <tbody className="divide-y divide-stroke/80 dark:divide-dark-3">
            {rows.map(({ key, value }) => (
              <tr key={key} className="bg-white dark:bg-gray-dark">
                <th className="whitespace-nowrap px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {key.replace(/_/g, " ")}
                </th>
                <td className="max-w-[28rem] break-words px-3 py-1.5 font-mono text-[11px] text-gray-800 dark:text-gray-200">
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Inline tables for one clean_task/query payload (floor_list often arrives as a JSON string). */
function ExecutionTaskDetailTables({ payload }: { payload: Record<string, unknown> }) {
  const [showAllMapZones, setShowAllMapZones] = useState(false);

  const floorRaw = parseEmbeddedJson(payload.floor_list) ?? payload.floor_list;
  const floors: unknown[] = Array.isArray(floorRaw) ? floorRaw : [];
  const configRaw = parseEmbeddedJson(payload.config) ?? payload.config;
  const configObj = isRecord(configRaw) ? configRaw : null;

  const scalarMap = useMemo(() => buildRunScalarMap(payload), [payload]);

  const heroCards = useMemo(() => {
    const order = [
      "task_name",
      "clean_area",
      "clean_time",
      "battery",
      "cost_water",
      "percentage",
      "status",
      "create_time",
    ] as const;
    return order
      .filter((k) => Object.prototype.hasOwnProperty.call(scalarMap, k))
      .map((k) => ({
        key: k,
        label: k.replace(/_/g, " "),
        value: displayRunFieldValue(k, scalarMap[k]),
      }));
  }, [scalarMap]);

  const groupedTables = useMemo(() => {
    const remaining = new Map(Object.entries(scalarMap));
    for (const k of RUN_DETAIL_HERO_KEYS) remaining.delete(k);
    const out: { title: string; rows: Array<{ key: string; value: string }> }[] = [];
    for (const spec of RUN_DETAIL_GROUP_SPECS) {
      const rows: Array<{ key: string; value: string }> = [];
      for (const k of spec.keys) {
        if (!remaining.has(k)) continue;
        const v = remaining.get(k);
        remaining.delete(k);
        rows.push({ key: k, value: displayRunFieldValue(k, v) });
      }
      if (rows.length) out.push({ title: spec.title, rows });
    }
    const rest = [...remaining.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ key: k, value: displayRunFieldValue(k, v) }));
    if (rest.length) out.push({ title: "Other", rows: rest });
    return out;
  }, [scalarMap]);

  return (
    <div className="space-y-6 text-xs text-dark dark:text-gray-100">
      {heroCards.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            At a glance
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {heroCards.map((c) => (
              <div
                key={c.key}
                className="rounded-xl border border-stroke bg-gradient-to-br from-white to-gray-50/80 px-3 py-2.5 shadow-sm dark:border-dark-3 dark:from-gray-dark dark:to-dark-2/80"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{c.label}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-dark dark:text-white">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {groupedTables.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Technical details
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {groupedTables.map((g) => (
              <RunFieldMiniTable key={g.title} title={g.title} rows={g.rows} />
            ))}
          </div>
        </div>
      )}

      {configObj && (
        <details className="group rounded-xl border border-stroke dark:border-dark-3" open>
          <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-bold text-gray-700 marker:content-none dark:text-gray-200 [&::-webkit-details-marker]:hidden">
            <span className="text-indigo-600 dark:text-indigo-400">Brush / vacuum / wash settings</span>
            <span className="ml-2 text-[10px] font-normal text-gray-400">(tap to collapse)</span>
          </summary>
          <div className="border-t border-stroke px-3 pb-3 dark:border-dark-3">
            <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {Object.entries(configObj).map(([ck, cv]) => (
                <div
                  key={ck}
                  className="rounded-lg border border-stroke/80 bg-gray-50/80 px-2.5 py-1.5 dark:border-dark-3 dark:bg-dark-2/50"
                >
                  <p className="font-mono text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">{ck}</p>
                  <p className="font-mono text-[12px] font-bold text-dark dark:text-white">{String(cv)}</p>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {floors.length > 0 && (
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Floors and areas
          </p>
          {floors.map((fl, fi) => {
            if (!isRecord(fl)) return null;
            const mapName = String(fl.map_name ?? fl.mapName ?? "—");
            const mapFloor = String(fl.map_floor ?? fl.mapFloor ?? "—");
            const areas = Array.isArray(fl.area_array) ? fl.area_array.filter(isRecord) : [];
            const taskUrl = fl.task_result_url ?? fl.taskResultUrl;
            const localUrl = fl.task_local_url ?? fl.taskLocalUrl;
            const res = fl.result;
            const touched = areas.filter((ar) => Number(ar.clean_count ?? ar.cleanCount ?? 0) > 0);
            const displayAreas = showAllMapZones ? areas : touched;
            return (
              <div
                key={fi}
                className="overflow-hidden rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark"
              >
                <div className="border-b border-stroke bg-gray-50 px-3 py-2 dark:border-dark-3 dark:bg-dark-2/60">
                  <p className="text-sm font-bold text-dark dark:text-white">{mapName}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Floor {mapFloor}
                    {fl.map_version != null ? ` · map v${String(fl.map_version)}` : null}
                  </p>
                  {typeof taskUrl === "string" && taskUrl.startsWith("http") ? (
                    <a
                      href={taskUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-[11px] font-semibold text-indigo-600 underline dark:text-indigo-400"
                    >
                      Open task result map
                    </a>
                  ) : null}
                  {typeof localUrl === "string" && localUrl ? (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        Robot-local report path
                      </summary>
                      <p className="mt-1 break-all font-mono text-[10px] text-gray-500 dark:text-gray-400">{localUrl}</p>
                    </details>
                  ) : null}
                </div>
                {isRecord(res) ? (
                  <div className="flex flex-wrap gap-2 border-b border-stroke bg-emerald-50/40 px-3 py-2 dark:border-dark-3 dark:bg-emerald-950/20">
                    {res.area != null && Number.isFinite(Number(res.area)) ? (
                      <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold shadow-sm dark:bg-dark-2/90 dark:text-emerald-100">
                        Floor area (result): {String(roundNum(Number(res.area), 2))}
                      </span>
                    ) : null}
                    {res.time != null ? (
                      <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold shadow-sm dark:bg-dark-2/90 dark:text-emerald-100">
                        Time: {displayRunFieldValue("clean_time", res.time)}
                      </span>
                    ) : null}
                    {res.status != null ? (
                      <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold shadow-sm dark:bg-dark-2/90 dark:text-emerald-100">
                        Status: {String(res.status)}
                      </span>
                    ) : null}
                    <details className="w-full">
                      <summary className="cursor-pointer text-[10px] font-medium text-gray-600 dark:text-gray-400">
                        Full floor result JSON
                      </summary>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-black/5 p-2 font-mono text-[10px] text-gray-700 dark:bg-black/30 dark:text-gray-300">
                        {JSON.stringify(res, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : res != null ? (
                  <details className="border-b border-stroke px-3 py-2 dark:border-dark-3">
                    <summary className="cursor-pointer text-[10px] text-gray-500">Floor result (raw)</summary>
                    <pre className="mt-1 max-h-32 overflow-auto font-mono text-[10px]">{String(res)}</pre>
                  </details>
                ) : null}

                {areas.length > 0 ? (
                  <div className="p-2">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                      <p className="text-[11px] text-gray-600 dark:text-gray-400">
                        {showAllMapZones ? (
                          <>
                            Showing <span className="font-semibold">all {areas.length}</span> zones on the map layout.
                          </>
                        ) : (
                          <>
                            Showing <span className="font-semibold">{touched.length}</span> zone
                            {touched.length === 1 ? "" : "s"} with at least one clean this run (of {areas.length} on map).
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAllMapZones((v) => !v)}
                        className="rounded-lg border border-stroke bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50 dark:border-dark-3 dark:bg-dark-2 dark:text-indigo-300 dark:hover:bg-dark-3"
                      >
                        {showAllMapZones ? "Only zones cleaned" : "Show all map zones"}
                      </button>
                    </div>
                    {displayAreas.length === 0 && !showAllMapZones ? (
                      <p className="px-2 py-4 text-center text-[11px] text-gray-500">
                        No zones with clean_count &gt; 0 in this payload — use &quot;Show all map zones&quot; to inspect the
                        layout.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-stroke/80 dark:border-dark-3">
                        <table className="min-w-full divide-y divide-stroke text-left dark:divide-dark-3">
                          <thead className="bg-gray-50/90 dark:bg-dark-2/80">
                            <tr>
                              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500">#</th>
                              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                Zone
                              </th>
                              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                Area
                              </th>
                              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                Cleans
                              </th>
                              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                Type
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stroke/70 dark:divide-dark-3">
                            {displayAreas.map((ar, ai) => {
                              const cc = Number(ar.clean_count ?? ar.cleanCount ?? 0);
                              const active = cc > 0;
                              return (
                                <tr
                                  key={ai}
                                  className={
                                    active
                                      ? "bg-emerald-50/90 dark:bg-emerald-950/25"
                                      : "hover:bg-gray-50/80 dark:hover:bg-white/[0.03]"
                                  }
                                >
                                  <td className="px-3 py-1.5 font-mono text-[11px] text-gray-500">{ai + 1}</td>
                                  <td className="max-w-[16rem] px-3 py-1.5 text-[11px] font-medium text-gray-900 dark:text-gray-100">
                                    {String(ar.area_name ?? ar.areaName ?? "—")}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px]">
                                    {String(ar.area ?? "—")}
                                  </td>
                                  <td className="px-3 py-1.5 font-mono text-[11px]">{String(cc)}</td>
                                  <td className="px-3 py-1.5 font-mono text-[11px] text-gray-500">{String(ar.type ?? "—")}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="px-3 py-3 text-[11px] text-gray-400">No area_array on this floor record.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {floors.length === 0 && typeof payload.floor_list === "string" && payload.floor_list.length > 2 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          floor_list could not be parsed as JSON; open Raw JSON below to inspect.
        </p>
      )}
    </div>
  );
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
  if (u === "EXEC_AREA") return "Sum of clean_area on execution rows loaded for this serial (vendor units).";
  if (u === "EXEC_DURATION") return "Sum of clean_time on those rows, shown as hours if values look like seconds.";
  if (u === "EXEC_TASK_COUNT") return "Count of execution rows loaded for this serial in the current window.";
  return null;
}

// ── icon map for well-known metric keys ───────────────────────────────────────
function metricIcon(key: string): string {
  const u = key.toUpperCase();
  if (u === "AREA" || u === "EXEC_AREA") return "⬛";
  if (u === "PLAN_AREA") return "📐";
  if (u === "DURATION" || u === "EXEC_DURATION") return "⏱";
  if (u === "POWER_CONSUMPTION") return "⚡";
  if (u === "TASK_COUNT" || u === "EXEC_TASK_COUNT") return "✅";
  if (u === "WATER_CONSUMPTION") return "💧";
  return "📊";
}

// ── accent colour per metric (maps to Tailwind classes) ───────────────────────
function metricAccent(key: string): { bar: string; bg: string; text: string } {
  const u = key.toUpperCase();
  if (u === "AREA" || u === "PLAN_AREA" || u === "EXEC_AREA")
    return { bar: "bg-violet-500", bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300" };
  if (u === "DURATION" || u === "EXEC_DURATION")
    return { bar: "bg-sky-500", bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-700 dark:text-sky-300" };
  if (u === "POWER_CONSUMPTION")
    return { bar: "bg-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300" };
  if (u === "TASK_COUNT" || u === "EXEC_TASK_COUNT")
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
  hubRobotTabs,
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
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailJson, setDetailJson] = useState<unknown>(null);
  const [detailQuerySn, setDetailQuerySn] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const nextExecOffsetRef = useRef(0);
  const dashboardFetchGenRef = useRef(0);

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
        /** Use for the HTTP request when React state is not updated yet (e.g. right after setShopId in an effect). */
        shopIdForRequest?: string;
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
      const fetchGen = ++dashboardFetchGenRef.current;
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
        const sid = (opts.shopIdForRequest !== undefined ? opts.shopIdForRequest : shopId).trim();
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
        if (fetchGen !== dashboardFetchGenRef.current) return;
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
        if (fetchGen !== dashboardFetchGenRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
        if (!append) {
          setData(null);
          setExecutionRows([]);
        }
      } finally {
        if (fetchGen === dashboardFetchGenRef.current) {
          setLoading(false);
          setLoadMoreLoading(false);
        }
      }
    },
    [idToken, robotSerial, fromLocal, toLocal, shopId]
  );

  const prevRobotSerialRef = useRef<string | null>(null);
  const prevInitialShopRef = useRef<string | null>(null);

  useEffect(() => {
    if (!robotSerial.trim()) return;
    const sidNow = (initialShopId ?? "").trim();
    const shopChanged = prevInitialShopRef.current !== null && prevInitialShopRef.current !== sidNow;
    const robotChanged =
      prevRobotSerialRef.current !== null && prevRobotSerialRef.current !== robotSerial.trim();

    setShopId(sidNow);

    if (shopChanged || prevInitialShopRef.current === null) {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const fl = toDatetimeLocalValue(now - day);
      const tl = toDatetimeLocalValue(now);
      setFromLocal(fl);
      setToLocal(tl);
      setError(null);
      setData(null);
      setExecutionRows([]);
      setNextExecOffset(0);
      nextExecOffsetRef.current = 0;
      setHasMoreExec(false);
      setDetailJson(null);
      setDetailQuerySn(null);
      setSelectedReportId(null);
      setDetailError(null);
      void fetchDashboard({ from: fl, to: tl, shopIdForRequest: sidNow });
    } else if (robotChanged) {
      setError(null);
      setDetailJson(null);
      setDetailQuerySn(null);
      setSelectedReportId(null);
      setDetailError(null);
      void fetchDashboard({ shopIdForRequest: sidNow });
    }

    prevRobotSerialRef.current = robotSerial.trim();
    prevInitialShopRef.current = sidNow;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robotSerial, initialShopId]);

  const siteModeSummary = useMemo(() => extractSummaryObject(data?.mode), [data?.mode]);
  const robotModeSummary = useMemo(() => extractSummaryObject(data?.robot_mode), [data?.robot_mode]);

  const robotModeMatchesSite = useMemo(() => {
    if (!siteModeSummary || !robotModeSummary) return false;
    try {
      return JSON.stringify(siteModeSummary, Object.keys(siteModeSummary).sort()) ===
        JSON.stringify(robotModeSummary, Object.keys(robotModeSummary).sort());
    } catch {
      return false;
    }
  }, [siteModeSummary, robotModeSummary]);

  const showVendorRobotMetrics = !!(robotModeSummary && !robotModeMatchesSite);

  /** Executions in state still belong to the previous dashboard fetch (serial mismatch while loading). */
  const executionsPayloadStale =
    loading &&
    executionRows.length > 0 &&
    data != null &&
    String(data.sn ?? "").trim() !== robotSerial.trim();

  const executionDerivedRobotSummary = useMemo(() => {
    if (executionsPayloadStale) return null;
    return rollupExecutionsForSerial(executionRows, robotSerial);
  }, [executionRows, robotSerial, executionsPayloadStale]);

  /** Pudu query_list is shop+time scoped and often returns other robots' runs; hub table shows only the active tab serial. */
  const displayExecutionRows = useMemo(() => {
    if (variant !== "hub") return executionRows;
    const sn = robotSerial.trim().toLowerCase();
    if (!sn) return executionRows;
    return executionRows.filter(
      (r) => isRecord(r) && executionSerialFromRow(r).trim().toLowerCase() === sn
    );
  }, [executionRows, robotSerial, variant]);

  const hubExecutionsHiddenOtherSerialCount = useMemo(() => {
    if (variant !== "hub") return 0;
    const sn = robotSerial.trim().toLowerCase();
    if (!sn) return 0;
    let other = 0;
    for (const r of executionRows) {
      if (!isRecord(r)) continue;
      const rs = executionSerialFromRow(r).trim().toLowerCase();
      if (rs && rs !== sn) other += 1;
    }
    return other;
  }, [executionRows, robotSerial, variant]);

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
    const first = displayExecutionRows.find(isRecord) ?? executionRows.find(isRecord);
    if (!first) return [] as string[];
    return pickExecutionTableColumns(first);
  }, [displayExecutionRows, executionRows]);

  const loadedPeriodLabel = useMemo(() => {
    if (!fromLocal || !toLocal) return null;
    return `${formatLocalDatetimeLabel(fromLocal)} -> ${formatLocalDatetimeLabel(toLocal)}`;
  }, [fromLocal, toLocal]);

  async function openDetail(reportId: string, rowSerial?: string) {
    if (!idToken) return;
    const snForQuery = (rowSerial && rowSerial.trim()) || robotSerial.trim();
    if (!snForQuery) return;
    setSelectedReportId(reportId);
    setDetailQuerySn(snForQuery);
    setDetailLoading(true);
    setDetailError(null);
    setDetailJson(null);
    try {
      const st = localInputToUnix(fromLocal);
      const et = localInputToUnix(toLocal);
      const params = new URLSearchParams({
        sn: snForQuery,
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

  const clearExecutionDetail = useCallback(() => {
    setSelectedReportId(null);
    setDetailQuerySn(null);
    setDetailJson(null);
    setDetailError(null);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (selectedReportId == null && !detailLoading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearExecutionDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedReportId, detailLoading, clearExecutionDetail]);

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

      {/* Hub uses site + tabs above; this hero only showed prop serial and could disagree with loaded data. */}
      {variant !== "hub" && (
        <div className="relative overflow-hidden rounded-3xl bg-[#0a0e1a] px-7 py-8 shadow-xl ring-1 ring-white/10">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-indigo-700/30 blur-3xl" />
            <div className="absolute -bottom-10 right-10 h-56 w-56 rounded-full bg-cyan-600/20 blur-3xl" />
            <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-700/20 blur-2xl" />
          </div>

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
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200/90">
                Pudu · cleaning analytics
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Robot cleaning data</h1>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2 font-mono text-sm font-semibold text-white backdrop-blur-sm">
                <span aria-hidden className="text-cyan-400">
                  ⬡
                </span>
                {robotSerial}
              </span>

              {businessName && (
                <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                  <span className="text-slate-500">Member</span> · {businessName}
                </span>
              )}

              {data?.timezone_offset != null && (
                <span className="rounded-xl border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm">
                  UTC{data.timezone_offset >= 0 ? "+" : ""}
                  {data.timezone_offset}h
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
      )}

      {/* ── DEGRADED WARNING ──────────────────────────────────────────────── */}
      {(data?.degraded?.mode ||
        data?.degraded?.robot_mode ||
        data?.degraded?.paging ||
        data?.degraded?.executions) && (
        <div className="flex gap-3 rounded-2xl border border-amber-300/40 bg-amber-50/90 px-5 py-4 text-sm text-amber-950 shadow-sm dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100">
          <span className="mt-px text-xl leading-none">⚠</span>
          <div>
            <p className="font-bold">Partial data</p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {[
                data.degraded.mode && "period summary (mode)",
                data.degraded.robot_mode && "robot period summary (mode + sn)",
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
      {(siteModeSummary || robotModeSummary) && (
        <section>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-base dark:bg-violet-900/40">📊</span>
            <div>
              <p className="text-sm font-bold text-dark dark:text-white">Period summary</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Site aggregate plus robot drill-down for the selected range. Vendor{" "}
                <code className="rounded bg-black/5 px-1 font-mono text-[10px] dark:bg-white/10">clean/mode</code> is
                shop-scoped; robot serial scoping is best verified in executions.
              </p>
            </div>
          </div>
          {siteModeSummary && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Site summary (all robots under selected shop)
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(siteModeSummary).map(([k, v]) => (
                  <MetricCard key={`site-${k}`} label={k} value={v} hint={metricHint(k)} />
                ))}
              </div>
            </div>
          )}

          {variant === "hub" && hubRobotTabs && hubRobotTabs.tabs.length > 0 && (
            <div className="mt-5 rounded-2xl border border-stroke/80 bg-white/95 p-4 shadow-sm dark:border-dark-3 dark:bg-gray-dark/90">
              <p className="text-sm font-bold text-dark dark:text-white">Robot tabs</p>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                Site is the primary scope. Choose a robot tab to drill into robot-level summary and executions.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {hubRobotTabs.tabs.map((tab, ti) => {
                  const active = hubRobotTabs.activeSn === tab.sn;
                  const isDefaultTab = !hubRobotTabs.hasManualSelection && ti === 0;
                  return (
                    <button
                      key={`${tab.sn}-${tab.product}-${ti}`}
                      type="button"
                      onClick={() => hubRobotTabs.onSelect(tab.sn)}
                      className={
                        active
                          ? "rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-emerald-950 transition dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
                          : "rounded-xl border border-stroke bg-white px-3 py-2 text-left text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">{tab.product}</span>
                        {isDefaultTab && (
                          <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[12px]">{tab.sn}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Selected robot summary ({robotSerial})
            </p>
            {robotModeMatchesSite && (
              <p className="mb-3 rounded-xl border border-dashed border-stroke px-3 py-2 text-xs text-gray-500 dark:border-dark-3 dark:text-gray-400">
                Pudu returned the same <span className="font-mono">clean/mode</span> aggregate with{" "}
                <span className="font-mono">sn</span> as without it for this shop/window, so vendor cards would duplicate
                the site summary.
              </p>
            )}
            {showVendorRobotMetrics && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(robotModeSummary!).map(([k, v]) => (
                  <MetricCard key={`robot-${k}`} label={k} value={v} hint={metricHint(k)} />
                ))}
              </div>
            )}
            {executionsPayloadStale && (
              <p className="mb-3 rounded-xl border border-stroke bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-dark-3 dark:bg-dark-2/60 dark:text-gray-300">
                Loading execution-backed metrics for <span className="font-mono">{robotSerial}</span>… (table rows may
                still reflect the previous serial until this request finishes.)
              </p>
            )}
            {executionDerivedRobotSummary && !showVendorRobotMetrics && (
              <div>
                <p className="mb-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  Pudu <span className="font-mono">clean/mode</span> is not serial-scoped for this shop (or duplicates the
                  site aggregate). Below sums the <span className="font-semibold">Executions</span> rows already loaded
                  for this serial—use <span className="font-semibold">Older runs (next page)</span> if the window has more
                  pages.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Object.entries(executionDerivedRobotSummary).map(([k, v]) => (
                    <MetricCard key={`exec-${k}`} label={k} value={v} hint={metricHint(k)} />
                  ))}
                </div>
              </div>
            )}
            {!showVendorRobotMetrics && !executionDerivedRobotSummary && !executionsPayloadStale && (
              <p className="rounded-xl border border-dashed border-stroke px-3 py-2 text-xs text-gray-500 dark:border-dark-3 dark:text-gray-400">
                {data?.degraded?.robot_mode
                  ? "Robot-level summary is currently unavailable from Pudu for this request, and there are no execution rows loaded for this serial yet."
                  : executionRows.length > 0
                    ? "Could not match loaded execution rows to this serial (unexpected payload shape). Check the SN column in Executions."
                    : "No vendor robot summary and no execution rows loaded for this serial in this window."}
              </p>
            )}
          </div>

        </section>
      )}

      {/* ── EXECUTIONS TABLE ──────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-base dark:bg-emerald-900/40">🗂</span>
          <div>
            <p className="text-sm font-bold text-dark dark:text-white">Executions</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Cleaning runs from Pudu <span className="font-mono">clean_task/query_list</span> for this time window.
            </p>
            {variant === "hub" && hubRobotTabs && (
              <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                The feed is scoped to the whole site, so Pudu can return runs from every robot in that window. This table
                lists only <span className="font-mono font-medium text-dark dark:text-gray-200">{robotSerial}</span>
                {hubExecutionsHiddenOtherSerialCount > 0 ? (
                  <>
                    {" "}
                    ({hubExecutionsHiddenOtherSerialCount} run
                    {hubExecutionsHiddenOtherSerialCount === 1 ? "" : "s"} from other robots in the same window are omitted
                    here).
                  </>
                ) : (
                  "."
                )}
              </p>
            )}
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
          ) : displayExecutionRows.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Pudu returned {executionRows.filter(isRecord).length} run(s) for this shop, but none have an{" "}
                <span className="font-mono">SN</span> matching{" "}
                <span className="font-mono font-semibold">{robotSerial}</span>. Try another robot tab or adjust the time
                range.
              </p>
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
                      Task
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke/60 dark:divide-dark-3">
                  {displayExecutionRows.map((row, ri) => {
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
                    const rowSn = executionSerialFromRow(row);
                    const selected = rid != null && selectedReportId === rid;
                    return (
                      <tr
                        key={ri}
                        className={`group transition-colors duration-100 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 ${
                          selected ? "bg-indigo-50/90 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-950/30 dark:ring-indigo-800" : ""
                        }`}
                      >
                        {tableColumns.map((c) => (
                          <td
                            key={c}
                            className="max-w-[11rem] px-4 py-3 align-top font-mono text-[11px] text-dark dark:text-gray-300"
                            title={String(row[c] ?? "")}
                          >
                            <ExecutionTableCell column={c} row={row} />
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          {rid ? (
                            <button
                              type="button"
                              className={
                                selected
                                  ? "rounded-lg border border-indigo-500 bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm dark:border-indigo-400 dark:bg-indigo-600"
                                  : "rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                              }
                              onClick={() => void openDetail(rid, rowSn || undefined)}
                            >
                              {selected && detailLoading ? "Loading…" : "Task detail"}
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
              <p className="mb-2 max-w-xl text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                Pudu returns this list in pages (newest first). If there are more runs in your date range, the button below
                fetches the next page and <span className="font-semibold text-dark dark:text-gray-200">appends</span> rows
                to this table without reloading the rest of the dashboard.
              </p>
              <button
                type="button"
                disabled={loadMoreLoading}
                onClick={() => void fetchDashboard({ appendExecutions: true, onlyExecutions: true })}
                className="rounded-xl border border-stroke bg-white px-4 py-2 text-xs font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50 dark:border-dark-3 dark:bg-gray-dark dark:text-indigo-400 dark:hover:bg-dark-2 disabled:opacity-50"
              >
                {loadMoreLoading ? "Loading…" : "Older runs (next page)"}
              </button>
            </div>
          )}
        </div>

        {(selectedReportId != null || detailLoading || detailError != null || detailJson != null) && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stroke bg-gray-50/90 px-4 py-3 dark:border-dark-3 dark:bg-dark-2/60">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Task detail (clean_task/query)
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-dark dark:text-white">
                  report_id {selectedReportId ?? "—"}
                </p>
                {detailQuerySn ? (
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                    Queried with serial <span className="font-mono text-gray-800 dark:text-gray-200">{detailQuerySn}</span>
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => clearExecutionDetail()}
                className="rounded-xl border border-stroke bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-gray-300 dark:hover:bg-dark-2"
              >
                Clear
              </button>
            </div>
            <div className="p-4">
              {detailLoading && (
                <div className="flex items-center gap-3 py-6 text-gray-500 dark:text-gray-400">
                  <svg className="h-5 w-5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span className="text-sm">Loading task payload…</span>
                </div>
              )}
              {detailError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {detailError}
                </div>
              )}
              {!detailLoading && detailJson != null && isRecord(detailJson) && (
                <>
                  <ExecutionTaskDetailTables payload={detailJson} />
                  <details className="mt-4 rounded-xl border border-stroke bg-gray-50/50 dark:border-dark-3 dark:bg-dark-2/40">
                    <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                      Raw JSON (copy-friendly)
                    </summary>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border-t border-stroke p-3 font-mono text-[11px] leading-relaxed text-gray-800 dark:border-dark-3 dark:text-emerald-200/90">
                      {JSON.stringify(detailJson, null, 2)}
                    </pre>
                  </details>
                </>
              )}
              {!detailLoading && detailJson != null && !isRecord(detailJson) && (
                <>
                  <div className="rounded-xl border border-stroke bg-gray-50/50 p-3 text-gray-900 dark:border-dark-3 dark:bg-dark-2/40 dark:text-gray-100">
                    <JsonValueView value={detailJson} depth={0} compact />
                  </div>
                  <details className="mt-4 rounded-xl border border-stroke bg-gray-50/50 dark:border-dark-3 dark:bg-dark-2/40">
                    <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                      Raw JSON (copy-friendly)
                    </summary>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border-t border-stroke p-3 font-mono text-[11px] leading-relaxed text-gray-800 dark:border-dark-3 dark:text-emerald-200/90">
                      {JSON.stringify(detailJson, null, 2)}
                    </pre>
                  </details>
                </>
              )}
              <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-500">
                Press <kbd className="rounded border border-stroke bg-gray-100 px-1 font-mono dark:border-dark-3 dark:bg-dark-2">Esc</kbd> to clear this panel.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}