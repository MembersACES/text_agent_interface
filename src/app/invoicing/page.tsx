"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { InvoicingOverview } from "@/components/invoicing/InvoicingOverview";
import { InvoicingWorkspace } from "@/components/invoicing/InvoicingWorkspace";
import {
  getInvoicingStream,
  getSessionToken,
  isInvoicingStreamId,
  type InvoicingStreamId,
} from "@/lib/invoicing-streams";

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-16 rounded-xl bg-gray-100 dark:bg-dark-2" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="h-36 rounded-2xl bg-gray-100 dark:bg-dark-2" />
        <div className="h-36 rounded-2xl bg-gray-100 dark:bg-dark-2" />
        <div className="h-36 rounded-2xl bg-gray-100 dark:bg-dark-2" />
      </div>
    </div>
  );
}

function InvoicingPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoicingAllowed, setInvoicingAllowed] = useState<boolean | null>(null);

  const streamParam = searchParams.get("stream");
  const tabParam = searchParams.get("tab");
  const streamId = isInvoicingStreamId(streamParam) ? streamParam : null;
  const stream = streamId ? getInvoicingStream(streamId) : undefined;
  const workspaceStream =
    stream && stream.id !== "bank-rec" ? stream : undefined;
  const token = getSessionToken(session);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/invoicing-access", { method: "GET" });
        const body = (await res.json().catch(() => ({}))) as { allowed?: boolean };
        if (cancelled) return;
        setInvoicingAllowed(Boolean(body.allowed));
      } catch {
        if (!cancelled) setInvoicingAllowed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.email]);

  function goToOverview() {
    router.replace("/invoicing", { scroll: false });
  }

  function openStream(id: InvoicingStreamId) {
    const next = getInvoicingStream(id);
    const params = new URLSearchParams();
    params.set("stream", id);
    if (next?.defaultTabGid) params.set("tab", next.defaultTabGid);
    router.replace(`/invoicing?${params.toString()}`, { scroll: false });
  }

  function changeTab(gid: string) {
    if (!workspaceStream) return;
    const params = new URLSearchParams();
    params.set("stream", workspaceStream.id);
    params.set("tab", gid);
    router.replace(`/invoicing?${params.toString()}`, { scroll: false });
  }

  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (status === "unauthenticated") {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Sign in required</CardTitle>
          <CardDescription>Please sign in to access Invoicing.</CardDescription>
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

  if (status === "authenticated" && invoicingAllowed === null) {
    return <PageSkeleton />;
  }

  if (status === "authenticated" && invoicingAllowed === false) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            You do not have permission to access Invoicing.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (workspaceStream) {
    return (
      <InvoicingWorkspace
        stream={workspaceStream}
        token={token}
        activeTabGid={tabParam}
        onBack={goToOverview}
        onTabChange={changeTab}
      />
    );
  }

  return (
    <>
      <PageHeader
        pageName="Invoicing"
        description="What needs invoicing, issued PDFs, then payments."
      />
      <InvoicingOverview
        token={token}
        onOpenStream={openStream}
      />
    </>
  );
}

export default function InvoicingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InvoicingPageInner />
    </Suspense>
  );
}
