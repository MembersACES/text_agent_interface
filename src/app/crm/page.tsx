"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { ArrowRight, Users, ListTodo, FileText } from "lucide-react";
import { getApiBaseUrl } from "@/lib/utils";
import type { ApexOptions } from "apexcharts";
import { Base1PipelineMini } from "@/components/base1/Base1PipelineMini";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ActivityItem {
  id: number;
  offer_id: number;
  client_id?: number | null;
  business_name?: string | null;
  activity_type: string;
  document_link?: string | null;
  created_at: string;
  created_by?: string | null;
}

function formatActivityDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("en-AU", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function activityTypeLabel(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PipelineSummary {
  total_clients: number;
  by_stage: { stage: string; count: number }[];
  won_count: number;
  lost_count: number;
}

interface TasksSummary {
  total_tasks: number;
  by_status: Record<string, number>;
  overdue: number;
  due_today: number;
}

interface OffersSummary {
  total_offers: number;
  by_status: Record<string, number>;
  accepted: number;
  lost: number;
  win_rate: number;
}

interface ActivitiesSummary {
  total: number;
  by_type: Record<string, number>;
}

export default function CrmDashboardPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [loading, setLoading] = useState(true);
  const [pipelineSummary, setPipelineSummary] =
    useState<PipelineSummary | null>(null);
  const [tasksSummary, setTasksSummary] =
    useState<TasksSummary | null>(null);
  const [offersSummary, setOffersSummary] =
    useState<OffersSummary | null>(null);
  const [activitiesSummary, setActivitiesSummary] =
    useState<ActivitiesSummary | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>(
    []
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const base = getApiBaseUrl();
    (async () => {
      try {
        setLoading(true);
        const [
          pipelineRes,
          tasksRes,
          offersRes,
          activitiesRes,
          activitiesListRes,
        ] = await Promise.all([
          fetch(`${base}/api/reports/pipeline/summary`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(`${base}/api/reports/tasks/summary`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(`${base}/api/reports/offers/summary`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(`${base}/api/reports/activities/summary`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(`${base}/api/reports/activities/list?limit=10`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        ]);
        if (pipelineRes.ok) setPipelineSummary(await pipelineRes.json());
        else setPipelineSummary(null);
        if (tasksRes.ok) setTasksSummary(await tasksRes.json());
        else setTasksSummary(null);
        if (offersRes.ok) setOffersSummary(await offersRes.json());
        else setOffersSummary(null);
        if (activitiesRes.ok) setActivitiesSummary(await activitiesRes.json());
        else setActivitiesSummary(null);
        if (activitiesListRes.ok) {
          const list: ActivityItem[] = await activitiesListRes.json();
          setRecentActivities(Array.isArray(list) ? list : []);
        } else {
          setRecentActivities([]);
        }
      } catch {
        setPipelineSummary(null);
        setTasksSummary(null);
        setOffersSummary(null);
        setActivitiesSummary(null);
        setRecentActivities([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <>
      <PageHeader
        pageName="CRM Dashboard"
        description="Tasks, offers, and activity at a glance."
      />

      <div className="mt-4 space-y-8">
        {/* Base 1 mini lead pipeline (top, under header) */}
        <Base1PipelineMini />

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <>
            {/* Overview: centered quick links, stats below */}
            <section className="space-y-3">
              <div className="text-center space-y-3">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/clients"
                    className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
                  >
                    <Users className="h-4 w-4" />
                    <span>CRM member records</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/offers"
                    className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
                  >
                    <ListTodo className="h-4 w-4" />
                    <span>Offers</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/reports/activities"
                    className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Activity report</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Overview
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Quick links and key counts for your CRM work.
                </p>
              </div>

              <Card className="bg-white/80 dark:bg-dark-2 border border-gray-200/80 dark:border-dark-3 shadow-sm">
                <CardContent className="p-3 sm:p-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Link
                      href="/tasks"
                      className="group rounded-md border border-gray-200/80 dark:border-dark-3 bg-gray-50/70 dark:bg-dark-1 px-3 py-2.5 flex flex-col justify-between hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                          Tasks
                        </p>
                        {tasksSummary && (
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                            {tasksSummary.total_tasks}
                          </span>
                        )}
                      </div>
                      {tasksSummary && (
                        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>
                            Overdue{" "}
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {tasksSummary.overdue}
                            </span>
                          </span>
                          <span>
                            Today{" "}
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              {tasksSummary.due_today}
                            </span>
                          </span>
                        </div>
                      )}
                      {!tasksSummary && (
                        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                          Tasks summary unavailable.
                        </p>
                      )}
                    </Link>

                    <Link
                      href="/offers"
                      className="group rounded-md border border-gray-200/80 dark:border-dark-3 bg-gray-50/70 dark:bg-dark-1 px-3 py-2.5 flex flex-col justify-between hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                          Offers
                        </p>
                        {offersSummary && (
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                            {offersSummary.total_offers}
                          </span>
                        )}
                      </div>
                      {offersSummary && (
                        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>
                            Accepted{" "}
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {offersSummary.accepted}
                            </span>
                          </span>
                          <span>
                            Win rate{" "}
                            <span className="font-semibold">
                              {offersSummary.total_offers > 0
                                ? `${Math.round((offersSummary.win_rate || 0) * 100)}%`
                                : "—"}
                            </span>
                          </span>
                        </div>
                      )}
                      {!offersSummary && (
                        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                          Offers summary unavailable.
                        </p>
                      )}
                    </Link>

                    <Link
                      href="/reports/activities"
                      className="group rounded-md border border-gray-200/80 dark:border-dark-3 bg-gray-50/70 dark:bg-dark-1 px-3 py-2.5 flex flex-col justify-between hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                          Offer activities
                        </p>
                        {activitiesSummary && (
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                            {activitiesSummary.total}
                          </span>
                        )}
                      </div>
                      {activitiesSummary && (
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                          {Object.entries(activitiesSummary.by_type || {})
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 2)
                            .map(([type, count]) => (
                              <span key={type} className="truncate">
                                {type.replace(/_/g, " ")}{" "}
                                <span className="font-semibold">{count}</span>
                              </span>
                            ))}
                        </div>
                      )}
                      {!activitiesSummary && (
                        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                          Activity summary unavailable.
                        </p>
                      )}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Middle layout: activity + chart */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Recent activity feed */}
              <div className="lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Recent activity
                  </h2>
                  <Link
                    href="/reports/activities"
                    className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    <span>View all</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <Card className="bg-white dark:bg-dark-2 border border-gray-200/80 dark:border-dark-3 shadow-sm">
                  <CardContent className="p-0">
                    {recentActivities.length === 0 ? (
                      <div className="p-4 text-xs text-gray-500 dark:text-gray-400">
                        No recent activity yet.
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100 dark:divide-dark-3">
                        {recentActivities.map((a, index) => (
                          <li
                            key={a.id}
                            className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
                              index === 0
                                ? "bg-gray-50/80 dark:bg-dark-1/60"
                                : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                                  {activityTypeLabel(a.activity_type)}
                                </span>
                                {a.business_name && (
                                  <span className="truncate text-[11px] text-gray-700 dark:text-gray-300">
                                    {a.business_name}
                                  </span>
                                )}
                              </div>
                              {a.created_by && (
                                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                  by {a.created_by}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                {formatActivityDate(a.created_at)}
                              </span>
                              <Link
                                href={`/offers/${a.offer_id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                              >
                                View offer
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Offers by status chart */}
              {offersSummary?.by_status &&
                Object.keys(offersSummary.by_status).length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        Offers by status
                      </h2>
                      <Link
                        href="/offers"
                        className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                      >
                        <span>Open offers</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <Card className="bg-white dark:bg-dark-2 border border-gray-200/80 dark:border-dark-3 shadow-sm">
                      <CardContent className="p-4">
                        <div className="min-h-[260px]">
                          <ApexChart
                            type="donut"
                            height={260}
                            options={
                              {
                                chart: {
                                  fontFamily: "inherit",
                                  toolbar: { show: false },
                                },
                                stroke: {
                                  colors: ["#ffffff"],
                                },
                                labels: Object.keys(
                                  offersSummary.by_status
                                ).map((s) => s.replace(/_/g, " ")),
                                colors: [
                                  "#4f46e5",
                                  "#22c55e",
                                  "#eab308",
                                  "#ef4444",
                                  "#0ea5e9",
                                  "#8b5cf6",
                                ],
                                legend: {
                                  position: "bottom",
                                  fontSize: "11px",
                                  labels: { colors: undefined },
                                  markers: {
                                    width: 8,
                                    height: 8,
                                    radius: 999,
                                  },
                                },
                                dataLabels: {
                                  enabled: false,
                                },
                                tooltip: {
                                  theme: "dark",
                                  y: {
                                    formatter: (val: number) =>
                                      `${val} offers`,
                                  },
                                },
                                plotOptions: {
                                  pie: {
                                    donut: {
                                      size: "70%",
                                      labels: {
                                        show: true,
                                        name: {
                                          show: true,
                                          fontSize: "11px",
                                          offsetY: 8,
                                        },
                                        value: {
                                          show: true,
                                          fontSize: "20px",
                                          fontWeight: 600,
                                          offsetY: -8,
                                        },
                                        total: {
                                          show: true,
                                          label: "Total",
                                          fontSize: "11px",
                                          formatter: () =>
                                            `${Object.values(
                                              offersSummary.by_status
                                            ).reduce(
                                              (acc, v) =>
                                                acc +
                                                (typeof v === "number"
                                                  ? v
                                                  : 0),
                                              0
                                            )}`,
                                        },
                                      },
                                    },
                                  },
                                },
                              } as ApexOptions
                            }
                            series={Object.values(offersSummary.by_status)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
            </div>

          </>
        )}
      </div>
    </>
  );
}
