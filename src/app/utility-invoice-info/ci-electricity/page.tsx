"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { getApiBaseUrl } from "@/lib/utils";

export default function CIElectricityInvoiceInfoPage() {
  const searchParams = useSearchParams();
  const nmi = searchParams.get("nmi") || "";
  const businessName = searchParams.get("business_name") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
  const formRef = useRef<any>(null);

  // Pass autoSubmit and formRef to InfoToolPage
  return (
    <InfoToolPage
      title="C&I Electricity Invoice Information"
      description={"Enter a business name or NMI to retrieve the latest C&I electricity invoice details."}
      endpoint={`${getApiBaseUrl()}/api/get-electricity-ci-info`}
      secondaryField={{ name: "nmi", label: "NMI" }}
      initialBusinessName={businessName}
      initialSecondaryValue={nmi}
      autoSubmit={autoSubmit}
      formRef={formRef}
    />
  );
} 