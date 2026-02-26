import Base1Client from "./Base1Client";

// Hardcoded Base 1 Review Agent URL
const BASE1_AGENT_URL = "https://text-agent-template-672026052958.australia-southeast2.run.app/agent/base-1-review";

// Hardcoded Base 1 Review Agent Password
const BASE1_AGENT_PASSWORD = "CZA12!";

// Server component: passes hardcoded URL and password to the client component.
export default function Base1Page() {
  return (
    <Base1Client base1Url={BASE1_AGENT_URL} base1Password={BASE1_AGENT_PASSWORD} />
  );
}

