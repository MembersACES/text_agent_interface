import type { ToolResponse } from "./types";
import { runHelpTool } from "./help";
import {
  runSearchClientsTool,
  runMyTasksTool,
  runTasksForClientTool,
  runCrmSummaryTool,
} from "./crmTasksTools";

export type { ToolResponse } from "./types";

export interface ToolContext {
  authToken: string | null;
  currentPath?: string;
  history?: { role: string; content: string }[];
  requestHost?: string;
}

export async function runTool(
  message: string,
  context: ToolContext
): Promise<ToolResponse | null> {
  const lower = message.toLowerCase().trim();
  const authToken = context.authToken;
  const requestHost = context.requestHost;

  // ---------- CRM / Tasks tools (keyword triggers) ----------
  if (
    lower.includes("my tasks") ||
    lower.includes("what's due") ||
    lower.includes("whats due") ||
    lower.includes("overdue tasks") ||
    lower === "tasks"
  ) {
    const out = await runMyTasksTool(authToken, requestHost);
    if (out) return out;
  }

  if (lower.includes("tasks for ")) {
    const after = message.slice(message.toLowerCase().indexOf("tasks for ") + "tasks for ".length).trim();
    const out = await runTasksForClientTool(after || message, authToken, requestHost);
    if (out) return out;
  }
  if (lower.includes("pending for ")) {
    const after = message.slice(message.toLowerCase().indexOf("pending for ") + "pending for ".length).trim();
    const out = await runTasksForClientTool(after || message, authToken, requestHost);
    if (out) return out;
  }

  if (
    lower.includes("crm summary") ||
    lower.includes("pipeline summary") ||
    (lower.includes("pipeline") && !lower.includes("document")) ||
    lower.includes("how many leads") ||
    lower.includes("crm dashboard")
  ) {
    const out = await runCrmSummaryTool(authToken, requestHost);
    if (out) return out;
  }

  if (
    lower.includes("find client") ||
    lower.includes("search client") ||
    lower.includes("who is ") ||
    lower.startsWith("open ") ||
    lower.includes("client named") ||
    lower.includes("look up ")
  ) {
    const query = message
      .replace(/\b(find client|search client|who is|open|client named|look up)\s*/gi, "")
      .trim() || message;
    const out = await runSearchClientsTool(query, authToken, requestHost);
    if (out) return out;
  }

  // ---------- Help / navigation tool triggers (existing) ----------
  if (
    lower.includes("help") ||
    lower.includes("explain") ||
    lower.includes("how do i") ||
    lower.includes("where do i") ||
    lower.includes("where can i") ||
    lower.includes("where is") ||
    lower.includes("how to") ||
    lower.includes("generate") ||
    lower.includes("create") ||
    lower.includes("make") ||
    lower.includes("solution") ||
    lower.includes("finance") ||
    lower.includes("robot") ||
    lower.includes("renewable") ||
    lower.includes("solar") ||
    lower.includes("waste") ||
    lower.includes("recycling") ||
    lower.includes("energy") ||
    lower.includes("ai bot") ||
    lower.includes("cleaning bot") ||
    lower.includes("voice agent") ||
    lower.includes("profile reset") ||
    lower.includes("asset") ||
    lower.includes("ghg") ||
    lower.includes("carbon") ||
    lower.includes("savings") ||
    lower.includes("invoice") ||
    lower.includes("first month") ||
    lower.includes("1st month")
  ) {
    return await runHelpTool(message);
  }

  return null;
}
