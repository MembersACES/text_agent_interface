"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { GroupBadge } from "./GroupBadge";
import type { EntityGroupListItem } from "@/lib/entity-groups";

interface GroupCardProps {
  group: EntityGroupListItem;
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/crm-groups/${encodeURIComponent(group.slug)}`} className="block">
      <Card
        hover
        className="h-full transition-colors hover:border-primary/30 dark:hover:border-primary/40"
      >
        <div className="flex flex-col gap-2">
          <GroupBadge displayName={group.display_name} slug={group.slug} />
          <p className="font-mono text-[11px] text-gray-400 dark:text-gray-500">{group.slug}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {group.member_count === 1 ? "1 member" : `${group.member_count} members`}
          </p>
        </div>
      </Card>
    </Link>
  );
}
