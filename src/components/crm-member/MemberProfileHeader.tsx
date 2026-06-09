"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "./shared/StageBadge";
import { CLIENT_STAGES, CLIENT_STAGE_LABELS, type ClientStage } from "@/constants/crm";
import { formatDate } from "./shared/formatDate";
import {
  getContractsFromBusinessInfo,
  getKeyDocumentsFromBusinessInfo,
  getSfaFilesFromBusinessInfo,
} from "./tabs/documentHelpers";
import type { Client } from "./types";

export interface MemberProfileHeaderProps {
  client: Client;
  firstOfferId?: number | null;
  businessInfo?: Record<string, unknown> | null;
  /** When provided, called to load business info if missing when opening Base 2 (so Base 2 gets full URL like business-info). */
  fetchBusinessInfo?: () => Promise<Record<string, unknown> | null>;
  onOpenTools?: () => void;
  onDeleteMember?: () => void;
  onStageChange?: (stage: ClientStage) => void | Promise<void>;
  savingStage?: boolean;
  onPromoteToExisting?: () => void | Promise<void>;
  offersCount?: number;
  lastActivityAt?: string | null;
}

function TabCountBadge({ count, href }: { count: number; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-primary/15 dark:hover:bg-primary/25 hover:text-primary transition-colors"
    >
      {count}
    </a>
  );
}

function HeaderStat({
  label,
  value,
  withDivider,
}: {
  label: string;
  value: React.ReactNode;
  withDivider?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center px-3 py-3 text-center sm:px-4 ${
        withDivider ? "border-l border-stroke dark:border-dark-3" : ""
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <span className="mt-0.5 flex items-center justify-center gap-1.5 text-[15px] font-medium tabular-nums text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}

function getAbn(info: Record<string, unknown> | null | undefined): string | null {
  if (!info || typeof info !== "object") return null;
  const details = info.business_details as Record<string, unknown> | undefined;
  if (!details || typeof details !== "object") return null;
  const abn = details.abn ?? details.ABN;
  return typeof abn === "string" ? abn : null;
}

// Simple inline SVG icons — no extra dependency needed
function IconDrive() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconBase() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2m-2 4h2m4-4h2m-2 4h2" />
    </svg>
  );
}

export function MemberProfileHeader({
  client,
  firstOfferId,
  businessInfo,
  fetchBusinessInfo,
  onOpenTools,
  onDeleteMember,
  onStageChange,
  savingStage = false,
  onPromoteToExisting,
  offersCount = 0,
  lastActivityAt = null,
}: MemberProfileHeaderProps) {
  const signedNotPromoted =
    Boolean(client.has_signed_contract) &&
    (client.stage === "lead" || client.stage === "qualified");
  const abn = getAbn(businessInfo);
  const [base2Opening, setBase2Opening] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const tradingName = useMemo(() => {
    if (!businessInfo || typeof businessInfo !== "object") return null;
    const biz = businessInfo.business_details as Record<string, unknown> | undefined;
    const name = biz?.trading_name;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  }, [businessInfo]);

  const loaSignedDate = useMemo(() => {
    if (!businessInfo || typeof businessInfo !== "object") return null;
    const rep = businessInfo.representative_details as Record<string, unknown> | undefined;
    const date = rep?.signed_date;
    return typeof date === "string" && date.trim() ? date.trim() : null;
  }, [businessInfo]);

  const contractCount = useMemo(() => {
    const contracts = getContractsFromBusinessInfo(businessInfo ?? null);
    return contracts.reduce((n, c) => n + c.items.length, 0);
  }, [businessInfo]);

  const loaFileLink = useMemo(() => {
    if (!businessInfo || typeof businessInfo !== "object") return null;
    const processed = businessInfo._processed_file_ids as Record<string, unknown> | undefined;
    const fromProcessed = processed?.business_LOA;
    const { loaUrl } = getKeyDocumentsFromBusinessInfo(businessInfo);
    const url =
      (typeof fromProcessed === "string" && fromProcessed.trim() ? fromProcessed : null) ??
      loaUrl ??
      null;
    return url;
  }, [businessInfo]);

  const { count: sfaCount, url: sfaFileUrl } = useMemo(
    () => getSfaFilesFromBusinessInfo(businessInfo ?? null),
    [businessInfo]
  );

  const driveUrl = useMemo(() => {
    if (client.gdrive_folder_url?.trim()) return client.gdrive_folder_url.trim();
    if (!businessInfo || typeof businessInfo !== "object") return null;
    const gdrive = businessInfo.gdrive as Record<string, unknown> | undefined;
    const url = gdrive?.folder_url;
    return typeof url === "string" && url.trim() ? url.trim() : null;
  }, [client.gdrive_folder_url, businessInfo]);

  const subtitleParts = useMemo(() => {
    const parts: string[] = [];
    if (tradingName) parts.push(tradingName);
    if (abn) parts.push(`ABN ${abn}`);
    const owner = client.owner_email?.trim();
    if (owner) {
      const ownerLabel = owner.includes("@") ? owner.split("@")[0] : owner;
      parts.push(`Owner ${ownerLabel}`);
    }
    return parts.length > 0 ? parts.join(" · ") : "—";
  }, [tradingName, abn, client.owner_email]);

  useEffect(() => {
    if (!showMoreMenu) return;
    const onDocClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showMoreMenu]);

  /** Build the same businessInfo payload that business-info passes to Base 2 (from raw API shape). */
  function buildBase2Params(info: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    const business = (info.business_details as Record<string, unknown>) ?? {};
    const contact = (info.contact_information as Record<string, unknown>) ?? {};
    const rep = (info.representative_details as Record<string, unknown>) ?? {};
    const linkedDetails = (info.Linked_Details ?? info.linked_details) as Record<string, unknown> | undefined;
    const linked = (linkedDetails?.linked_utilities as Record<string, unknown>) ?? {};
    const retailers = (linkedDetails?.utility_retailers as Record<string, unknown>) ?? {};
    const gdrive = info.gdrive as Record<string, unknown> | undefined;
    const driveUrl = gdrive?.folder_url;
    const processedFileIds = info._processed_file_ids as Record<string, unknown> | undefined;
    const businessInfoToPass = {
      name: business.name,
      abn: business.abn,
      trading_name: business.trading_name,
      postal_address: contact.postal_address,
      site_address: contact.site_address,
      telephone: contact.telephone,
      email: contact.email,
      contact_name: rep.contact_name,
      position: rep.position,
      industry: business.industry,
      website: business.website,
      googleDriveLink: driveUrl,
      utilities: linked,
      retailers,
      floorPlan: processedFileIds?.business_site_map_upload ?? processedFileIds?.["Floor Plan"],
      cleaningInvoice: processedFileIds?.invoice_Cleaning ?? processedFileIds?.["Cleaning Invoice"],
    };
    if (business.name) params.set("businessName", String(business.name));
    params.set("businessInfo", encodeURIComponent(JSON.stringify(businessInfoToPass)));
    return params;
  }

  /** Open Base 2 with CRM context so offer activities / autonomous follow-up can run after a successful comparison. */
  const handleOpenBase2 = async () => {
    const params = new URLSearchParams();
    let info = businessInfo && typeof businessInfo === "object" ? businessInfo : null;
    if (!info && fetchBusinessInfo && client.business_name) {
      setBase2Opening(true);
      try {
        info = await fetchBusinessInfo();
      } finally {
        setBase2Opening(false);
      }
    }
    if (info && typeof info === "object") {
      const base2Params = buildBase2Params(info);
      base2Params.forEach((value, key) => params.set(key, value));
    } else if (client.business_name) {
      params.set("businessName", client.business_name);
    }
    params.set("clientId", String(client.id));
    if (firstOfferId != null && Number.isFinite(firstOfferId)) {
      params.set("offerId", String(firstOfferId));
    }
    const url = `/base-2?${params.toString()}`;
    window.open(url, "_blank");
  };

  const handleUpdateLoa = () => {
    const params = new URLSearchParams();
    if (client.business_name) params.set("businessName", client.business_name);
    window.open(`/update-loa/upload?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const [showGenerateDocumentsMenu, setShowGenerateDocumentsMenu] = useState(false);
  const generateDocumentsMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showGenerateDocumentsMenu) return;
    const onDocClick = (e: MouseEvent) => {
      if (generateDocumentsMenuRef.current && !generateDocumentsMenuRef.current.contains(e.target as Node)) {
        setShowGenerateDocumentsMenu(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showGenerateDocumentsMenu]);

  /** Build document-generation URL params from business info (same shape as BusinessInfoDisplay). */
  function buildDocumentGenerationParams(info: Record<string, unknown>, categoryFilter?: "business-documents" | "eoi-ef"): URLSearchParams {
    const params = new URLSearchParams();
    const business = (info.business_details as Record<string, unknown>) ?? {};
    const contact = (info.contact_information as Record<string, unknown>) ?? {};
    const rep = (info.representative_details as Record<string, unknown>) ?? {};
    const linkedDetails = (info.Linked_Details ?? info.linked_details) as Record<string, unknown> | undefined;
    const linked = (linkedDetails?.linked_utilities as Record<string, unknown>) ?? {};
    const gdrive = info.gdrive as Record<string, unknown> | undefined;
    const driveUrl = gdrive?.folder_url as string | undefined;
    if (business.name) params.set("businessName", String(business.name));
    if (business.abn) params.set("abn", String(business.abn));
    if (business.trading_name) params.set("tradingAs", String(business.trading_name));
    if (contact.email) params.set("email", String(contact.email));
    if (contact.telephone) params.set("phone", String(contact.telephone));
    if (contact.postal_address) params.set("address", String(contact.postal_address));
    if (contact.site_address) params.set("siteAddress", String(contact.site_address));
    if (rep.contact_name) params.set("contactName", String(rep.contact_name));
    if (rep.position) params.set("position", String(rep.position));
    if (driveUrl) params.set("clientFolderUrl", driveUrl);
    if (categoryFilter) params.set("categoryFilter", categoryFilter);
    const linkedUtilities: string[] = [];
    if (linked["C&I Electricity"]) linkedUtilities.push("ELECTRICITY_CI");
    if (linked["SME Electricity"]) linkedUtilities.push("ELECTRICITY_SME");
    if (linked["C&I Gas"]) linkedUtilities.push("GAS_CI");
    if (linked["SME Gas"] || linked["Small Gas"]) linkedUtilities.push("GAS_SME");
    if (linked["Waste"]) linkedUtilities.push("WASTE");
    if (linked["Oil"]) linkedUtilities.push("COOKING_OIL");
    if (linked["Cleaning"]) linkedUtilities.push("CLEANING");
    if (linkedUtilities.length > 0) params.set("utilities", linkedUtilities.join(","));
    return params;
  }

  /** Build solutions-strategy-generator businessInfo JSON (same as BusinessInfoDisplay). */
  function buildSolutionsStrategyBusinessInfo(info: Record<string, unknown>): Record<string, unknown> {
    const business = (info.business_details as Record<string, unknown>) ?? {};
    const contact = (info.contact_information as Record<string, unknown>) ?? {};
    const rep = (info.representative_details as Record<string, unknown>) ?? {};
    const linkedDetails = (info.Linked_Details ?? info.linked_details) as Record<string, unknown> | undefined;
    const linked = (linkedDetails?.linked_utilities as Record<string, unknown>) ?? {};
    const retailers = (linkedDetails?.utility_retailers as Record<string, unknown>) ?? {};
    const gdrive = info.gdrive as Record<string, unknown> | undefined;
    const driveUrl = gdrive?.folder_url;
    const utilities: string[] = [];
    if (linked["C&I Electricity"]) utilities.push("ELECTRICITY_CI");
    if (linked["SME Electricity"]) utilities.push("ELECTRICITY_SME");
    if (linked["C&I Gas"]) utilities.push("GAS_CI");
    if (linked["SME Gas"] || linked["Small Gas"]) utilities.push("GAS_SME");
    if (linked["Waste"]) utilities.push("WASTE");
    if (linked["Oil"]) utilities.push("COOKING_OIL");
    if (linked["Cleaning"]) utilities.push("CLEANING");
    return {
      name: business.name,
      abn: business.abn,
      trading_name: business.trading_name,
      email: contact.email,
      telephone: contact.telephone,
      postal_address: contact.postal_address,
      site_address: contact.site_address,
      contact_name: rep.contact_name,
      position: rep.position,
      industry: business.industry,
      website: business.website,
      googleDriveLink: driveUrl,
      retailers,
      utilities,
    };
  }

  const handleOpenDocumentGeneration = async (categoryFilter: "business-documents" | "eoi-ef") => {
    setShowGenerateDocumentsMenu(false);
    let info = businessInfo && typeof businessInfo === "object" ? businessInfo : null;
    if (!info && fetchBusinessInfo && client.business_name) {
      info = await fetchBusinessInfo();
    }
    const params = info && typeof info === "object"
      ? buildDocumentGenerationParams(info, categoryFilter)
      : new URLSearchParams();
    if (!info && client.business_name) params.set("businessName", client.business_name);
    if (!info && client.primary_contact_email) params.set("email", client.primary_contact_email);
    if (!info && client.gdrive_folder_url) params.set("clientFolderUrl", client.gdrive_folder_url);
    window.open(`/document-generation?${params.toString()}`, "_blank");
  };

  const openSolutionsStrategyGenerator = async () => {
    setShowGenerateDocumentsMenu(false);
    let info = businessInfo && typeof businessInfo === "object" ? businessInfo : null;
    if (!info && fetchBusinessInfo && client.business_name) {
      info = await fetchBusinessInfo();
    }
    const params = new URLSearchParams();
    if (info && typeof info === "object") {
      params.set("businessInfo", JSON.stringify(buildSolutionsStrategyBusinessInfo(info)));
    } else {
      const fallback = {
        name: client.business_name,
        email: client.primary_contact_email ?? "",
        googleDriveLink: client.gdrive_folder_url ?? "",
        utilities: [] as string[],
      };
      params.set("businessInfo", JSON.stringify(fallback));
    }
    window.open(`/solutions-strategy-generator?${params.toString()}`, "_blank");
  };

  const openSolarCleaningQuote = async () => {
    setShowGenerateDocumentsMenu(false);
    let info = businessInfo && typeof businessInfo === "object" ? businessInfo : null;
    if (!info && fetchBusinessInfo && client.business_name) {
      info = await fetchBusinessInfo();
    }
    const params = new URLSearchParams();
    params.set("clientId", String(client.id));
    if (client.business_name) params.set("businessName", client.business_name);
    if (client.primary_contact_email) params.set("email", client.primary_contact_email);
    if (client.gdrive_folder_url) params.set("clientFolderUrl", client.gdrive_folder_url);

    if (info && typeof info === "object") {
      const contact = (info.contact_information as Record<string, unknown>) ?? {};
      const rep = (info.representative_details as Record<string, unknown>) ?? {};
      const site = contact.site_address;
      if (typeof site === "string" && site.trim()) params.set("siteAddress", site.trim());
      const cn = rep.contact_name;
      if (typeof cn === "string" && cn.trim()) params.set("contactName", cn.trim());
    }

    window.open(`/solar-cleaning-quote?${params.toString()}`, "_blank");
  };

  const openVinylRobotWrap = async () => {
    setShowGenerateDocumentsMenu(false);
    let info = businessInfo && typeof businessInfo === "object" ? businessInfo : null;
    if (!info && fetchBusinessInfo && client.business_name) {
      info = await fetchBusinessInfo();
    }
    const params = new URLSearchParams();
    params.set("clientId", String(client.id));
    if (client.business_name) params.set("businessName", client.business_name);
    if (client.primary_contact_email) params.set("email", client.primary_contact_email);
    if (client.gdrive_folder_url) params.set("clientFolderUrl", client.gdrive_folder_url);

    if (info && typeof info === "object") {
      const business = (info.business_details as Record<string, unknown>) ?? {};
      const contact = (info.contact_information as Record<string, unknown>) ?? {};
      const rep = (info.representative_details as Record<string, unknown>) ?? {};
      const site = contact.site_address;
      if (typeof site === "string" && site.trim()) params.set("siteAddress", site.trim());
      const cn = rep.contact_name;
      if (typeof cn === "string" && cn.trim()) params.set("contactName", cn.trim());
      const web = business.website;
      if (typeof web === "string" && web.trim()) params.set("website", web.trim());
      const trading = business.trading_name;
      if (typeof trading === "string" && trading.trim()) params.set("tradingAs", trading.trim());
    }

    window.open(`/vinyl-robot-wrap?${params.toString()}`, "_blank");
  };

  return (
    <Card className="border border-stroke bg-white shadow-sm ring-1 ring-gray-200/60 dark:border-dark-3 dark:bg-gray-dark dark:ring-gray-700/50">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 lg:p-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-stroke bg-gray/30 dark:border-dark-3 dark:bg-dark-2"
                aria-hidden
              >
                {client.business_name ? (
                  <span className="text-base font-semibold text-gray-500 dark:text-gray-400">
                    {client.business_name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <IconBuilding />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[18px] font-medium text-gray-900 dark:text-gray-100">
                    {client.business_name}
                  </h1>
                  <StageBadge stage={client.stage} />
                  {client.entity_group_display_name ? (
                    <span
                      className="inline-flex shrink-0 items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-800 dark:border-violet-800/60 dark:bg-violet-900/30 dark:text-violet-200"
                      title={client.entity_group_slug ?? undefined}
                    >
                      {client.entity_group_display_name}
                    </span>
                  ) : null}
                  {signedNotPromoted ? (
                    <span className="inline-flex items-center gap-1">
                      <Badge intent="warning" shape="pill" className="text-[10px] py-0">
                        Signed — not promoted
                      </Badge>
                      {onPromoteToExisting ? (
                        <button
                          type="button"
                          onClick={() => void onPromoteToExisting()}
                          disabled={savingStage}
                          className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
                        >
                          Promote
                        </button>
                      ) : null}
                    </span>
                  ) : null}
                  {driveUrl && (
                    <a
                      href={driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open Google Drive folder"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-stroke bg-white px-2.5 py-1 text-[11px] font-semibold text-dark transition-all hover:bg-gray-2 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-2"
                    >
                      <IconDrive />
                      Drive
                    </a>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                  {subtitleParts}
                </p>
              </div>
            </div>
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
                {CLIENT_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {CLIENT_STAGE_LABELS[s]}
                  </option>
                ))}
              </Select>
            ) : null}
            <div className="relative" ref={generateDocumentsMenuRef}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowGenerateDocumentsMenu((v) => !v)}
                title="Generate documents"
              >
                Generate Documents {showGenerateDocumentsMenu ? "▲" : "▼"}
              </Button>
              {showGenerateDocumentsMenu && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-md">
                  <button
                    type="button"
                    onClick={() => handleOpenDocumentGeneration("business-documents")}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Generate LOA and SFA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDocumentGeneration("eoi-ef")}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Generate EOI or EF
                  </button>
                  <button
                    type="button"
                    onClick={() => openSolutionsStrategyGenerator()}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Generate Solution Documents
                  </button>
                  <div
                    className="my-1 border-t border-gray-200 dark:border-gray-600"
                    role="separator"
                  />
                  <button
                    type="button"
                    onClick={() => void openSolarCleaningQuote()}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Solar Panel Cleaning Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => void openVinylRobotWrap()}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Vinyl Robot Wrap
                  </button>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleOpenBase2()}
              disabled={base2Opening}
              title="Open Base 2 analysis"
              leftIcon={<IconBase />}
            >
              {base2Opening ? "Opening…" : "Base 2"}
            </Button>

            <div className="relative" ref={moreMenuRef}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowMoreMenu((v) => !v)}
                title="More actions"
                aria-expanded={showMoreMenu}
              >
                ⋯ More
              </Button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full z-[9999] mt-1 min-w-[180px] rounded-lg border border-stroke bg-white py-1 shadow-md dark:border-dark-3 dark:bg-gray-dark">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      handleUpdateLoa();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray/50 dark:text-gray-200 dark:hover:bg-dark-2"
                  >
                    Update LOA
                  </button>
                  {onOpenTools && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onOpenTools();
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray/50 dark:text-gray-200 dark:hover:bg-dark-2"
                    >
                      Tools
                    </button>
                  )}
                  {onDeleteMember ? (
                    <>
                      <div
                        className="my-1 border-t border-gray-200 dark:border-gray-600"
                        role="separator"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onDeleteMember();
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Delete member…
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex border-t border-stroke dark:border-dark-3">
          <HeaderStat label="Offers" value={String(offersCount)} />
          <HeaderStat
            label="Contracts"
            value={businessInfo ? String(contractCount) : "—"}
            withDivider
          />
          <div
            className={`flex flex-1 flex-col items-center px-3 py-3 text-center sm:px-4 border-l border-stroke dark:border-dark-3`}
          >
            {(loaFileLink || (sfaCount > 0 && sfaFileUrl)) && (
              <span className="flex items-center justify-center gap-3 text-[11px] font-semibold tracking-wide text-gray-700 dark:text-gray-300">
                {loaFileLink && (
                  <span className="inline-flex items-center gap-1">
                    LOA
                    <TabCountBadge count={1} href={loaFileLink} />
                  </span>
                )}
                {sfaCount > 0 && sfaFileUrl && (
                  <span className="inline-flex items-center gap-1">
                    SFA
                    <TabCountBadge count={sfaCount} href={sfaFileUrl} />
                  </span>
                )}
              </span>
            )}
            <span className="mt-0.5 text-[15px] font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {loaSignedDate ?? "—"}
            </span>
          </div>
          <HeaderStat
            label="Last activity"
            value={lastActivityAt ? formatDate(lastActivityAt) : "—"}
            withDivider
          />
        </div>
      </CardContent>
    </Card>
  );
}