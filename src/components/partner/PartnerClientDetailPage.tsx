"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPartnerClient, type PartnerClient } from "@/lib/partner-api";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PartnerClientDetailPage({ clientId }: { clientId: number }) {
  const { data: session } = useSession();
  const token = (session as { id_token?: string } | null)?.id_token;
  const [row, setRow] = useState<PartnerClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const client = await fetchPartnerClient(token, clientId);
        if (!cancelled) setRow(client);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load client.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, clientId]);

  return (
    <>
      <PageHeader
        pageName="Client"
        title={row?.business_name || "Client"}
        description="Details available for this referral."
      />
      <p className="mb-4 text-sm">
        <Link href="/clients" className="text-primary hover:underline">
          Back to clients
        </Link>
      </p>
      {loading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-600 dark:text-gray-400">
            {error}
          </CardContent>
        </Card>
      ) : row ? (
        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Business</p>
              <p className="text-base font-medium text-dark dark:text-white">
                {row.business_name}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Contact email</p>
              <p className="text-base text-dark dark:text-white">
                {row.primary_contact_email || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Referred</p>
              <p className="text-base text-dark dark:text-white">
                {formatDate(row.created_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
