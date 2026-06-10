"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getApiBaseUrl, cn } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { GroupBadge } from "@/components/crm-groups/GroupBadge";
import { GroupSummaryBar } from "@/components/crm-groups/GroupSummaryBar";
import { GroupSiteDetail } from "@/components/crm-groups/GroupSiteDetail";
import { useGroupBusinessInfoCache } from "@/components/crm-groups/useGroupBusinessInfoCache";
import { StageBadge } from "@/components/crm-member/shared/StageBadge";
import type { Client } from "@/components/crm-member/types";
import type { EntityGroupListItem, EntityGroupSummary } from "@/lib/entity-groups";
import type { ClientStage } from "@/constants/crm";
import { useToast } from "@/components/ui/toast";
import { AlertTriangle } from "lucide-react";

interface EntityGroupDetail extends EntityGroupListItem {
  members: Client[];
}

function truncateLoa(id: string, max = 12): string {
  if (id.length <= max) return id;
  return `${id.slice(0, max)}…`;
}

export default function CrmGroupHubPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken;

  const [group, setGroup] = useState<EntityGroupDetail | null>(null);
  const [summary, setSummary] = useState<EntityGroupSummary | null>(null);
  const [offerCountByClientId, setOfferCountByClientId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteFilter, setSiteFilter] = useState("");
  const [savingStageId, setSavingStageId] = useState<number | null>(null);
  const { showToast } = useToast();

  const siteParam = searchParams.get("site");
  const selectedSiteId = siteParam ? parseInt(siteParam, 10) : null;

  const sortedMembers = useMemo(() => {
    if (!group?.members) return [];
    return [...group.members].sort((a, b) =>
      a.business_name.localeCompare(b.business_name)
    );
  }, [group?.members]);

  const filteredMembers = useMemo(() => {
    const q = siteFilter.trim().toLowerCase();
    if (!q) return sortedMembers;
    return sortedMembers.filter((m) => {
      const name = m.business_name.toLowerCase();
      const loa = (m.external_business_id ?? "").toLowerCase();
      return name.includes(q) || loa.includes(q);
    });
  }, [sortedMembers, siteFilter]);

  const effectiveSelectedId = useMemo(() => {
    if (selectedSiteId && sortedMembers.some((m) => m.id === selectedSiteId)) {
      return selectedSiteId;
    }
    return sortedMembers[0]?.id ?? null;
  }, [selectedSiteId, sortedMembers]);

  const selectedMember = useMemo(
    () => sortedMembers.find((m) => m.id === effectiveSelectedId) ?? null,
    [sortedMembers, effectiveSelectedId]
  );

  const signedCount = useMemo(
    () => sortedMembers.filter((m) => m.has_signed_contract).length,
    [sortedMembers]
  );

  const stageCount = useMemo(
    () => Object.keys(summary?.stage_breakdown ?? {}).length,
    [summary?.stage_breakdown]
  );

  useEffect(() => {
    if (!effectiveSelectedId || !slug) return;
    if (siteParam && parseInt(siteParam, 10) === effectiveSelectedId) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("site", String(effectiveSelectedId));
    router.replace(`/crm-groups/${encodeURIComponent(slug)}?${next.toString()}`, {
      scroll: false,
    });
  }, [effectiveSelectedId, siteParam, slug, router, searchParams]);

  const fetchData = useCallback(async () => {
    if (!token || !slug) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [detailRes, summaryRes, countsRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/entity-groups/${encodeURIComponent(slug)}`, { headers }),
        fetch(`${getApiBaseUrl()}/api/entity-groups/${encodeURIComponent(slug)}/summary`, {
          headers,
        }),
        fetch(`${getApiBaseUrl()}/api/reports/clients/offer-counts`, { headers }),
      ]);
      if (!detailRes.ok) {
        throw new Error(detailRes.status === 404 ? "Group not found" : "Failed to load group");
      }
      if (!summaryRes.ok) throw new Error("Failed to load summary");
      const detail = (await detailRes.json()) as EntityGroupDetail;
      const summaryData = (await summaryRes.json()) as EntityGroupSummary;
      setGroup(detail);
      setSummary(summaryData);
      if (countsRes.ok) {
        const counts = (await countsRes.json()) as Record<string, number>;
        setOfferCountByClientId(counts ?? {});
      } else {
        setOfferCountByClientId({});
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load group");
      setGroup(null);
      setSummary(null);
      setOfferCountByClientId({});
    } finally {
      setLoading(false);
    }
  }, [token, slug]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const { cache: businessInfoCache, retry: retryBusinessInfo } = useGroupBusinessInfoCache(
    sortedMembers,
    token ?? ""
  );

  const handleStageChange = useCallback(
    async (clientId: number, stage: ClientStage) => {
      if (!token) return;
      const previous = sortedMembers.find((m) => m.id === clientId);
      setSavingStageId(clientId);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}/stage`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stage }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to update stage");
        }
        const updated = (await res.json()) as Client;
        setGroup((g) =>
          g
            ? { ...g, members: g.members.map((m) => (m.id === clientId ? updated : m)) }
            : g
        );
        if (previous && summary) {
          setSummary((s) => {
            if (!s) return s;
            const breakdown = { ...s.stage_breakdown };
            const oldStage = previous.stage;
            if (breakdown[oldStage] != null) {
              breakdown[oldStage] = Math.max(0, breakdown[oldStage] - 1);
              if (breakdown[oldStage] === 0) delete breakdown[oldStage];
            }
            breakdown[stage] = (breakdown[stage] ?? 0) + 1;
            return { ...s, stage_breakdown: breakdown };
          });
        }
        showToast("Stage updated", "success");
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : "Failed to update stage", "error");
      } finally {
        setSavingStageId(null);
      }
    },
    [token, sortedMembers, summary, showToast]
  );

  const selectSite = (clientId: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("site", String(clientId));
    router.replace(`/crm-groups/${encodeURIComponent(slug)}?${next.toString()}`, {
      scroll: false,
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="mb-6 h-12 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !group || !summary) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <PageHeader pageName="Groups" title="Group not found" />
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? "Unknown error"}</p>
        <Link href="/crm-groups" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Back to groups
        </Link>
      </div>
    );
  }

  const selectedOfferCount =
    effectiveSelectedId != null
      ? offerCountByClientId[String(effectiveSelectedId)] ?? 0
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        pageName="Groups"
        title={group.display_name}
        description={`Commercial multisite group · ${group.slug}`}
        actions={
          <Link
            href="/crm-groups"
            className="text-sm font-medium text-primary hover:underline"
          >
            All groups
          </Link>
        }
      />

      <div className="mb-4">
        <GroupBadge displayName={group.display_name} slug={group.slug} />
      </div>

      {group.primary_abn ? (
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Head office / billing ABN:{" "}
          <span className="font-mono text-gray-700 dark:text-gray-300">{group.primary_abn}</span>
        </p>
      ) : null}

      <GroupSummaryBar
        className="mb-4"
        memberCount={summary.member_count}
        totalOffers={summary.total_offers}
        signedCount={signedCount}
        stageCount={stageCount}
      />

      {!summary.reporting_entity.aligned ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Mixed reporting entity across sites — Climate may differ per member (
            {summary.reporting_entity.distinct_values.join(", ")}).
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-dark">
            <div className="border-b border-gray-100 p-3 dark:border-gray-800">
              <Input
                placeholder="Filter sites…"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                aria-label="Filter sites by name or LOA record"
              />
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredMembers.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-gray-500">
                  {sortedMembers.length === 0
                    ? "No members assigned yet."
                    : "No sites match your filter."}
                </li>
              ) : (
                filteredMembers.map((member) => {
                  const selected = member.id === effectiveSelectedId;
                  return (
                    <li key={member.id}>
                      <button
                        type="button"
                        onClick={() => selectSite(member.id)}
                        className={cn(
                          "w-full border-l-4 px-3 py-3 text-left transition-colors",
                          selected
                            ? "border-violet-500 bg-violet-50/90 dark:border-violet-400 dark:bg-violet-900/25"
                            : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        )}
                      >
                        <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {member.business_name}
                        </span>
                        {member.external_business_id ? (
                          <span className="mt-0.5 block font-mono text-[10px] text-gray-400">
                            {truncateLoa(member.external_business_id)}
                          </span>
                        ) : null}
                        <div className="mt-2">
                          <StageBadge stage={member.stage as ClientStage} />
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </aside>

        <div className="min-w-0">
          <GroupSiteDetail
            client={selectedMember}
            token={token ?? ""}
            offerCount={selectedOfferCount}
            cacheEntry={
              selectedMember ? businessInfoCache[selectedMember.id] ?? null : null
            }
            onRetry={
              selectedMember && token
                ? () => retryBusinessInfo(selectedMember)
                : undefined
            }
            onStageChange={
              selectedMember && token
                ? (stage) => handleStageChange(selectedMember.id, stage)
                : undefined
            }
            savingStage={selectedMember != null && savingStageId === selectedMember.id}
          />
        </div>
      </div>
    </div>
  );
}
