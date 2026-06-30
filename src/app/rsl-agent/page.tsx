"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Full iframe src (origin + path). Override per environment via NEXT_PUBLIC_RSL_AGENT_URL */
const DEFAULT_RSL_IFRAME_SRC =
  "https://rsl-crm-frontend-672026052958.australia-southeast2.run.app/";

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-48 rounded-lg bg-gray-200 dark:bg-dark-2" />
      <div className="h-40 rounded-xl bg-gray-100 dark:bg-dark-2" />
    </div>
  );
}

export default function RslAgentPage() {
  const { status } = useSession();

  const iframeSrc = useMemo(() => {
    const raw =
      process.env.NEXT_PUBLIC_RSL_AGENT_URL?.trim() || DEFAULT_RSL_IFRAME_SRC;
    try {
      return new URL(raw).href;
    } catch {
      return DEFAULT_RSL_IFRAME_SRC;
    }
  }, []);

  // Login required (like the rest of the interface), but no allowlist — every
  // signed-in user can access the RSL agent.
  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (status === "unauthenticated") {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Sign in required</CardTitle>
          <CardDescription>Please sign in to access the RSL Agent.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-dark"
      style={{ minHeight: "min(85dvh, calc(100dvh - 11rem))", height: "calc(100dvh - 11rem)" }}
    >
      <iframe
        src={iframeSrc}
        title="RSL Agent"
        className="block h-full w-full"
        style={{ width: "100%", height: "100%", border: 0 }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
