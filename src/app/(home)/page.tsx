"use client";



import Link from "next/link";

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";

import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";

import {

  StatCard,

  DemoFold,

  ActivityOverTimeChart,

  Base1ConversionFunnelCard,

} from "@/components/dashboard";

import {

  ClipboardList,

  FileText,

  Users,

  Database,

  UserPlus,

  Target,

  FileCheck,

  Sparkles,

  FolderPlus,

  ListTodo,

  LayoutDashboard,

  Leaf,

} from "lucide-react";

import { getApiBaseUrl } from "@/lib/utils";

import {

  fetchHomeDashboardData,

  type HomeDashboardData,

} from "@/app/(home)/dashboard-data";

import { cn } from "@/lib/utils";



const quickActions = [

  { title: "Member Profile", href: "/business-info", icon: Users },

  { title: "Links & Passwords", href: "/resources", icon: Database },

  { title: "Solution Range", href: "/solution-range", icon: Sparkles },

  { title: "All Tasks", href: "/tasks", icon: ClipboardList },

  { title: "Google Drive — New Member", href: "/loa-upload", icon: FolderPlus },

  { title: "New Member LOA", href: "/new-client-loa", icon: UserPlus },

  { title: "Document Generation", href: "/document-generation", icon: FileCheck },

  { title: "Strategy & Proposals", href: "/initial-strategy-generator", icon: Target },

  { title: "Members", href: "/crm-members", icon: Users },

  { title: "Offers", href: "/offers", icon: ListTodo },

  { title: "CRM Dashboard", href: "/crm", icon: LayoutDashboard },

  { title: "Activity report", href: "/reports/activities", icon: FileText },

];



const demoLinks = [

  { title: "Base 1 Review", href: "/base-1", description: "Public utility bill review lead magnet" },

  { title: "Design system", href: "/design-system", description: "Phase 1 UI components showcase" },

  { title: "Workflows hub", href: "/workflows", description: "Full list of operational workflows" },

];



function getGreeting(): string {

  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";

  if (hour < 17) return "Good afternoon";

  return "Good evening";

}



function formatDate(): string {

  return new Date().toLocaleDateString("en-AU", {

    weekday: "long",

    month: "long",

    day: "numeric",

  });

}



export default function Home() {

  const { data: session } = useSession();

  const token = (session as { id_token?: string; accessToken?: string })?.id_token ?? (session as { id_token?: string; accessToken?: string })?.accessToken;

  const [loading, setLoading] = useState(true);

  const [dashboardData, setDashboardData] = useState<HomeDashboardData | null>(null);



  useEffect(() => {

    if (!token) {

      setLoading(false);

      return;

    }



    const loadDashboard = async () => {

      try {

        setLoading(true);

        const base = getApiBaseUrl();

        const data = await fetchHomeDashboardData(base, token);

        setDashboardData(data);

      } catch {

        setDashboardData(null);

      } finally {

        setLoading(false);

      }

    };



    void loadDashboard();

  }, [token]);



  const userName = (session?.user as { name?: string })?.name || session?.user?.email?.split("@")[0] || "there";



  return (

    <div className="space-y-6">

      {/* Compact hero */}

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div className="flex min-w-0 flex-wrap items-center gap-2">

          <h1 className="text-lg font-bold tracking-tight text-dark dark:text-white sm:text-xl">

            {getGreeting()}, {userName}

            <span className="font-normal text-gray-400 dark:text-gray-500"> · </span>

            <span className="font-normal text-gray-600 dark:text-gray-400">{formatDate()}</span>

          </h1>

          {!loading && dashboardData && dashboardData.openTasks.overdue > 0 && dashboardData.overdueTask && (

            <Link

              href="/tasks"

              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-semantic-flag/30 bg-semantic-flag/10 px-2.5 py-1 text-[11px] font-semibold text-semantic-flag transition-colors hover:bg-semantic-flag/15"

            >

              <span className="truncate">

                {dashboardData.openTasks.overdue} task{dashboardData.openTasks.overdue !== 1 ? "s" : ""} overdue · {dashboardData.overdueTask.title}

              </span>

            </Link>

          )}

        </div>

        <Link href="/workflows">

          <Button variant="secondary" size="sm" leftIcon={<Leaf className="size-3.5" />}>

            All workflows

          </Button>

        </Link>

      </div>



      {loading && (

        <div className="space-y-4">

          <Skeleton className="h-24 w-full rounded-2xl" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

            <Skeleton className="h-24 rounded-2xl" />

            <Skeleton className="h-24 rounded-2xl" />

            <Skeleton className="h-24 rounded-2xl" />

            <Skeleton className="h-24 rounded-2xl" />

            <Skeleton className="h-24 rounded-2xl" />

          </div>

          <Skeleton className="h-72 w-full rounded-2xl" />

        </div>

      )}



      {/* KPI row */}

      {!loading && dashboardData && (

        <section className="pg-fade-up">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

            <StatCard

              className="pg-fade-up pg-stagger-1"

              label="New Leads"

              value={dashboardData.newLeads.value}

              trendLabel={dashboardData.newLeads.trend?.label}

              trendVariant={dashboardData.newLeads.trend?.direction}

              sparkline={dashboardData.newLeads.sparkline}

              detailTooltip="Base 1 prospects not yet in CRM"

              icon={<UserPlus />}

              href="/base-1#pipeline"

            />

            <StatCard

              className="pg-fade-up pg-stagger-2"

              label="Open Tasks"

              value={dashboardData.openTasks.value}

              trendLabel={dashboardData.openTasks.trend?.label}

              trendVariant={dashboardData.openTasks.trend?.direction}

              sparkline={dashboardData.openTasks.sparkline}

              detailTooltip={

                dashboardData.openTasks.overdue > 0

                  ? `${dashboardData.openTasks.overdue} overdue`

                  : undefined

              }

              icon={<ClipboardList />}

              href="/tasks"

            />

            <StatCard

              className="pg-fade-up pg-stagger-3"

              label="Offers"

              value={dashboardData.offers.value}

              trendLabel={dashboardData.offers.trend?.label}

              trendVariant={dashboardData.offers.trend?.direction}

              sparkline={dashboardData.offers.sparkline}

              icon={<ListTodo />}

              href="/offers"

            />

            <StatCard

              className="pg-fade-up pg-stagger-4"

              label="Activities (12 wk)"

              value={dashboardData.activities.value}

              trendLabel={dashboardData.activities.trend?.label}

              trendVariant={dashboardData.activities.trend?.direction}

              sparkline={dashboardData.activities.sparkline}

              detailTooltip="Offer activities in the last 12 weeks"

              icon={<FileText />}

              href="/reports/activities"

            />

            <StatCard

              className="pg-fade-up pg-stagger-5"

              label="Members"

              value={dashboardData.members.value}

              detailTooltip="Total CRM members"

              icon={<Users />}

              href="/crm-members"

            />

          </div>

        </section>

      )}



      {/* Activity chart + Base 1 conversion funnel */}

      {!loading && dashboardData && (

        <section className="pg-fade-up pg-stagger-5 grid gap-4 lg:grid-cols-3">

          <div className="lg:col-span-2">

            <ActivityOverTimeChart data={dashboardData.activityWeekly} />

          </div>

          <Base1ConversionFunnelCard funnel={dashboardData.base1Funnel} />

        </section>

      )}



      {/* Quick actions grid */}

      <section className="pg-fade-up pg-stagger-6">

        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">

          Quick actions

        </h2>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">

          {quickActions.map((action) => {

            const Icon = action.icon;

            return (

              <Link

                key={action.href + action.title}

                href={action.href}

                className={cn(

                  "group flex flex-col items-center gap-2 rounded-2xl border border-stroke bg-white px-3 py-4 text-center shadow-sm transition-all duration-300",

                  "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",

                  "dark:border-dark-3 dark:bg-gray-dark",

                )}

              >

                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">

                  <Icon className="size-4" />

                </span>

                <span className="text-xs font-semibold leading-tight text-dark dark:text-white">

                  {action.title}

                </span>

              </Link>

            );

          })}

        </div>

      </section>



      {/* Demo / training fold */}

      <DemoFold

        title="Demo & reference pages"

        description="Training scenarios and internal reference — not primary workflows."

      >

        <div className="grid gap-2 sm:grid-cols-3">

          {demoLinks.map((link) => (

            <Link

              key={link.href}

              href={link.href}

              className="rounded-xl border border-stroke bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-brand-disclosure/40 hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"

            >

              <p className="text-sm font-semibold text-dark dark:text-white">{link.title}</p>

              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{link.description}</p>

            </Link>

          ))}

        </div>

      </DemoFold>

    </div>

  );

}

