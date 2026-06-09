import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import BusinessInfoDisplay from "./BusinessInfoDisplay";
import { getApiBaseUrl } from "@/lib/utils";
import {
  getRecentMemberViews,
  recordMemberProfileView,
  type RecentMemberView,
} from "@/lib/member-profile-recent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InsightCallout } from "@/components/dashboard";
import {
  MemberProfilePreviewSkeleton,
  RecentMembersRow,
} from "@/components/member-profile";
import { AlertCircle, Search } from "lucide-react";

interface BusinessInfoToolProps {
  token: string;
  onTokenExpired?: () => Promise<void>;
  getValidToken?: () => Promise<string | null>;
}

const SEARCH_PLACEHOLDER =
  "e.g. Frankston RSL, Extrusions…";

export default function BusinessInfoTool({
  token,
  onTokenExpired,
  getValidToken,
}: BusinessInfoToolProps) {
  const [businessName, setBusinessName] = useState("");
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentMembers, setRecentMembers] = useState<RecentMemberView[]>([]);
  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    setRecentMembers(getRecentMemberViews());
  }, []);

  const getBusinessInfo = useCallback(
    async (nameOverride?: string) => {
      const queryName = (nameOverride ?? businessName).trim();
      if (!queryName) {
        setError("Enter a business name to search.");
        return;
      }

      if (nameOverride) {
        setBusinessName(nameOverride);
      }

      setError(null);
      setLoading(true);

      try {
        let currentToken = token;
        if (getValidToken) {
          const freshToken = await getValidToken();
          if (freshToken) currentToken = freshToken;
        }

        if (!currentToken && onTokenExpired) {
          await onTokenExpired();
          setError("Authentication required. Please try again.");
          return;
        }

        const res = await fetch(`${getApiBaseUrl()}/api/get-business-info`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ business_name: queryName }),
        });

        if (res.status === 401) {
          if (onTokenExpired) {
            await onTokenExpired();
            setError("Session expired. Authentication refreshed — please try again.");
          } else {
            const currentUrl = window.location.pathname + window.location.search;
            window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`;
            setError("Session expired. Redirecting to sign in…");
          }
          return;
        }

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Unknown error");
        }

        const data = await res.json();
        setBusinessInfo(data);

        const resolvedName =
          data?.business_details?.name || data?.business_details?.["Business Name"] || queryName;
        const clientId = data?.client_id ?? null;
        recordMemberProfileView({ businessName: resolvedName, clientId });
        setRecentMembers(getRecentMemberViews());
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not load profile";
        if (message !== "REAUTHENTICATION_REQUIRED") {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [businessName, token, getValidToken, onTokenExpired],
  );

  useEffect(() => {
    if (hasAutoSubmitted.current) return;
    const params = new URLSearchParams(window.location.search);
    const urlBusinessName = params.get("businessName");
    if (!urlBusinessName) return;

    hasAutoSubmitted.current = true;
    setBusinessName(urlBusinessName);
    const timer = setTimeout(() => {
      void getBusinessInfo(urlBusinessName);
    }, 300);
    return () => clearTimeout(timer);
  }, [getBusinessInfo]);

  const handleLinkUtility = () => {
    const params = new URLSearchParams();
    const actualBusinessName = businessInfo?.business_details?.name || businessName;
    params.set("businessName", actualBusinessName);
    params.set("token", token);
    window.open(`/utility-linking?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const handleRecentSelect = (entry: RecentMemberView) => {
    void getBusinessInfo(entry.businessName);
  };

  const showPreviewSkeleton = loading || (!businessInfo && !error);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              id="business-name-input"
              label="Business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER}
              wrapperClassName="min-w-0 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") void getBusinessInfo();
              }}
            />
            <Button
              onClick={() => void getBusinessInfo()}
              loading={loading}
              disabled={loading || !businessName.trim()}
              leftIcon={<Search className="size-4" />}
            >
              Get member profile
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Press{" "}
            <kbd className="rounded border border-stroke bg-gray/50 px-1.5 py-0.5 font-mono text-[10px] dark:border-dark-3 dark:bg-dark-2">
              ⌘K
            </kbd>{" "}
            to search members from anywhere — or browse{" "}
            <Link href="/crm-members" className="font-semibold text-primary hover:underline">
              CRM members
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <RecentMembersRow
        items={recentMembers}
        onSelect={handleRecentSelect}
        activeBusinessName={businessInfo?.business_details?.name || businessName}
        loading={loading}
      />

      {error && (
        <InsightCallout
          variant="warning"
          title="Could not load profile"
          icon={<AlertCircle className="text-semantic-flag" />}
        >
          {error}
        </InsightCallout>
      )}

      {showPreviewSkeleton && !businessInfo && (
        <MemberProfilePreviewSkeleton loading={loading} />
      )}

      {businessInfo &&
        typeof businessInfo === "object" &&
        businessInfo !== null &&
        (businessInfo as { client_id?: number }).client_id != null && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            CRM member saved —{" "}
            <Link
              href={`/crm-members/${(businessInfo as { client_id: number }).client_id}`}
              className="font-semibold text-primary hover:underline"
            >
              View in CRM
            </Link>
          </p>
        )}

      {loading && businessInfo && (
        <MemberProfilePreviewSkeleton loading />
      )}

      {businessInfo && !loading && (
        <div className="text-left">
          {typeof businessInfo === "object" && businessInfo !== null ? (
            <BusinessInfoDisplay
              info={businessInfo}
              onLinkUtility={handleLinkUtility}
              setInfo={setBusinessInfo}
            />
          ) : (
            <pre className="overflow-auto rounded-xl bg-gray/50 p-4 text-xs dark:bg-dark-3/40">
              {JSON.stringify(businessInfo, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
