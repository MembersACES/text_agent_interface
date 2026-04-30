"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/utils";

type Row = Record<string, unknown>;
type MatchStrategy = "exact" | "case_insensitive" | "normalized_whitespace";
type UtilityCategory = "Electricity" | "Gas" | "Waste" | "Oil" | "Cleaning" | "Other";

type BusinessInfoPayload = Record<string, unknown> & {
  business_details?: Record<string, unknown>;
  Linked_Details?: {
    linked_utilities?: Record<string, unknown>;
    utility_retailers?: Record<string, unknown>;
    linked_utility_extra?: Record<string, UtilityExtra[]>;
  };
  _processed_file_ids?: Record<string, unknown>;
};

type UtilityExtra = {
  contract_end_date?: string;
  data_requested?: string;
  data_recieved?: string | boolean;
  data_received?: string | boolean;
};

type UtilityConfig = { key: string; label: string; sourceKey?: string };
type UtilityRow = {
  utilityType: string;
  category: UtilityCategory;
  label: string;
  identifier: string;
  retailer: string;
  extra?: UtilityExtra;
};

type InvoiceDiagnostics = {
  account_table?: string;
  invoice_table?: string;
  account_record_found?: boolean;
  linked_invoice_ids_count?: number;
  records_returned_count?: number;
  matched_field?: string;
  matched_strategy?: string;
};
type UtilityInvoiceApiResponse = {
  rows?: Row[];
  count?: number;
  total_count?: number;
  diagnostics?: InvoiceDiagnostics;
};

type UtilityInvoiceState = {
  rows: Row[];
  totalCount: number;
  fetchedAt: number;
  diagnostics?: InvoiceDiagnostics;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

const UTILITY_CONFIG: UtilityConfig[] = [
  { key: "C&I Electricity", label: "NMI" },
  { key: "SME Electricity", label: "NMI" },
  { key: "C&I Gas", label: "MRIN" },
  { key: "SME Gas", label: "MRIN" },
  { key: "Small Gas", label: "MRIN", sourceKey: "SME Gas" },
  { key: "Waste", label: "Account Number" },
  { key: "Oil", label: "Account Name" },
  { key: "Cleaning", label: "Client Name" },
];

const NULLISH_STRINGS = new Set(["", "null", "n/a", "na", "none", "-", "--", "undefined"]);

function parseWipDocId(info: BusinessInfoPayload | null): string | null {
  const value = info?._processed_file_ids?.business_WIP;
  if (!value || typeof value !== "string") return null;
  const match = value.match(/\/d\/([^/]+)/);
  return match?.[1] ?? null;
}

function utilityCategory(type: string): UtilityCategory {
  const t = type.toLowerCase();
  if (t.includes("electricity")) return "Electricity";
  if (t.includes("gas")) return "Gas";
  if (t.includes("waste")) return "Waste";
  if (t.includes("oil")) return "Oil";
  if (t.includes("clean")) return "Cleaning";
  return "Other";
}

function normalizeValue(value: unknown): string | number | boolean {
  if (value == null) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (NULLISH_STRINGS.has(trimmed.toLowerCase())) return "";
    if (trimmed === "[object Object]") return "";
    const numeric = Number(trimmed.replace(/[$,]/g, ""));
    if (!Number.isNaN(numeric) && /[$\d,.]/.test(trimmed)) return numeric;
    return trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => normalizeValue(v)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("url" in obj) return String(obj.url ?? "");
    return JSON.stringify(obj);
  }
  return String(value);
}

function parseFlexibleDate(value: unknown): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const native = Date.parse(raw);
  if (!Number.isNaN(native)) return native;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return 0;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const parsed = new Date(year, month - 1, day).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getInvoiceSortTimestamp(row: Row): number {
  const keys = [
    "Invoice Date",
    "invoice_date",
    "Invoice Date Formatted",
    "Review Period",
    "Invoice Review Period",
    "Billing Period",
  ];
  for (const key of keys) {
    const val = row[key];
    if (!val) continue;
    const text = String(val);
    if (text.includes("-") || / to /i.test(text)) {
      const parts = / to /i.test(text) ? text.split(/ to /i) : text.split("-");
      const endTs = parseFlexibleDate(parts[1]);
      if (endTs > 0) return endTs;
    }
    const ts = parseFlexibleDate(text);
    if (ts > 0) return ts;
  }
  return 0;
}

function normalizeInvoiceRows(rows: Row[], identifier: string): Row[] {
  const dedupe = new Map<string, Row>();
  const periodCount = new Map<string, number>();
  rows.forEach((raw) => {
    const normalized: Row = {};
    Object.entries(raw).forEach(([k, v]) => {
      if (k === "row_number") return;
      normalized[k] = normalizeValue(v);
    });
    const invoiceNo = String(normalized["Invoice Number"] ?? normalized.invoice_number ?? "");
    const period = String(normalized["Review Period"] ?? normalized["Invoice Review Period"] ?? "");
    const key = String(normalized.record_id ?? `${invoiceNo}|${period}|${identifier}`);
    if (!dedupe.has(key)) dedupe.set(key, normalized);
    if (period) periodCount.set(period, (periodCount.get(period) ?? 0) + 1);
  });

  return [...dedupe.values()]
    .map((row) => {
      const warnings: string[] = [];
      const dateValue = row["Invoice Date"] ?? row.invoice_date ?? row["Invoice Date Formatted"];
      if (!dateValue || parseFlexibleDate(dateValue) === 0) warnings.push("missing_invoice_date");
      const total = Number(row["Total Invoice Cost:"] ?? row["Invoice Total:"] ?? row.total_amount ?? "");
      if (!Number.isNaN(total) && total < 0) warnings.push("suspicious_total");
      const period = String(row["Review Period"] ?? row["Invoice Review Period"] ?? "");
      if (period && (periodCount.get(period) ?? 0) > 1) warnings.push("duplicate_period");
      return { ...row, _row_warnings: warnings };
    })
    .sort((a, b) => getInvoiceSortTimestamp(b) - getInvoiceSortTimestamp(a));
}

/** Same rules as BusinessInfoDisplay: n8n often sends `{ identifier, retailer, … }[]` instead of plain strings. */
function toSafeIdentifier(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim() === "[object Object]" ? "" : v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && v !== null && "identifier" in v) {
    return toSafeIdentifier((v as { identifier: unknown }).identifier);
  }
  const s = String(v);
  return s === "[object Object]" ? "" : s;
}

/** If the row is shaped like `{ NMI: "…" }` without `identifier`, pick a sensible field. */
function identifierFromUtilityObject(o: Record<string, unknown>): string {
  const direct = toSafeIdentifier(o.identifier);
  if (direct) return direct;
  const fallbacks = [
    "NMI",
    "nmi",
    "MRIN",
    "mrin",
    "Account Number",
    "Account Number or Customer Number",
    "Client Name",
    "Account Name",
  ];
  for (const k of fallbacks) {
    if (k in o && o[k] != null) {
      const s = toSafeIdentifier(o[k]);
      if (s) return s;
    }
  }
  return "";
}

function extraFromUtilityObject(o: Record<string, unknown>): UtilityExtra | undefined {
  const has =
    o.ced != null ||
    o.data_requested != null ||
    o.data_received != null ||
    o.data_recieved != null;
  if (!has) return undefined;
  return {
    contract_end_date: typeof o.ced === "string" ? o.ced : undefined,
    data_requested: typeof o.data_requested === "string" ? o.data_requested : undefined,
    data_received: o.data_received as string | boolean | undefined,
    data_recieved: (o.data_recieved as string | boolean | undefined) ?? (o.data_received as string | boolean | undefined),
  };
}

function toRows(
  linkedUtilities: Record<string, unknown>,
  utilityRetailers: Record<string, unknown>,
  utilityExtra: Record<string, UtilityExtra[]>
): UtilityRow[] {
  const out: UtilityRow[] = [];
  for (const conf of UTILITY_CONFIG) {
    const sourceKey = conf.sourceKey ?? conf.key;
    const utilityValue = linkedUtilities[sourceKey];
    const retailerValue = utilityRetailers[sourceKey];
    const extraValue = utilityExtra[sourceKey] ?? [];

    let entries: Array<{ identifier: string; retailer: string; extra?: UtilityExtra }> = [];

    if (typeof utilityValue === "string") {
      const ids = utilityValue.split(",").map((v) => v.trim()).filter(Boolean);
      entries = ids.map((identifier, idx) => ({
        identifier,
        retailer: Array.isArray(retailerValue)
          ? String(retailerValue[idx] ?? "")
          : String(retailerValue ?? ""),
        extra: Array.isArray(extraValue) ? extraValue[idx] : undefined,
      }));
    } else if (Array.isArray(utilityValue) && utilityValue.length > 0) {
      const first = utilityValue[0];
      const firstIsPlainObject =
        first != null && typeof first === "object" && !Array.isArray(first);

      if (firstIsPlainObject) {
        entries = utilityValue.map((raw, idx) => {
          const o = raw as Record<string, unknown>;
          const identifier = identifierFromUtilityObject(o) || toSafeIdentifier(o);
          const fromObjExtra = extraFromUtilityObject(o);
          const retailerFromObj = o.retailer != null ? String(o.retailer) : "";
          return {
            identifier,
            retailer:
              retailerFromObj ||
              (Array.isArray(retailerValue) ? String(retailerValue[idx] ?? "") : String(retailerValue ?? "")),
            extra: fromObjExtra ?? (Array.isArray(extraValue) ? extraValue[idx] : undefined),
          };
        });
      } else {
        entries = utilityValue.map((raw, idx) => ({
          identifier: toSafeIdentifier(raw),
          retailer: Array.isArray(retailerValue)
            ? String(retailerValue[idx] ?? "")
            : String(retailerValue ?? ""),
          extra: Array.isArray(extraValue) ? extraValue[idx] : undefined,
        }));
      }
    }

    entries
      .filter((e) => e.identifier.length > 0)
      .forEach((e) => {
        out.push({
          utilityType: sourceKey,
          category: utilityCategory(sourceKey),
          label: conf.label,
          identifier: e.identifier,
          retailer: e.retailer,
          extra: e.extra,
        });
      });
  }
  return out;
}

function boolLabel(value: unknown): "Yes" | "No" {
  if (value === true) return "Yes";
  const s = String(value ?? "").trim().toLowerCase();
  if (["yes", "true", "1", "y", "received"].includes(s)) return "Yes";
  return "No";
}

function getCellLink(key: string, value: unknown): { href: string; text: string } | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  if (str.startsWith("http://") || str.startsWith("https://")) return { href: str, text: str };
  const keyLower = key.toLowerCase();
  const idLike = keyLower.includes("file id") || keyLower.includes("file_id");
  if (idLike && /^[a-zA-Z0-9_-]{20,}$/.test(str)) {
    return { href: `https://drive.google.com/file/d/${str}/view`, text: str };
  }
  return null;
}

function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-AU");
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value: unknown) => {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  rows.forEach((row) => lines.push(headers.map((h) => escape(row[h])).join(",")));
  return lines.join("\n");
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function GhgReportingPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken ??
    "";

  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfoPayload | null>(null);
  const [ghgRows, setGhgRows] = useState<Row[]>([]);
  const [openUtilityKeys, setOpenUtilityKeys] = useState<Record<string, boolean>>({});
  const [invoiceRowsByUtilityKey, setInvoiceRowsByUtilityKey] = useState<Record<string, Row[]>>({});
  const [invoiceMetaByUtilityKey, setInvoiceMetaByUtilityKey] = useState<
    Record<string, UtilityInvoiceState>
  >({});
  const [invoiceLoadingByUtilityKey, setInvoiceLoadingByUtilityKey] = useState<Record<string, boolean>>(
    {}
  );
  const [invoiceErrorByUtilityKey, setInvoiceErrorByUtilityKey] = useState<Record<string, string | null>>(
    {}
  );
  const [invoiceOffsetByUtilityKey, setInvoiceOffsetByUtilityKey] = useState<Record<string, number>>({});
  const [showAllColumnsByUtilityKey, setShowAllColumnsByUtilityKey] = useState<Record<string, boolean>>({});
  const [matchStrategy, setMatchStrategy] = useState<MatchStrategy>("exact");
  const [onlyNoDataReceived, setOnlyNoDataReceived] = useState(false);
  const [onlyNoInvoices, setOnlyNoInvoices] = useState(false);
  const [utilityTypeFilter, setUtilityTypeFilter] = useState<UtilityCategory | "All">("All");
  const [exporting, setExporting] = useState(false);

  const urlPrefillDone = useRef(false);
  const abortControllers = useRef<Record<string, AbortController>>({});
  const cacheRef = useRef<Record<string, UtilityInvoiceState>>({});

  const linkedUtilities = useMemo(
    () => businessInfo?.Linked_Details?.linked_utilities ?? {},
    [businessInfo]
  );
  const utilityRetailers = useMemo(
    () => businessInfo?.Linked_Details?.utility_retailers ?? {},
    [businessInfo]
  );
  const utilityExtra = useMemo(
    () => businessInfo?.Linked_Details?.linked_utility_extra ?? {},
    [businessInfo]
  );
  const utilityRows = useMemo(
    () => toRows(linkedUtilities, utilityRetailers, utilityExtra),
    [linkedUtilities, utilityRetailers, utilityExtra]
  );

  const rowKeyFor = useCallback((row: UtilityRow, idx: number) => `${row.utilityType}-${row.identifier}-${idx}`, []);

  const loadBusinessContext = useCallback(
    async (targetBusinessName: string) => {
      if (!targetBusinessName.trim()) return;
      if (!token) {
        setError("Please sign in first.");
        return;
      }
      setLoading(true);
      setError(null);
      setBusinessInfo(null);
      setGhgRows([]);
      setOpenUtilityKeys({});
      setInvoiceRowsByUtilityKey({});
      setInvoiceMetaByUtilityKey({});
      setInvoiceLoadingByUtilityKey({});
      setInvoiceErrorByUtilityKey({});
      setInvoiceOffsetByUtilityKey({});
      cacheRef.current = {};
      Object.values(abortControllers.current).forEach((c) => c.abort());
      abortControllers.current = {};

      try {
        const base = getApiBaseUrl();
        const infoRes = await fetch(`${base}/api/get-business-info`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ business_name: targetBusinessName.trim() }),
        });
        if (!infoRes.ok) {
          const details = await infoRes.json().catch(() => ({}));
          throw new Error((details as { detail?: string }).detail ?? "Failed to load business info.");
        }
        const infoData = (await infoRes.json()) as BusinessInfoPayload;
        setBusinessInfo(infoData);
        const resolvedBusinessName = String(infoData.business_details?.name ?? targetBusinessName).trim();
        const wipDocId = parseWipDocId(infoData);
        const ghgRes = await fetch("/api/ghg-reporting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business_name: resolvedBusinessName, wip_document_id: wipDocId ?? undefined }),
        });
        if (ghgRes.ok) {
          const ghgJson = (await ghgRes.json()) as { data?: Row[] };
          setGhgRows(Array.isArray(ghgJson.data) ? ghgJson.data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, normalizeValue(v)]))) : []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load reporting context.");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (urlPrefillDone.current) return;
    const fromUrl = searchParams.get("businessName")?.trim();
    if (!fromUrl) return;
    urlPrefillDone.current = true;
    setBusinessName(fromUrl);
    void loadBusinessContext(fromUrl);
  }, [searchParams, loadBusinessContext]);

  const fetchUtilityInvoiceRows = useCallback(
    async (utilityKey: string, utilityType: string, identifier: string, options?: { force?: boolean; offset?: number }) => {
      if (!token) return;
      const offset = options?.offset ?? 0;
      const cacheKey = `${utilityKey}|${offset}|${matchStrategy}`;
      const cached = cacheRef.current[cacheKey];
      if (!options?.force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setInvoiceRowsByUtilityKey((prev) => ({ ...prev, [utilityKey]: cached.rows }));
        setInvoiceMetaByUtilityKey((prev) => ({ ...prev, [utilityKey]: cached }));
        return;
      }
      abortControllers.current[utilityKey]?.abort();
      const controller = new AbortController();
      abortControllers.current[utilityKey] = controller;
      setInvoiceLoadingByUtilityKey((prev) => ({ ...prev, [utilityKey]: true }));
      setInvoiceErrorByUtilityKey((prev) => ({ ...prev, [utilityKey]: null }));

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/utility-invoice-rows`, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            utility_type: utilityType,
            identifier,
            max_records: 100,
            offset,
            sort_dir: "desc",
            match_strategy: matchStrategy,
            fallback_fields: utilityType === "Oil" ? ["Client Name", "Account Number / Customer Code"] : [],
          }),
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
          throw new Error(payload.detail || payload.error || "Failed to load invoice rows.");
        }
        const payload = (await res.json()) as UtilityInvoiceApiResponse;
        const normalizedRows = normalizeInvoiceRows(Array.isArray(payload.rows) ? payload.rows : [], identifier);
        const nextState: UtilityInvoiceState = {
          rows: normalizedRows,
          totalCount: Number(payload.total_count ?? normalizedRows.length),
          diagnostics: payload.diagnostics,
          fetchedAt: Date.now(),
        };
        cacheRef.current[cacheKey] = nextState;
        setInvoiceRowsByUtilityKey((prev) => ({ ...prev, [utilityKey]: normalizedRows }));
        setInvoiceMetaByUtilityKey((prev) => ({ ...prev, [utilityKey]: nextState }));
        setInvoiceOffsetByUtilityKey((prev) => ({ ...prev, [utilityKey]: offset }));
      } catch (e) {
        if (controller.signal.aborted) return;
        setInvoiceErrorByUtilityKey((prev) => ({
          ...prev,
          [utilityKey]: e instanceof Error ? e.message : "Failed to load invoice rows.",
        }));
      } finally {
        setInvoiceLoadingByUtilityKey((prev) => ({ ...prev, [utilityKey]: false }));
      }
    },
    [matchStrategy, token]
  );

  const filteredUtilityRows = useMemo(() => {
    return utilityRows.filter((row, idx) => {
      const rowKey = rowKeyFor(row, idx);
      if (utilityTypeFilter !== "All" && row.category !== utilityTypeFilter) return false;
      if (onlyNoDataReceived && boolLabel(row.extra?.data_recieved ?? row.extra?.data_received) !== "No") return false;
      if (onlyNoInvoices && (invoiceMetaByUtilityKey[rowKey]?.totalCount ?? 0) > 0) return false;
      return true;
    });
  }, [utilityRows, utilityTypeFilter, onlyNoDataReceived, onlyNoInvoices, invoiceMetaByUtilityKey, rowKeyFor]);

  const currentBusinessName = String(businessInfo?.business_details?.name ?? businessName);
  const hasOpenUtilities = Object.values(openUtilityKeys).some(Boolean);

  const openUtilityRows = useMemo(() => {
    return utilityRows
      .map((row, idx) => ({ row, idx, key: rowKeyFor(row, idx) }))
      .filter((x) => openUtilityKeys[x.key]);
  }, [openUtilityKeys, rowKeyFor, utilityRows]);

  const ghgFactorAverage = useMemo(() => {
    const factors = ghgRows
      .map((r) => Number(r["Emission factor kg CO2‑e GJ/kWh"] ?? r["Scope 1 Emission Factor (kg CO2‑e/GJ) Combined gases CO2-e"] ?? ""))
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (!factors.length) return 0;
    return factors.reduce((acc, n) => acc + n, 0) / factors.length;
  }, [ghgRows]);

  const rollups = useMemo(() => {
    const byPeriod = new Map<string, { cost: number; usage: number; emissions: number }>();
    openUtilityRows.forEach(({ key }) => {
      (invoiceRowsByUtilityKey[key] ?? []).forEach((r) => {
        const period = String(r["Invoice Review Period"] ?? r["Review Period"] ?? r["Billing Period"] ?? "Unknown");
        const usage = Number(r["Activity data kWh"] ?? r["Energy Charge Quantity in GJ"] ?? r["General Usage Quantity"] ?? "0");
        const cost = Number(r["Invoice Total:"] ?? r["Total Invoice Cost:"] ?? r.total_amount ?? "0");
        const bucket = byPeriod.get(period) ?? { cost: 0, usage: 0, emissions: 0 };
        bucket.cost += Number.isNaN(cost) ? 0 : cost;
        bucket.usage += Number.isNaN(usage) ? 0 : usage;
        bucket.emissions += Number.isNaN(usage) ? 0 : usage * (ghgFactorAverage || 0);
        byPeriod.set(period, bucket);
      });
    });
    const entries = [...byPeriod.entries()].map(([period, v]) => ({ period, ...v }));
    const sorted = entries.sort((a, b) => parseFlexibleDate(b.period) - parseFlexibleDate(a.period));
    const current = sorted[0];
    const prior = sorted[1];
    return {
      rows: sorted,
      currentVsPrior:
        current && prior
          ? {
              costDelta: current.cost - prior.cost,
              usageDelta: current.usage - prior.usage,
              emissionsDelta: current.emissions - prior.emissions,
            }
          : null,
    };
  }, [ghgFactorAverage, invoiceRowsByUtilityKey, openUtilityRows]);

  const readiness = useMemo(() => {
    const missingIdentifiers = utilityRows.filter((r) => !r.identifier).length;
    const missingDataReceived = utilityRows.filter(
      (r) => boolLabel(r.extra?.data_recieved ?? r.extra?.data_received) === "No"
    ).length;
    const missingFactors = ghgRows.filter(
      (r) =>
        !r["Emission factor kg CO2‑e GJ/kWh"] &&
        !r["Scope 1 Emission Factor (kg CO2‑e/GJ) Combined gases CO2-e"]
    ).length;
    return { missingIdentifiers, missingDataReceived, missingFactors };
  }, [ghgRows, utilityRows]);

  const exportVisibleUtilityTables = useCallback(() => {
    setExporting(true);
    try {
      const exportRows: Row[] = [];
      filteredUtilityRows.forEach((row, idx) => {
        const key = rowKeyFor(row, idx);
        const rows = invoiceRowsByUtilityKey[key] ?? [];
        if (!rows.length) {
          exportRows.push({
            utility_type: row.utilityType,
            identifier: row.identifier,
            retailer: row.retailer,
            note: "No invoice rows loaded",
          });
          return;
        }
        rows.forEach((invoice) =>
          exportRows.push({ utility_type: row.utilityType, identifier: row.identifier, retailer: row.retailer, ...invoice })
        );
      });
      downloadCsv(`ghg-utilities-${Date.now()}.csv`, exportRows);
    } finally {
      setExporting(false);
    }
  }, [filteredUtilityRows, invoiceRowsByUtilityKey, rowKeyFor]);

  const exportPackage = useCallback(() => {
    const summaryRows: Row[] = [
      {
        business_name: currentBusinessName,
        linked_utilities: utilityRows.length,
        ghg_records: ghgRows.length,
        missing_identifiers: readiness.missingIdentifiers,
        missing_data_received: readiness.missingDataReceived,
        missing_emission_factors: readiness.missingFactors,
      },
      ...rollups.rows.map((r) => ({
        type: "period_rollup",
        period: r.period,
        cost: r.cost.toFixed(2),
        usage: r.usage.toFixed(2),
        estimated_emissions: r.emissions.toFixed(2),
      })),
    ];
    downloadCsv(`ghg-package-summary-${Date.now()}.csv`, summaryRows);
    downloadCsv(`ghg-package-records-${Date.now()}.csv`, ghgRows);
  }, [currentBusinessName, ghgRows, readiness, rollups.rows, utilityRows.length]);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    await loadBusinessContext(businessName);
  };

  return (
    <div className="space-y-4">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-xl">GHG Reporting</CardTitle>
          <CardDescription>Search a business, inspect utility invoice health, and review GHG readiness.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter business name"
              className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
            />
            <button
              type="submit"
              disabled={loading || !businessName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load Context"}
            </button>
          </form>
          {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Business Context</CardTitle>
          <CardDescription>{currentBusinessName || "No business loaded yet"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Linked utilities" value={utilityRows.length} />
          <Stat label="GHG records" value={ghgRows.length} />
          <Stat label="ABN" value={String(businessInfo?.business_details?.abn ?? "—")} />
          <Stat label="Avg factor" value={ghgFactorAverage ? ghgFactorAverage.toFixed(3) : "—"} />
        </CardContent>
      </Card>

      <div className="sticky top-2 z-10 rounded-lg border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-dark-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next: Record<string, boolean> = {};
              utilityRows.forEach((row, idx) => {
                const key = rowKeyFor(row, idx);
                next[key] = true;
                void fetchUtilityInvoiceRows(key, row.utilityType, row.identifier, { offset: invoiceOffsetByUtilityKey[key] ?? 0 });
              });
              setOpenUtilityKeys(next);
            }}
            className="rounded-md border border-stroke px-2.5 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3"
          >
            Expand all
          </button>
          <button
            type="button"
            disabled={!hasOpenUtilities}
            onClick={() => {
              setOpenUtilityKeys({});
              Object.values(abortControllers.current).forEach((c) => c.abort());
            }}
            className="rounded-md border border-stroke px-2.5 py-1 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-3"
          >
            Collapse all
          </button>
          <button
            type="button"
            onClick={() => {
              openUtilityRows.forEach(({ row, key }) => {
                void fetchUtilityInvoiceRows(key, row.utilityType, row.identifier, {
                  force: true,
                  offset: invoiceOffsetByUtilityKey[key] ?? 0,
                });
              });
            }}
            className="rounded-md border border-stroke px-2.5 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3"
          >
            Refresh all open
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={exportVisibleUtilityTables}
            className="rounded-md border border-stroke px-2.5 py-1 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-3"
          >
            {exporting ? "Exporting..." : "Export visible table"}
          </button>
          <button
            type="button"
            onClick={exportPackage}
            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Generate package
          </button>
        </div>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Linked Utilities</CardTitle>
          <CardDescription>Filter utilities, then expand a row to inspect invoices inline.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 grid gap-2 md:grid-cols-4">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={onlyNoDataReceived} onChange={(e) => setOnlyNoDataReceived(e.target.checked)} />
              Show only no data received
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={onlyNoInvoices} onChange={(e) => setOnlyNoInvoices(e.target.checked)} />
              Show only no invoices
            </label>
            <label className="text-xs">
              Utility type
              <select
                value={utilityTypeFilter}
                onChange={(e) => setUtilityTypeFilter(e.target.value as UtilityCategory | "All")}
                className="mt-1 w-full rounded border border-stroke bg-white px-2 py-1 text-xs dark:border-dark-3 dark:bg-dark-2"
              >
                <option value="All">All</option>
                <option value="Electricity">Electricity</option>
                <option value="Gas">Gas</option>
                <option value="Waste">Waste</option>
                <option value="Oil">Oil</option>
                <option value="Cleaning">Cleaning</option>
              </select>
            </label>
            <label className="text-xs">
              Match strategy
              <select
                value={matchStrategy}
                onChange={(e) => setMatchStrategy(e.target.value as MatchStrategy)}
                className="mt-1 w-full rounded border border-stroke bg-white px-2 py-1 text-xs dark:border-dark-3 dark:bg-dark-2"
              >
                <option value="exact">Exact</option>
                <option value="case_insensitive">Case-insensitive</option>
                <option value="normalized_whitespace">Normalized whitespace</option>
              </select>
            </label>
          </div>

          {filteredUtilityRows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No linked utilities match the current filters.</p>
          ) : (
            <div className="space-y-2">
              {filteredUtilityRows.map((row, idx) => {
                const rowKey = rowKeyFor(row, idx);
                const isOpen = Boolean(openUtilityKeys[rowKey]);
                const invoiceRows = invoiceRowsByUtilityKey[rowKey] ?? [];
                const invoiceMeta = invoiceMetaByUtilityKey[rowKey];
                const warningsCount = invoiceRows.reduce((acc, r) => acc + ((r._row_warnings as string[] | undefined)?.length ?? 0), 0);
                const latestTs = invoiceRows.length ? getInvoiceSortTimestamp(invoiceRows[0]) : 0;
                const dataReceivedLabel = boolLabel(row.extra?.data_recieved ?? row.extra?.data_received);
                const hasInvoices = (invoiceMeta?.totalCount ?? invoiceRows.length) > 0;
                const statusClass = !hasInvoices
                  ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-950/20"
                  : dataReceivedLabel === "No" || warningsCount > 0
                    ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/20"
                    : "border-green-300 bg-green-50 dark:border-green-500/40 dark:bg-green-950/20";
                const pageOffset = invoiceOffsetByUtilityKey[rowKey] ?? 0;

                const keys = Object.keys(invoiceRows[0] ?? {}).filter((k) => !k.startsWith("_"));
                const totalMarkers = [
                  "Total Invoice Cost:",
                  "Invoice Total:",
                  "total_amount",
                  "Total Charges:",
                  "Total Invoice Cost (ex GST):",
                ];
                const totalIdx = keys.findIndex((k) => totalMarkers.includes(k));
                const defaultCols =
                  totalIdx >= 0
                    ? keys.slice(0, totalIdx + 1)
                    : keys;
                const columns = showAllColumnsByUtilityKey[rowKey] ? keys : defaultCols;

                return (
                  <div key={rowKey} className={`rounded-lg border p-3 ${statusClass}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const nextOpen = !isOpen;
                        setOpenUtilityKeys((prev) => ({ ...prev, [rowKey]: nextOpen }));
                        if (nextOpen) {
                          void fetchUtilityInvoiceRows(rowKey, row.utilityType, row.identifier, { offset: pageOffset });
                        } else {
                          abortControllers.current[rowKey]?.abort();
                        }
                      }}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold text-dark dark:text-white">{row.utilityType}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {row.label}: {row.identifier} {row.retailer ? `• ${row.retailer}` : ""}
                        </p>
                      </div>
                      <span className="text-xs">{isOpen ? "Hide details" : "Show details"}</span>
                    </button>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      <Chip label={`Invoices: ${invoiceMeta?.totalCount ?? invoiceRows.length}`} />
                      <Chip label={`Latest: ${formatDate(latestTs)}`} />
                      <Chip label={`Data requested: ${row.extra?.data_requested ? "Yes" : "No"}`} />
                      <Chip label={`Data received: ${dataReceivedLabel}`} />
                      <Chip label={`Data warnings: ${warningsCount}`} />
                    </div>

                    {isOpen ? (
                      <div className="mt-3 space-y-2 border-t border-stroke/60 pt-3 dark:border-dark-3/60">
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Contract end: {String(row.extra?.contract_end_date ?? "—")} • Matching:{" "}
                          {invoiceMeta?.diagnostics?.matched_strategy ?? "—"} on {invoiceMeta?.diagnostics?.matched_field ?? "—"}
                        </p>
                        {invoiceLoadingByUtilityKey[rowKey] ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Loading invoice records...</p>
                        ) : invoiceErrorByUtilityKey[rowKey] ? (
                          <p className="text-sm text-red-600 dark:text-red-400">{invoiceErrorByUtilityKey[rowKey]}</p>
                        ) : invoiceRows.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No invoice records found for this identifier.</p>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowAllColumnsByUtilityKey((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                                className="rounded-md border border-stroke px-2 py-1 text-xs dark:border-dark-3"
                              >
                                {showAllColumnsByUtilityKey[rowKey] ? "Show key columns" : "Show all columns"}
                              </button>
                              <button
                                type="button"
                                disabled={pageOffset === 0}
                                onClick={() =>
                                  void fetchUtilityInvoiceRows(rowKey, row.utilityType, row.identifier, {
                                    offset: Math.max(0, pageOffset - 100),
                                  })
                                }
                                className="rounded-md border border-stroke px-2 py-1 text-xs disabled:opacity-50 dark:border-dark-3"
                              >
                                Prev 100
                              </button>
                              <button
                                type="button"
                                disabled={(invoiceMeta?.totalCount ?? 0) <= pageOffset + 100}
                                onClick={() =>
                                  void fetchUtilityInvoiceRows(rowKey, row.utilityType, row.identifier, {
                                    offset: pageOffset + 100,
                                  })
                                }
                                className="rounded-md border border-stroke px-2 py-1 text-xs disabled:opacity-50 dark:border-dark-3"
                              >
                                Next 100
                              </button>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Showing {pageOffset + 1}-{Math.min(pageOffset + invoiceRows.length, (invoiceMeta?.totalCount ?? invoiceRows.length))} of{" "}
                                {invoiceMeta?.totalCount ?? invoiceRows.length}
                              </span>
                            </div>
                            <div className="max-h-[420px] overflow-auto rounded-md border border-stroke dark:border-dark-3">
                              <table className="min-w-full text-xs">
                                <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-dark-3">
                                  <tr>
                                    {columns.map((key) => (
                                      <th key={key} className="px-2 py-1.5 text-left font-semibold">
                                        {key.replace(/_/g, " ")}
                                      </th>
                                    ))}
                                    <th className="px-2 py-1.5 text-left font-semibold">Warnings</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoiceRows.map((record, recordIdx) => (
                                    <tr key={`${rowKey}-record-${recordIdx}`} className="border-b border-stroke/70 dark:border-dark-3/70">
                                      {columns.map((key) => {
                                        const value = record[key];
                                        const cellLink = getCellLink(key, value);
                                        return (
                                          <td key={key} className="px-2 py-1.5 align-top">
                                            {cellLink ? (
                                              <a href={cellLink.href} target="_blank" rel="noreferrer" className="text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400">
                                                {cellLink.text}
                                              </a>
                                            ) : (
                                              String(value ?? "—")
                                            )}
                                          </td>
                                        );
                                      })}
                                      <td className="px-2 py-1.5 align-top text-amber-700 dark:text-amber-300">
                                        {((record._row_warnings as string[] | undefined) ?? []).join(", ") || "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">GHG Readiness & Trends</CardTitle>
          <CardDescription>Rollups are based on currently loaded utility invoice pages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Stat label="Missing identifiers" value={readiness.missingIdentifiers} />
            <Stat label="Missing data received" value={readiness.missingDataReceived} />
            <Stat label="Missing factors" value={readiness.missingFactors} />
          </div>
          {rollups.currentVsPrior ? (
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Current vs prior period delta: Cost {rollups.currentVsPrior.costDelta.toFixed(2)}, Usage {rollups.currentVsPrior.usageDelta.toFixed(2)}, Estimated emissions {rollups.currentVsPrior.emissionsDelta.toFixed(2)}.
            </p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-300">Load at least two invoice periods to compare current vs prior period.</p>
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">GHG Records</CardTitle>
          <CardDescription>Pulled from the GHG reporting WIP sheet.</CardDescription>
        </CardHeader>
        <CardContent>
          {ghgRows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No GHG records found. Load a business to fetch data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stroke dark:border-dark-3">
                    {Object.keys(ghgRows[0] ?? {}).filter((key) => key !== "row_number").map((key) => (
                      <th key={key} className="px-2 py-2 text-left">{key.replace(/_/g, " ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ghgRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-stroke/70 dark:border-dark-3/70">
                      {Object.entries(row).filter(([key]) => key !== "row_number").map(([key, value]) => {
                        const cellLink = getCellLink(key, value);
                        return (
                          <td key={key} className="px-2 py-2">
                            {cellLink ? (
                              <a href={cellLink.href} target="_blank" rel="noreferrer" className="text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400">{cellLink.text}</a>
                            ) : (
                              String(value ?? "—")
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="rounded bg-white/80 px-2 py-0.5 text-[11px] dark:bg-dark-2">{label}</span>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-stroke bg-white px-3 py-2 dark:border-dark-3 dark:bg-dark-2">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-dark dark:text-white">{value}</p>
    </div>
  );
}
