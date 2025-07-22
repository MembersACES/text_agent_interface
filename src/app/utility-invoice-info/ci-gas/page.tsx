"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { getApiBaseUrl } from "@/lib/utils";

export default function CIGasInvoiceInfoPage() {
  const searchParams = useSearchParams();
  const mrin = searchParams.get("mrin") || "";
  const businessName = searchParams.get("business_name") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
  const formRef = useRef<any>(null);

  return (
    <InfoToolPage
      title="C&I Gas Invoice Information"
      description={"Enter a business name or MRIN to retrieve the latest C&I gas invoice details."}
      endpoint={`${getApiBaseUrl()}/api/get-gas-ci-info`}
      secondaryField={{ name: "mrin", label: "MRIN" }}
      initialBusinessName={businessName}
      initialSecondaryValue={mrin}
      autoSubmit={autoSubmit}
      formRef={formRef}
    />
  );
} 