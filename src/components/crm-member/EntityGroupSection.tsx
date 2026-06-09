"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card as UiCard } from "@/components/ui/card";
import { SectionHeader } from "./shared/SectionHeader";
import type { Client } from "./types";

export interface EntityGroupOption {
  id: number;
  slug: string;
  display_name: string;
  member_count?: number;
}

interface EntityGroupDetail extends EntityGroupOption {
  members: Client[];
}

function slugifyDisplayName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

type EntityGroupSectionProps = {
  client: Client;
  onSaveEntityGroup: (entity_group_id: number | null) => Promise<void>;
  saving?: boolean;
};

export function EntityGroupSection({
  client,
  onSaveEntityGroup,
  saving = false,
}: EntityGroupSectionProps) {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken;

  const [groups, setGroups] = useState<EntityGroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    client.entity_group_id != null ? String(client.entity_group_id) : ""
  );
  const [siblings, setSiblings] = useState<Client[]>([]);
  const [siblingsLoading, setSiblingsLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedGroupId(client.entity_group_id != null ? String(client.entity_group_id) : "");
  }, [client.id, client.entity_group_id]);

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

  const groupSlug = (client.entity_group_slug || "").trim();

  useEffect(() => {
    if (!token || !groupSlug) {
      setSiblings([]);
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

  const autoSlug = useMemo(
    () => slugifyDisplayName(createDisplayName),
    [createDisplayName]
  );

  const handleCreateGroup = async () => {
    if (!token) return;
    const displayName = createDisplayName.trim();
    const slug = (createSlug.trim() || autoSlug).trim();
    if (!displayName || !slug) {
      setCreateError("Display name and slug are required.");
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entity-groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug, display_name: displayName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Failed to create group");
      }
      const created = (await res.json()) as EntityGroupOption;
      await fetchGroups();
      setSelectedGroupId(String(created.id));
      await onSaveEntityGroup(created.id);
      setCreateOpen(false);
      setCreateDisplayName("");
      setCreateSlug("");
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleAssign = async () => {
    const id = selectedGroupId ? parseInt(selectedGroupId, 10) : null;
    if (selectedGroupId && (id == null || Number.isNaN(id))) return;
    await onSaveEntityGroup(id);
  };

  const hasUnsavedChange =
    (client.entity_group_id != null ? String(client.entity_group_id) : "") !== selectedGroupId;

  return (
    <UiCard className="overflow-hidden p-0 ring-1 ring-gray-200/60 dark:ring-gray-700/50">
      <SectionHeader
        className="px-5 py-4"
        title="Commercial entity group"
        as="h2"
      />
      <div className="border-t border-stroke/40 px-5 py-4 dark:border-dark-3/60 space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Link this site to a multisite commercial group. Separate from the sustainability reporting
          entity on the Climate tab.
        </p>

        {client.entity_group_display_name ? (
          <p className="text-sm text-gray-900 dark:text-gray-100">
            Current group:{" "}
            <span className="font-medium">{client.entity_group_display_name}</span>
            {client.entity_group_slug ? (
              <span className="ml-2 font-mono text-xs text-gray-500">({client.entity_group_slug})</span>
            ) : null}
          </p>
        ) : (
          <p className="text-sm text-amber-800 dark:text-amber-200">No commercial group assigned.</p>
        )}

        {client.external_business_id ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            LOA record: <span className="font-mono">{client.external_business_id}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Assign to group"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            disabled={groupsLoading || saving}
            wrapperClassName="min-w-[14rem] flex-1"
          >
            <option value="">— None —</option>
            {groups.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.display_name}
                {typeof g.member_count === "number" ? ` (${g.member_count})` : ""}
              </option>
            ))}
          </Select>
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
            onClick={() => {
              setCreateOpen((o) => !o);
              setCreateError(null);
            }}
          >
            {createOpen ? "Cancel new" : "New group"}
          </Button>
        </div>

        {createOpen ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/40 space-y-3">
            <Input
              label="Group display name"
              value={createDisplayName}
              onChange={(e) => {
                setCreateDisplayName(e.target.value);
                if (!createSlug.trim()) {
                  setCreateSlug(slugifyDisplayName(e.target.value));
                }
              }}
              placeholder="e.g. Bentleigh RSL Group"
            />
            <Input
              label="Slug"
              value={createSlug || autoSlug}
              onChange={(e) => setCreateSlug(e.target.value)}
              className="font-mono"
              placeholder="bentleigh-rsl-group"
              hint="Lowercase kebab-case; used in API filters"
            />
            {createError ? (
              <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>
            ) : null}
            <Button
              type="button"
              size="sm"
              loading={createSubmitting}
              disabled={createSubmitting}
              onClick={() => void handleCreateGroup()}
            >
              Create & assign to this member
            </Button>
          </div>
        ) : null}

        {groupSlug ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Other sites in this group
            </p>
            {siblingsLoading ? (
              <p className="text-xs text-gray-500">Loading…</p>
            ) : siblings.length === 0 ? (
              <p className="text-xs text-gray-500">No other members in this group yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                {siblings.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/crm-members/${s.id}`}
                      className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {s.business_name}
                      </span>
                      {s.external_business_id ? (
                        <span className="font-mono text-[10px] text-gray-400">
                          {s.external_business_id.slice(0, 12)}…
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </UiCard>
  );
}
