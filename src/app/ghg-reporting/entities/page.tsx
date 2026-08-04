"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ExternalLink, Leaf, Users } from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { progradeWorkspaceUrl } from "@/lib/entity-groups";
import { getApiBaseUrl } from "@/lib/utils";

interface ClimateRosterClient {
  reporting_entity: string;
  display_name?: string | null;
  business_name?: string | null;
  entity_group_slug?: string | null;
  member_count?: number;
  aces_client_ids?: number[];
  aces_client_id?: number | null;
  loa_record_ids?: string[];
  loa_record_id?: string | null;
  activity_record_count?: number;
  primary_abn?: string | null;
  period?: string;
  deep_link?: string;
}

interface ClimateRosterResponse {
  period?: string;
  count?: number;
  clients?: ClimateRosterClient[];
}

function displayNameFor(row: ClimateRosterClient): string {
  return (row.display_name || row.business_name || row.reporting_entity || "").trim();
}

export default function GhgLinkedEntitiesPage() {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken;

  const [period, setPeriod] = useState("FY26");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<ClimateRosterClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchRoster = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period, limit: "500" });
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`${getApiBaseUrl()}/api/climate/roster?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(
          (detail as { detail?: string }).detail || `Failed to load roster (${res.status})`,
        );
      }
      const data = (await res.json()) as ClimateRosterResponse;
      setRows(Array.isArray(data.clients) ? data.clients : []);
      if (data.period) setPeriod(data.period);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load linked entities");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, period, debouncedSearch]);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) =>
        displayNameFor(a).localeCompare(displayNameFor(b), undefined, { sensitivity: "base" }),
      ),
    [rows],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        pageName="Linked entities"
        title="Linked reporting entities"
        description="Members and groups already linked to a Prograde sustainability disclosure slug. Open a workspace or jump to the CRM Climate tab to edit."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              Period
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-md border border-stroke bg-white px-2 py-1.5 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              >
                <option value="FY26">FY26</option>
                <option value="FY25">FY25</option>
                <option value="FY27">FY27</option>
              </select>
            </label>
            <Button type="button" variant="secondary" size="sm" onClick={() => void fetchRoster()}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <Input
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by business name or entity slug"
          wrapperClassName="max-w-md"
        />
      </div>

      {error ? (
        <Card className="mb-4 border-red-200 dark:border-red-900/50">
          <CardContent className="py-4 text-sm text-red-700 dark:text-red-300">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : sortedRows.length === 0 ? (
        <EmptyState
          icon={<Leaf className="size-10" aria-hidden />}
          title="No linked reporting entities"
          description="Set a sustainability reporting entity on a member Climate tab (or a group disclosure slug) to see it here."
          action={
            <Link href="/crm-members" className="text-sm font-medium text-primary hover:underline">
              Browse members
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {sortedRows.length} linked {sortedRows.length === 1 ? "entity" : "entities"}
            {debouncedSearch ? ` matching “${debouncedSearch}”` : ""} · period {period}
          </p>
          {sortedRows.map((row) => {
            const slug = (row.reporting_entity || "").trim();
            const name = displayNameFor(row);
            const workspaceUrl = progradeWorkspaceUrl(slug, period);
            const memberId = row.aces_client_id ?? row.aces_client_ids?.[0];
            const loaIds = (row.loa_record_ids?.length
              ? row.loa_record_ids
              : row.loa_record_id
                ? [row.loa_record_id]
                : []
            ).filter(Boolean);
            const memberCount = row.member_count ?? row.aces_client_ids?.length ?? 1;

            return (
              <Card key={slug} className="overflow-hidden border border-gray-100 dark:border-gray-800">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                        <Leaf className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-dark dark:text-white">
                          {name}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          Effective disclosure slug:{" "}
                          <span className="font-mono text-emerald-700 dark:text-emerald-300">{slug}</span>
                          {memberCount > 1 ? " (shared)" : " (site-level)"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 pl-[3.25rem] text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5" aria-hidden />
                        {memberCount === 1 ? "1 member" : `${memberCount} members`}
                      </span>
                      {typeof row.activity_record_count === "number" ? (
                        <span>
                          {row.activity_record_count} staged activit
                          {row.activity_record_count === 1 ? "y" : "ies"}
                        </span>
                      ) : null}
                      {loaIds.length > 0 ? (
                        <span>
                          LOA record{loaIds.length > 1 ? "s" : ""}:{" "}
                          <span className="font-mono">{loaIds.join(", ")}</span>
                        </span>
                      ) : null}
                      {row.primary_abn ? (
                        <span>
                          ABN: <span className="font-mono">{row.primary_abn}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[3.25rem] sm:pl-0">
                    <a
                      href={workspaceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
                    >
                      Open Prograde workspace
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                    {typeof memberId === "number" ? (
                      <Link
                        href={`/crm-members/${memberId}`}
                        className="inline-flex items-center rounded-md border border-stroke px-3 py-1.5 text-xs font-semibold text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                      >
                        Open member
                      </Link>
                    ) : null}
                    {row.entity_group_slug ? (
                      <Link
                        href={`/crm-groups/${encodeURIComponent(row.entity_group_slug)}`}
                        className="inline-flex items-center rounded-md border border-stroke px-3 py-1.5 text-xs font-semibold text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                      >
                        Open group
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
