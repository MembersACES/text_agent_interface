"use client";

import { useMemo, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Full iframe src (origin + path). Override per environment via NEXT_PUBLIC_PERSONAL_ASSISTANT_CRM_URL */
const DEFAULT_CRM_IFRAME_SRC =
  "https://crm-frontend-dev-522472397014.australia-southeast2.run.app/";

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-48 rounded-lg bg-gray-200 dark:bg-dark-2" />
      <div className="h-40 rounded-xl bg-gray-100 dark:bg-dark-2" />
    </div>
  );
}

export default function PersonalAssistantPage() {
  const { data: session, status } = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const iframeSrc = useMemo(() => {
    const raw =
      process.env.NEXT_PUBLIC_PERSONAL_ASSISTANT_CRM_URL?.trim() ||
      DEFAULT_CRM_IFRAME_SRC;
    try {
      return new URL(raw).href;
    } catch {
      return DEFAULT_CRM_IFRAME_SRC;
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/personal-assistant-access", { method: "GET" });
        const body = (await res.json().catch(() => ({}))) as { allowed?: boolean };
        if (cancelled) return;
        setAllowed(Boolean(body.allowed));
      } catch {
        if (!cancelled) setAllowed(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.email]);

  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (status === "unauthenticated") {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Sign in required</CardTitle>
          <CardDescription>Please sign in to access Personal Assistant.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "authenticated" && !session?.user?.email) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Your account does not have an email on file.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "authenticated" && allowed === null) {
    return <PageSkeleton />;
  }

  if (status === "authenticated" && allowed === false) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            You do not have permission to access Personal Assistant.
          </CardDescription>
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
        title="CRM"
        className="block h-full w-full"
        style={{ width: "100%", height: "100%", border: 0 }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
