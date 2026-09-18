import { isPartnerMode } from "@/lib/partner-mode";
import { PartnerClientDetailPage } from "@/components/partner/PartnerClientDetailPage";
import { redirect, notFound } from "next/navigation";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isPartnerMode()) {
    const { id } = await params;
    redirect(`/crm-members/${id}`);
  }
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    notFound();
  }
  return <PartnerClientDetailPage clientId={clientId} />;
}
