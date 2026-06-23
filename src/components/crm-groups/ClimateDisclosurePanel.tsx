"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { progradeWorkspaceUrl } from "@/lib/entity-groups";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ExternalLink,
  Leaf,
  RefreshCw,
} from "lucide-react";

interface ClimateDisclosureChipProps {
  /** Active disclosure slug (group-level or inherited). Empty string when unset. */
  slug: string;
  /** Misalignment present — mixed member slugs and/or sites excluded from the rollup. */
  hasWarning: boolean;
  membersInRollup?: number | null;
  memberCount: number;
  onOpen: () => void;
  className?: string;
}

/**
 * Compact, clickable climate-disclosure status chip. Three states:
 *  - unset   → muted dashed "Set up" call-to-action
 *  - warning → amber, flags misaligned slugs / excluded sites
 *  - linked  → violet, shows the active slug + rollup coverage
 */
export function ClimateDisclosureChip({
  slug,
  hasWarning,
  membersInRollup,
  memberCount,
  onOpen,
  className,
}: ClimateDisclosureChipProps) {
  const isSet = slug.length > 0;
  const state = !isSet ? "unset" : hasWarning ? "warning" : "linked";

  const styles = {
    unset:
      "border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800",
    linked:
      "border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-900/25 dark:text-violet-200 dark:hover:bg-violet-900/40",
    warning:
      "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/50",
  }[state];

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Climate disclosure (group)"
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:focus:ring-offset-gray-dark",
        styles,
        className
      )}
    >
      {state === "warning" ? (
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Leaf className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="hidden sm:inline">Climate disclosure</span>
      <span className="sm:hidden">Climate</span>
      {state === "unset" ? (
        <span className="rounded-full bg-gray-200/70 px-1.5 py-px text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          Set up
        </span>
      ) : (
        <>
          <span
            className={cn(
              "max-w-[10rem] truncate rounded-full px-1.5 py-px font-mono text-[10px] font-medium",
              state === "warning"
                ? "bg-amber-200/60 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                : "bg-violet-200/60 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100"
            )}
          >
            {slug}
          </span>
          {membersInRollup != null ? (
            <span className="hidden items-center gap-1 text-[10px] font-medium opacity-80 md:inline-flex">
              {state === "warning" ? (
                <AlertTriangle className="size-3" aria-hidden />
              ) : (
                <Check className="size-3" aria-hidden />
              )}
              {membersInRollup}/{memberCount}
            </span>
          ) : null}
        </>
      )}
      <ChevronRight
        className="size-3.5 shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

interface ClimateDisclosureModalProps {
  open: boolean;
  onClose: () => void;
  /** Controlled draft value of the reporting-entity slug input. */
  draft: string;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  /** Active (saved) slug — drives the actions + rollup section. */
  activeSlug: string;
  onSync: () => void;
  syncing: boolean;
  syncProgress?: string | null;
  membersInRollup?: number | null;
  memberCount: number;
  stagedActivityTotal?: number | null;
  /** Member-level slugs are mixed across the group. */
  aligned: boolean;
  distinctValues: string[];
  /** Count of sites excluded from the group climate rollup. */
  membersNotInRollup: number;
}

/** Full editing surface for the group climate disclosure, shown in a modal. */
export function ClimateDisclosureModal({
  open,
  onClose,
  draft,
  onDraftChange,
  onSave,
  saving,
  activeSlug,
  onSync,
  syncing,
  syncProgress,
  membersInRollup,
  memberCount,
  stagedActivityTotal,
  aligned,
  distinctValues,
  membersNotInRollup,
}: ClimateDisclosureModalProps) {
  const hasSlug = activeSlug.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      id="climate-disclosure"
      title={
        <span className="flex items-center gap-2">
          <Leaf className="size-4 text-violet-600 dark:text-violet-300" aria-hidden />
          Climate disclosure
        </span>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          {hasSlug ? (
            <a
              href={progradeWorkspaceUrl(activeSlug)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Open Prograde
            </a>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {hasSlug ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={syncing}
                disabled={syncing}
                onClick={onSync}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                {syncProgress ? `Syncing… ${syncProgress}` : "Sync all in rollup"}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              loading={saving}
              disabled={saving}
              onClick={onSave}
            >
              Save slug
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Links every site in this group to one Prograde sustainability workspace. Sites without
          their own disclosure slug inherit this one.
        </p>

        <Input
          label="Reporting entity slug"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="e.g. frankston-rsl"
          className="font-mono text-sm"
        />

        {hasSlug ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wide text-gray-400">
                Climate rollup
              </span>
              {membersInRollup != null ? (
                <span className="font-mono tabular-nums text-gray-700 dark:text-gray-200">
                  {membersInRollup} / {memberCount} site(s)
                </span>
              ) : null}
            </div>
            {stagedActivityTotal != null ? (
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                {stagedActivityTotal} staged activity record(s)
              </p>
            ) : null}
          </div>
        ) : null}

        {!aligned ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Mixed member-level reporting slugs — some sites may use separate Prograde workspaces (
              {distinctValues.join(", ")}).
            </p>
          </div>
        ) : null}

        {membersNotInRollup > 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              {membersNotInRollup} site(s) excluded from the group climate rollup — they have a
              different member-level disclosure slug.
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
