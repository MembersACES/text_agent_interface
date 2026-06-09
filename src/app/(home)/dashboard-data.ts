import type { StatTrendVariant } from "@/components/dashboard/stat-card";
export const SPARKLINE_WEEKS = 8;
export const CHART_WEEKS = 12;

export interface MetricTrend {
  label: string;
  direction: StatTrendVariant;
}

export interface DashboardKpi {
  value: number;
  trend: MetricTrend | null;
  sparkline: number[] | null;
}

export interface WeeklyBucket {
  label: string;
  count: number;
}

export interface Base1ConversionFunnel {
  activeLeads: number;
  converted: number;
  totalInBase1: number;
  conversionRatePercent: number | null;
}

export interface HomeDashboardData {
  members: DashboardKpi;
  openTasks: DashboardKpi & { overdue: number };
  offers: DashboardKpi;
  activities: DashboardKpi;
  newLeads: DashboardKpi;
  activityWeekly: WeeklyBucket[];
  base1Funnel: Base1ConversionFunnel;
  overdueTask: { title: string } | null;
}

interface Timestamped {
  created_at?: string | null;
}

interface TaskRow extends Timestamped {
  id: number;
  title: string;
  due_date?: string | null;
  status: string;
}

interface ClientRow extends Timestamped {
  id: number;
  business_name?: string | null;
  primary_contact_email?: string | null;
}

interface OfferRow extends Timestamped {
  id: number;
}

interface ActivityRow extends Timestamped {
  id: number;
}

interface Base1LeadRow {
  company_name: string;
  timestamp?: string | null;
}

interface LandingRow {
  "Company Name"?: string;
  "Contact Email"?: string;
  Timestamp?: string;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getWeekBuckets(weekCount: number): { start: Date; label: string }[] {
  const currentWeekStart = startOfWeek(new Date());
  const buckets: { start: Date; label: string }[] = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - i * 7);
    buckets.push({
      start,
      label: start.toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
    });
  }
  return buckets;
}

export function bucketWeeklyCounts(timestamps: string[], weekCount: number): number[] {
  const buckets = getWeekBuckets(weekCount);
  const counts = new Array(weekCount).fill(0);
  for (const ts of timestamps) {
    if (!ts) continue;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    const weekStart = startOfWeek(d).getTime();
    const idx = buckets.findIndex((b) => b.start.getTime() === weekStart);
    if (idx >= 0) counts[idx]++;
  }
  return counts;
}

function parseTimestamps(items: Timestamped[]): string[] {
  return items
    .map((item) => item.created_at)
    .filter((ts): ts is string => Boolean(ts));
}

function parseLeadTimestamps(leads: Base1LeadRow[]): string[] {
  return leads
    .map((lead) => lead.timestamp)
    .filter((ts): ts is string => Boolean(ts));
}

function hasReliableHistory(timestamps: string[], weekCount: number): boolean {
  if (timestamps.length === 0) return false;
  const buckets = getWeekBuckets(weekCount);
  const earliest = buckets[0]?.start;
  if (!earliest) return false;
  return timestamps.some((ts) => {
    const d = new Date(ts);
    return !Number.isNaN(d.getTime()) && d >= earliest;
  });
}

export function computeWeekOverWeekTrend(timestamps: string[]): MetricTrend | null {
  if (!hasReliableHistory(timestamps, 2)) return null;
  const counts = bucketWeeklyCounts(timestamps, SPARKLINE_WEEKS);
  const thisWeek = counts[counts.length - 1] ?? 0;
  const lastWeek = counts[counts.length - 2] ?? 0;
  const delta = thisWeek - lastWeek;
  if (delta > 0) return { label: `+${delta} this week`, direction: "up" };
  if (delta < 0) return { label: `${delta} this week`, direction: "down" };
  return { label: "No change this week", direction: "neutral" };
}

export function buildSparkline(timestamps: string[]): number[] | null {
  if (!hasReliableHistory(timestamps, SPARKLINE_WEEKS)) return null;
  return bucketWeeklyCounts(timestamps, SPARKLINE_WEEKS);
}

function parseListResponse<T>(data: unknown): { items: T[]; total: number } {
  if (Array.isArray(data)) {
    return { items: data as T[], total: data.length };
  }
  if (data && typeof data === "object" && "items" in data) {
    const obj = data as { items?: unknown; total?: number };
    const items = Array.isArray(obj.items) ? (obj.items as T[]) : [];
    const total = typeof obj.total === "number" ? obj.total : items.length;
    return { items, total };
  }
  return { items: [], total: 0 };
}

function isOpenTask(task: TaskRow): boolean {
  return !["completed", "cancelled"].includes(task.status.toLowerCase());
}

function isOverdueTask(task: TaskRow): boolean {
  if (!task.due_date) return false;
  const due = new Date(task.due_date);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today && isOpenTask(task);
}

/** Same matching rules as GET /api/base1-leads */
export function computeBase1Funnel(
  landingRows: LandingRow[],
  clients: ClientRow[],
): Base1ConversionFunnel {
  const existingNames = new Set(
    clients
      .map((c) => (c.business_name || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const existingEmails = new Set(
    clients
      .map((c) => (c.primary_contact_email || "").trim().toLowerCase())
      .filter(Boolean),
  );

  const groupedByCompany = new Map<string, LandingRow>();
  for (const row of landingRows) {
    const company = (row["Company Name"] || "").trim();
    if (!company) continue;
    const key = company.toLowerCase();
    const ts = row.Timestamp || "";
    const current = groupedByCompany.get(key);
    if (!current || ts > (current.Timestamp || "")) {
      groupedByCompany.set(key, row);
    }
  }

  let converted = 0;
  for (const row of groupedByCompany.values()) {
    const company = (row["Company Name"] || "").trim().toLowerCase();
    const email = (row["Contact Email"] || "").trim().toLowerCase();
    if (existingNames.has(company) || (email && existingEmails.has(email))) {
      converted++;
    }
  }

  const totalInBase1 = groupedByCompany.size;
  const activeLeads = totalInBase1 - converted;
  const conversionRatePercent =
    totalInBase1 > 0 ? (converted / totalInBase1) * 100 : null;

  return {
    activeLeads,
    converted,
    totalInBase1,
    conversionRatePercent,
  };
}

export async function fetchHomeDashboardData(
  base: string,
  token: string,
): Promise<HomeDashboardData | null> {
  const chartAfter = new Date();
  chartAfter.setDate(chartAfter.getDate() - CHART_WEEKS * 7);
  const chartAfterStr = isoDate(chartAfter);

  const [
    clientsRes,
    offersRes,
    tasksRes,
    activitiesRes,
    base1LeadsRes,
    base1LandingRes,
  ] = await Promise.all([
    fetch(`${base}/api/clients?limit=5000`, { headers: authHeaders(token) }),
    fetch(`${base}/api/offers?limit=5000`, { headers: authHeaders(token) }),
    fetch(`${base}/api/tasks/my`, { headers: authHeaders(token) }),
    fetch(
      `${base}/api/reports/activities/list?limit=500&created_after=${chartAfterStr}`,
      { headers: authHeaders(token) },
    ),
    fetch(`${base}/api/base1-leads`, { headers: authHeaders(token) }),
    fetch(`${base}/api/base1-landing-responses`, { headers: authHeaders(token) }),
  ]);

  if (!clientsRes.ok && !offersRes.ok && !tasksRes.ok && !activitiesRes.ok) {
    return null;
  }

  const clientsData = clientsRes.ok ? await clientsRes.json() : null;
  const offersData = offersRes.ok ? await offersRes.json() : null;
  const tasksData = tasksRes.ok ? await tasksRes.json() : [];
  const activitiesData = activitiesRes.ok ? await activitiesRes.json() : [];

  const { items: clients, total: memberTotal } = parseListResponse<ClientRow>(clientsData);
  const { items: offers, total: offerTotal } = parseListResponse<OfferRow>(offersData);
  const offersComplete = offerTotal <= offers.length;

  const base1LeadsData = base1LeadsRes.ok ? await base1LeadsRes.json() : null;
  const base1Leads: Base1LeadRow[] = Array.isArray(base1LeadsData?.rows)
    ? base1LeadsData.rows.filter(
        (row: Base1LeadRow) => (row.company_name || "").trim().length > 0,
      )
    : [];
  const leadTimestamps = parseLeadTimestamps(base1Leads);

  const landingData = base1LandingRes.ok ? await base1LandingRes.json() : null;
  const landingRows: LandingRow[] = Array.isArray(landingData?.rows)
    ? landingData.rows
    : [];
  const base1Funnel = computeBase1Funnel(landingRows, clients);

  const tasks: TaskRow[] = Array.isArray(tasksData) ? tasksData : [];
  const activities: ActivityRow[] = Array.isArray(activitiesData) ? activitiesData : [];

  const openTasks = tasks.filter(isOpenTask);
  const overdueTasks = openTasks.filter(isOverdueTask);
  const overdueTask = overdueTasks.sort(
    (a, b) =>
      new Date(a.due_date || a.created_at || 0).getTime() -
      new Date(b.due_date || b.created_at || 0).getTime(),
  )[0];

  const offerTimestamps = parseTimestamps(offers);
  const taskTimestamps = parseTimestamps(openTasks);
  const activityTimestamps = parseTimestamps(activities);

  const activityWeeklyCounts = bucketWeeklyCounts(activityTimestamps, CHART_WEEKS);
  const activityWeekly = getWeekBuckets(CHART_WEEKS).map((b, i) => ({
    label: b.label,
    count: activityWeeklyCounts[i] ?? 0,
  }));

  const tasksTrend: MetricTrend | null =
    overdueTasks.length > 0
      ? {
          label: `${overdueTasks.length} overdue`,
          direction: "warn",
        }
      : openTasks.length > 0
        ? { label: "All on track", direction: "up" }
        : null;

  return {
    members: {
      value: memberTotal,
      trend: null,
      sparkline: null,
    },
    openTasks: {
      value: openTasks.length,
      overdue: overdueTasks.length,
      trend: tasksTrend,
      sparkline: buildSparkline(taskTimestamps),
    },
    offers: {
      value: offerTotal,
      trend: offersComplete ? computeWeekOverWeekTrend(offerTimestamps) : null,
      sparkline: offersComplete ? buildSparkline(offerTimestamps) : null,
    },
    activities: {
      value: activities.length,
      trend: computeWeekOverWeekTrend(activityTimestamps),
      sparkline: buildSparkline(activityTimestamps),
    },
    newLeads: {
      value: base1Funnel.activeLeads,
      trend: computeWeekOverWeekTrend(leadTimestamps),
      sparkline: buildSparkline(leadTimestamps),
    },
    activityWeekly,
    base1Funnel,
    overdueTask: overdueTask ? { title: overdueTask.title } : null,
  };
}
