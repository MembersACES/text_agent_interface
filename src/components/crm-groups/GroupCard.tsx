"use client";

import Link from "next/link";
import { ArrowUpRight, Leaf, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { GroupBadge } from "./GroupBadge";
import type { EntityGroupListItem } from "@/lib/entity-groups";

interface GroupCardProps {
  group: EntityGroupListItem;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function GroupCard({ group }: GroupCardProps) {
  const hasDisclosure = Boolean(group.reporting_entity?.trim());

  return (
    <Link href={`/crm-groups/${encodeURIComponent(group.slug)}`} className="block">
      <Card
        hover
        className="group relative h-full overflow-hidden border border-gray-100 transition-colors hover:border-violet-200 dark:border-gray-800 dark:hover:border-violet-800/60"
      >
        {/* Left accent stripe */}
        <span
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-400 to-violet-500 opacity-70 transition-opacity group-hover:opacity-100 dark:from-violet-500 dark:to-violet-600"
          aria-hidden
        />

        <div className="flex flex-col gap-3 pl-1">
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
              {initials(group.display_name)}
            </span>
            <ArrowUpRight
              className="size-4 text-gray-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-500 dark:text-gray-600"
              aria-hidden
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <GroupBadge displayName={group.display_name} slug={group.slug} className="self-start" />
            <p className="font-mono text-[11px] text-gray-400 dark:text-gray-500">{group.slug}</p>
          </div>

          <div className="mt-1 flex items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden />
              {group.member_count === 1 ? "1 member" : `${group.member_count} members`}
            </span>
            {hasDisclosure ? (
              <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-300">
                <Leaf className="size-3.5" aria-hidden />
                Disclosure linked
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
