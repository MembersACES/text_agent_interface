"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { getApiBaseUrl } from "@/lib/utils";

export default function CIGasInfoPage() {
  return (
    <InfoToolPage
      title="C&I Gas Information"
      description={"Enter a business name or MRIN to retrieve the latest C&I gas invoice details."}
      endpoint={`${getApiBaseUrl()}/api/get-gas-ci-info`}
      secondaryField={{ name: "mrin", label: "MRIN" }}
    />
  );
} 