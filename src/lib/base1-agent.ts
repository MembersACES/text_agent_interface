/** Base 1 Review Agent (text_agent_template) Cloud Run base URL — no trailing slash. */
export function getBase1AgentApiUrl(): string {
  return (
    process.env.BASE1_AGENT_API_URL ||
    process.env.NEXT_PUBLIC_BASE1_AGENT_API_URL ||
    "https://text-agent-template-672026052958.australia-southeast2.run.app"
  ).replace(/\/+$/, "");
}

export function getBase1AgentEmbedUrl(): string {
  const base = getBase1AgentApiUrl();
  const path =
    process.env.NEXT_PUBLIC_BASE1_AGENT_PATH || "/agent/base-1-review";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getBase1AgentPassword(): string {
  return process.env.BASE1_AGENT_PASSWORD || process.env.NEXT_PUBLIC_BASE1_AGENT_PASSWORD || "";
}
