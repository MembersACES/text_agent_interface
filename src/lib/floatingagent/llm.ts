import { catalogForPrompt } from "./catalog";
import { AGENT_TOOLS, executeTool, type ToolContext } from "./tools";
import type { ToolResponse } from "./tools/types";

export interface ChatLLMContext {
  currentPath?: string;
  history?: { role: string; content: string }[];
  toolContext?: { authToken: string | null; requestHost?: string } | null;
}

export interface AgentReply {
  text: string;
  suggestedPage?: string | null;
  suggestedLinks?: { label: string; href: string }[] | null;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface ModelMessage {
  role: string;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

const SYSTEM_PROMPT =
  "You are the Carbon Zero Assistant inside the Carbon Zero Australasia dashboard. " +
  "You help staff find members, tasks, the CRM pipeline, the unsigned utility pipeline, the autonomous queue, and the right page.\n\n" +
  "Rules:\n" +
  "- Call a tool before you answer questions about where to go, how to do a job in the app, members, tasks, pipeline, unsigned sites, or the autonomous queue.\n" +
  "- Never invent a path. navigate path must be an exact catalog path or exact page title.\n" +
  "- Member-specific jobs (documents, site photos, additional uploads, utilities, offers, savings, testimonials, solutions, strategy, climate) use navigate with member_tab. If the user is on /crm-members/{id}, the tool attaches that member.\n" +
  "- CRM pipeline (pipeline_summary) is member stages. Unsigned utility sites use unsigned_pipeline_summary. Do not mix them.\n" +
  "- Say member, not client, in the reply.\n" +
  "- You only look up and direct. Do not claim you changed, uploaded, generated, or sent anything.\n" +
  "- Keep the reply to a few sentences. The screen adds link buttons from the tool result, so name the page and do not paste a long URL list.\n" +
  "- If a tool returns an error or a sign-in prompt, say that plainly.\n\n";

function systemContent(currentPath?: string): string {
  const where = currentPath ? `\nCurrent page: ${currentPath}\n` : "\n";
  return `${SYSTEM_PROMPT}${where}\n${catalogForPrompt()}`;
}

function collectLinks(responses: ToolResponse[]): { label: string; href: string }[] {
  const seen = new Set<string>();
  const links: { label: string; href: string }[] = [];
  for (const response of responses) {
    for (const link of response.suggestedLinks ?? []) {
      if (!link.href.startsWith("/") || seen.has(link.href)) continue;
      seen.add(link.href);
      links.push(link);
      if (links.length >= 8) return links;
    }
  }
  return links;
}

export async function chatWithTools(
  message: string,
  context?: ChatLLMContext | null
): Promise<AgentReply> {
  if (!process.env.OPENAI_API_KEY) {
    return { text: "The assistant is missing an OpenAI API key." };
  }

  const toolContext: ToolContext = {
    authToken: context?.toolContext?.authToken ?? null,
    currentPath: context?.currentPath,
    history: context?.history,
    requestHost: context?.toolContext?.requestHost,
  };

  const messages: ModelMessage[] = [
    { role: "system", content: systemContent(context?.currentPath) },
  ];

  for (const turn of (context?.history ?? []).slice(-6)) {
    if ((turn.role === "user" || turn.role === "assistant") && turn.content) {
      messages.push({ role: turn.role, content: turn.content });
    }
  }
  messages.push({ role: "user", content: message });

  const toolResponses: ToolResponse[] = [];

  try {
    for (let round = 0; round < 3; round++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages,
          tools: AGENT_TOOLS,
          tool_choice: "auto",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("OpenAI API error:", data);
        return {
          text: `The assistant could not reply: ${data.error?.message || res.statusText}`,
        };
      }

      const choice = data?.choices?.[0]?.message as ModelMessage | undefined;
      if (!choice) return { text: "The assistant returned an empty reply." };

      const calls = choice.tool_calls ?? [];
      if (calls.length === 0) {
        const links = collectLinks(toolResponses);
        const text = choice.content?.trim()
          || toolResponses.map((item) => item.message).filter(Boolean).join("\n\n")
          || "I could not find an answer for that.";
        return {
          text,
          suggestedLinks: links.length > 0 ? links : null,
          suggestedPage: links[0]?.href ?? toolResponses.find((item) => item.suggestedPage)?.suggestedPage ?? null,
        };
      }

      messages.push({
        role: "assistant",
        content: choice.content ?? null,
        tool_calls: calls,
      });

      for (const call of calls) {
        let parsed: unknown = {};
        try {
          parsed = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          parsed = {};
        }
        const result = await executeTool(call.function.name, parsed, toolContext);
        toolResponses.push(result);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.message,
        });
      }
    }

    const links = collectLinks(toolResponses);
    return {
      text: toolResponses.at(-1)?.message || "I gathered some results but could not finish the reply.",
      suggestedLinks: links.length > 0 ? links : null,
      suggestedPage: links[0]?.href ?? null,
    };
  } catch (err) {
    console.error("Floating agent failed:", err);
    return { text: "The assistant could not reach the model." };
  }
}
