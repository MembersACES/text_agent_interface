"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { getApiBaseUrl } from "@/lib/utils";

export default function SMEElectricityInfoPage() {
  return (
    <InfoToolPage
      title="SME Electricity Information"
      description={"Enter a business name or NMI to retrieve the latest SME electricity invoice details."}
      endpoint={`${getApiBaseUrl()}/api/get-electricity-sme-info`}
      secondaryField={{ name: "nmi", label: "NMI" }}
    />
  );
} 