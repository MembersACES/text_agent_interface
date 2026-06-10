"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateGroupForm } from "@/components/crm-groups/CreateGroupForm";
import { GroupCard } from "@/components/crm-groups/GroupCard";
import { SuggestionsPanel } from "@/components/crm-groups/SuggestionsPanel";
import { CollapsiblePanel } from "@/components/dashboard";
import type { EntityGroupListItem } from "@/lib/entity-groups";

export default function CrmGroupsPage() {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken;

  const [groups, setGroups] = useState<EntityGroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entity-groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load groups");
      const data = (await res.json()) as EntityGroupListItem[];
      setGroups(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load groups");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        pageName="Groups"
        title="Commercial entity groups"
        description="Multisite commercial grouping for CRM members. Separate from sustainability reporting entities."
        actions={
          <Button type="button" variant="secondary" size="sm" onClick={() => setCreateOpen((o) => !o)}>
            {createOpen ? "Cancel" : "Create group"}
          </Button>
        }
      />

      {createOpen && token ? (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">New group</h2>
          <CreateGroupForm
            token={token}
            onCreated={(group) => {
              setGroups((prev) =>
                [...prev, group].sort((a, b) => a.display_name.localeCompare(b.display_name))
              );
              setCreateOpen(false);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </Card>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          All groups
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No commercial groups yet. Create one or assign from member profiles.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        )}
      </section>

      {token ? (
        <CollapsiblePanel
          title="Suggestions"
          description="Ungrouped members with similar names. Review and confirm before assigning — nothing is applied automatically."
          defaultOpen={false}
        >
          <SuggestionsPanel
            token={token}
            groups={groups}
            onAssignmentComplete={() => void fetchGroups()}
          />
        </CollapsiblePanel>
      ) : null}
    </div>
  );
}
