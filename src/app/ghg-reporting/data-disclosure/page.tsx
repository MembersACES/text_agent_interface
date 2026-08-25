"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  FileQuestion,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiBaseUrl } from "@/lib/utils";

/* ---------------------------------------------------------------- types ---- */

type Severity = "nothing_staged" | "undated" | "month_gaps" | "not_countable" | "ok";

interface GapSite {
  utility_type: string;
  identifier: string;
  retailer?: string;
  member_business_name?: string | null;
  countable: boolean;
  staged_in_period: number;
  undated: number;
  activity_types: string[];
  months_present: string[];
  months_missing: string[];
  coverage_pct: number;
  severity: Severity;
  headline: string;
  still_linked: boolean;
}

interface EntityGapReport {
  found: boolean;
  entity_id: string;
  period: string;
  fy_months: string[];
  site_count: number;
  staged_in_period: number;
  undated_total: number;
  needs_attention: number;
  orphan_site_count: number;
  counts_by_severity: Partial<Record<Severity, number>>;
  other_years_available: Record<string, number>;
  sites: GapSite[];
}

interface RosterEntity {
  entity_id: string;
  site_count: number;
  staged_in_period: number;
  undated_total: number;
  needs_attention: number;
  counts_by_severity: Partial<Record<Severity, number>>;
  other_years_available: Record<string, number>;
}

interface RosterGapReport {
  period: string;
  entity_count: number;
  entities_needing_attention: number;
  undated_total: number;
  entities: RosterEntity[];
}

/* ------------------------------------------------------- severity styling -- */

const SEVERITY: Record<
  Severity,
  { label: string; cls: string; Icon: typeof AlertTriangle; why: string }
> = {
  nothing_staged: {
    label: "Nothing brought in",
    cls: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200",
    Icon: CircleSlash,
    why: "This site has no activity data for the period. Run Open Prograde workspace, and if it stays empty check the invoices exist in Airtable.",
  },
  undated: {
    label: "Undated invoices",
    cls: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200",
    Icon: FileQuestion,
    why: "These invoices have no readable billing period, so they cannot be attributed to a financial year and are left out of the total. Add the date in Airtable, then refresh.",
  },
  month_gaps: {
    label: "Missing months",
    cls: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    Icon: CalendarX,
    why: "No invoice covers these months. Either they were never issued, never linked, or never brought in — the total is understated until they are.",
  },
  not_countable: {
    label: "Not countable yet",
    cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    Icon: AlertTriangle,
    why: "Linked on the LOA but there is no emission factor for this utility type yet, so it can never contribute to the total. Not a data problem.",
  },
  ok: {
    label: "Complete",
    cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    Icon: CheckCircle2,
    why: "Every month in the period has at least one invoice.",
  },
};

const SEVERITY_ORDER: Severity[] = [
  "nothing_staged",
  "undated",
  "month_gaps",
  "not_countable",
  "ok",
];

function monthLabel(m: string): string {
  const [y, mm] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = Number(mm) - 1;
  return `${names[idx] ?? mm} ${y.slice(2)}`;
}

/* ------------------------------------------------------------------ page --- */

export default function DataDisclosurePage() {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken;

  const [period, setPeriod] = useState("FY26");
  const [roster, setRoster] = useState<RosterGapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, EntityGapReport>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const fetchRoster = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/climate/data-gaps?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { detail?: string }).detail || `Failed to load (${res.status})`);
      }
      setRoster((await res.json()) as RosterGapReport);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data disclosure");
      setRoster(null);
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster]);

  // Detail is loaded lazily: it resolves the live LOA site list, which is the
  // slow part, so we only pay for it on the entity you actually open.
  const toggleEntity = useCallback(
    async (slug: string) => {
      if (openSlug === slug) {
        setOpenSlug(null);
        return;
      }
      setOpenSlug(slug);
      if (detail[slug] || !token) return;
      setDetailLoading(slug);
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/api/climate/entities/${encodeURIComponent(slug)}/data-gaps?period=${period}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = (await res.json()) as EntityGapReport;
          setDetail((prev) => ({ ...prev, [slug]: data }));
        }
      } catch {
        /* the row stays collapsed-with-no-detail; the summary is still useful */
      } finally {
        setDetailLoading(null);
      }
    },
    [openSlug, detail, token, period],
  );

  const totals = useMemo(() => {
    if (!roster) return null;
    const agg: Partial<Record<Severity, number>> = {};
    for (const e of roster.entities) {
      for (const k of SEVERITY_ORDER) {
        const v = e.counts_by_severity[k];
        if (v) agg[k] = (agg[k] ?? 0) + v;
      }
    }
    return agg;
  }, [roster]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        pageName="Data disclosure"
        title="Data disclosure"
        description="What's missing from your activity data. Anything listed here is understating a total, or excluded from it — fix these before a report goes out."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              Period
              <select
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setDetail({});
                  setOpenSlug(null);
                }}
                className="rounded-md border border-stroke bg-white px-2 py-1.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              >
                <option value="FY26">FY26</option>
                <option value="FY25">FY25</option>
                <option value="FY24">FY24</option>
                <option value="FY23">FY23</option>
                <option value="FY27">FY27</option>
              </select>
            </label>
            <Button variant="secondary" size="sm" onClick={() => void fetchRoster()} loading={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      {error ? (
        <Card className="mb-4 border-red-200 dark:border-red-900/50">
          <CardContent className="py-4 text-sm text-red-800 dark:text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !roster || roster.entities.length === 0 ? (
        <EmptyState
          title="Nothing to check yet"
          description="No reporting entity has any activity data for this period. Bring data in from a member's Climate tab or the Linked entities page first."
        />
      ) : (
        <div className="space-y-4">
          {/* ---- summary strip ---- */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Entities</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{roster.entity_count}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {roster.entities_needing_attention} need attention
                </p>
              </CardContent>
            </Card>
            {(["nothing_staged", "undated", "month_gaps"] as Severity[]).map((sev) => {
              const meta = SEVERITY[sev];
              const n = totals?.[sev] ?? 0;
              return (
                <Card key={sev} className={n > 0 ? "border-amber-200 dark:border-amber-900/40" : undefined}>
                  <CardContent className="py-4">
                    <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400">
                      <meta.Icon className="size-3.5" aria-hidden />
                      {meta.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{n}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {n === 1 ? "site" : "sites"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {roster.undated_total > 0 ? (
            <Card className="border-orange-200 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/20">
              <CardContent className="flex items-start gap-2.5 py-3.5 text-sm text-orange-900 dark:text-orange-100">
                <FileQuestion className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  <strong>{roster.undated_total} invoice(s) across all entities have no readable date.</strong>{" "}
                  They are stored but left out of every total, because an invoice with no billing period
                  can&apos;t be attributed to a financial year. Add the date in Airtable, then refresh that
                  entity.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* ---- per entity ---- */}
          {roster.entities.map((e) => {
            const isOpen = openSlug === e.entity_id;
            const rep = detail[e.entity_id];
            return (
              <Card key={e.entity_id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => void toggleEntity(e.entity_id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-dark-3/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {isOpen ? (
                      <ChevronDown className="size-4 shrink-0 text-gray-400" aria-hidden />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold">{e.entity_id}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {e.site_count} site{e.site_count === 1 ? "" : "s"} ·{" "}
                        {e.staged_in_period} record{e.staged_in_period === 1 ? "" : "s"} in {period}
                        {Object.keys(e.other_years_available).length > 0
                          ? ` · also holds ${Object.entries(e.other_years_available)
                              .map(([fy, n]) => `${fy} (${n})`)
                              .join(", ")}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {SEVERITY_ORDER.map((sev) => {
                      const n = e.counts_by_severity[sev];
                      if (!n) return null;
                      const meta = SEVERITY[sev];
                      return (
                        <span
                          key={sev}
                          title={meta.label}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
                        >
                          <meta.Icon className="size-3" aria-hidden />
                          {n}
                        </span>
                      );
                    })}
                  </div>
                </button>

                {isOpen ? (
                  <CardContent className="border-t border-stroke bg-gray-50/50 py-4 dark:border-dark-3 dark:bg-dark-2/30">
                    {detailLoading === e.entity_id ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : !rep ? (
                      <p className="text-sm text-gray-500">Couldn&apos;t load site detail for this entity.</p>
                    ) : (
                      <div className="space-y-3">
                        {rep.orphan_site_count > 0 ? (
                          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                            <strong>{rep.orphan_site_count} site(s) no longer on the LOA still have data
                            counting toward this total.</strong> Bringing data in never deletes — a developer
                            needs to clear them.
                          </p>
                        ) : null}

                        <div className="overflow-x-auto rounded-md border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
                          <table className="w-full min-w-[46rem] text-left text-sm">
                            <thead className="bg-gray/50 text-xs uppercase text-gray-500 dark:bg-dark-3/50 dark:text-gray-400">
                              <tr>
                                <th className="px-3 py-2 font-medium">Status</th>
                                <th className="px-3 py-2 font-medium">Utility</th>
                                <th className="px-3 py-2 font-medium">Identifier</th>
                                <th className="px-3 py-2 font-medium text-right">Records</th>
                                <th className="px-3 py-2 font-medium">Months covered</th>
                                <th className="px-3 py-2 font-medium">What to do</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {rep.sites.map((s) => {
                                const meta = SEVERITY[s.severity];
                                return (
                                  <tr key={`${s.utility_type}|${s.identifier}`}>
                                    <td className="whitespace-nowrap px-3 py-2">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
                                      >
                                        <meta.Icon className="size-3" aria-hidden />
                                        {meta.label}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-xs">{s.utility_type}</td>
                                    <td className="px-3 py-2 font-mono text-xs">{s.identifier}</td>
                                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                                      {s.staged_in_period}
                                      {s.undated > 0 ? (
                                        <span className="text-orange-700 dark:text-orange-300">
                                          {" "}
                                          +{s.undated} undated
                                        </span>
                                      ) : null}
                                    </td>
                                    <td className="px-3 py-2">
                                      {/* 12 blocks, one per month — a gap is visible at a glance */}
                                      <div className="flex items-center gap-2">
                                        <div className="flex gap-0.5">
                                          {rep.fy_months.map((m) => {
                                            const has = s.months_present.includes(m);
                                            return (
                                              <span
                                                key={m}
                                                title={`${monthLabel(m)}: ${has ? "invoice present" : "no invoice"}`}
                                                className={`h-4 w-2 rounded-sm ${
                                                  has
                                                    ? "bg-emerald-500/80"
                                                    : "bg-gray-200 dark:bg-gray-700"
                                                }`}
                                              />
                                            );
                                          })}
                                        </div>
                                        <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                                          {s.coverage_pct}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                                      {s.headline}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Link
                            href="/ghg-reporting/entities"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Open this entity&apos;s workspace to refresh →
                          </Link>
                        </div>
                      </div>
                    )}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}

          {/* ---- legend ---- */}
          <Card>
            <CardContent className="space-y-2.5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                What these mean
              </p>
              {SEVERITY_ORDER.map((sev) => {
                const meta = SEVERITY[sev];
                return (
                  <div key={sev} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
                    >
                      <meta.Icon className="size-3" aria-hidden />
                      {meta.label}
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{meta.why}</p>
                  </div>
                );
              })}
              <p className="flex items-start gap-1.5 border-t border-stroke pt-2.5 text-xs text-gray-500 dark:border-dark-3 dark:text-gray-400">
                <RefreshCw className="mt-0.5 size-3 shrink-0" aria-hidden />
                Month coverage is based on the billing periods actually brought in, not on Airtable
                directly. A site can look complete here and still be missing an invoice nobody linked.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
