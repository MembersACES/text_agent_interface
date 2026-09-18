import { PageHeader } from "@/components/Layouts/PageHeader";
import Base1Hub from "./Base1Hub";
import {
  getBase1AgentEmbedUrl,
  getBase1AgentPassword,
} from "@/lib/base1-agent";
import { isPartnerMode } from "@/lib/partner-mode";
import { PartnerBase1Form } from "@/components/partner/PartnerBase1Form";

export default function Base1Page() {
  if (isPartnerMode()) {
    return <PartnerBase1Form />;
  }
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
