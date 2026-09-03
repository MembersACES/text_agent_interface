"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { cn, getApiBaseUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card as UiCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatBackendErrorBody } from "@/lib/api-errors";
import { SectionHeader } from "../shared/SectionHeader";
import { FileText, Building2, Pencil } from "lucide-react";
import { BusinessInfoRow } from "../shared/BusinessInfoRow";
import {
  MEMBER_CARD_BODY,
  MEMBER_CARD_HEADER,
  MEMBER_CARD_SHELL,
} from "../shared/memberCardShell";
import { OfferStatusBadge } from "../shared/OfferStatusBadge";
import { RecordRow, RecordRowOpenAction } from "../shared/RecordRow";
import { buildOfferRecordSubtitle } from "../shared/offerRecordMeta";
import { getRecordRowIcon } from "../shared/recordRowIcons";
import type { Task, Offer, Note, Client } from "../types";
import {
  getBusinessDocumentsForOverview,
  getContractsFromBusinessInfo,
  getDocumentsCountFromBusinessInfo,
  getKeyDocumentsFromBusinessInfo,
  getSfaFilesFromBusinessInfo,
  withUpdatedContractStatus,
} from "./documentHelpers";
import { CONTRACT_STATUS_OPTIONS } from "@/lib/brand";

type BusinessEditForm = {
  trading_name: string;
  postal_address: string;
  site_address: string;
  telephone: string;
  email: string;
  contact_name: string;
  position: string;
};

export interface OverviewTabProps {
  clientId: number;
  client: Client;
  businessInfo: Record<string, unknown> | null;
  businessInfoLoading?: boolean;
  setBusinessInfo: (info: Record<string, unknown> | null) => void;
  businessInfoOpen: boolean;
  onToggleBusinessInfo: () => void;
  tasks: Task[];
  offers: Offer[];
  notes: Note[];
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

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <UiCard className={cn(MEMBER_CARD_SHELL, className)}>
      {children}
    </UiCard>
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
    <SectionHeader
      className={MEMBER_CARD_HEADER}
      icon={icon}
      title={title}
      badge={badge}
      actions={actions}
      as="h2"
    />
  );
}

function Divider() {
  return <div className="border-t border-stroke/40 dark:border-dark-3/60" />;
}

function InfoRow({ label, children, even }: { label: string; children: React.ReactNode; even?: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[130px_1fr] gap-3 items-start py-2.5 px-4",
        even && "bg-gray-50/50 dark:bg-gray-800/30"
      )}
    >
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 dark:text-gray-100">{children}</span>
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

function EditField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const cls =
    "w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-gray-100";
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      {multiline ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function OverviewTab({
  clientId,
  client,
  businessInfo,
  businessInfoLoading = false,
  setBusinessInfo,
  businessInfoOpen,
  onToggleBusinessInfo,
  offers,
  notes,
  onCreateOfferClick,
}: OverviewTabProps) {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken ??
    "";

  const biz = (businessInfo as any)?.business_details ?? {};
  const contact = (businessInfo as any)?.contact_information ?? {};
  const rep = (businessInfo as any)?.representative_details ?? {};
  const loaFileUrl = (businessInfo as any)?._processed_file_ids?.business_LOA as
    | string
    | undefined;
  const driveUrl = (businessInfo as any)?.gdrive?.folder_url as string | undefined;
  const tradingName: string = biz?.trading_name ?? "";
  const loaSignedDate: string | undefined = rep?.signed_date;
  const postalAddress: string | undefined = contact?.postal_address;
  const siteAddress: string | undefined = contact?.site_address;

  const documentsCount = getDocumentsCountFromBusinessInfo(
    businessInfo as Record<string, unknown> | null
  );

  const contracts = getContractsFromBusinessInfo(
    businessInfo as Record<string, unknown> | null
  );
  const contractFileTotal = contracts.reduce((n, c) => n + c.items.length, 0);
  const hasContracts = contractFileTotal > 0;
  const { loaUrl, wipUrl, amortExcelUrl, amortPdfUrl } =
    getKeyDocumentsFromBusinessInfo(
      businessInfo as Record<string, unknown> | null
    );
  const { count: sfaCount, url: sfaFileUrl } = getSfaFilesFromBusinessInfo(
    businessInfo as Record<string, unknown> | null
  );
  const loaFileLink = loaFileUrl || loaUrl;

  const overviewBusinessDocs = getBusinessDocumentsForOverview(
    businessInfo as Record<string, unknown> | null
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<BusinessEditForm>({
    trading_name: "",
    postal_address: "",
    site_address: "",
    telephone: "",
    email: "",
    contact_name: "",
    position: "",
  });
  const [statusSavingKey, setStatusSavingKey] = useState<string | null>(null);

  const openEditModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      trading_name: String(biz?.trading_name ?? ""),
      postal_address: String(contact?.postal_address ?? ""),
      site_address: String(contact?.site_address ?? ""),
      telephone: String(contact?.telephone ?? ""),
      email: String(contact?.email ?? ""),
      contact_name: String(rep?.contact_name ?? ""),
      position: String(rep?.position ?? ""),
    });
    setEditOpen(true);
  };

  const saveBusinessDetails = async () => {
    if (!token) {
      showToast("Sign in required to update business details", "error");
      return;
    }
    const recordId = String((businessInfo as any)?.record_ID ?? "").trim();
    const businessName =
      String(biz?.name ?? "").trim() || String(client.business_name ?? "").trim();
    if (!recordId && !businessName) {
      showToast("Missing LOA record id / business name", "error");
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/business-info`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(recordId ? { record_id: recordId } : {}),
          business_name: businessName,
          ...editForm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatBackendErrorBody(data) || `Update failed (${res.status})`);
      }

      const updated = (data as { business_info?: Record<string, unknown> }).business_info;
      if (updated && businessInfo) {
        setBusinessInfo({
          ...businessInfo,
          business_details: {
            ...((businessInfo.business_details as object) ?? {}),
            ...((updated.business_details as object) ?? {}),
          },
          contact_information: {
            ...((businessInfo.contact_information as object) ?? {}),
            ...((updated.contact_information as object) ?? {}),
          },
          representative_details: {
            ...((businessInfo.representative_details as object) ?? {}),
            ...((updated.representative_details as object) ?? {}),
          },
          record_ID:
            (updated.record_ID as string) ||
            (businessInfo.record_ID as string) ||
            recordId,
        });
      }
      showToast("Business details updated", "success");
      setEditOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setEditSaving(false);
    }
  };

  const updateContractStatus = async (
    contractKey: string,
    fileIndex: number,
    newStatus: string
  ) => {
    if (!token || !businessInfo) return;
    const businessName =
      String(biz?.name ?? "").trim() || String(client.business_name ?? "").trim();
    if (!businessName) {
      showToast("Missing business name for contract update", "error");
      return;
    }
    const saveKey = `${contractKey}-${fileIndex}`;
    setStatusSavingKey(saveKey);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/contracts/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_name: businessName,
          contract_key: contractKey,
          status: newStatus,
          file_index: fileIndex,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatBackendErrorBody(data) || `Status update failed (${res.status})`);
      }
      const cell = (data as { updated_status_cell?: string }).updated_status_cell;
      setBusinessInfo(
        withUpdatedContractStatus(
          businessInfo,
          contractKey,
          fileIndex,
          newStatus,
          cell ?? null
        )
      );
      showToast(`${contractKey} status updated`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Status update failed", "error");
    } finally {
      setStatusSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Business Information ── */}
      <Card>
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onToggleBusinessInfo}
            className="flex min-w-0 flex-1 items-center justify-between text-left hover:opacity-90 transition-opacity"
            aria-expanded={businessInfoOpen}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                <Building2 className="size-4" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Business Information</span>
              {businessInfoLoading && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Loading
                </span>
              )}
            </div>
            <IconChevron rotated={businessInfoOpen} />
          </button>
          {businessInfo && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={openEditModal}
            >
              <Pencil className="size-3.5" aria-hidden />
              Edit details
            </Button>
          )}
        </div>

        {businessInfoOpen && (
          <>
            <Divider />
            <div className="px-5 pb-5">
              {businessInfo ? (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Left: core business details */}
                    <div>
                      <SectionHeader title="Business details" as="h3" className="mb-3" />
                      <div className="rounded-lg border border-stroke/40 dark:border-dark-3/60 overflow-hidden">
                        <InfoRow label="Trading name" even>
                          {tradingName || (
                            <span className="text-gray-400 dark:text-gray-500">
                              Not available
                            </span>
                          )}
                        </InfoRow>
                        <InfoRow label="Postal address">
                          {postalAddress || (
                            <span className="text-gray-400 dark:text-gray-500">
                              Not available
                            </span>
                          )}
                        </InfoRow>
                        <InfoRow label="Site address" even>
                          {siteAddress || (
                            <span className="text-gray-400 dark:text-gray-500">
                              Not available
                            </span>
                          )}
                        </InfoRow>
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
                            <span className="text-gray-400 dark:text-gray-500">Not linked</span>
                          )}
                        </InfoRow>
                      </div>
                      <SectionHeader title="Representative details" as="h3" className="mb-3 mt-6" />
                      <div className="space-y-1">
                        <BusinessInfoRow
                          label="Contact name"
                          value={
                            rep.contact_name || (
                              <span className="text-gray-400 dark:text-gray-500">Not available</span>
                            )
                          }
                        />
                        <BusinessInfoRow
                          label="Position"
                          value={
                            rep.position || (
                              <span className="text-gray-400 dark:text-gray-500">Not available</span>
                            )
                          }
                        />
                        <BusinessInfoRow
                          label="LOA signed"
                          value={
                            loaSignedDate && loaFileLink ? (
                              <a
                                href={loaFileLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline font-medium"
                              >
                                {loaSignedDate}
                              </a>
                            ) : loaSignedDate ? (
                              loaSignedDate
                            ) : loaFileLink ? (
                              <a
                                href={loaFileLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline font-medium"
                              >
                                View file
                              </a>
                            ) : (
                              "—"
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* Right: documents & contracts quick view */}
                    <div className="flex flex-col gap-3 md:border-l md:border-gray-100 md:dark:border-gray-800/60 md:pl-6">
                      <SectionHeader title="Documents & contracts" as="h3" />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                          <span>
                            <span className="text-gray-400 dark:text-gray-500 mr-1.5">Signed</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {hasContracts ? contractFileTotal : 0}
                            </span>
                          </span>
                          <span>
                            <span className="text-gray-400 dark:text-gray-500 mr-1.5">Docs</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {documentsCount}
                            </span>
                          </span>
                        </div>
                        <Link
                          href="?tab=documents"
                          scroll={false}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          Open documents tab
                        </Link>
                      </div>

                      {hasContracts && (
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            Contracts
                          </p>
                          <div className="divide-y divide-gray-50 dark:divide-gray-800/40 -mx-2">
                            {contracts
                              .flatMap((c) =>
                                c.items.map((item, idx) => ({
                                  url: item.url,
                                  status: item.status,
                                  label:
                                    c.items.length > 1
                                      ? `${c.key} (#${idx + 1})`
                                      : c.key,
                                  rowKey: `${c.key}-${idx}`,
                                  category: c.key,
                                  fileIndex: idx,
                                })),
                              )
                              .slice(0, 6)
                              .map(({ rowKey, label, url, category, status, fileIndex }) => {
                                const rowIcon = getRecordRowIcon(category);
                                const saving = statusSavingKey === rowKey;
                                return (
                                  <RecordRow
                                    key={rowKey}
                                    className="px-2 py-2"
                                    leadingIcon={rowIcon.icon}
                                    iconIntent={rowIcon.intent}
                                    title={label}
                                    status={
                                      <select
                                        aria-label={`${label} contract status`}
                                        disabled={saving || !token}
                                        value={status || ""}
                                        onChange={(e) =>
                                          updateContractStatus(
                                            category,
                                            fileIndex,
                                            e.target.value
                                          )
                                        }
                                        className="max-w-[11rem] rounded-md border border-stroke/60 bg-white px-1.5 py-1 text-[11px] text-gray-700 dark:border-dark-3 dark:bg-dark-2 dark:text-gray-200"
                                      >
                                        <option value="">No status</option>
                                        {CONTRACT_STATUS_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                        {status &&
                                          !CONTRACT_STATUS_OPTIONS.some(
                                            (o) => o.value === status
                                          ) && (
                                            <option value={status}>{status}</option>
                                          )}
                                      </select>
                                    }
                                    actions={url ? <RecordRowOpenAction href={url} /> : undefined}
                                  />
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {documentsCount > 0 && (
                        <div>
                          <p className="mb-1 mt-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            Key documents
                          </p>
                          <ul className="space-y-1.5">
                            {loaUrl && (
                              <li className="flex items-center justify-between gap-2">
                                <span className="truncate text-[11px] text-gray-700 dark:text-gray-200">
                                  Letter of Authority
                                </span>
                                <a
                                  href={loaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-primary hover:underline"
                                >
                                  Open
                                </a>
                              </li>
                            )}
                            {sfaCount > 0 && sfaFileUrl && (
                              <li className="flex items-center justify-between gap-2">
                                <span className="truncate text-[11px] text-gray-700 dark:text-gray-200">
                                  Service Fee Agreement
                                </span>
                                <a
                                  href={sfaFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-primary hover:underline"
                                >
                                  Open
                                </a>
                              </li>
                            )}
                            {wipUrl && (
                              <li className="flex items-center justify-between gap-2">
                                <span className="truncate text-[11px] text-gray-700 dark:text-gray-200">
                                  Work in Progress
                                </span>
                                <a
                                  href={wipUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-primary hover:underline"
                                >
                                  Open
                                </a>
                              </li>
                            )}
                            {(amortExcelUrl || amortPdfUrl) && (
                              <li className="flex items-center justify-between gap-2">
                                <span className="truncate text-[11px] text-gray-700 dark:text-gray-200">
                                  Amortisation asset list
                                </span>
                                <span className="flex items-center gap-2">
                                  {amortExcelUrl && (
                                    <a
                                      href={amortExcelUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-semibold text-primary hover:underline"
                                    >
                                      Excel
                                    </a>
                                  )}
                                  {amortPdfUrl && (
                                    <a
                                      href={amortPdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-semibold text-primary hover:underline"
                                    >
                                      PDF
                                    </a>
                                  )}
                                </span>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {overviewBusinessDocs.length > 0 && (
                        <div>
                          <p className="mb-1 mt-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                            All business documents
                          </p>
                          <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {overviewBusinessDocs.map((doc) => (
                              <li
                                key={doc.name}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate text-[11px] text-gray-700 dark:text-gray-200">
                                  {doc.name}
                                </span>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-primary hover:underline"
                                >
                                  Open
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {!hasContracts && documentsCount === 0 && (
                        <EmptyState
                          title="No contracts or business documents linked yet. Add them from the Documents tab."
                          className="py-4 px-0 items-start text-left [&_h3]:text-[11px] [&_h3]:font-normal [&_h3]:text-gray-400 [&_h3]:dark:text-gray-500 [&_h3]:mb-0"
                        />
                      )}
                    </div>
                  </div>
                </>
              ) : businessInfoLoading ? (
                <div className="space-y-3 pt-4" aria-busy>
                  <Skeleton variant="text" className="w-3/4 h-4" />
                  <Skeleton variant="text" className="w-1/2 h-4" />
                  <Skeleton variant="text" className="w-2/5 h-4" />
                </div>
              ) : (
                <EmptyState
                  title="No business information loaded yet."
                  className="py-4 pt-4 items-start text-left [&_h3]:text-sm [&_h3]:font-normal [&_h3]:text-gray-400 [&_h3]:mb-0"
                />
              )}
            </div>
          </>
        )}

      </Card>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {notes.length === 0 ? (
          <>
            No notes yet —{" "}
            <Link
              href="?tab=activity&subtab=notes"
              scroll={false}
              className="font-medium text-primary hover:underline"
            >
              add one in Activity
            </Link>
          </>
        ) : (
          <>
            {notes.length} note{notes.length === 1 ? "" : "s"} —{" "}
            <Link
              href="?tab=activity&subtab=notes"
              scroll={false}
              className="font-medium text-primary hover:underline"
            >
              view in Activity
            </Link>
          </>
        )}
      </p>
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
              <Link
                href={`/crm-members/${clientId}?tab=offers`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all →
              </Link>
            </>
          }
        />
        {offers.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-2 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              <IconQuote />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No offers recorded yet.</p>
            <button
              type="button"
              onClick={onCreateOfferClick}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <IconPlus />
              Create the first offer
            </button>
          </div>
        ) : (
          <div className={cn(MEMBER_CARD_BODY, "pt-0 divide-y divide-gray-50 dark:divide-gray-800/50")}>
            {offers.slice(0, 5).map((o) => {
              const utilityLabel =
                o.utility_display || o.utility_type_identifier || o.utility_type || "Offer";
              const rowIcon = getRecordRowIcon(utilityLabel);
              return (
                <RecordRow
                  key={o.id}
                  leadingIcon={rowIcon.icon}
                  iconIntent={rowIcon.intent}
                  title={
                    <Link
                      href={`/offers/${o.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {utilityLabel}
                      {o.identifier ? ` ${o.identifier}` : ""}
                    </Link>
                  }
                  subtitle={buildOfferRecordSubtitle(o)}
                  status={<OfferStatusBadge status={o.status} />}
                />
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={editOpen}
        onClose={() => !editSaving && setEditOpen(false)}
        title="Edit business details"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={editSaving}
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" loading={editSaving} onClick={saveBusinessDetails}>
              Save changes
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <EditField
            label="Trading name"
            value={editForm.trading_name}
            onChange={(v) => setEditForm((f) => ({ ...f, trading_name: v }))}
          />
          <EditField
            label="Contact name"
            value={editForm.contact_name}
            onChange={(v) => setEditForm((f) => ({ ...f, contact_name: v }))}
          />
          <EditField
            label="Position"
            value={editForm.position}
            onChange={(v) => setEditForm((f) => ({ ...f, position: v }))}
          />
          <EditField
            label="Phone"
            value={editForm.telephone}
            onChange={(v) => setEditForm((f) => ({ ...f, telephone: v }))}
          />
          <EditField
            label="Email"
            value={editForm.email}
            onChange={(v) => setEditForm((f) => ({ ...f, email: v }))}
          />
          <div className="sm:col-span-2">
            <EditField
              label="Postal address"
              value={editForm.postal_address}
              onChange={(v) => setEditForm((f) => ({ ...f, postal_address: v }))}
              multiline
            />
          </div>
          <div className="sm:col-span-2">
            <EditField
              label="Site address"
              value={editForm.site_address}
              onChange={(v) => setEditForm((f) => ({ ...f, site_address: v }))}
              multiline
            />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-gray-400">
          Saves to the LOA Business Details record in Airtable (same source as business-info).
        </p>
      </Modal>

    </div>
  );
}