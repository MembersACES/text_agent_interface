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
import {
  ClimateDisclosureChip,
  ClimateDisclosureModal,
} from "@/components/crm-groups/ClimateDisclosurePanel";
import { GroupSiteDetail } from "@/components/crm-groups/GroupSiteDetail";
import { useGroupBusinessInfoCache } from "@/components/crm-groups/useGroupBusinessInfoCache";
import { StageBadge } from "@/components/crm-member/shared/StageBadge";
import type { Client } from "@/components/crm-member/types";
import {
  type EntityGroupListItem,
  type EntityGroupSummary,
} from "@/lib/entity-groups";
import type { ClientStage } from "@/constants/crm";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AddSiteToGroupModal } from "@/components/crm-groups/AddSiteToGroupModal";
import { Plus, Trash2 } from "lucide-react";
import type { EntityGroupDeleteResult } from "@/lib/entity-groups";
import { getTradingName } from "@/lib/business-info-fields";

interface EntityGroupDetail extends EntityGroupListItem {
  members: Client[];
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
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [climateOpen, setClimateOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [allGroups, setAllGroups] = useState<EntityGroupListItem[]>([]);
  const [savingMembershipClientId, setSavingMembershipClientId] = useState<number | null>(null);
  const [reportingEntityDraft, setReportingEntityDraft] = useState("");
  const [savingReportingEntity, setSavingReportingEntity] = useState(false);
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState<string | null>(null);
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

  useEffect(() => {
    setReportingEntityDraft(group?.reporting_entity ?? "");
  }, [group?.id, group?.reporting_entity]);

  const climateRollupSlug = (summary?.group_reporting_entity || group?.reporting_entity || "").trim();
  const membersNotInRollup =
    summary && climateRollupSlug
      ? Math.max(0, summary.member_count - (summary.members_in_climate_rollup ?? 0))
      : 0;
  const climateHasWarning =
    !!summary && (!summary.reporting_entity.aligned || membersNotInRollup > 0);

  const saveGroupReportingEntity = useCallback(async () => {
    if (!token || !slug) return;
    setSavingReportingEntity(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entity-groups/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reporting_entity: reportingEntityDraft.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Failed to save disclosure slug");
      }
      showToast("Group disclosure slug saved", "success");
      await fetchData();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to save", "error");
    } finally {
      setSavingReportingEntity(false);
    }
  }, [token, slug, reportingEntityDraft, showToast, fetchData]);

  const runGroupSyncAll = useCallback(async () => {
    if (!token || !climateRollupSlug || !group?.members?.length) {
      showToast("Set a group disclosure slug first", "warning");
      return;
    }
    setSyncAllLoading(true);
    let totalCreated = 0;
    let totalUpdated = 0;
    let failures = 0;
    try {
      const rollupMembers = group.members.filter((m) => {
        const memberSlug = (m.reporting_entity || "").trim().toLowerCase();
        return !memberSlug || memberSlug === climateRollupSlug.toLowerCase();
      });
      for (const member of rollupMembers) {
        setSyncAllProgress(member.business_name);
        const luRes = await fetch(
          `${getApiBaseUrl()}/api/clients/${member.id}/climate/linked-utilities`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!luRes.ok) {
          failures += 1;
          continue;
        }
        const lu = (await luRes.json()) as {
          sites?: Array<{ utility_type: string; identifier: string }>;
        };
        const sites = Array.isArray(lu.sites) ? lu.sites : [];
        for (const site of sites) {
          setSyncAllProgress(`${member.business_name} · ${site.utility_type}`);
          const syncRes = await fetch(
            `${getApiBaseUrl()}/api/clients/${member.id}/climate/etl/sync`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                utility_type: site.utility_type,
                identifier: site.identifier,
                reporting_period_label: "FY26",
                max_records: 100,
                dry_run: false,
              }),
            },
          );
          if (!syncRes.ok) {
            failures += 1;
            continue;
          }
          const data = (await syncRes.json()) as { created?: number; updated?: number };
          totalCreated += data.created ?? 0;
          totalUpdated += data.updated ?? 0;
        }
      }
      showToast(
        `Sync all: ${totalCreated} created, ${totalUpdated} updated` +
          (failures ? ` · ${failures} step(s) failed` : ""),
        failures > 0 ? "warning" : "success",
      );
      await fetchData();
    } catch {
      showToast("Group sync failed", "error");
    } finally {
      setSyncAllProgress(null);
      setSyncAllLoading(false);
    }
  }, [token, climateRollupSlug, group?.members, showToast, fetchData]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/entity-groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as EntityGroupListItem[];
        setAllGroups(Array.isArray(data) ? data : []);
      } catch {
        setAllGroups([]);
      }
    })();
  }, [token]);

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

  const patchSiteMembership = useCallback(
    async (clientId: number, entity_group_id: number | null) => {
      if (!token) return;
      setSavingMembershipClientId(clientId);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ entity_group_id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to update group");
        }
        return true;
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : "Failed to update group", "error");
        return false;
      } finally {
        setSavingMembershipClientId(null);
      }
    },
    [token, showToast]
  );

  const handleRemoveFromGroup = useCallback(async () => {
    if (!selectedMember) return;
    const clientId = selectedMember.id;
    const ok = await patchSiteMembership(clientId, null);
    if (!ok) return;
    showToast(`${selectedMember.business_name} removed from group`, "success");
    await fetchData();
  }, [selectedMember, patchSiteMembership, showToast, fetchData]);

  const handleTransferToGroup = useCallback(
    async (targetGroupId: number) => {
      if (!selectedMember) return;
      const target = allGroups.find((g) => g.id === targetGroupId);
      const ok = await patchSiteMembership(selectedMember.id, targetGroupId);
      if (!ok) return;
      showToast(
        `${selectedMember.business_name} moved to ${target?.display_name ?? "group"}`,
        "success"
      );
      await fetchData();
    },
    [selectedMember, allGroups, patchSiteMembership, showToast, fetchData]
  );

  const handleDeleteGroup = useCallback(async () => {
    if (!token || !slug) return;
    setDeleting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entity-groups/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Failed to delete group");
      }
      const result = (await res.json()) as EntityGroupDeleteResult;
      const count = result.unlinked_member_count;
      showToast(
        count === 1
          ? "Group deleted — 1 site unlinked"
          : `Group deleted — ${count} sites unlinked`,
        "success"
      );
      setDeleteOpen(false);
      setDeleteConfirm(false);
      router.push("/crm-groups");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to delete group", "error");
    } finally {
      setDeleting(false);
    }
  }, [token, slug, router, showToast]);

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
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/crm-groups"
              className="text-sm font-medium text-primary hover:underline"
            >
              All groups
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete group
            </Button>
          </div>
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
        trailing={
          <ClimateDisclosureChip
            slug={climateRollupSlug}
            hasWarning={climateHasWarning}
            membersInRollup={summary.members_in_climate_rollup}
            memberCount={summary.member_count}
            onOpen={() => setClimateOpen(true)}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-[260px_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-dark">
            <div className="space-y-2 border-b border-gray-100 p-3 dark:border-gray-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setAddSiteOpen(true)}
              >
                <Plus className="size-3.5" aria-hidden />
                Add site
              </Button>
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
                  const memberTrading = getTradingName(
                    businessInfoCache[member.id]?.data ?? null
                  );
                  const tradingSubtitle =
                    memberTrading && memberTrading !== member.business_name
                      ? memberTrading
                      : null;
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
                        <span
                          className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100"
                          title={member.business_name}
                        >
                          {member.business_name}
                        </span>
                        {tradingSubtitle ? (
                          <span
                            className="mt-0.5 block truncate text-[11px] text-gray-500 dark:text-gray-400"
                            title={tradingSubtitle}
                          >
                            {tradingSubtitle}
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
            currentGroupId={group.id}
            otherGroups={allGroups}
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
            onRemoveFromGroup={selectedMember && token ? handleRemoveFromGroup : undefined}
            onTransferToGroup={selectedMember && token ? handleTransferToGroup : undefined}
            savingMembership={
              selectedMember != null && savingMembershipClientId === selectedMember.id
            }
          />
        </div>
      </div>

      {token ? (
        <AddSiteToGroupModal
          open={addSiteOpen}
          onClose={() => setAddSiteOpen(false)}
          token={token}
          groupId={group.id}
          groupDisplayName={group.display_name}
          existingMemberIds={sortedMembers.map((m) => m.id)}
          onAdded={() => void fetchData()}
        />
      ) : null}

      <ClimateDisclosureModal
        open={climateOpen}
        onClose={() => setClimateOpen(false)}
        draft={reportingEntityDraft}
        onDraftChange={setReportingEntityDraft}
        onSave={() => void saveGroupReportingEntity()}
        saving={savingReportingEntity}
        activeSlug={climateRollupSlug}
        onSync={() => void runGroupSyncAll()}
        syncing={syncAllLoading}
        syncProgress={syncAllProgress}
        membersInRollup={summary.members_in_climate_rollup}
        memberCount={summary.member_count}
        stagedActivityTotal={summary.staged_activity_total}
        aligned={summary.reporting_entity.aligned}
        distinctValues={summary.reporting_entity.distinct_values}
        membersNotInRollup={membersNotInRollup}
      />

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeleteConfirm(false);
        }}
        title="Delete group?"
        size="default"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={deleting}
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirm(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
              loading={deleting}
              disabled={deleting || !deleteConfirm}
              onClick={() => void handleDeleteGroup()}
            >
              {deleting ? "Deleting…" : "Delete group"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            This will permanently delete{" "}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {group.display_name}
            </span>{" "}
            and unlink{" "}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {summary.member_count === 1
                ? "1 site"
                : `${summary.member_count} sites`}
            </span>{" "}
            from the group. CRM members are not deleted — they stay in the pipeline with no
            commercial group assigned.
          </p>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/40">
            <input
              type="checkbox"
              checked={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500 dark:border-gray-600"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              I understand this group will be deleted and all linked sites will be unassigned.
            </span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
