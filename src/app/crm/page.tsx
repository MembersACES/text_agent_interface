"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { ArrowRight, Users, LayoutDashboard, ListTodo, FileText, UserPlus } from "lucide-react";
import { getApiBaseUrl } from "@/lib/utils";
import type { ApexOptions } from "apexcharts";

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
    return new Date(s).toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return s;
  }
}

function activityTypeLabel(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

const crmSectionCards = [
  { title: "Members", description: "Browse and manage member records", href: "/clients", icon: Users, color: "from-blue-500 to-indigo-600" },
  { title: "Pipeline", description: "View pipeline by stage and move members", href: "/pipeline", icon: LayoutDashboard, color: "from-violet-500 to-purple-600" },
  { title: "Offers", description: "Manage offers and quote requests", href: "/offers", icon: ListTodo, color: "from-emerald-500 to-teal-600" },
  { title: "Activity report", description: "Recent offer activities and documents", href: "/reports/activities", icon: FileText, color: "from-amber-500 to-orange-600" },
];

export default function CrmDashboardPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [loading, setLoading] = useState(true);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [tasksSummary, setTasksSummary] = useState<TasksSummary | null>(null);
  const [offersSummary, setOffersSummary] = useState<OffersSummary | null>(null);
  const [activitiesSummary, setActivitiesSummary] = useState<ActivitiesSummary | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const base = getApiBaseUrl();
    (async () => {
      try {
        setLoading(true);
        const [pipelineRes, tasksRes, offersRes, activitiesRes, activitiesListRes] = await Promise.all([
          fetch(`${base}/api/reports/pipeline/summary`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }),
          fetch(`${base}/api/reports/tasks/summary`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }),
          fetch(`${base}/api/reports/offers/summary`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }),
          fetch(`${base}/api/reports/activities/summary`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }),
          fetch(`${base}/api/reports/activities/list?limit=10`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }),
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
      <PageHeader pageName="CRM Dashboard" description="Pipeline, tasks, offers, and activity at a glance. Use the links below to dive in." />
      <div className="mt-4">
        {loading ? (
          <div className="mb-8">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* CRM Snapshot */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Snapshot
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {pipelineSummary && (
                  <Link href="/pipeline">
                    <Card className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pipeline</p>
                        <p className="text-2xl font-bold text-dark dark:text-white">
                          {pipelineSummary.total_clients}
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">clients</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <span>Won: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{pipelineSummary.won_count}</span></span>
                          <span>Lost: <span className="font-semibold text-red-600 dark:text-red-400">{pipelineSummary.lost_count}</span></span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
                {tasksSummary && (
                  <Link href="/tasks">
                    <Card className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tasks</p>
                        <p className="text-2xl font-bold text-dark dark:text-white">
                          {tasksSummary.total_tasks}
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">total</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <span>Overdue: <span className="font-semibold text-red-600 dark:text-red-400">{tasksSummary.overdue}</span></span>
                          <span>Due today: <span className="font-semibold text-amber-600 dark:text-amber-400">{tasksSummary.due_today}</span></span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
                {offersSummary && (
                  <Link href="/offers">
                    <Card className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offers</p>
                        <p className="text-2xl font-bold text-dark dark:text-white">
                          {offersSummary.total_offers}
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">total</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <span>Accepted: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{offersSummary.accepted}</span></span>
                          <span>Win rate: <span className="font-semibold">
                            {offersSummary.total_offers > 0 ? `${Math.round((offersSummary.win_rate || 0) * 100)}%` : "—"}
                          </span></span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
                {activitiesSummary && (
                  <Link href="/reports/activities">
                    <Card className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offer activities</p>
                        <p className="text-2xl font-bold text-dark dark:text-white">
                          {activitiesSummary.total}
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">total</span>
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                          {Object.entries(activitiesSummary.by_type || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type, count]) => (
                            <span key={type}>{type.replace(/_/g, " ")}: <span className="font-semibold">{count}</span></span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              </div>
            </div>

            {/* Pipeline by stage & Offers by status charts */}
            {((pipelineSummary?.by_stage?.length ?? 0) > 0 || (offersSummary?.by_status && Object.keys(offersSummary.by_status).length > 0)) && (
              <div className="mb-8 grid gap-4 md:grid-cols-2">
                {(pipelineSummary?.by_stage?.length ?? 0) > 0 && (
                  <Card className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3">
                    <CardContent className="p-4">
                      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Pipeline by stage</h2>
                      <div className="min-h-[200px]">
                        <ApexChart
                          type="bar"
                          height={220}
                          options={{
                            chart: { fontFamily: "inherit", toolbar: { show: false } },
                            plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "60%" } },
                            colors: ["#5750F1"],
                            dataLabels: { enabled: false },
                            xaxis: {
                              categories: (pipelineSummary?.by_stage ?? []).map((s) => s.stage.replace(/_/g, " ")),
                              labels: { style: { fontSize: "11px" } },
                            },
                            yaxis: { labels: { style: { fontSize: "11px" } } },
                            grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: false } } },
                          } as ApexOptions}
                          series={[{ name: "Members", data: (pipelineSummary?.by_stage ?? []).map((s) => s.count) }]}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
                {offersSummary?.by_status && Object.keys(offersSummary.by_status).length > 0 && (
                  <Card className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3">
                    <CardContent className="p-4">
                      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Offers by status</h2>
                      <div className="min-h-[200px]">
                        <ApexChart
                          type="donut"
                          height={220}
                          options={{
                            chart: { fontFamily: "inherit" },
                            labels: Object.keys(offersSummary.by_status).map((s) => s.replace(/_/g, " ")),
                            colors: ["#5750F1", "#5475E5", "#8099EC", "#ADBCF2", "#6366f1", "#8b5cf6"],
                            legend: { position: "bottom", fontSize: "12px" },
                            dataLabels: { enabled: true },
                          } as ApexOptions}
                          series={Object.values(offersSummary.by_status)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Quick action: Add lead */}
            <div className="mb-8">
              <Link
                href="/clients?openAdd=1"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50 text-sm font-medium hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add lead
              </Link>
            </div>

            {/* Recent activity */}
            {recentActivities.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recent activity
                  </h2>
                  <Link href="/reports/activities" className="text-xs text-primary hover:underline font-medium">
                    View all
                  </Link>
                </div>
                <Card className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3">
                  <CardContent className="p-0">
                    <ul className="divide-y divide-gray-200 dark:divide-dark-3">
                      {recentActivities.map((a) => (
                        <li key={a.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <span className="font-medium text-dark dark:text-white">
                              {activityTypeLabel(a.activity_type)}
                            </span>
                            {a.business_name && (
                              <span className="text-gray-600 dark:text-gray-400 ml-2 truncate">
                                · {a.business_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatActivityDate(a.created_at)}
                            </span>
                            <Link
                              href={`/offers/${a.offer_id}`}
                              className="text-primary text-xs font-medium hover:underline"
                            >
                              View offer
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* CRM Nav */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Go to
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {crmSectionCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link key={card.title} href={card.href}>
                      <Card className="h-full transition-all duration-200 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 hover:border-primary/30">
                        <CardContent className="p-5">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-dark dark:text-white mb-1.5 text-base">{card.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{card.description}</p>
                          <div className="flex items-center text-primary text-sm font-medium">
                            Open <ArrowRight className="w-4 h-4 ml-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
