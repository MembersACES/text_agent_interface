"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/utils";

interface WonLostRow {
  period: string;
  won: number;
  lost: number;
}

interface PipelineSummary {
  total_clients: number;
  by_stage: { stage: string; count: number }[];
  won_count: number;
  lost_count: number;
}

function formatPeriod(period: string) {
  if (!period || period.length !== 7) return period;
  const [y, m] = period.split("-");
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const mi = parseInt(m, 10) - 1;
  return mi >= 0 && mi < 12 ? `${months[mi]} ${y}` : period;
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [wonLost, setWonLost] = useState<WonLostRow[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const base = getApiBaseUrl();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [wonLostRes, summaryRes] = await Promise.all([
          fetch(`${base}/api/reports/pipeline/won-lost-by-period?period=month`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }),
          fetch(`${base}/api/reports/pipeline/summary`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }),
        ]);
        if (wonLostRes.ok) {
          const data: WonLostRow[] = await wonLostRes.json();
          setWonLost(Array.isArray(data) ? data : []);
        } else {
          setWonLost([]);
        }
        if (summaryRes.ok) {
          setPipelineSummary(await summaryRes.json());
        } else {
          setPipelineSummary(null);
        }
      } catch (e) {
        setError("Failed to load reports");
        setWonLost([]);
        setPipelineSummary(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <>
      <PageHeader
        pageName="Reports"
        title="Pipeline reports"
        description="Won/lost by period and conversion by stage."
      />
      <div className="mt-4 space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading reports…</div>
        ) : (
          <>
            <Card className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3">
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Won / lost by period (monthly)
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Clients that moved to Won or Lost, grouped by the month of their stage change.
                </p>
                {wonLost.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No data yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                            Period
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                            Won
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                            Lost
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {wonLost.map((row) => (
                          <tr key={row.period} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                              {formatPeriod(row.period)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                              {row.won}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                              {row.lost}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                              {row.won + row.lost}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3">
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Conversion by stage
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Current client counts per pipeline stage.
                </p>
                {!pipelineSummary || !pipelineSummary.by_stage?.length ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No data yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                            Stage
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pipelineSummary.by_stage.map(({ stage, count }) => (
                          <tr key={stage} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100 capitalize">
                              {stage.replace(/_/g, " ")}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums font-medium text-gray-700 dark:text-gray-300">
                              {count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
