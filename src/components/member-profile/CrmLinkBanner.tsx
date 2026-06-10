"use client";

import React, { useCallback, useState } from "react";
import { getApiBaseUrl } from "@/lib/utils";
import { type CrmLink, isCrmLinkMatched } from "@/lib/crm-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InsightCallout } from "@/components/dashboard";
import { AlertCircle, ExternalLink, Link2, UserPlus } from "lucide-react";

interface CrmClientSummary {
  id: number;
  business_name: string;
  stage?: string;
}

interface CrmLinkBannerProps {
  crmLink: CrmLink | null | undefined;
  recordId?: string | null;
  businessName: string;
  primaryContactEmail?: string | null;
  gdriveFolderUrl?: string | null;
  token: string;
  onLinked: (clientId: number) => void;
}

export function CrmLinkBanner({
  crmLink,
  recordId,
  businessName,
  primaryContactEmail,
  gdriveFolderUrl,
  token,
  onLinked,
}: CrmLinkBannerProps) {
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CrmClientSummary[]>([]);
  const [searching, setSearching] = useState(false);

  const rid = (recordId || crmLink?.record_id || "").trim();

  const postLink = useCallback(
    async (clientId?: number) => {
      if (!rid) {
        setError("No LOA record ID — cannot link to CRM.");
        return;
      }
      setLinking(true);
      setError(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/clients/link-from-loa`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            record_id: rid,
            business_name: businessName,
            primary_contact_email: primaryContactEmail || undefined,
            gdrive_folder_url: gdriveFolderUrl || undefined,
            client_id: clientId ?? undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { detail?: string }).detail || "Could not link CRM member");
        }
        const client = (await res.json()) as CrmClientSummary;
        onLinked(client.id);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not link CRM member");
      } finally {
        setLinking(false);
      }
    },
    [rid, businessName, primaryContactEmail, gdriveFolderUrl, token, onLinked],
  );

  const runSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/clients?query=${encodeURIComponent(q)}&limit=8`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data as { items?: CrmClientSummary[] }).items ?? [];
      setSearchResults(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, token]);

  if (isCrmLinkMatched(crmLink)) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-gray-dark">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          CRM member linked
          {rid ? (
            <>
              {" "}
              <span className="font-mono text-xs text-gray-500 dark:text-gray-500">({rid})</span>
            </>
          ) : null}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<ExternalLink className="size-3.5" />}
          onClick={() => window.open(`/crm-members/${crmLink.client_id}`, "_blank", "noopener,noreferrer")}
        >
          View in CRM
        </Button>
      </div>
    );
  }

  const status = crmLink?.status ?? "ambiguous";
  const reason = crmLink?.reason ?? "CRM link status unknown";

  return (
    <div className="space-y-3 rounded-xl border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-gray-dark">
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">CRM link</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{reason}</p>
        {rid ? (
          <p className="font-mono text-xs text-gray-500 dark:text-gray-500">
            LOA record: {rid}
          </p>
        ) : null}
      </div>

      {status === "conflict" && crmLink?.candidates?.length ? (
        <ul className="space-y-2 text-sm">
          {crmLink.candidates.map((c) => (
            <li key={c.client_id} className="flex flex-wrap items-center gap-2">
              <span>
                #{c.client_id} {c.business_name}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={linking}
                onClick={() => void postLink(c.client_id)}
              >
                Keep this link
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {status === "no_match" && rid ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            loading={linking}
            leftIcon={<UserPlus className="size-3.5" />}
            onClick={() => void postLink()}
          >
            Create CRM member from LOA
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Link2 className="size-3.5" />}
            onClick={() => setShowSearch((v) => !v)}
          >
            Link to existing member
          </Button>
        </div>
      ) : null}

      {showSearch && rid ? (
        <div className="space-y-2 border-t border-stroke pt-3 dark:border-dark-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              label="Search CRM members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Centurion"
              wrapperClassName="min-w-0 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSearch();
              }}
            />
            <Button type="button" size="sm" loading={searching} onClick={() => void runSearch()}>
              Search
            </Button>
          </div>
          {searchResults.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {searchResults.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-gray/60 dark:hover:bg-dark-2"
                    onClick={() => void postLink(c.id)}
                    disabled={linking}
                  >
                    #{c.id} {c.business_name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <InsightCallout variant="warning" title="CRM link" icon={<AlertCircle className="text-semantic-flag" />}>
          {error}
        </InsightCallout>
      ) : null}
    </div>
  );
}
