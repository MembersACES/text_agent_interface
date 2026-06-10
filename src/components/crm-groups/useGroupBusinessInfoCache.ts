"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/utils";
import { isBusinessInfoVerified } from "@/lib/business-info-fields";
import type { Client } from "@/components/crm-member/types";

export type BusinessInfoCacheEntry = {
  data: Record<string, unknown> | null;
  error: string | null;
  verified: boolean;
  loading: boolean;
};

async function fetchOne(
  token: string,
  member: Client
): Promise<BusinessInfoCacheEntry> {
  if (!member.business_name?.trim()) {
    return { data: null, error: null, verified: false, loading: false };
  }
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/get-business-info`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ business_name: member.business_name }),
    });
    if (!res.ok) {
      throw new Error("Failed to load business info");
    }
    const data = (await res.json()) as Record<string, unknown>;
    return {
      data,
      error: null,
      verified: isBusinessInfoVerified(data, member.external_business_id),
      loading: false,
    };
  } catch (e: unknown) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to load business info",
      verified: false,
      loading: false,
    };
  }
}

export function useGroupBusinessInfoCache(members: Client[], token: string) {
  const [cache, setCache] = useState<Record<number, BusinessInfoCacheEntry>>({});
  const [prefetching, setPrefetching] = useState(false);

  const memberKey = members
    .map((m) => `${m.id}:${m.business_name}:${m.external_business_id ?? ""}`)
    .join("|");

  useEffect(() => {
    if (!token || members.length === 0) {
      setCache({});
      setPrefetching(false);
      return;
    }

    let cancelled = false;
    setPrefetching(true);

    setCache((prev) => {
      const next: Record<number, BusinessInfoCacheEntry> = { ...prev };
      for (const m of members) {
        if (!next[m.id]?.data && !next[m.id]?.error) {
          next[m.id] = {
            data: null,
            error: null,
            verified: false,
            loading: true,
          };
        }
      }
      return next;
    });

    void (async () => {
      await Promise.all(
        members.map(async (member) => {
          const entry = await fetchOne(token, member);
          if (cancelled) return;
          setCache((prev) => ({ ...prev, [member.id]: entry }));
        })
      );
      if (!cancelled) setPrefetching(false);
    })();

    return () => {
      cancelled = true;
    };
    // memberKey encodes member ids/names/LOA — refetch when the set changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- members aligned with memberKey
  }, [token, memberKey]);

  const retry = useCallback(
    async (member: Client) => {
      if (!token) return;
      setCache((prev) => ({
        ...prev,
        [member.id]: {
          data: prev[member.id]?.data ?? null,
          error: null,
          verified: false,
          loading: true,
        },
      }));
      const entry = await fetchOne(token, member);
      setCache((prev) => ({ ...prev, [member.id]: entry }));
    },
    [token]
  );

  return { cache, prefetching, retry };
}
