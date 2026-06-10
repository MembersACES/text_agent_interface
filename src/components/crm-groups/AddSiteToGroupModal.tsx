"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl, cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/crm-member/shared/StageBadge";
import type { Client } from "@/components/crm-member/types";
import type { ClientStage } from "@/constants/crm";
import { useToast } from "@/components/ui/toast";
import { assignClusterMembers } from "./assignClusterMembers";

interface AddSiteToGroupModalProps {
  open: boolean;
  onClose: () => void;
  token: string;
  groupId: number;
  groupDisplayName: string;
  existingMemberIds: number[];
  onAdded: () => void;
}

type ClientListResponse = { items: Client[]; total: number };

export function AddSiteToGroupModal({
  open,
  onClose,
  token,
  groupId,
  groupDisplayName,
  existingMemberIds,
  onAdded,
}: AddSiteToGroupModalProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [candidates, setCandidates] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [assigning, setAssigning] = useState(false);

  const existingSet = useMemo(() => new Set(existingMemberIds), [existingMemberIds]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search, open]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      setCandidates([]);
      setSelectedIds(new Set());
    }
  }, [open]);

  const fetchCandidates = useCallback(async () => {
    if (!token || !open) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "40");
      if (debouncedSearch) {
        params.set("query", debouncedSearch);
      } else {
        params.set("ungrouped_only", "true");
      }
      const res = await fetch(`${getApiBaseUrl()}/api/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to search members");
      const data = (await res.json()) as ClientListResponse | Client[];
      const items = Array.isArray(data) ? data : data.items ?? [];
      setCandidates(items.filter((c) => !existingSet.has(c.id)));
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to load members", "error");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [token, open, debouncedSearch, existingSet, showToast]);

  useEffect(() => {
    if (open) void fetchCandidates();
  }, [open, fetchCandidates]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!token || selectedIds.size === 0) return;
    setAssigning(true);
    try {
      const results = await assignClusterMembers(token, [...selectedIds], groupId);
      const ok = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      if (ok > 0) {
        showToast(
          ok === 1 ? "1 site linked to group" : `${ok} sites linked to group`,
          "success"
        );
        onAdded();
        onClose();
      }
      if (failed.length > 0) {
        showToast(
          failed.length === 1
            ? `1 site could not be linked: ${failed[0].error ?? "error"}`
            : `${failed.length} sites could not be linked`,
          "error"
        );
      }
    } finally {
      setAssigning(false);
    }
  };

  const reassignCount = useMemo(
    () =>
      candidates.filter((c) => selectedIds.has(c.id) && c.entity_group_id != null).length,
    [candidates, selectedIds]
  );

  return (
    <Modal
      open={open}
      onClose={() => {
        if (assigning) return;
        onClose();
      }}
      title="Add sites to group"
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {selectedIds.size === 0
              ? "Select members to link"
              : `${selectedIds.size} selected`}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={assigning}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={assigning}
              disabled={assigning || selectedIds.size === 0}
              onClick={() => void handleAssign()}
            >
              Add to {groupDisplayName}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Link CRM members to{" "}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {groupDisplayName}
          </span>
          . Members already in this group are hidden. Search to find any member; ungrouped
          members are shown by default.
        </p>

        <Input
          placeholder="Search by business name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search CRM members"
        />

        {reassignCount > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            {reassignCount === 1
              ? "1 selected site is in another group and will be moved here."
              : `${reassignCount} selected sites are in other groups and will be moved here.`}
          </p>
        ) : null}

        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {debouncedSearch
                ? "No matching members found (or all matches are already in this group)."
                : "No ungrouped members available. Try searching by name."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {candidates.map((client) => {
                const selected = selectedIds.has(client.id);
                const inOtherGroup =
                  client.entity_group_id != null && client.entity_group_id !== groupId;
                return (
                  <li key={client.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40",
                        selected && "bg-primary/5 dark:bg-primary/10"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(client.id)}
                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {client.business_name}
                        </p>
                        {inOtherGroup && client.entity_group_display_name ? (
                          <p className="truncate text-[11px] text-amber-700 dark:text-amber-300">
                            Currently in {client.entity_group_display_name}
                          </p>
                        ) : null}
                      </div>
                      <StageBadge stage={client.stage as ClientStage} />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
