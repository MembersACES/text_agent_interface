"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { getApiBaseUrl } from "@/lib/utils";

export default function SMEGasInfoPage() {
  return (
    <InfoToolPage
      title="SME Gas Information"
      description={"Enter a business name or MRIN to retrieve the latest SME gas invoice details."}
      endpoint={`${getApiBaseUrl()}/api/get-gas-sme-info`}
      secondaryField={{ name: "mrin", label: "MRIN" }}
    />
  );
} 