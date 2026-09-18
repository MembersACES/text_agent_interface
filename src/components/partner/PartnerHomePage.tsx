"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BarChart3, Users } from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPartnerMe, type PartnerMe } from "@/lib/partner-api";

export function PartnerHomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as { id_token?: string } | null)?.id_token;
  const [me, setMe] = useState<PartnerMe | null>(null);
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
        const row = await fetchPartnerMe(token);
        if (!cancelled) setMe(row);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load your account.");
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
        pageName="Home"
        title="Distributor portal"
        description="Submit Base 1 reviews and see the clients referred from your organisation."
      />
      {loading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-600 dark:text-gray-400">
            {error}
          </CardContent>
        </Card>
      ) : me ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Signed in as</p>
              <p className="text-lg font-semibold text-dark dark:text-white">{me.email}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tools: {me.tools.length ? me.tools.join(", ") : "none"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-3 p-6">
              <Button className="w-full" onClick={() => router.push("/base-1")}>
                <BarChart3 className="size-4" />
                Submit Base 1
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => router.push("/clients")}
              >
                <Users className="size-4" />
                View clients
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
