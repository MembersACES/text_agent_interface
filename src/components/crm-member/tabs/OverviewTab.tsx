"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { OfferStatusBadge } from "../shared/OfferStatusBadge";
import { formatDate } from "../shared/formatDate";
import { FileLink } from "../shared/FileLink";
import { OFFER_ACTIVITY_LABELS } from "@/constants/crm";
import type { OfferActivityType } from "@/constants/crm";
import type { Task, Offer, ClientActivity } from "../types";

export interface OverviewTabProps {
  businessInfo: Record<string, unknown> | null;
  businessInfoLoading?: boolean;
  setBusinessInfo: (info: Record<string, unknown> | null) => void;
  businessInfoOpen: boolean;
  onToggleBusinessInfo: () => void;
  tasks: Task[];
  offers: Offer[];
  activities: ClientActivity[];
  onCreateOfferClick: () => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBuilding() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2m-2 4h2m4-4h2m-2 4h2" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconChevron({ rotated }: { rotated: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${rotated ? "rotate-180" : ""}`}
      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({
  icon,
  title,
  badge,
  actions,
}: {
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
            {icon}
          </span>
        )}
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        {badge}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-50 dark:border-gray-800/60" />;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-4 items-start py-3">
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{children}</span>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
      {count}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function OverviewTab({
  businessInfo,
  businessInfoLoading = false,
  businessInfoOpen,
  onToggleBusinessInfo,
  offers,
  activities,
  onCreateOfferClick,
}: OverviewTabProps) {
  const biz = (businessInfo as any)?.business_details ?? {};
  const driveUrl = (businessInfo as any)?.gdrive?.folder_url as string | undefined;
  const businessName: string = biz?.name ?? "";
  const abn: string = biz?.abn ?? "";

  return (
    <div className="space-y-4">

      {/* ── Business Information ── */}
      <Card>
        <button
          type="button"
          onClick={onToggleBusinessInfo}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
          aria-expanded={businessInfoOpen}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0">
              <IconBuilding />
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Business Information</span>
            {businessInfoLoading ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Loading
              </span>
            ) : businessInfo ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Loaded
              </span>
            ) : null}
          </div>
          <IconChevron rotated={businessInfoOpen} />
        </button>

        {businessInfoOpen && (
          <>
            <Divider />
            <div className="px-5 pb-5">
              {businessInfo ? (
                <>
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/40">
                    <InfoRow label="Business name">{businessName || "—"}</InfoRow>
                    <InfoRow label="ABN">{abn || "—"}</InfoRow>
                    <InfoRow label="Drive folder">
                      {driveUrl ? (
                        <a
                          href={driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                        >
                          <IconFolder />
                          Open Drive folder
                        </a>
                      ) : (
                        <span className="text-gray-400">Not linked</span>
                      )}
                    </InfoRow>
                  </div>
                  <div className="pt-4 mt-2 border-t border-gray-50 dark:border-gray-800/40">
                    <Link
                      href={businessName ? `/business-info?business_name=${encodeURIComponent(businessName)}` : "/business-info"}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      Open full business view
                      <IconExternal />
                    </Link>
                  </div>
                </>
              ) : businessInfoLoading ? (
                <div className="space-y-3 pt-4" aria-busy>
                  <Skeleton variant="text" className="w-3/4 h-4" />
                  <Skeleton variant="text" className="w-1/2 h-4" />
                  <Skeleton variant="text" className="w-2/5 h-4" />
                </div>
              ) : (
                <p className="text-sm text-gray-400 pt-4">No business information loaded yet.</p>
              )}
            </div>
          </>
        )}

        {!businessInfoOpen && businessInfo && !businessInfoLoading && (
          <div className="px-5 pb-3.5">
            <p className="text-sm text-gray-400 truncate ml-9">{businessName || "Loaded"}</p>
          </div>
        )}
      </Card>

      {/* ── Offers & Quote Requests ── */}
      <Card>
        <CardHeader
          icon={<IconQuote />}
          title="Offers & Quote Requests"
          badge={offers.length > 0 ? <CountBadge count={offers.length} /> : undefined}
          actions={
            <>
              <button
                type="button"
                onClick={onCreateOfferClick}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <IconPlus />
                Create offer
              </button>
              <span className="text-gray-200 dark:text-gray-700 select-none">|</span>
              <Link href="/offers" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                View all
              </Link>
            </>
          }
        />
        <Divider />
        {offers.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <IconQuote />
            </div>
            <p className="text-sm text-gray-400 mb-2">No offers recorded yet.</p>
            <button
              type="button"
              onClick={onCreateOfferClick}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <IconPlus />
              Create the first offer
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {offers.slice(0, 5).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/offers/${o.id}`}
                    className="text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-primary transition-colors truncate block"
                  >
                    {(o.utility_display || o.utility_type_identifier || o.utility_type || "Offer") +
                      (o.identifier ? ` ${o.identifier}` : "")}
                  </Link>
                  <p className="text-[11px] text-gray-400 mt-0.5">Created {formatDate(o.created_at)}</p>
                </div>
                <OfferStatusBadge status={o.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Activity timeline ── */}
      <Card>
        <CardHeader
          icon={<IconActivity />}
          title="Activity"
          badge={activities.length > 0 ? <CountBadge count={activities.length} /> : undefined}
        />
        <Divider />
        <div className="px-5 py-4">
          {activities.length === 0 ? (
            <p className="py-6 text-sm text-center text-gray-400">No activity recorded yet.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto space-y-0 pr-1 -ml-px">
              {activities.map((a, idx) => {
                const label =
                  OFFER_ACTIVITY_LABELS[a.activity_type as OfferActivityType] ??
                  a.activity_type.replace(/_/g, " ");
                const isComparison = a.activity_type === "comparison";
                const compType = isComparison && a.metadata?.comparison_type ? String(a.metadata.comparison_type) : null;

                return (
                  <li key={a.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {idx < activities.length - 1 && (
                      <div className="absolute left-[7px] top-5 bottom-0 w-px bg-gray-100 dark:bg-gray-800" />
                    )}
                    <span className="relative mt-1 flex-shrink-0 w-3.5 h-3.5 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 z-10" />
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug">
                        {isComparison && compType ? `Comparison (${compType})` : label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {formatDate(a.created_at)}{a.created_by && ` · ${a.created_by}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Link href={`/offers/${a.offer_id}`} className="text-[11px] font-semibold text-primary hover:underline">
                          View offer
                        </Link>
                        {a.document_link && (
                          <a href={a.document_link} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-primary hover:underline">
                            Open document
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

    </div>
  );
}