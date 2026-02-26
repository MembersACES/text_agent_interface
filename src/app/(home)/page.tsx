"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardList, 
  FileText, 
  Users, 
  Database, 
  ArrowRight,
  Clock,
  UserPlus,
  Target,
  FileCheck,
  Sparkles,
  FolderPlus,
  AlertCircle,
  LayoutDashboard,
  ListTodo
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  status: string;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
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

const navigationCards = [
  // Row 1: Core tools
  {
    title: "Member Profile",
    description: "View and manage the member's information",
    href: "/business-info",
    icon: Users,
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Key Resources",
    description: "Access important links and credentials",
    href: "/resources",
    icon: Database,
    color: "from-cyan-500 to-blue-600",
  },
  {
    title: "Solution Range",
    description: "Browse available solutions and services",
    href: "/solution-range",
    icon: Sparkles,
    color: "from-pink-500 to-rose-600",
  },
  {
    title: "All Tasks",
    description: "Track and manage your tasks",
    href: "/tasks",
    icon: ClipboardList,
    color: "from-violet-500 to-purple-600",
  },
  // Row 2: Workflows
  {
    title: "Google Drive - New Member",
    description: "Create folder structure and file LOA",
    href: "/loa-upload",
    icon: FolderPlus,
    color: "from-green-500 to-emerald-600",
  },
  {
    title: "New Member LOA",
    description: "Generate new LOA and/or SFA documents",
    href: "/new-client-loa",
    icon: UserPlus,
    color: "from-purple-500 to-pink-600",
  },
  {
    title: "Document Generation",
    description: "Create and manage member documents",
    href: "/document-generation",
    icon: FileCheck,
    color: "from-orange-500 to-amber-600",
  },
  {
    title: "Strategy & Proposals",
    description: "Generate strategies and pitch decks",
    href: "/initial-strategy-generator",
    icon: Target,
    color: "from-indigo-500 to-purple-600",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  return now.toLocaleDateString("en-US", options);
}

function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPriorityFromDueDate(dueDate: string): "High" | "Medium" | "Low" {
  const due = new Date(dueDate);
  const now = new Date();
  const diffInDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 0) return "High";
  if (diffInDays <= 1) return "High";
  if (diffInDays <= 7) return "Medium";
  return "Low";
}

function getDueDateLabel(dueDate: string): string {
  const due = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffInDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 0) return "Overdue";
  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Tomorrow";
  if (diffInDays <= 7) return `${diffInDays}d`;
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Home() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(formatTime());
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [tasksSummary, setTasksSummary] = useState<TasksSummary | null>(null);
  const [offersSummary, setOffersSummary] = useState<OffersSummary | null>(null);
  const [activitiesSummary, setActivitiesSummary] = useState<ActivitiesSummary | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchTasksAndMetrics = async () => {
      try {
        setLoading(true);
        
        const base = getApiBaseUrl();

        const response = await fetch(`${base}/api/tasks/my`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          setTasks([]);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }

        const data = await response.json();
        const tasksList = Array.isArray(data) ? data : [];
        setTasks(tasksList);

        // Fetch lightweight CRM summaries in parallel
        try {
          const [pipelineRes, tasksRes, offersRes, activitiesRes] = await Promise.all([
            fetch(`${base}/api/reports/pipeline/summary`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }),
            fetch(`${base}/api/reports/tasks/summary`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }),
            fetch(`${base}/api/reports/offers/summary`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }),
            fetch(`${base}/api/reports/activities/summary`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }),
          ]);

          if (pipelineRes.ok) {
            const ps: PipelineSummary = await pipelineRes.json();
            setPipelineSummary(ps);
          } else {
            setPipelineSummary(null);
          }

          if (tasksRes.ok) {
            const ts: TasksSummary = await tasksRes.json();
            setTasksSummary(ts);
          } else {
            setTasksSummary(null);
          }

          if (offersRes.ok) {
            const os: OffersSummary = await offersRes.json();
            setOffersSummary(os);
          } else {
            setOffersSummary(null);
          }

          if (activitiesRes.ok) {
            const as: ActivitiesSummary = await activitiesRes.json();
            setActivitiesSummary(as);
          } else {
            setActivitiesSummary(null);
          }
        } catch (err) {
          console.warn("Failed to load CRM summaries", err);
          setPipelineSummary(null);
          setTasksSummary(null);
          setOffersSummary(null);
          setActivitiesSummary(null);
        }
      } catch (err: any) {
        console.error("Error fetching tasks:", err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasksAndMetrics();
  }, [token]);

  const upcomingTasks = tasks
    .filter(t => 
      t.status.toLowerCase() !== "completed" && 
      t.status.toLowerCase() !== "cancelled"
    )
    .sort((a, b) => {
      const dateA = new Date(a.due_date || a.created_at).getTime();
      const dateB = new Date(b.due_date || b.created_at).getTime();
      return dateA - dateB;
    })
    .slice(0, 4);

  const userName = (session?.user as any)?.name || session?.user?.email?.split("@")[0] || "there";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-dark dark:via-dark-2 dark:to-dark">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Simple Greeting Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-dark dark:text-white mb-1">
              {getGreeting()}, {userName}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-3">
              <span>{formatDate()}</span>
              <span className="text-gray-400">•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {currentTime}
              </span>
            </p>
          </div>
        </div>

        {/* Compact Task Banner (if tasks exist) */}
        {!loading && upcomingTasks.length > 0 && (
          <Card className="mb-10 border-l-4 border-l-primary shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-dark dark:text-white">
                    You have {upcomingTasks.length} pending task{upcomingTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Link
                  href="/tasks"
                  className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {upcomingTasks.map((task) => {
                  const priority = getPriorityFromDueDate(task.due_date || task.created_at);
                  const dueLabel = getDueDateLabel(task.due_date || task.created_at);
                  
                  return (
                    <Link
                      key={task.id}
                      href="/tasks"
                      className="flex items-center gap-2 p-2 rounded border border-stroke dark:border-dark-3 hover:bg-white dark:hover:bg-dark-2 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-dark dark:text-white truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Due {dueLabel}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                          priority === "High"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : priority === "Medium"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {priority}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State for Tasks */}
        {loading && (
          <div className="mb-10">
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* CRM Snapshot */}
        {!loading && (pipelineSummary || tasksSummary || offersSummary || activitiesSummary) && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              CRM Snapshot
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {pipelineSummary && (
                <Link href="/pipeline">
                  <Card className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Pipeline
                      </p>
                      <p className="text-2xl font-bold text-dark dark:text-white">
                        {pipelineSummary.total_clients}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                          members
                        </span>
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
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Tasks
                      </p>
                      <p className="text-2xl font-bold text-dark dark:text-white">
                        {tasksSummary.total_tasks}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                          total
                        </span>
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
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Offers
                      </p>
                      <p className="text-2xl font-bold text-dark dark:text-white">
                        {offersSummary.total_offers}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                          total
                        </span>
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <span>Accepted: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{offersSummary.accepted}</span></span>
                        <span>Win rate: <span className="font-semibold">
                          {offersSummary.total_offers > 0
                            ? `${Math.round((offersSummary.win_rate || 0) * 100)}%`
                            : "—"}
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
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Offer activities
                      </p>
                      <p className="text-2xl font-bold text-dark dark:text-white">
                        {activitiesSummary.total}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                          total
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                        {Object.entries(activitiesSummary.by_type || {})
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([type, count]) => (
                            <span key={type}>
                              {type.replace(/_/g, " ")}: <span className="font-semibold">{count}</span>
                            </span>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          </div>
        )}
        {/* Jump to – tools and workflows in one grid */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Jump to
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Quick access to key tools and workflows. For the full list, use <Link href="/workflows" className="text-primary hover:underline font-medium">Workflows</Link>.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {navigationCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.title} href={card.href}>
                  <Card
                    hover
                    className="h-full transition-all duration-200 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 hover:border-primary/30"
                  >
                    <CardContent className="p-5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-dark dark:text-white mb-1.5 text-base">
                        {card.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {card.description}
                      </p>
                      <div className="flex items-center text-primary text-sm font-medium">
                        Open <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          
        {/* CRM Section - single entry point to all CRM pages */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            CRM
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Members, pipeline, offers, and activity report in one place.
          </p>
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
                      <h3 className="font-semibold text-dark dark:text-white mb-1.5 text-base">
                        {card.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {card.description}
                      </p>
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
        </div>
      </div>
    </div>
  );
}