"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/Layouts/PageHeader";
import {
  StatCard,
  QuickActionRow,
  QuickActionList,
  ActivityFeedItem,
  PillarGrid,
} from "@/components/dashboard";
import { ArrowRight, Users, ListTodo, FileText, ClipboardList } from "lucide-react";
import { getApiBaseUrl } from "@/lib/utils";
import type { ApexOptions } from "apexcharts";
import { Base1PipelineMini } from "@/components/base1/Base1PipelineMini";
import { CLIENT_STAGE_LABELS, type ClientStage } from "@/constants/crm";

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

  const pipelinePillars = useMemo(() => {
    if (!pipelineSummary?.by_stage?.length) return [];
    const total = pipelineSummary.total_clients || 1;
    return pipelineSummary.by_stage
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((s) => ({
        id: s.stage,
        label: CLIENT_STAGE_LABELS[s.stage as ClientStage] ?? s.stage.replace(/_/g, " "),
        percent: (s.count / total) * 100,
        status: "neutral" as const,
        detail: `${s.count} members`,
      }));
  }, [pipelineSummary]);

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
            <section className="space-y-4">
              <QuickActionList className="sm:grid sm:grid-cols-3 sm:gap-2">
                <QuickActionRow href="/crm-members" icon={<Users />} label="CRM member records" description="Browse pipeline" />
                <QuickActionRow href="/offers" icon={<ListTodo />} label="Offers" description="Manage quotes" />
                <QuickActionRow href="/reports/activities" icon={<FileText />} label="Activity report" description="Recent documents" />
              </QuickActionList>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {pipelineSummary && (
                  <StatCard
                    label="Members"
                    value={pipelineSummary.total_clients}
                    trend={`${pipelineSummary.won_count} won · ${pipelineSummary.lost_count} lost`}
                    icon={<Users />}
                    accent="scope-2"
                    href="/crm-members"
                  />
                )}
                {tasksSummary && (
                  <StatCard
                    label="Tasks"
                    value={tasksSummary.total_tasks}
                    trend={
                      <>
                        Overdue{" "}
                        <span className="font-semibold text-semantic-block">{tasksSummary.overdue}</span>
                        {" · "}Today{" "}
                        <span className="font-semibold text-semantic-flag">{tasksSummary.due_today}</span>
                      </>
                    }
                    icon={<ClipboardList />}
                    accent="primary"
                    href="/tasks"
                  />
                )}
                {offersSummary && (
                  <StatCard
                    label="Offers"
                    value={offersSummary.total_offers}
                    trend={`Accepted ${offersSummary.accepted} · Win ${offersSummary.total_offers > 0 ? `${Math.round((offersSummary.win_rate || 0) * 100)}%` : "—"}`}
                    icon={<ListTodo />}
                    accent="scope-3"
                    href="/offers"
                  />
                )}
                {activitiesSummary && (
                  <StatCard
                    label="Activities"
                    value={activitiesSummary.total}
                    icon={<FileText />}
                    accent="scope-1"
                    href="/reports/activities"
                  />
                )}
              </div>

              {pipelinePillars.length > 0 && (
                <div>
                  <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                    Pipeline by stage
                  </h2>
                  <PillarGrid items={pipelinePillars} />
                </div>
              )}
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
                          <ActivityFeedItem
                            key={a.id}
                            icon={<FileText />}
                            title={activityTypeLabel(a.activity_type)}
                            meta={
                              <>
                                {a.business_name && <span>{a.business_name}</span>}
                                {a.created_by && (
                                  <span>{a.business_name ? " · " : ""}by {a.created_by}</span>
                                )}
                              </>
                            }
                            timestamp={formatActivityDate(a.created_at)}
                            href={`/offers/${a.offer_id}`}
                            hrefLabel="View offer"
                            type="info"
                            highlighted={index === 0}
                          />
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
