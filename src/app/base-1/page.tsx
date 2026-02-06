import Base1Client from "./Base1Client";

// Hardcoded Base 1 Review Agent URL
const BASE1_AGENT_URL = "https://text-agent-template-dev-672026052958.australia-southeast2.run.app/agent/base-1-review";

// Server component: passes hardcoded URL to the client component.
export default function Base1Page() {
  const base1Password =
    process.env.NEXT_PUBLIC_BASE1_AGENT_PASSWORD ||
    process.env.BASE1_AGENT_PASSWORD ||
    "";

  return (
    <Base1Client base1Url={BASE1_AGENT_URL} base1Password={base1Password} />
  );
}
