import {
  memberJob,
  memberTabHref,
  parseMemberId,
  resolvePage,
  type MemberJob,
} from "../catalog";
import type { ToolResponse } from "./types";
import {
  runAutonomousQueueTool,
  runCrmSummaryTool,
  runMyTasksTool,
  runSearchClientsTool,
  runTasksForMemberTool,
  runUnsignedPipelineTool,
} from "./crmTasksTools";

export type { ToolResponse } from "./types";

export interface ToolContext {
  authToken: string | null;
  currentPath?: string;
  history?: { role: string; content: string }[];
  requestHost?: string;
}

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate",
      description:
        "Look up a dashboard page or a tab on the open member record. Use for where-to-go and how-to questions. path must be an exact catalog path or exact page title. For work on a specific member (documents, site photos, utilities, offers, savings, solutions, climate), set member_tab.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Exact catalog path, such as /unsigned-pipeline, or the exact page title.",
          },
          member_tab: {
            type: "string",
            enum: ["overview", "documents", "offers", "activity", "utilities", "savings", "solutions", "climate"],
            description: "Tab on the member record. Use with path /crm-members when the job is about the open member.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_members",
      description: "Search members and offers by business name or identifier.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Business name or identifier to search." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "my_tasks",
      description: "Tasks assigned to the signed-in user, including overdue and due today.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "tasks_for_member",
      description:
        "Tasks for one member. Pass member_id when the user says this member and a member record is open. Otherwise pass the business name as query.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Business name. Omit when member_id is known." },
          member_id: { type: "number", description: "Member id from the current page." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pipeline_summary",
      description:
        "CRM member-stage counts and task totals. This is the CRM pipeline, not the unsigned utility pipeline.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "unsigned_pipeline_summary",
      description:
        "Counts of unsigned utility sites. Pass the utility the user named. Use all only when they ask for every utility.",
      parameters: {
        type: "object",
        properties: {
          utility: {
            type: "string",
            enum: ["gas", "electricity", "waste", "oil", "water", "cleaning", "all"],
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "autonomous_queue_summary",
      description: "Counts of autonomous sequence runs that are running or errored, plus drafts waiting for review.",
      parameters: { type: "object", properties: {} },
    },
  },
] as const;

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asMemberId(value: unknown): number | null {
  const id = typeof value === "number" ? value : Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function navigate(args: Record<string, unknown>, context: ToolContext): ToolResponse {
  const requested = asString(args.path);
  const tab = asString(args.member_tab);
  const job: MemberJob | null = tab ? memberJob(tab) : null;
  const entry = requested ? resolvePage(requested) : null;
  const memberId = parseMemberId(context.currentPath);
  const links: { label: string; href: string }[] = [];
  const lines: string[] = [];

  if (tab && !job) {
    lines.push(`Unknown member tab "${tab}". Use overview, documents, offers, activity, utilities, savings, solutions, or climate.`);
  }

  if (job) {
    if (memberId) {
      const href = memberTabHref(memberId, job.tab);
      lines.push(`**${job.label}** on this member: ${job.description}`);
      lines.push(`Open ${href}`);
      links.push({ label: job.label, href });
    } else {
      lines.push(`**${job.label}**: ${job.description}`);
      lines.push("Open the member first, then this tab.");
      links.push({ label: "Members", href: "/crm-members" });
      links.push({ label: "Member Profile", href: "/business-info" });
    }
  }

  if (entry && entry.path !== "/crm-members") {
    lines.push(`**${entry.title}** (${entry.path}): ${entry.description}`);
    links.push({ label: entry.title, href: entry.path });
  } else if (!job && entry) {
    lines.push(`**${entry.title}** (${entry.path}): ${entry.description}`);
    links.push({ label: entry.title, href: entry.path });
  }

  if (lines.length === 0) {
    return {
      message: `No catalog page matches "${requested}". Call navigate again with an exact path from the catalog.`,
    };
  }

  return {
    message: lines.join("\n"),
    suggestedPage: links[0]?.href,
    suggestedLinks: links,
  };
}

export async function executeTool(
  name: string,
  rawArgs: unknown,
  context: ToolContext
): Promise<ToolResponse> {
  const args = asRecord(rawArgs);
  const { authToken, requestHost, currentPath } = context;

  switch (name) {
    case "navigate":
      return navigate(args, context);
    case "search_members": {
      const query = asString(args.query).trim();
      if (!query) return { message: "Pass a business name or identifier to search." };
      return (await runSearchClientsTool(query, authToken, requestHost)) ?? {
        message: "Search returned nothing.",
        suggestedLinks: [{ label: "Members", href: "/crm-members" }],
      };
    }
    case "my_tasks":
      return (await runMyTasksTool(authToken, requestHost)) ?? {
        message: "No task data returned.",
        suggestedLinks: [{ label: "Tasks", href: "/tasks" }],
      };
    case "tasks_for_member": {
      const explicitId = asMemberId(args.member_id);
      const query = asString(args.query);
      const generic = /^(this|the|current) member$/.test(query.trim().toLowerCase());
      const memberId = explicitId ?? (generic || !query.trim() ? parseMemberId(currentPath) : null);
      return runTasksForMemberTool(generic ? "" : query, memberId, authToken, requestHost);
    }
    case "pipeline_summary":
      return (await runCrmSummaryTool(authToken, requestHost)) ?? {
        message: "No pipeline data returned.",
        suggestedLinks: [{ label: "Dashboard", href: "/crm" }],
      };
    case "unsigned_pipeline_summary":
      return runUnsignedPipelineTool(asString(args.utility), authToken, requestHost);
    case "autonomous_queue_summary":
      return runAutonomousQueueTool(authToken, requestHost);
    default:
      return { message: `Unknown tool ${name}.` };
  }
}
