import { PageHeader } from "@/components/Layouts/PageHeader";
import Base1Hub from "./Base1Hub";
import {
  getBase1AgentEmbedUrl,
  getBase1AgentPassword,
} from "@/lib/base1-agent";

export default function Base1Page() {
  return (
    <>
      <PageHeader
        pageName="Base 1"
        title="Base 1 hub"
        description="Run Base 1 reviews, track leads, and open reports from a single workspace."
      />
      <Base1Hub
        base1Url={getBase1AgentEmbedUrl()}
        base1Password={getBase1AgentPassword()}
      />
    </>
  );
}
