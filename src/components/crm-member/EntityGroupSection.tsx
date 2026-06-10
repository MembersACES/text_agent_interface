"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ChevronDown,
  ChevronRight,
  Link2,
  Network,
  Settings,
  UsersRound,
} from "lucide-react";
import { cn, getApiBaseUrl } from "@/lib/utils";
import {
  getMemberAvatarClass,
  getMemberInitials,
} from "@/lib/member-profile-recent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CreateGroupForm } from "@/components/crm-groups/CreateGroupForm";
import { GroupBadge } from "@/components/crm-groups/GroupBadge";
import type { EntityGroupListItem } from "@/lib/entity-groups";
import type { ClientStage } from "@/constants/crm";
import { StageBadge } from "./shared/StageBadge";
import type { Client } from "./types";

export type EntityGroupOption = EntityGroupListItem;

interface EntityGroupDetail extends EntityGroupOption {
  members: Client[];
}

type EntityGroupSectionProps = {
  client: Client;
  onSaveEntityGroup: (entity_group_id: number | null) => Promise<void>;
  onSaveExternalBusinessId?: (external_business_id: string | null) => Promise<void>;
  saving?: boolean;
  savingExternalBusinessId?: boolean;
};

function truncateLoaId(id: string, max = 14): string {
  const t = id.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function EntityGroupSection({
  client,
  onSaveEntityGroup,
  onSaveExternalBusinessId,
  saving = false,
  savingExternalBusinessId = false,
}: EntityGroupSectionProps) {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken;

  const manageMenuRef = useRef<HTMLDivElement>(null);

  const [groups, setGroups] = useState<EntityGroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    client.entity_group_id != null ? String(client.entity_group_id) : ""
  );
  const [siblings, setSiblings] = useState<Client[]>([]);
  const [groupReportingEntity, setGroupReportingEntity] = useState<string | null>(null);
  const [siblingsLoading, setSiblingsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [siblingsExpanded, setSiblingsExpanded] = useState(false);
  const [loaRecordId, setLoaRecordId] = useState(client.external_business_id ?? "");

  const isAssigned = client.entity_group_id != null;
  const groupSlug = (client.entity_group_slug || "").trim();
  const hubHref = groupSlug ? `/crm-groups/${encodeURIComponent(groupSlug)}` : null;

  useEffect(() => {
    setSelectedGroupId(client.entity_group_id != null ? String(client.entity_group_id) : "");
  }, [client.id, client.entity_group_id]);

  useEffect(() => {
    setLoaRecordId(client.external_business_id ?? "");
  }, [client.id, client.external_business_id]);

  useEffect(() => {
    if (!manageOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (manageMenuRef.current && !manageMenuRef.current.contains(e.target as Node)) {
        setManageOpen(false);
        setCreateOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [manageOpen]);

  const fetchGroups = useCallback(async () => {
    if (!token) return;
    setGroupsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entity-groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as EntityGroupOption[];
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (!token || !groupSlug) {
      setSiblings([]);
      setGroupReportingEntity(null);
      setSiblingsExpanded(false);
      return;
    }
    let cancelled = false;
    setSiblingsLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/api/entity-groups/${encodeURIComponent(groupSlug)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to load group");
        const data = (await res.json()) as EntityGroupDetail;
        if (!cancelled) {
          setSiblings(
            Array.isArray(data.members)
              ? data.members.filter((m) => m.id !== client.id)
              : []
          );
          setGroupReportingEntity(data.reporting_entity ?? null);
        }
      } catch {
        if (!cancelled) setSiblings([]);
      } finally {
        if (!cancelled) setSiblingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, groupSlug, client.id]);

  const currentGroup = useMemo(
    () => groups.find((g) => g.id === client.entity_group_id),
    [groups, client.entity_group_id]
  );

  const siteCount = useMemo(() => {
    if (typeof currentGroup?.member_count === "number") return currentGroup.member_count;
    return siblings.length + 1;
  }, [currentGroup?.member_count, siblings.length]);

  const handleAssign = async () => {
    const id = selectedGroupId ? parseInt(selectedGroupId, 10) : null;
    if (selectedGroupId && (id == null || Number.isNaN(id))) return;
    await onSaveEntityGroup(id);
    setCreateOpen(false);
    setManageOpen(false);
  };

  const hasUnsavedChange =
    (client.entity_group_id != null ? String(client.entity_group_id) : "") !== selectedGroupId;

  const siteCountLabel = siteCount === 1 ? "1 site" : `${siteCount} sites`;
  const canExpandSiblings = isAssigned && Boolean(groupSlug);
  const memberSlug = (client.reporting_entity || "").trim().toLowerCase();
  const groupSlugNorm = (groupReportingEntity || "").trim().toLowerCase();
  const disclosureMode =
    memberSlug && groupSlugNorm && memberSlug !== groupSlugNorm
      ? "override"
      : !memberSlug && groupSlugNorm
        ? "inherit"
        : memberSlug
          ? "member"
          : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-stroke/40 bg-white shadow-sm ring-1 ring-gray-200/60 dark:border-dark-3/60 dark:bg-dark-2 dark:ring-gray-700/50",
        manageOpen && "relative z-50"
      )}
    >
      <div className="flex min-h-[50px] items-center gap-3 px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Network
            className="size-4 shrink-0 text-gray-400 dark:text-gray-500"
            aria-hidden
          />

          {isAssigned && client.entity_group_display_name ? (
            <>
              <span className="shrink-0 text-gray-500 dark:text-gray-400">Part of</span>
              <GroupBadge
                displayName={client.entity_group_display_name}
                slug={client.entity_group_slug}
              />
              <span className="text-gray-400 dark:text-gray-500">·</span>
              {canExpandSiblings ? (
                <button
                  type="button"
                  onClick={() => setSiblingsExpanded((v) => !v)}
                  className="inline-flex items-center gap-1 font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-200 dark:hover:text-primary"
                  aria-expanded={siblingsExpanded}
                >
                  {siteCountLabel}
                  <ChevronDown
                    className={cn("size-3.5 transition-transform", siblingsExpanded && "rotate-180")}
                    aria-hidden
                  />
                </button>
              ) : (
                <span className="font-medium text-gray-700 dark:text-gray-200">{siteCountLabel}</span>
              )}
              {!siblingsLoading && siblings.length > 0 ? (
                <span className="inline-flex items-center -space-x-1.5">
                  {siblings.slice(0, 3).map((s) => (
                    <span
                      key={s.id}
                      title={s.business_name}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-semibold dark:border-dark-2",
                        getMemberAvatarClass(s.business_name)
                      )}
                    >
                      {getMemberInitials(s.business_name)}
                    </span>
                  ))}
                  {siblings.length > 3 ? (
                    <span className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[9px] font-semibold text-gray-600 dark:border-dark-2 dark:bg-gray-800 dark:text-gray-300">
                      +{siblings.length - 3}
                    </span>
                  ) : null}
                </span>
              ) : null}
              {groupReportingEntity ? (
                <>
                  <span className="text-gray-400 dark:text-gray-500">·</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Disclosure{" "}
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      {groupReportingEntity}
                    </span>
                    {disclosureMode === "inherit" ? " (inherited)" : null}
                    {disclosureMode === "override" ? " (site uses different slug)" : null}
                  </span>
                </>
              ) : null}
            </>
          ) : (
            <span className="text-gray-600 dark:text-gray-300">
              <UsersRound className="mr-1.5 inline size-3.5 text-amber-500" aria-hidden />
              No commercial group assigned
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {hubHref ? (
            <Link
              href={hubHref}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View hub →
            </Link>
          ) : null}

          <div className="relative" ref={manageMenuRef}>
            <button
              type="button"
              onClick={() => {
                setManageOpen((v) => !v);
                if (!manageOpen) void fetchGroups();
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              aria-expanded={manageOpen}
              aria-haspopup="true"
            >
              <Settings className="size-3.5" aria-hidden />
              Manage
              <ChevronDown
                className={cn("size-3.5 transition-transform", manageOpen && "rotate-180")}
                aria-hidden
              />
            </button>

            {manageOpen ? (
              <div className="absolute right-0 top-full z-[9999] mt-1 w-[min(100vw-2rem,22rem)] rounded-lg border border-gray-200 bg-white py-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                <div className="space-y-4 px-4">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Group assignment
                    </p>
                    {groupsLoading ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Loading groups…</p>
                    ) : null}
                    <div className="space-y-2">
                      <Select
                        label="Assign to group"
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        disabled={groupsLoading || saving}
                      >
                        <option value="">— None —</option>
                        {groups.map((g) => (
                          <option key={g.id} value={String(g.id)}>
                            {g.display_name}
                            {typeof g.member_count === "number" ? ` (${g.member_count})` : ""}
                          </option>
                        ))}
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={saving}
                          disabled={saving || !hasUnsavedChange}
                          onClick={() => void handleAssign()}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setCreateOpen((o) => !o)}
                        >
                          {createOpen ? "Cancel new" : "New group"}
                        </Button>
                      </div>
                    </div>

                    {createOpen && token ? (
                      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                        <CreateGroupForm
                          token={token}
                          submitLabel="Create & assign to this member"
                          onCancel={() => setCreateOpen(false)}
                          onCreated={async (created) => {
                            await fetchGroups();
                            setSelectedGroupId(String(created.id));
                            await onSaveEntityGroup(created.id);
                            setCreateOpen(false);
                            setManageOpen(false);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Link2 className="size-3.5 text-gray-400 dark:text-gray-500" aria-hidden />
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Airtable LOA record ID
                      </p>
                    </div>
                    {onSaveExternalBusinessId ? (
                      <div className="space-y-2">
                        <Input
                          label=""
                          aria-label="Airtable LOA record ID"
                          value={loaRecordId}
                          onChange={(e) => setLoaRecordId(e.target.value)}
                          className="font-mono text-xs"
                          placeholder="recXXXXXXXXXXXXXX"
                          disabled={savingExternalBusinessId}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          loading={savingExternalBusinessId}
                          disabled={
                            savingExternalBusinessId ||
                            loaRecordId.trim() === (client.external_business_id ?? "").trim()
                          }
                          onClick={() =>
                            void onSaveExternalBusinessId(
                              loaRecordId.trim() ? loaRecordId.trim() : null
                            )
                          }
                        >
                          Save ID
                        </Button>
                      </div>
                    ) : client.external_business_id ? (
                      <p className="font-mono text-xs text-gray-600 dark:text-gray-400">
                        {client.external_business_id}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No ID linked yet (loads from business info).
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {siblingsExpanded && canExpandSiblings ? (
        <div className="border-t border-stroke/40 px-4 py-2 dark:border-dark-3/60">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Other sites in this group
          </p>
          {siblingsLoading ? (
            <p className="py-1 text-xs text-gray-500 dark:text-gray-400">Loading related sites…</p>
          ) : siblings.length === 0 ? (
            <p className="py-1 text-xs text-gray-500 dark:text-gray-400">
              No other members in this group yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {siblings.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/crm-members/${s.id}`}
                    className="group flex items-center gap-2.5 py-2 transition-colors hover:text-primary"
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        getMemberAvatarClass(s.business_name)
                      )}
                    >
                      {getMemberInitials(s.business_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 group-hover:text-primary dark:text-gray-100">
                        {s.business_name}
                      </p>
                      {s.external_business_id ? (
                        <p className="truncate font-mono text-[10px] text-gray-400 dark:text-gray-500">
                          {truncateLoaId(s.external_business_id, 18)}
                        </p>
                      ) : null}
                    </div>
                    <StageBadge stage={s.stage as ClientStage} />
                    <ChevronRight
                      className="size-3.5 shrink-0 text-gray-300 group-hover:text-gray-500 dark:text-gray-600"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hubHref ? (
            <Link
              href={hubHref}
              className="mt-1 inline-block py-1 text-xs font-semibold text-primary hover:underline"
            >
              View all {siteCount} sites in hub →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
