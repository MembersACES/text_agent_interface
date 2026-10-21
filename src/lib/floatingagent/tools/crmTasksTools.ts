import type { ToolResponse } from "./types";
import {
  searchClients,
  getMyTasks,
  getTasksSummary,
  getClientTasks,
  getClientName,
  getPipelineSummary,
  getUnsignedPipelineSummary,
  getAutonomousQueueSummary,
  type UnsignedUtility,
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
      message: `No members or offers found for "${trimmed}". Try a different search term.`,
      suggestedLinks: [{ label: "Members", href: "/crm-members" }],
    };
  }
  const lines: string[] = [];
  if (clients.length > 0) {
    lines.push("**Members:**");
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

export async function runTasksForMemberTool(
  query: string,
  memberId: number | null,
  authToken: string | null,
  requestHost?: string
): Promise<ToolResponse> {
  if (!authToken) {
    return { message: UNAUTH_MESSAGE };
  }

  let clientId = memberId;
  let businessName: string | null = null;

  if (clientId) {
    businessName = await getClientName(clientId, authToken, requestHost);
  } else {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        message: "Name the member, or ask while their record is open.",
        suggestedLinks: [{ label: "Members", href: "/crm-members" }],
      };
    }
    const { data: searchData, error: searchErr } = await searchClients(
      trimmed,
      authToken,
      5,
      requestHost
    );
    if (searchErr || !searchData) {
      return {
        message: searchErr === "Unauthorized" ? UNAUTH_MESSAGE : `Search failed: ${searchErr || "No results"}.`,
      };
    }
    const client = searchData.clients[0];
    if (!client) {
      return {
        message: `No member found for "${trimmed}".`,
        suggestedLinks: [{ label: "Members", href: "/crm-members" }],
      };
    }
    clientId = client.id;
    businessName = client.business_name;
  }

  const { data: tasks, error: tasksErr } = await getClientTasks(clientId, authToken, requestHost);
  const label = businessName ?? "This member";
  const href = `/crm-members/${clientId}`;
  if (tasksErr) {
    return {
      message: tasksErr === "Unauthorized" ? UNAUTH_MESSAGE : `Found **${label}** but could not load tasks: ${tasksErr}.`,
      suggestedLinks: [{ label, href }],
    };
  }
  const taskList = tasks ?? [];
  const lines: string[] = [`Tasks for **${label}** (${taskList.length}):`];
  if (taskList.length === 0) {
    lines.push("No tasks for this member.");
  } else {
    for (const t of taskList.slice(0, 8)) {
      const due = t.due_date ? ` (due ${t.due_date.split("T")[0]})` : "";
      lines.push(`• ${t.title} — ${formatStage(t.status)}${due}`);
    }
  }
  return {
    message: lines.join("\n"),
    suggestedPage: href,
    suggestedLinks: [{ label, href }],
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
        { label: "Dashboard", href: "/crm" },
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
        { label: "Dashboard", href: "/crm" },
        { label: "Tasks", href: "/tasks" },
      ],
    };
  }
  const pipeline = pipelineRes.data;
  const tasksSummary = tasksRes.data;
  const lines: string[] = [];
  if (pipeline) {
    lines.push("**Pipeline:**");
    lines.push(`Total members: **${pipeline.total_clients}**`);
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
      { label: "Dashboard", href: "/crm" },
      { label: "Tasks", href: "/tasks" },
    ],
  };
}

const UNSIGNED_UTILITIES: UnsignedUtility[] = [
  "gas",
  "electricity",
  "waste",
  "oil",
  "water",
  "cleaning",
  "all",
];

export function parseUnsignedUtility(raw: string | undefined): UnsignedUtility {
  const value = (raw ?? "all").trim().toLowerCase();
  if (!value || value === "all" || value === "every" || value === "everything") return "all";
  if (value.includes("elec")) return "electricity";
  if (value.includes("gas")) return "gas";
  if (value.includes("waste")) return "waste";
  if (value.includes("oil")) return "oil";
  if (value.includes("water")) return "water";
  if (value.includes("clean")) return "cleaning";
  if (UNSIGNED_UTILITIES.includes(value as UnsignedUtility)) return value as UnsignedUtility;
  return "all";
}

export async function runUnsignedPipelineTool(
  utilityRaw: string | undefined,
  authToken: string | null,
  requestHost?: string
): Promise<ToolResponse> {
  if (!authToken) {
    return {
      message: UNAUTH_MESSAGE,
      suggestedLinks: [{ label: "Unsigned pipeline", href: "/unsigned-pipeline" }],
    };
  }
  const utility = parseUnsignedUtility(utilityRaw);
  const { data, error } = await getUnsignedPipelineSummary(utility, authToken, requestHost);
  if (error || !data) {
    return {
      message: error === "Unauthorized" ? UNAUTH_MESSAGE : `Could not load the unsigned pipeline: ${(error || "no data").slice(0, 240)}.`,
      suggestedLinks: [{ label: "Unsigned pipeline", href: "/unsigned-pipeline" }],
    };
  }
  const lines = [
    `Unsigned **${utility}** sites: **${data.site_count}**`,
    `Quoteable: ${data.quoteable_site_count}. Thin history: ${data.thin_site_count}.`,
    `Invoices: ${data.invoice_count}. PDFs: ${data.pdf_count}. Missing PDFs: ${data.missing_pdf_sites}.`,
  ];
  if (data.summary) lines.push(data.summary.slice(0, 400));
  return {
    message: lines.join("\n"),
    suggestedPage: "/unsigned-pipeline",
    suggestedLinks: [{ label: "Unsigned pipeline", href: "/unsigned-pipeline" }],
  };
}

const QUEUE_LABELS: Record<string, string> = {
  running: "Running",
  errored: "Errored",
};

export async function runAutonomousQueueTool(
  authToken: string | null,
  requestHost?: string
): Promise<ToolResponse> {
  const links = [
    { label: "Queue", href: "/autonomous-agent" },
    { label: "Campaigns", href: "/autonomous-agent/campaigns" },
  ];
  if (!authToken) {
    return { message: UNAUTH_MESSAGE, suggestedLinks: links };
  }
  const { data, error } = await getAutonomousQueueSummary(authToken, requestHost);
  if (error || !data) {
    return {
      message: error === "Unauthorized" ? UNAUTH_MESSAGE : `Could not load the autonomous queue: ${error || "no data"}.`,
      suggestedLinks: links,
    };
  }
  const ack = data.find((slice) => slice.group === "running")?.ack_draft_pending_count ?? 0;
  const lines = data.map((slice) => {
    const label = QUEUE_LABELS[slice.group] ?? slice.group;
    const names = slice.names.length > 0 ? ` — ${slice.names.join(", ")}` : "";
    return `• ${label}: **${slice.total}**${names}`;
  });
  if (ack > 0) lines.push(`Drafts to review: **${ack}**`);
  return {
    message: lines.join("\n"),
    suggestedPage: "/autonomous-agent",
    suggestedLinks: links,
  };
}
