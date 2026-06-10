"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Calendar,
  FileText,
  Folder,
  Link2,
  MoreVertical,
  User,
  Zap,
} from "lucide-react";
import { cn, getApiBaseUrl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip";
import { CopyChip } from "@/components/ui/copy-chip";
import {
  Dropdown,
  DropdownClose,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { EditableStageBadge } from "@/components/crm-member/shared/EditableStageBadge";
import { StageBadge } from "@/components/crm-member/shared/StageBadge";
import type { Client, ClientReferral } from "@/components/crm-member/types";
import { type ClientStage } from "@/constants/crm";
import type { EntityGroupListItem } from "@/lib/entity-groups";
import {
  getContactEmail,
  getContactName,
  getContactPhone,
  getDriveUrl,
  getSiteAbn,
  getSiteAddress,
  getTradingName,
} from "@/lib/business-info-fields";
import type { BusinessInfoCacheEntry } from "./useGroupBusinessInfoCache";

interface GroupSiteDetailProps {
  client: Client | null;
  token: string;
  currentGroupId: number;
  otherGroups?: EntityGroupListItem[];
  offerCount?: number;
  cacheEntry?: BusinessInfoCacheEntry | null;
  onRetry?: () => void;
  onStageChange?: (stage: ClientStage) => void | Promise<void>;
  savingStage?: boolean;
  onRemoveFromGroup?: () => void | Promise<void>;
  onTransferToGroup?: (targetGroupId: number) => void | Promise<void>;
  savingMembership?: boolean;
}

function formatMeetingDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = iso.trim().slice(0, 10);
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function AdvocacyMeetingInline({ client }: { client: Client }) {
  const completed = Boolean(client.advocacy_meeting_completed);
  const dateLabel = formatMeetingDate(client.advocacy_meeting_date);
  const time = client.advocacy_meeting_time?.trim();

  if (completed) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
        <Calendar className="size-3.5 shrink-0" aria-hidden />
        Meeting completed{dateLabel ? ` · ${dateLabel}` : ""}
      </span>
    );
  }
  if (dateLabel) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
        <Calendar className="size-3.5 shrink-0" aria-hidden />
        Scheduled {dateLabel}
        {time ? ` ${time}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
      <Calendar className="size-3.5 shrink-0" aria-hidden />
      No meeting scheduled
    </span>
  );
}

const iconToolbarBtnClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800/60 dark:hover:text-primary dark:focus-visible:ring-offset-gray-dark";

function ToolbarIconButton({
  label,
  onClick,
  disabled,
  children,
  badge,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <Tooltip label={badge != null && badge > 0 ? `${label} (${badge})` : label}>
      <button
        type="button"
        className={cn(iconToolbarBtnClass, "relative")}
        aria-label={badge != null && badge > 0 ? `${label}, ${badge} offers` : label}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
        {badge != null && badge > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}

function DetailField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}) {
  if (value == null || value === "") return null;
  return (
    <div className={cn(fullWidth ? "col-span-2" : "min-w-0")}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-gray-800 dark:text-gray-200">{value}</dd>
    </div>
  );
}

export function GroupSiteDetail({
  client,
  token,
  currentGroupId,
  otherGroups = [],
  offerCount,
  cacheEntry,
  onRetry,
  onStageChange,
  savingStage = false,
  onRemoveFromGroup,
  onTransferToGroup,
  savingMembership = false,
}: GroupSiteDetailProps) {
  const businessInfo = cacheEntry?.data ?? null;
  const verified = cacheEntry?.verified ?? false;
  const loading = cacheEntry?.loading ?? false;

  const [referrals, setReferrals] = useState<ClientReferral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [kebabOpen, setKebabOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");

  const tradingName = useMemo(() => getTradingName(businessInfo), [businessInfo]);
  const driveUrl = useMemo(
    () => getDriveUrl(businessInfo, client?.gdrive_folder_url),
    [businessInfo, client?.gdrive_folder_url]
  );

  const profileHref = client ? `/crm-members/${client.id}` : "#";
  const utilitiesHref = client ? `/crm-members/${client.id}?tab=utilities` : "#";
  const offersHref = client ? `/crm-members/${client.id}?tab=offers` : "#";
  const strategyHref = client
    ? `/crm-members/${client.id}?tab=solutions&subtab=strategy`
    : "#";

  const fetchReferrals = useCallback(async () => {
    if (!token || !client?.id) {
      setReferrals([]);
      return;
    }
    setReferralsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${client.id}/referrals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load advocates");
      const data = (await res.json()) as ClientReferral[];
      setReferrals(Array.isArray(data) ? data : []);
    } catch {
      setReferrals([]);
    } finally {
      setReferralsLoading(false);
    }
  }, [token, client?.id]);

  useEffect(() => {
    void fetchReferrals();
    setTransferTargetId("");
    setKebabOpen(false);
    setTransferModalOpen(false);
    setRemoveModalOpen(false);
  }, [fetchReferrals]);

  const activeAdvocates = useMemo(
    () => referrals.filter((r) => r.active),
    [referrals]
  );

  const transferOptions = otherGroups.filter((g) => g.id !== currentGroupId);

  if (!client) {
    return (
      <Card className="flex min-h-[280px] items-center justify-center p-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a site to view details.</p>
      </Card>
    );
  }

  const tradingAsSubtitle =
    tradingName && tradingName !== client.business_name ? `Trading as ${tradingName}` : null;

  const hasLoaId = Boolean(client.external_business_id?.trim());
  const showNoLoaNote = !loading && !hasLoaId;
  const showUnverifiedNote =
    !loading && !cacheEntry?.error && hasLoaId && Boolean(businessInfo) && !verified;
  const showError = cacheEntry?.error && !loading;

  const siteAbn = verified && businessInfo ? getSiteAbn(businessInfo) : null;
  const contactName = verified && businessInfo ? getContactName(businessInfo) : null;
  const email =
    (verified && businessInfo ? getContactEmail(businessInfo) : null) ??
    client.primary_contact_email ??
    null;
  const phone = verified && businessInfo ? getContactPhone(businessInfo) : null;
  const siteAddress = verified && businessInfo ? getSiteAddress(businessInfo) : null;

  const hasGridFields =
    siteAbn ||
    contactName ||
    email ||
    phone ||
    siteAddress ||
    client.external_business_id ||
    client.has_signed_contract;

  const handleConfirmTransfer = () => {
    const id = parseInt(transferTargetId, 10);
    if (Number.isNaN(id) || !onTransferToGroup) return;
    void (async () => {
      await onTransferToGroup(id);
      setTransferModalOpen(false);
      setTransferTargetId("");
    })();
  };

  const handleConfirmRemove = () => {
    if (!onRemoveFromGroup) return;
    void (async () => {
      await onRemoveFromGroup();
      setRemoveModalOpen(false);
    })();
  };

  return (
    <>
      <Card className="flex min-h-[280px] flex-col overflow-hidden p-0">
        <div className="border-b border-stroke px-4 py-3 dark:border-dark-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h2
                className="min-w-0 truncate text-base font-semibold text-gray-900 dark:text-gray-100"
                title={client.business_name}
              >
                {client.business_name}
              </h2>
              {onStageChange ? (
                <EditableStageBadge
                  stage={client.stage as ClientStage}
                  onChange={onStageChange}
                  disabled={savingStage}
                />
              ) : (
                <StageBadge stage={client.stage as ClientStage} />
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
              <ToolbarIconButton label="Full profile" onClick={() => openInNewTab(profileHref)}>
                <User className="size-4" aria-hidden />
              </ToolbarIconButton>
              {driveUrl ? (
                <ToolbarIconButton label="Drive folder" onClick={() => openInNewTab(driveUrl)}>
                  <Folder className="size-4" aria-hidden />
                </ToolbarIconButton>
              ) : null}
              <ToolbarIconButton label="Utilities" onClick={() => openInNewTab(utilitiesHref)}>
                <Zap className="size-4" aria-hidden />
              </ToolbarIconButton>
              <ToolbarIconButton
                label="Offers"
                badge={offerCount}
                onClick={() => openInNewTab(offersHref)}
              >
                <FileText className="size-4" aria-hidden />
              </ToolbarIconButton>

              {(onRemoveFromGroup || (onTransferToGroup && transferOptions.length > 0)) && (
                <>
                  <span
                    className="mx-1 hidden h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-700 sm:block"
                    aria-hidden
                  />
                  <Dropdown isOpen={kebabOpen} setIsOpen={setKebabOpen}>
                    <Tooltip label="More actions">
                      <DropdownTrigger
                        className={iconToolbarBtnClass}
                        aria-label="More actions"
                      >
                        <MoreVertical className="size-4" aria-hidden />
                      </DropdownTrigger>
                    </Tooltip>
                    <DropdownContent
                      align="end"
                      className="min-w-[12rem] rounded-lg border border-stroke bg-white py-1 shadow-lg dark:border-dark-3 dark:bg-gray-dark"
                    >
                      {onTransferToGroup && transferOptions.length > 0 ? (
                        <DropdownClose>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:text-gray-200 dark:hover:bg-dark-2 dark:focus:bg-dark-2"
                            onClick={() => {
                              setTransferTargetId("");
                              setTransferModalOpen(true);
                            }}
                          >
                            <Link2 className="size-3.5 shrink-0" aria-hidden />
                            Transfer to another group
                          </button>
                        </DropdownClose>
                      ) : null}
                      {onRemoveFromGroup ? (
                        <DropdownClose>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none dark:text-red-400 dark:hover:bg-red-950/30 dark:focus:bg-red-950/30"
                            onClick={() => setRemoveModalOpen(true)}
                          >
                            Remove from group
                          </button>
                        </DropdownClose>
                      ) : null}
                    </DropdownContent>
                  </Dropdown>
                </>
              )}
            </div>
          </div>

          {tradingAsSubtitle ? (
            <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400" title={tradingAsSubtitle}>
              {tradingAsSubtitle}
            </p>
          ) : null}
        </div>

        <div className="flex-1 px-4 py-3 sm:px-5 sm:py-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <>
              {showNoLoaNote ? (
                <UnverifiedBanner message="LOA record not linked on this member — open full profile to verify site details." />
              ) : null}
              {showUnverifiedNote ? (
                <UnverifiedBanner message="Couldn't confirm site details for this LOA — business info may not match this site. Open full profile to verify." />
              ) : null}
              {showError ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  <span>{cacheEntry?.error}</span>
                  {onRetry ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => void onRetry()}>
                      Retry
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {hasGridFields ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Site ABN" value={siteAbn} />
                  <DetailField label="Contact" value={contactName} />
                  <DetailField
                    label="Email"
                    value={
                      email ? (
                        <a
                          href={`mailto:${email}`}
                          className="block truncate text-primary hover:underline"
                          title={email}
                        >
                          {email}
                        </a>
                      ) : null
                    }
                  />
                  <DetailField label="Phone" value={phone} />
                  <DetailField label="Site address" value={siteAddress} fullWidth />
                  {client.external_business_id ? (
                    <div className="col-span-2 min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        LOA record
                      </dt>
                      <dd className="mt-0.5">
                        <CopyChip
                          value={client.external_business_id}
                          ariaLabel="Copy LOA record ID"
                        />
                      </dd>
                    </div>
                  ) : null}
                  {client.has_signed_contract ? (
                    <DetailField label="Signed via ACES" value="Yes" />
                  ) : null}
                </dl>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-stroke/60 pt-3 dark:border-dark-3/60">
                <AdvocacyMeetingInline client={client} />
                {referralsLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : activeAdvocates.length === 0 ? (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">No advocates</span>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    {activeAdvocates.map((ref) => {
                      const label =
                        ref.advocate_display_name?.trim() ||
                        ref.advocate_business_name?.trim() ||
                        "Unnamed advocate";
                      if (ref.advocate_client_id) {
                        return (
                          <button
                            key={ref.id}
                            type="button"
                            onClick={() =>
                              openInNewTab(`/crm-members/${ref.advocate_client_id}`)
                            }
                            className="inline-flex max-w-[10rem] items-center truncate rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-800 transition-colors hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/50"
                          >
                            {label}
                          </button>
                        );
                      }
                      return (
                        <span
                          key={ref.id}
                          className="inline-flex max-w-[10rem] truncate rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
                <NewTabLink
                  href={strategyHref}
                  className="ml-auto shrink-0 text-[11px] font-semibold text-primary hover:underline"
                >
                  Strategy &amp; WIP
                </NewTabLink>
              </div>

              {!loading &&
              !hasGridFields &&
              !showError &&
              activeAdvocates.length === 0 &&
              !referralsLoading ? (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No additional details available. Open full profile for more.
                </p>
              ) : null}
            </>
          )}
        </div>
      </Card>

      <Modal
        open={transferModalOpen}
        onClose={() => {
          if (savingMembership) return;
          setTransferModalOpen(false);
          setTransferTargetId("");
        }}
        title="Transfer to another group"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={savingMembership}
              onClick={() => {
                setTransferModalOpen(false);
                setTransferTargetId("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={savingMembership}
              disabled={savingMembership || !transferTargetId}
              onClick={handleConfirmTransfer}
            >
              Transfer site
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Move{" "}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {client.business_name}
            </span>{" "}
            to a different commercial group.
          </p>
          <Select
            label="Target group"
            value={transferTargetId}
            onChange={(e) => setTransferTargetId(e.target.value)}
            disabled={savingMembership}
          >
            <option value="">— Select group —</option>
            {transferOptions.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.display_name}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      <Modal
        open={removeModalOpen}
        onClose={() => {
          if (savingMembership) return;
          setRemoveModalOpen(false);
        }}
        title="Remove from group?"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={savingMembership}
              onClick={() => setRemoveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={savingMembership}
              disabled={savingMembership}
              onClick={handleConfirmRemove}
            >
              Remove from group
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Remove this site from the group? The member record itself is not deleted.
        </p>
      </Modal>
    </>
  );
}

function UnverifiedBanner({ message }: { message: string }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  );
}

function resolveTabUrl(href: string): string {
  return href.startsWith("http://") || href.startsWith("https://")
    ? href
    : `${window.location.origin}${href.startsWith("/") ? href : `/${href}`}`;
}

function openInNewTab(href: string) {
  window.open(resolveTabUrl(href), "_blank", "noopener,noreferrer");
}

function NewTabLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn("cursor-pointer bg-transparent p-0 text-left", className)}
      onClick={() => openInNewTab(href)}
    >
      {children}
    </button>
  );
}
