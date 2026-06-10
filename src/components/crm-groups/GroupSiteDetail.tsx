"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { cn, getApiBaseUrl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/crm-member/shared/StageBadge";
import type { Client, ClientReferral } from "@/components/crm-member/types";
import { CLIENT_STAGES, CLIENT_STAGE_LABELS, type ClientStage } from "@/constants/crm";
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

function AdvocacyMeetingBadge({ client }: { client: Client }) {
  const completed = Boolean(client.advocacy_meeting_completed);
  const dateLabel = formatMeetingDate(client.advocacy_meeting_date);
  const time = client.advocacy_meeting_time?.trim();

  if (completed) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
        Advocacy meeting completed
        {dateLabel ? ` · ${dateLabel}` : ""}
      </span>
    );
  }
  if (dateLabel) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        Meeting scheduled {dateLabel}
        {time ? ` ${time}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      No advocacy meeting scheduled
    </span>
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
  const [transferTargetId, setTransferTargetId] = useState("");

  const tradingName = useMemo(() => getTradingName(businessInfo), [businessInfo]);
  const driveUrl = useMemo(
    () => getDriveUrl(businessInfo, client?.gdrive_folder_url),
    [businessInfo, client?.gdrive_folder_url]
  );

  const utilitiesHref = useMemo(() => {
    if (!client?.business_name) return null;
    const params = new URLSearchParams();
    params.set("businessName", client.business_name);
    if (token) params.set("token", token);
    return `/utility-linking?${params.toString()}`;
  }, [client?.business_name, token]);

  const profileHref = client ? `/crm-members/${client.id}` : "#";
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
  }, [fetchReferrals]);

  const activeAdvocates = useMemo(
    () => referrals.filter((r) => r.active),
    [referrals]
  );

  if (!client) {
    return (
      <Card className="flex min-h-[280px] items-center justify-center p-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a site to view details.</p>
      </Card>
    );
  }

  const subtitleParts: string[] = [];
  if (tradingName && tradingName !== client.business_name) {
    subtitleParts.push(`Trading as ${tradingName}`);
  }

  const hasLoaId = Boolean(client.external_business_id?.trim());
  const showNoLoaNote = !loading && !hasLoaId;
  const showUnverifiedNote =
    !loading && !cacheEntry?.error && hasLoaId && Boolean(businessInfo) && !verified;
  const showError = cacheEntry?.error && !loading;

  const enrichedFields: { label: string; value: React.ReactNode }[] = [];
  if (verified && businessInfo) {
    const siteAbn = getSiteAbn(businessInfo);
    const contactName = getContactName(businessInfo);
    const email = getContactEmail(businessInfo) ?? client.primary_contact_email;
    const phone = getContactPhone(businessInfo);
    const siteAddress = getSiteAddress(businessInfo);

    if (siteAbn) enrichedFields.push({ label: "Site ABN", value: siteAbn });
    if (contactName) enrichedFields.push({ label: "Primary contact", value: contactName });
    if (email) {
      enrichedFields.push({
        label: "Email",
        value: (
          <a href={`mailto:${email}`} className="text-primary hover:underline">
            {email}
          </a>
        ),
      });
    }
    if (phone) enrichedFields.push({ label: "Phone", value: phone });
    if (typeof offerCount === "number" && offerCount > 0) {
      enrichedFields.push({ label: "Offers", value: String(offerCount) });
    }
    if (siteAddress) enrichedFields.push({ label: "Site address", value: siteAddress });
  }

  const crmFields: { label: string; value: React.ReactNode }[] = [];
  if (client.external_business_id) {
    crmFields.push({
      label: "LOA record",
      value: <span className="font-mono text-xs">{client.external_business_id}</span>,
    });
  }
  if (client.primary_contact_email && !verified) {
    crmFields.push({
      label: "Email (CRM)",
      value: (
        <a href={`mailto:${client.primary_contact_email}`} className="text-primary hover:underline">
          {client.primary_contact_email}
        </a>
      ),
    });
  }
  if (client.has_signed_contract) {
    crmFields.push({ label: "Signed via ACES", value: "Yes" });
  }

  const stageOptions = useMemo(() => {
    const stages = [...CLIENT_STAGES];
    const current = client.stage as string;
    if (current && !stages.includes(current as ClientStage)) {
      stages.unshift(current as ClientStage);
    }
    return stages;
  }, [client.stage]);

  const transferOptions = otherGroups.filter((g) => g.id !== currentGroupId);

  return (
    <Card className="flex min-h-[280px] flex-col overflow-hidden p-0">
      <div className="border-b border-stroke px-5 py-4 dark:border-dark-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {client.business_name}
            </h2>
            {subtitleParts.length > 0 ? (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {subtitleParts.join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-end gap-2">
            {onStageChange ? (
              <Select
                label="Stage"
                value={client.stage}
                onChange={(e) => void onStageChange(e.target.value as ClientStage)}
                disabled={savingStage}
                wrapperClassName="min-w-[9rem]"
              >
                {stageOptions.map((s) => (
                  <option key={s} value={s}>
                    {CLIENT_STAGE_LABELS[s as ClientStage] ?? s.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            ) : (
              <StageBadge stage={client.stage as ClientStage} />
            )}
            <NewTabLink
              href={profileHref}
              className="inline-flex items-center gap-1 pb-2 text-xs font-medium text-primary hover:underline"
            >
              Open full profile
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </NewTabLink>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
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
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                <span>{cacheEntry?.error}</span>
                {onRetry ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => void onRetry()}>
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : null}

            {(enrichedFields.length > 0 || crmFields.length > 0) && (
              <dl className="mb-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {[...enrichedFields, ...crmFields].map((row) => (
                  <div key={row.label}>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-800 dark:text-gray-200">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/30">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Advocates
                </h3>
                <NewTabLink
                  href={strategyHref}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Edit in Strategy & WIP →
                </NewTabLink>
              </div>
              <div className="mb-2.5">
                <AdvocacyMeetingBadge client={client} />
              </div>
              {referralsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-40" />
                </div>
              ) : activeAdvocates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No active advocates linked. Add advocates in Strategy & WIP.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
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
                          className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 transition-colors hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/50"
                        >
                          {label}
                        </button>
                      );
                    }
                    return (
                      <span
                        key={ref.id}
                        className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
            </section>

            {!loading &&
            enrichedFields.length === 0 &&
            crmFields.length === 0 &&
            !showError &&
            activeAdvocates.length === 0 &&
            !referralsLoading ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                No additional details available. Open full profile for more.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="space-y-3 border-t border-stroke px-5 py-3 dark:border-dark-3">
        <div className="flex flex-wrap gap-2">
          <QuickLink href={profileHref} label="Full profile" newTab />
          {driveUrl ? <QuickLink href={driveUrl} label="Drive" external /> : null}
          {utilitiesHref ? <QuickLink href={utilitiesHref} label="Utilities" external /> : null}
          {(offerCount ?? 0) > 0 ? (
            <QuickLink href={`/crm-members/${client.id}?tab=offers`} label="Offers" newTab />
          ) : null}
        </div>

        {(onRemoveFromGroup || onTransferToGroup) && (
          <div className="flex flex-wrap items-end gap-2 border-t border-stroke/60 pt-3 dark:border-dark-3/60">
            {onRemoveFromGroup ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={savingMembership}
                onClick={() => void onRemoveFromGroup()}
              >
                Remove from group
              </Button>
            ) : null}
            {onTransferToGroup && transferOptions.length > 0 ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:max-w-md">
                <Select
                  label="Transfer to"
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  disabled={savingMembership}
                  wrapperClassName="min-w-[10rem] flex-1"
                >
                  <option value="">— Select group —</option>
                  {transferOptions.map((g) => (
                    <option key={g.id} value={String(g.id)}>
                      {g.display_name}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={savingMembership || !transferTargetId}
                  onClick={() => {
                    const id = parseInt(transferTargetId, 10);
                    if (!Number.isNaN(id)) void onTransferToGroup(id);
                  }}
                >
                  Transfer
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}

function UnverifiedBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
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

function QuickLink({
  href,
  label,
  external,
  newTab,
}: {
  href: string;
  label: string;
  external?: boolean;
  newTab?: boolean;
}) {
  const className =
    "inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary/40 hover:text-primary dark:border-gray-600 dark:text-gray-300 dark:hover:border-primary/50";

  if (external || newTab) {
    return (
      <button type="button" className={className} onClick={() => openInNewTab(href)}>
        {label}
      </button>
    );
  }
  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}
