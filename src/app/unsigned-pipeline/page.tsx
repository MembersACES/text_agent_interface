"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FolderPlus,
  RefreshCw,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { cn, getApiBaseUrl } from "@/lib/utils";

type UtilityGroup = "gas" | "electricity" | "waste" | "oil" | "water" | "cleaning" | "all";
type Segment = "all" | "ci" | "sme";
type PdfMode = "all" | "latest";

type InvoicePdf = {
  label?: string;
  link?: string;
  missing?: boolean;
};

type PipelineSite = {
  utility_type: string;
  identifier: string;
  business_name: string;
  site_address: string;
  retailer: string;
  state: string;
  unit: string;
  annual_load: number | null;
  load_method: string | null;
  quoteable: boolean;
  thin_data: boolean;
  billed_quantity: number | null;
  billed_days: number | null;
  invoice_count: number;
  pdf_count: number;
  pdfs: InvoicePdf[];
  latest_invoice: InvoicePdf | null;
  source: string;
  signed: boolean;
  signed_utilities: string[];
  has_contract_flag: boolean;
  match_method: string;
  client_id: number | null;
  client_stage: string | null;
  utility_types?: string | null;
};

type StateRow = {
  state: string;
  site_count: number;
  quoteable_site_count?: number;
  thin_site_count?: number;
  invoice_count: number;
  pdf_count: number;
  load_by_unit: Record<string, number>;
  load_by_unit_all?: Record<string, number>;
};

type PipelineResponse = {
  utility_group: string;
  segment: string;
  unsigned_only: boolean;
  pdfs: string;
  include_base1: boolean;
  utility_types: string[];
  legend: string;
  summary: string;
  by_state: StateRow[];
  totals: {
    site_count: number;
    quoteable_site_count: number;
    thin_site_count: number;
    base1_site_count: number;
    unknown_state_count: number;
    invoice_count: number;
    pdf_count: number;
    load_by_unit: Record<string, number>;
    load_by_unit_all?: Record<string, number>;
    missing_pdf_sites: number;
    min_annualise_days: number;
    retailers: { name: string; site_count: number }[];
  };
  sites: PipelineSite[];
  warnings: string[];
};

const UTILITY_TABS: { id: UtilityGroup; label: string }[] = [
  { id: "gas", label: "Gas" },
  { id: "electricity", label: "Electricity" },
  { id: "waste", label: "Waste" },
  { id: "oil", label: "Oil" },
  { id: "water", label: "Water" },
  { id: "cleaning", label: "Cleaning" },
  { id: "all", label: "All" },
];

const PRIMARY_UNIT: Record<UtilityGroup, string> = {
  gas: "GJ",
  electricity: "kWh",
  waste: "t",
  oil: "L",
  water: "kL",
  cleaning: "AUD",
  all: "",
};

const GROUP_LABEL: Record<UtilityGroup, string> = {
  gas: "gas",
  electricity: "electricity",
  waste: "waste",
  oil: "oil",
  water: "water",
  cleaning: "cleaning",
  all: "utilities",
};

const PACK_CAP = 250;
const STATE_ORDER = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT", "Unknown"];

function fmt(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-AU", { maximumFractionDigits: digits });
}

function formatLoad(value: number | null | undefined, unit: string): string {
  if (value == null) return "—";
  if (unit === "kWh" && value >= 1000) {
    return `${fmt(value / 1000, 1)} MWh`;
  }
  if (!unit) return fmt(value);
  return `${fmt(value)} ${unit}`;
}

function formatLoadMap(map: Record<string, number> | undefined, prefer?: string): string {
  const entries = Object.entries(map || {});
  if (!entries.length) return "—";
  if (prefer && map?.[prefer] != null) {
    const rest = entries.filter(([u]) => u !== prefer);
    const primary = formatLoad(map[prefer], prefer);
    if (!rest.length) return primary;
    return `${primary} · ${rest.map(([u, v]) => formatLoad(v, u)).join(" · ")}`;
  }
  return entries.map(([u, v]) => formatLoad(v, u)).join(" · ");
}

function retailerKey(site: PipelineSite): string {
  return (site.retailer || "").trim() || "Unknown";
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toggleValue(list: string[] | null, value: string): string[] | null {
  const current = list ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return next.length ? next : null;
}

function buildLocalSummary(
  sites: PipelineSite[],
  utility: UtilityGroup,
  pdfs: PdfMode,
  minDays: number,
): string {
  const load: Record<string, number> = {};
  let quoteable = 0;
  let thin = 0;
  let base1 = 0;
  let unknown = 0;
  let pdfCount = 0;
  const byState: Record<string, { sites: number; load: Record<string, number> }> = {};
  for (const s of sites) {
    pdfCount += s.pdf_count;
    if (s.thin_data) thin += 1;
    if (s.source === "base1") base1 += 1;
    if (s.state === "Unknown") unknown += 1;
    const bucket = byState[s.state] || { sites: 0, load: {} };
    bucket.sites += 1;
    if (s.quoteable && s.annual_load != null && s.unit) {
      quoteable += 1;
      load[s.unit] = (load[s.unit] || 0) + s.annual_load;
      bucket.load[s.unit] = (bucket.load[s.unit] || 0) + s.annual_load;
    }
    byState[s.state] = bucket;
  }
  const label = GROUP_LABEL[utility];
  const loadText = formatLoadMap(load) === "—" ? "no quoteable load" : formatLoadMap(load);
  const stateBits = STATE_ORDER.filter((st) => st !== "Unknown" && byState[st])
    .map((st) => `${st} ${byState[st].sites} sites / ${formatLoadMap(byState[st].load)}`)
    .join(" · ");
  const extras = [
    thin ? `${thin} thin-data sites excluded from headline load` : "",
    base1 ? `${base1} Base 1 leads (no extracted load)` : "",
    unknown ? `${unknown} Unknown state` : "",
  ].filter(Boolean);
  const pdfWord = pdfs === "latest" ? "latest invoice PDFs" : "invoice PDFs";
  return [
    `Unsigned ${label}: ${sites.length} sites (${quoteable} with quoteable load, ≥${minDays} bill days). Headline load: ${loadText}.`,
    stateBits ? `By state: ${stateBits}.` : "",
    extras.length ? `${extras.join("; ")}.` : "",
    `${pdfCount} ${pdfWord} in this view.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function UnsignedPipelinePage() {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { accessToken?: string } | null)?.accessToken ??
    "";
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? "";
  const { showToast } = useToast();

  const [utility, setUtility] = useState<UtilityGroup>("gas");
  const [segment, setSegment] = useState<Segment>("all");
  const [unsignedOnly, setUnsignedOnly] = useState(true);
  const [includeBase1, setIncludeBase1] = useState(true);
  const [pdfs, setPdfs] = useState<PdfMode>("all");
  const [data, setData] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[] | null>(null);
  const [selectedRetailers, setSelectedRetailers] = useState<string[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [packing, setPacking] = useState(false);
  const [packUrl, setPackUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setPackUrl(null);
    setSelectedStates(null);
    setSelectedRetailers(null);
    try {
      const params = new URLSearchParams({
        utility,
        unsigned_only: unsignedOnly ? "true" : "false",
        pdfs,
        include_base1: includeBase1 ? "true" : "false",
        segment,
      });
      const res = await fetch(`${getApiBaseUrl()}/api/unsigned-pipeline?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { detail?: string }).detail || `Failed (${res.status})`);
      }
      setData(body as PipelineResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pipeline");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, utility, unsignedOnly, includeBase1, pdfs, segment]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSites = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.sites ?? []).filter((s) => {
      if (selectedStates && !selectedStates.includes(s.state)) return false;
      if (selectedRetailers && !selectedRetailers.includes(retailerKey(s))) return false;
      if (!q) return true;
      const hay = `${s.business_name} ${s.identifier} ${s.state} ${s.utility_type} ${s.site_address} ${s.retailer}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data?.sites, query, selectedStates, selectedRetailers]);

  const primaryUnit = PRIMARY_UNIT[utility];
  const minDays = data?.totals.min_annualise_days ?? 90;

  const headline = useMemo(() => {
    const load: Record<string, number> = {};
    let pdfCount = 0;
    let quoteable = 0;
    let thin = 0;
    let missing = 0;
    const states = new Set<string>();
    for (const s of filteredSites) {
      pdfCount += s.pdf_count;
      if (s.quoteable && s.annual_load != null && s.unit) {
        load[s.unit] = (load[s.unit] || 0) + s.annual_load;
        quoteable += 1;
      }
      if (s.thin_data) thin += 1;
      if (s.pdf_count === 0) missing += 1;
      states.add(s.state);
    }
    return {
      siteCount: filteredSites.length,
      quoteable,
      thin,
      missing,
      pdfCount,
      load,
      stateCount: states.size,
    };
  }, [filteredSites]);

  const summaryText = useMemo(
    () => buildLocalSummary(filteredSites, utility, pdfs, minDays),
    [filteredSites, utility, pdfs, minDays],
  );

  const visibleStateRows = useMemo(() => {
    const buckets = new Map<string, StateRow>();
    for (const s of filteredSites) {
      const row = buckets.get(s.state) || {
        state: s.state,
        site_count: 0,
        quoteable_site_count: 0,
        thin_site_count: 0,
        invoice_count: 0,
        pdf_count: 0,
        load_by_unit: {},
      };
      row.site_count += 1;
      row.invoice_count += s.invoice_count;
      row.pdf_count += s.pdf_count;
      if (s.quoteable) row.quoteable_site_count = (row.quoteable_site_count || 0) + 1;
      if (s.thin_data) row.thin_site_count = (row.thin_site_count || 0) + 1;
      if (s.quoteable && s.annual_load != null && s.unit) {
        row.load_by_unit[s.unit] = (row.load_by_unit[s.unit] || 0) + s.annual_load;
      }
      buckets.set(s.state, row);
    }
    return STATE_ORDER.filter((st) => buckets.has(st)).map((st) => buckets.get(st)!);
  }, [filteredSites]);

  const retailerOptions = data?.totals.retailers ?? [];
  const packOverCap = headline.pdfCount > PACK_CAP;

  const copyText = useCallback(
    async (text: string, ok: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(ok, "success");
      } catch {
        showToast("Could not copy", "error");
      }
    },
    [showToast],
  );

  const createPack = useCallback(async () => {
    if (!token) return;
    setPacking(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/unsigned-pipeline/drive-pack`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(accessToken ? { "X-Google-Access-Token": accessToken } : {}),
        },
        body: JSON.stringify({
          utility,
          unsigned_only: unsignedOnly,
          pdfs,
          include_base1: includeBase1,
          segment,
          states: selectedStates,
          retailers: selectedRetailers,
          max_files: PACK_CAP,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { detail?: string }).detail || "Drive pack failed");
      }
      const url = (body as { folder_url?: string }).folder_url || "";
      setPackUrl(url || null);
      const copied = (body as { copied?: number }).copied ?? 0;
      const skipped = (body as { skipped_missing?: number }).skipped_missing ?? 0;
      const capped = (body as { skipped_cap?: number }).skipped_cap ?? 0;
      showToast(
        `Drive pack ready — ${copied} PDFs copied${skipped ? `, ${skipped} missing links skipped` : ""}${capped ? `, ${capped} over the ${PACK_CAP} cap` : ""}`,
        "success",
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Drive pack failed", "error");
    } finally {
      setPacking(false);
    }
  }, [
    token,
    accessToken,
    utility,
    unsignedOnly,
    pdfs,
    includeBase1,
    segment,
    selectedStates,
    selectedRetailers,
    showToast,
  ]);

  const exportCsv = useCallback(() => {
    const sites = filteredSites;
    if (!sites.length) {
      showToast("Nothing to export", "warning");
      return;
    }
    const header = [
      "state",
      "utility_type",
      "business_name",
      "identifier",
      "retailer",
      "annual_load",
      "unit",
      "quoteable",
      "thin_data",
      "billed_days",
      "invoice_count",
      "pdf_count",
      "signed",
      "source",
      "latest_link",
    ];
    const lines = [
      header.join(","),
      ...sites.map((s) =>
        [
          csvEscape(s.state),
          csvEscape(s.utility_type),
          csvEscape(s.business_name),
          csvEscape(s.identifier),
          csvEscape(s.retailer),
          csvEscape(s.annual_load),
          csvEscape(s.unit),
          csvEscape(s.quoteable ? "yes" : "no"),
          csvEscape(s.thin_data ? "yes" : "no"),
          csvEscape(s.billed_days),
          csvEscape(s.invoice_count),
          csvEscape(s.pdf_count),
          csvEscape(s.signed ? "yes" : "no"),
          csvEscape(s.source),
          csvEscape(s.latest_invoice?.link || s.pdfs[0]?.link || ""),
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unsigned-pipeline-${utility}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredSites, showToast, utility]);

  const siteKey = (site: PipelineSite, i: number) =>
    `${site.utility_type}-${site.identifier}-${site.source}-${i}`;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-4 sm:px-6">
      <PageHeader
        pageName="Unsigned pipeline"
        title="Unsigned pipeline"
        description="What we can bring, by state — quoteable load only — plus the invoice PDFs. Unsigned is per utility, not per member."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyText(summaryText, "Summary copied")}
              leftIcon={<Copy className="h-4 w-4" />}
              disabled={!filteredSites.length}
            >
              Copy summary
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCsv} leftIcon={<Download className="h-4 w-4" />}>
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={createPack}
              loading={packing}
              leftIcon={<FolderPlus className="h-4 w-4" />}
            >
              Pack PDFs ({fmt(Math.min(headline.pdfCount, PACK_CAP), 0)})
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {UTILITY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setUtility(tab.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              utility === tab.id
                ? "bg-primary text-white"
                : "bg-gray-2 text-dark hover:bg-gray-3 dark:bg-dark-2 dark:text-gray-5 dark:hover:bg-dark-3",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={unsignedOnly}
              onChange={(e) => setUnsignedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-stroke"
            />
            Unsigned only
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeBase1}
              onChange={(e) => setIncludeBase1(e.target.checked)}
              className="h-4 w-4 rounded border-stroke"
            />
            Include Base 1
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Segment</span>
            {(["all", "ci", "sme"] as Segment[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSegment(s)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium",
                  segment === s
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-2 dark:text-gray-4",
                )}
              >
                {s === "all" ? "Both" : s === "ci" ? "C&I" : "SME"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">PDFs</span>
            {(["all", "latest"] as PdfMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPdfs(m)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium",
                  pdfs === m
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-2 dark:text-gray-4",
                )}
              >
                {m === "all" ? "All invoices" : "Latest per site"}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-4">
          {data?.legend ||
            `Headline load needs ≥${minDays} bill days. Switch to Latest per site before sending a retailer pack.`}
        </p>
      </Card>

      {!loading && !!filteredSites.length && (
        <Card className="mb-4 border border-primary/20 bg-primary/[0.03]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm leading-relaxed text-dark dark:text-white">{summaryText}</p>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => copyText(summaryText, "Summary copied")}
              leftIcon={<Copy className="h-4 w-4" />}
            >
              Copy
            </Button>
          </div>
        </Card>
      )}

      {packUrl && (
        <div className="mb-4 rounded-xl border border-green-dark/30 bg-green-light-6 px-4 py-3 text-sm dark:bg-green-dark/20">
          Drive pack ready.{" "}
          <a href={packUrl} target="_blank" rel="noreferrer" className="font-medium text-primary underline">
            Open folder
          </a>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-dark/30 bg-red-light-6 px-4 py-3 text-sm text-red-dark dark:bg-red/20 dark:text-red-light">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!!data?.warnings?.length && (
        <div className="mb-4 rounded-xl border border-yellow-dark-2/40 bg-yellow-light-4 px-4 py-3 text-xs text-yellow-dark-2 dark:bg-yellow-dark/20">
          {data.warnings.join(" · ")}
        </div>
      )}

      {packOverCap && (
        <div className="mb-4 rounded-xl border border-yellow-dark-2/40 bg-yellow-light-4 px-4 py-3 text-xs text-yellow-dark-2 dark:bg-yellow-dark/20">
          This view has {fmt(headline.pdfCount, 0)} PDFs. Drive pack copies the first {PACK_CAP}. Switch to Latest per
          site, or filter by state, before sending.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">State</span>
        <button
          type="button"
          onClick={() => setSelectedStates(null)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            selectedStates == null ? "bg-primary text-white" : "bg-gray-2 dark:bg-dark-2",
          )}
        >
          All
        </button>
        {(data?.by_state ?? []).map((row) => (
          <button
            key={row.state}
            type="button"
            onClick={() => setSelectedStates((cur) => toggleValue(cur, row.state))}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              selectedStates?.includes(row.state)
                ? "bg-primary text-white"
                : "bg-gray-2 dark:bg-dark-2",
              row.state === "Unknown" && "ring-1 ring-yellow-dark-2/50",
            )}
          >
            {row.state} ({row.site_count})
          </button>
        ))}
      </div>

      {!!retailerOptions.length && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Current retailer</span>
          <button
            type="button"
            onClick={() => setSelectedRetailers(null)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              selectedRetailers == null ? "bg-primary text-white" : "bg-gray-2 dark:bg-dark-2",
            )}
          >
            All
          </button>
          {retailerOptions.slice(0, 12).map((row) => (
            <button
              key={row.name}
              type="button"
              onClick={() => setSelectedRetailers((cur) => toggleValue(cur, row.name))}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                selectedRetailers?.includes(row.name)
                  ? "bg-primary text-white"
                  : "bg-gray-2 dark:bg-dark-2",
              )}
            >
              {row.name} ({row.site_count})
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Sites</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-dark dark:text-white">
            {loading ? "…" : fmt(headline.siteCount, 0)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {loading ? "Reading invoice tabs — can take a minute." : `${fmt(headline.quoteable, 0)} quoteable`}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Quoteable load {primaryUnit ? `(≥${minDays} days)` : ""}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-dark dark:text-white">
            {loading ? "…" : formatLoadMap(headline.load, primaryUnit || undefined)}
          </p>
          {headline.thin > 0 && (
            <p className="mt-1 text-xs text-gray-500">{fmt(headline.thin, 0)} thin-data sites excluded</p>
          )}
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">PDFs in this view</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-dark dark:text-white">
            {loading ? "…" : fmt(headline.pdfCount, 0)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {headline.missing > 0 ? `${headline.missing} sites missing PDFs` : "All listed sites have a Drive link"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">States</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-dark dark:text-white">
            {loading ? "…" : fmt(headline.stateCount, 0)}
          </p>
        </Card>
      </div>

      <h2 className="mb-3 text-base font-semibold text-dark dark:text-white">Load by state</h2>
      <div className="mb-8 overflow-hidden rounded-2xl border border-stroke dark:border-dark-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Sites</TableHead>
              <TableHead className="text-right">Quoteable</TableHead>
              <TableHead className="text-right">PDFs</TableHead>
              <TableHead className="text-right">Quoteable load</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleStateRows.map((row) => (
              <TableRow
                key={row.state}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedStates((cur) => (cur == null ? [row.state] : toggleValue(cur, row.state)))
                }
              >
                <TableCell className="font-medium">
                  {row.state}
                  {row.state === "Unknown" && (
                    <span className="ml-2 text-xs font-normal text-yellow-dark-2">needs address</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmt(row.site_count, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(row.quoteable_site_count || 0, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(row.pdf_count, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatLoadMap(row.load_by_unit, primaryUnit || undefined)}
                </TableCell>
              </TableRow>
            ))}
            {!loading && !visibleStateRows.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No unsigned sites for this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-dark dark:text-white">
          Sites{" "}
          {filteredSites.length !== (data?.sites.length ?? 0)
            ? `(${filteredSites.length} of ${data?.sites.length ?? 0})`
            : `(${filteredSites.length})`}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const links = filteredSites.flatMap((s) => s.pdfs.map((p) => p.link).filter(Boolean));
              if (!links.length) {
                showToast("No PDF links in this view", "warning");
                return;
              }
              copyText(links.join("\n"), `${links.length} links copied`);
            }}
            leftIcon={<Copy className="h-4 w-4" />}
          >
            Copy PDF links
          </Button>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search business, NMI/MRIN, retailer…"
              className="w-full rounded-lg border border-stroke bg-white py-2 pl-9 pr-3 text-sm dark:border-dark-3 dark:bg-gray-dark"
            />
          </div>
        </div>
      </div>

      {!loading && !filteredSites.length ? (
        <EmptyState
          title="No sites in this view"
          description="Try another utility, clear state/retailer filters, or include Base 1 leads."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stroke dark:border-dark-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Business</TableHead>
                <TableHead>Utility</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Retailer</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Load</TableHead>
                <TableHead className="text-right">PDFs</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.map((site, i) => {
                const key = siteKey(site, i);
                const open = !!expanded[key];
                return (
                  <Fragment key={key}>
                    <TableRow className="cursor-pointer" onClick={() => setExpanded((e) => ({ ...e, [key]: !e[key] }))}>
                      <TableCell>
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{site.business_name}</div>
                        {site.client_id ? (
                          <Link
                            href={`/crm-members/${site.client_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-primary hover:underline"
                          >
                            CRM
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {site.source === "base1" ? "Base 1" : "Not in CRM"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{site.utility_type}</TableCell>
                      <TableCell className="font-mono text-xs">{site.identifier}</TableCell>
                      <TableCell className="text-xs">{site.retailer || "—"}</TableCell>
                      <TableCell>{site.state}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatLoad(site.annual_load, site.unit)}
                        {site.thin_data && (
                          <div className="text-[10px] text-yellow-dark-2">
                            thin · {site.billed_days || 0}d
                          </div>
                        )}
                        {site.load_method === "none" && (
                          <div className="text-[10px] text-gray-400">no usage extracted</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {site.pdf_count}/{site.invoice_count}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {site.signed ? (
                            <Badge intent="success">Signed</Badge>
                          ) : (
                            <Badge intent="warning">Unsigned</Badge>
                          )}
                          {site.quoteable && <Badge intent="success">Quoteable</Badge>}
                          {site.thin_data && <Badge intent="warning">Thin data</Badge>}
                          {!site.has_contract_flag && site.source !== "base1" && (
                            <Badge intent="neutral">No contract flag</Badge>
                          )}
                          {site.source === "base1" && <Badge intent="info">Base 1</Badge>}
                          {site.match_method === "name_collision" && (
                            <Badge intent="danger">Name clash</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow key={`${key}-open`} className="bg-gray-1/60 dark:bg-dark-2/40">
                        <TableCell colSpan={9}>
                          <div className="space-y-2 py-2 text-sm">
                            {site.site_address && (
                              <p className="text-gray-500">{site.site_address}</p>
                            )}
                            {!!site.signed_utilities.length && (
                              <p className="text-xs text-gray-500">
                                Signed via ACES: {site.signed_utilities.join(", ")}
                              </p>
                            )}
                            {site.pdfs.length ? (
                              <ul className="space-y-1">
                                {site.pdfs.map((pdf, pi) => (
                                  <li key={`${key}-pdf-${pi}`}>
                                    {pdf.link ? (
                                      <a
                                        href={pdf.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                      >
                                        {pdf.label || "Invoice PDF"}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span className="text-gray-400">{pdf.label || "Missing PDF"}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-gray-400">No Drive links on these invoices.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
