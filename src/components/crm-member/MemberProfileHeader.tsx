"use client";

import Link from "next/link";
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
  onEditProfile: () => void;
  firstOfferId?: number | null;
  businessInfo?: Record<string, unknown> | null;
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
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconBase() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function MemberProfileHeader({
  client,
  stageValue,
  savingStage,
  onStageChange,
  onEditProfile,
  firstOfferId,
  businessInfo,
}: MemberProfileHeaderProps) {
  const abn = getAbn(businessInfo);
  const [actionsOpen, setActionsOpen] = useState(false);

  const businessName = client.business_name ? encodeURIComponent(client.business_name) : "";

  const actionLinks = [
    {
      href: `/business-info?business_name=${businessName}`,
      label: "Full business info",
    },
    { href: "/utility-linking", label: "Utility linking" },
    {
      href: `/quote-request${businessName ? `?business_name=${businessName}` : ""}`,
      label: "Quote request",
    },
    { href: "/new-client-loa", label: "New client LOA" },
  ];

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: identity */}
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

          {/* Right: stage + owner + action toolbar */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Stage selector */}
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                Stage
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={stageValue ?? client.stage}
                  onChange={(e) => onStageChange(e.target.value as ClientStage)}
                  className="text-sm px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={savingStage}
                >
                  {CLIENT_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {CLIENT_STAGE_LABELS[s] ?? s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                {stageValue != null && <StageBadge stage={stageValue as ClientStage} />}
              </div>
            </div>

            {/* Owner */}
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                Owner
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {client.owner_email ? (
                  <span title={client.owner_email}>
                    {client.owner_email.split("@")[0]}
                  </span>
                ) : (
                  "—"
                )}
              </p>
            </div>

            {/* Divider */}
            <div className="hidden md:block h-8 w-px bg-gray-200 dark:bg-gray-700" aria-hidden />

            {/* Action toolbar */}
            <div className="flex items-center gap-1.5">
              {/* Drive — subtle icon+label */}
              {client.gdrive_folder_url && (
                <a
                  href={client.gdrive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open Google Drive folder"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <IconDrive />
                  Drive
                </a>
              )}

              {/* Base 2 — subtle icon+label */}
              <Link
                href={`/base-2?businessName=${encodeURIComponent(client.business_name)}&clientId=${client.id}${firstOfferId ? `&offerId=${firstOfferId}` : ""}`}
                title="Open Base 2 analysis"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <IconBase />
                Base 2
              </Link>

              {/* Edit profile — solid outlined primary button */}
              <button
                type="button"
                onClick={onEditProfile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <IconEdit />
                Edit profile
              </button>

              {/* Actions dropdown — secondary items */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActionsOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Actions
                  <IconChevron />
                </button>
                {actionsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setActionsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 z-20 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg min-w-[180px]">
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800 mb-1">
                        Quick actions
                      </div>
                      {actionLinks.map(({ href, label }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          onClick={() => setActionsOpen(false)}
                        >
                          {label}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}