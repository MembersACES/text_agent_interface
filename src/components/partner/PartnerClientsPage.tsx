"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPartnerClients, type PartnerClient } from "@/lib/partner-api";

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

export function PartnerClientsPage() {
  const { data: session } = useSession();
  const token = (session as { id_token?: string } | null)?.id_token;
  const [rows, setRows] = useState<PartnerClient[]>([]);
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
        const list = await fetchPartnerClients(token);
        if (!cancelled) setRows(list);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load clients.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <>
      <PageHeader
        pageName="Clients"
        title="Your referred clients"
        description="These are leads submitted from your distributor portal."
      />
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-gray-600 dark:text-gray-400">{error}</p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Users className="size-10" />}
              title="No clients yet"
              description="Submit a Base 1 review to refer your first client."
            />
          ) : (
            <ul className="divide-y divide-stroke dark:divide-dark-3">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/clients/${row.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-gray-2 dark:hover:bg-dark-3"
                  >
                    <div>
                      <p className="font-medium text-dark dark:text-white">
                        {row.business_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {row.primary_contact_email || "No email on file"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(row.created_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
