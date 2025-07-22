"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { getApiBaseUrl } from "@/lib/utils";

export default function CIElectricityInfoPage() {
  return (
    <InfoToolPage
      title="C&I Electricity Information"
      description={"Enter a business name or NMI to retrieve the latest C&I electricity invoice details."}
      endpoint={`${getApiBaseUrl()}/api/get-electricity-ci-info`}
      secondaryField={{ name: "nmi", label: "NMI" }}
    />
  );
} 