"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StageBadge } from "./shared/StageBadge";
import { CLIENT_STAGES, CLIENT_STAGE_LABELS } from "@/constants/crm";
import type { Client } from "./types";
import type { ClientStage } from "@/constants/crm";

export interface MemberProfileHeaderProps {
  client: Client;
  stageValue: ClientStage | undefined;
  savingStage: boolean;
  onStageChange: (value: ClientStage) => void;
  firstOfferId?: number | null;
  businessInfo?: Record<string, unknown> | null;
  /** When provided, called to load business info if missing when opening Base 2 (so Base 2 gets full URL like business-info). */
  fetchBusinessInfo?: () => Promise<Record<string, unknown> | null>;
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
  stageValue,
  savingStage,
  onStageChange,
  firstOfferId,
  businessInfo,
  fetchBusinessInfo,
}: MemberProfileHeaderProps) {
  const abn = getAbn(businessInfo);
  const [base2Opening, setBase2Opening] = useState(false);

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

  /** Open Base 2 the same way as business-info: URL with businessInfo JSON, new tab, no CRM clientId. */
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
    const url = `/base-2?${params.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-700/50 border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: avatar + identity */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 shrink-0" aria-hidden>
              {client.business_name ? (
                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                  {client.business_name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <IconBuilding />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {client.business_name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                {abn && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ABN: {abn}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: stage + owner + action toolbar */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Stage selector — badge has more weight */}
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                Stage
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={stageValue ?? client.stage}
                  onChange={(e) => onStageChange(e.target.value as ClientStage)}
                  className="text-sm px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={savingStage}
                >
                  {CLIENT_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {CLIENT_STAGE_LABELS[s] ?? s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                {stageValue != null && (
                  <span className="scale-[1.05]">
                    <StageBadge stage={stageValue as ClientStage} />
                  </span>
                )}
              </div>
            </div>

            {/* Owner — styled when empty */}
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                Owner
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {client.owner_email ? (
                  <span title={client.owner_email} className="font-medium">
                    {client.owner_email.split("@")[0]}
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 italic">Unassigned</span>
                )}
              </p>
            </div>

            {/* Divider */}
            <div className="hidden md:block h-8 w-px bg-gray-200 dark:bg-gray-700" aria-hidden />

            {/* Action toolbar — Drive & Base 2 as prominent buttons */}
            <div className="flex items-center gap-2">
              {/* Drive — prominent button */}
              {client.gdrive_folder_url && (
                <a
                  href={client.gdrive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open Google Drive folder"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors"
                >
                  <IconDrive />
                  Drive
                </a>
              )}

              {/* Base 2 — prominent button */}
              <button
                type="button"
                onClick={() => handleOpenBase2()}
                disabled={base2Opening}
                title="Open Base 2 analysis"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-50"
              >
                <IconBase />
                {base2Opening ? "Opening…" : "Base 2"}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}