"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/utils";
import {
  slugifyDisplayName,
  type EntityGroupListItem,
  type EntityGroupSuggestionCluster,
} from "@/lib/entity-groups";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StageBadge } from "@/components/crm-member/shared/StageBadge";
import type { ClientStage } from "@/constants/crm";
import { useToast } from "@/components/ui/toast";
import {
  assignClusterMembers,
  failedMemberIds,
  allSucceeded,
  type ClusterAssignResult,
} from "./assignClusterMembers";

interface SuggestionsPanelProps {
  token: string;
  groups: EntityGroupListItem[];
  onAssignmentComplete?: () => void;
}

type ConfirmAction = "assign-existing" | "create-assign";

const CONFIDENCE_STYLES: Record<EntityGroupSuggestionCluster["confidence"], string> = {
  high: "bg-green-light-6 text-green-dark dark:bg-green-dark/25 dark:text-green-light-2",
  medium: "bg-yellow-light-4 text-yellow-dark-2 dark:bg-yellow-dark/25 dark:text-yellow-light",
  low: "bg-gray-3 text-dark-5 dark:bg-dark-3 dark:text-gray-5",
};

export function SuggestionsPanel({ token, groups, onAssignmentComplete }: SuggestionsPanelProps) {
  const { showToast } = useToast();
  const [clusters, setClusters] = useState<EntityGroupSuggestionCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmCluster, setConfirmCluster] = useState<EntityGroupSuggestionCluster | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignResults, setAssignResults] = useState<ClusterAssignResult[] | null>(null);
  const [pendingMemberIds, setPendingMemberIds] = useState<number[]>([]);
  const [createdGroupId, setCreatedGroupId] = useState<number | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entity-groups/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load suggestions");
      const data = (await res.json()) as { clusters?: EntityGroupSuggestionCluster[] };
      setClusters(Array.isArray(data.clusters) ? data.clusters : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load suggestions");
      setClusters([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  const resetConfirm = () => {
    setConfirmCluster(null);
    setConfirmAction(null);
    setSelectedGroupId("");
    setCreateSlug("");
    setCreateDisplayName("");
    setCreateError(null);
    setAssignResults(null);
    setPendingMemberIds([]);
    setCreatedGroupId(null);
  };

  const openConfirm = (cluster: EntityGroupSuggestionCluster, action: ConfirmAction) => {
    setConfirmCluster(cluster);
    setConfirmAction(action);
    setAssignResults(null);
    setPendingMemberIds(cluster.member_ids);
    setCreateError(null);
    if (action === "create-assign") {
      setCreateDisplayName(cluster.suggested_display_name);
      setCreateSlug(cluster.suggested_slug);
    } else {
      setSelectedGroupId(groups[0] ? String(groups[0].id) : "");
    }
  };

  const runAssignExisting = async () => {
    if (!confirmCluster || !selectedGroupId) return;
    const groupId = parseInt(selectedGroupId, 10);
    if (Number.isNaN(groupId)) return;
    setAssigning(true);
    setCreateError(null);
    const results = await assignClusterMembers(token, pendingMemberIds, groupId);
    setAssignResults(results);
    setAssigning(false);
    if (allSucceeded(results)) {
      showToast(`Assigned ${results.length} member(s) to group`, "success");
      resetConfirm();
      void fetchSuggestions();
      onAssignmentComplete?.();
    } else {
      setPendingMemberIds(failedMemberIds(results));
      showToast("Some members could not be assigned — see details below", "warning");
    }
  };

  const runCreateAndAssign = async () => {
    if (!confirmCluster) return;
    const trimmedName = createDisplayName.trim();
    const trimmedSlug = (createSlug.trim() || slugifyDisplayName(trimmedName)).trim();
    if (!trimmedName || !trimmedSlug) {
      setCreateError("Display name and slug are required.");
      return;
    }
    setAssigning(true);
    setCreateError(null);
    setAssignResults(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entity-groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: trimmedSlug, display_name: trimmedName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Failed to create group");
      }
      const created = (await res.json()) as EntityGroupListItem;
      setCreatedGroupId(created.id);
      const results = await assignClusterMembers(token, pendingMemberIds, created.id);
      setAssignResults(results);
      if (allSucceeded(results)) {
        showToast(`Created group and assigned ${results.length} member(s)`, "success");
        resetConfirm();
        void fetchSuggestions();
        onAssignmentComplete?.();
      } else {
        setPendingMemberIds(failedMemberIds(results));
        showToast("Group created but some members could not be assigned", "warning");
        onAssignmentComplete?.();
      }
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setAssigning(false);
    }
  };

  const retryFailed = async () => {
    const targetGroupId =
      confirmAction === "create-assign"
        ? createdGroupId
        : selectedGroupId
          ? parseInt(selectedGroupId, 10)
          : null;
    if (!targetGroupId || Number.isNaN(targetGroupId)) return;

    setAssigning(true);
    const results = await assignClusterMembers(token, pendingMemberIds, targetGroupId);
    const merged = [
      ...(assignResults ?? []).filter((r) => r.ok),
      ...results,
    ];
    setAssignResults(merged);
    setPendingMemberIds(failedMemberIds(results));
    setAssigning(false);

    if (allSucceeded(merged)) {
      showToast("All members assigned", "success");
      resetConfirm();
      void fetchSuggestions();
      onAssignmentComplete?.();
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading suggestions…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (clusters.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No ungrouped member clusters detected. Assign groups manually from member profiles.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {clusters.map((cluster) => {
        const isOpen =
          confirmCluster?.suggested_slug === cluster.suggested_slug &&
          confirmCluster?.member_ids.join() === cluster.member_ids.join();

        return (
          <Card key={`${cluster.suggested_slug}-${cluster.member_ids.join("-")}`} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {cluster.suggested_display_name}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{cluster.reason}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${CONFIDENCE_STYLES[cluster.confidence]}`}
              >
                {cluster.confidence}
              </span>
            </div>

            <ul className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
              {cluster.members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {m.business_name}
                  </span>
                  <div className="flex items-center gap-2">
                    {m.external_business_id ? (
                      <span className="font-mono text-[10px] text-gray-400">
                        {m.external_business_id.slice(0, 14)}
                        {m.external_business_id.length > 14 ? "…" : ""}
                      </span>
                    ) : null}
                    <StageBadge stage={m.stage as ClientStage} />
                  </div>
                </li>
              ))}
            </ul>

            {!isOpen ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={groups.length === 0}
                  onClick={() => openConfirm(cluster, "assign-existing")}
                >
                  Assign to existing group
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openConfirm(cluster, "create-assign")}
                >
                  Create group + assign
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 space-y-3">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Confirm assignment for {pendingMemberIds.length} member
                  {pendingMemberIds.length === 1 ? "" : "s"}
                </p>

                {confirmAction === "assign-existing" ? (
                  <Select
                    label="Existing group"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    wrapperClassName="max-w-md"
                  >
                    <option value="">— Select group —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={String(g.id)}>
                        {g.display_name} ({g.member_count})
                      </option>
                    ))}
                  </Select>
                ) : (
                  <>
                    <Input
                      label="Group display name"
                      value={createDisplayName}
                      onChange={(e) => setCreateDisplayName(e.target.value)}
                    />
                    <Input
                      label="Slug"
                      value={createSlug}
                      onChange={(e) => setCreateSlug(e.target.value)}
                      className="font-mono text-xs"
                      hint="Edit if this slug already exists"
                    />
                    {createError ? (
                      <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>
                    ) : null}
                  </>
                )}

                {assignResults ? (
                  <div className="space-y-1 text-xs">
                    {assignResults.map((r) => (
                      <p
                        key={r.client_id}
                        className={
                          r.ok
                            ? "text-green-700 dark:text-green-300"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        Member #{r.client_id}: {r.ok ? "assigned" : r.error ?? "failed"}
                      </p>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {assignResults && pendingMemberIds.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      loading={assigning}
                      onClick={() => void retryFailed()}
                    >
                      Retry failed ({pendingMemberIds.length})
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      loading={assigning}
                      disabled={
                        assigning ||
                        (confirmAction === "assign-existing" && !selectedGroupId)
                      }
                      onClick={() =>
                        void (
                          confirmAction === "assign-existing"
                            ? runAssignExisting()
                            : runCreateAndAssign()
                        )
                      }
                    >
                      Confirm
                    </Button>
                  )}
                  <Button type="button" variant="secondary" size="sm" onClick={resetConfirm}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
