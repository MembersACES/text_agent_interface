import type { ToolResponse } from "./types";
import {
  searchClients,
  getMyTasks,
  getTasksSummary,
  getClientTasks,
  getPipelineSummary,
} from "./backendClient";

const UNAUTH_MESSAGE =
  "🔒 Sign in to use CRM and task features. Once signed in, you can search clients, view your tasks, and see pipeline summaries.";

function formatStage(s: string): string {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function runSearchClientsTool(
  query: string,
  authToken: string | null,
  requestHost?: string
): Promise<ToolResponse | null> {
  if (!authToken) {
    return { message: UNAUTH_MESSAGE };
  }
  const trimmed = query.trim();
  if (!trimmed) return null;
  const { data, error } = await searchClients(trimmed, authToken, 10, requestHost);
  if (error) {
    return {
      message: error === "Unauthorized" ? UNAUTH_MESSAGE : `⚠️ Search failed: ${error}`,
    };
  }
  if (!data) return null;
  const { clients, offers } = data;
  const links: { label: string; href: string }[] = [];
  if (clients.length === 0 && offers.length === 0) {
    return {
      message: `No clients or offers found for "${trimmed}". Try a different search term.`,
      suggestedLinks: [{ label: "CRM Members", href: "/crm-members" }],
    };
  }
  const lines: string[] = [];
  if (clients.length > 0) {
    lines.push("**Clients:**");
    for (const c of clients.slice(0, 5)) {
      lines.push(`• ${c.business_name}${c.stage ? ` — ${formatStage(c.stage)}` : ""}`);
      links.push({ label: c.business_name, href: `/crm-members/${c.id}` });
    }
  }
  if (offers.length > 0) {
    lines.push("**Offers:**");
    for (const o of offers.slice(0, 5)) {
      const label = (o.business_name || "Offer") + (o.identifier ? ` (${o.identifier})` : "");
      lines.push(`• ${label}${o.status ? ` — ${formatStage(o.status)}` : ""}`);
      links.push({ label, href: `/offers/${o.id}` });
    }
  }
  return {
    message: lines.join("\n"),
    suggestedLinks: links.length > 0 ? links : undefined,
    suggestedPage: clients.length > 0 ? `/crm-members/${clients[0].id}` : undefined,
  };
}

export async function runMyTasksTool(
  authToken: string | null,
  requestHost?: string
): Promise<ToolResponse | null> {
  if (!authToken) {
    return { message: UNAUTH_MESSAGE, suggestedPage: "/tasks" };
  }
  const [tasksRes, summaryRes] = await Promise.all([
    getMyTasks(authToken, requestHost),
    getTasksSummary(authToken, requestHost),
  ]);
  if (tasksRes.error && tasksRes.error === "Unauthorized") {
    return { message: UNAUTH_MESSAGE, suggestedPage: "/tasks" };
  }
  const tasks = tasksRes.data ?? [];
  const summary = summaryRes.data;
  const lines: string[] = [];
  if (summary) {
    if (summary.overdue > 0) lines.push(`⚠️ **${summary.overdue}** overdue`);
    if (summary.due_today > 0) lines.push(`📅 **${summary.due_today}** due today`);
    lines.push(`**${tasks.length}** tasks assigned to you.`);
  } else {
    lines.push(`**${tasks.length}** tasks assigned to you.`);
  }
  if (tasks.length > 0) {
    lines.push("");
    for (const t of tasks.slice(0, 5)) {
      const due = t.due_date ? ` (due ${t.due_date.split("T")[0]})` : "";
      lines.push(`• ${t.title} — ${formatStage(t.status)}${due}`);
    }
  }
  return {
    message: lines.join("\n"),
    suggestedPage: "/tasks",
    suggestedLinks: [{ label: "My Tasks", href: "/tasks" }],
  };
}

export async function runTasksForClientTool(
  clientNameOrQuery: string,
  authToken: string | null,
  requestHost?: string
): Promise<ToolResponse | null> {
  if (!authToken) {
    return { message: UNAUTH_MESSAGE };
  }
  const trimmed = clientNameOrQuery.trim();
  if (!trimmed) return null;
  const { data: searchData, error: searchErr } = await searchClients(
    trimmed,
    authToken,
    5,
    requestHost
  );
  if (searchErr || !searchData) {
    return {
      message: searchErr === "Unauthorized" ? UNAUTH_MESSAGE : `⚠️ Could not search: ${searchErr || "No results"}.`,
    };
  }
  const clients = searchData.clients;
  if (clients.length === 0) {
    return {
      message: `No client found for "${trimmed}". Try searching in CRM Members.`,
      suggestedLinks: [{ label: "CRM Members", href: "/crm-members" }],
    };
  }
  const client = clients[0];
  const { data: tasks, error: tasksErr } = await getClientTasks(client.id, authToken, requestHost);
  if (tasksErr) {
    return {
      message: `Found **${client.business_name}** but could not load tasks: ${tasksErr}.`,
      suggestedLinks: [{ label: client.business_name, href: `/crm-members/${client.id}` }],
    };
  }
  const taskList = tasks ?? [];
  const lines: string[] = [`Tasks for **${client.business_name}** (${taskList.length}):`];
  if (taskList.length === 0) {
    lines.push("No tasks for this client.");
  } else {
    for (const t of taskList.slice(0, 8)) {
      const due = t.due_date ? ` (due ${t.due_date.split("T")[0]})` : "";
      lines.push(`• ${t.title} — ${formatStage(t.status)}${due}`);
    }
  }
  const suggestedLinks: { label: string; href: string }[] = [
    { label: client.business_name, href: `/crm-members/${client.id}` },
  ];
  return {
    message: lines.join("\n"),
    suggestedPage: `/crm-members/${client.id}`,
    suggestedLinks,
  };
}

export async function runCrmSummaryTool(
  authToken: string | null,
  requestHost?: string
): Promise<ToolResponse | null> {
  if (!authToken) {
    return {
      message: UNAUTH_MESSAGE,
      suggestedLinks: [
        { label: "CRM Dashboard", href: "/crm" },
        { label: "Tasks", href: "/tasks" },
      ],
    };
  }
  const [pipelineRes, tasksRes] = await Promise.all([
    getPipelineSummary(authToken, requestHost),
    getTasksSummary(authToken, requestHost),
  ]);
  if (pipelineRes.error && pipelineRes.error === "Unauthorized") {
    return {
      message: UNAUTH_MESSAGE,
      suggestedLinks: [
        { label: "CRM Dashboard", href: "/crm" },
        { label: "Tasks", href: "/tasks" },
      ],
    };
  }
  const pipeline = pipelineRes.data;
  const tasksSummary = tasksRes.data;
  const lines: string[] = [];
  if (pipeline) {
    lines.push("**Pipeline:**");
    lines.push(`Total clients: **${pipeline.total_clients}**`);
    const withCount = pipeline.by_stage.filter((s) => s.count > 0);
    if (withCount.length > 0) {
      for (const s of withCount) {
        lines.push(`• ${formatStage(s.stage)}: ${s.count}`);
      }
    }
    if (pipeline.won_count > 0 || pipeline.lost_count > 0) {
      lines.push(`Won: ${pipeline.won_count}, Lost: ${pipeline.lost_count}`);
    }
  }
  if (tasksSummary) {
    lines.push("");
    lines.push("**Tasks:**");
    lines.push(`Total: ${tasksSummary.total_tasks}`);
    if (tasksSummary.overdue > 0) lines.push(`Overdue: ${tasksSummary.overdue}`);
    if (tasksSummary.due_today > 0) lines.push(`Due today: ${tasksSummary.due_today}`);
  }
  return {
    message: lines.length > 0 ? lines.join("\n") : "No pipeline or task summary available.",
    suggestedLinks: [
      { label: "CRM Dashboard", href: "/crm" },
      { label: "Tasks", href: "/tasks" },
    ],
  };
}
