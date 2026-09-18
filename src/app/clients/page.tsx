import { isPartnerMode } from "@/lib/partner-mode";
import { PartnerClientsPage } from "@/components/partner/PartnerClientsPage";
import { redirect } from "next/navigation";

export default function ClientsPage() {
  if (!isPartnerMode()) {
    redirect("/crm-members");
  }
  return <PartnerClientsPage />;
}
