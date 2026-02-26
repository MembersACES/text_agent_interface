"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { getApiBaseUrl } from "@/lib/utils";

export default function OilInvoiceInfoPage() {
  const searchParams = useSearchParams();
  const businessName = searchParams.get("business_name") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
  const offerIdParam = searchParams.get("offerId");
  const offerId = offerIdParam ? parseInt(offerIdParam, 10) : NaN;
  const formRef = useRef<any>(null);

  return (
    <InfoToolPage
      title="Oil Invoice Information"
      description={"Enter a business name to retrieve the latest oil invoice details."}
      endpoint={`${getApiBaseUrl()}/api/get-oil-info`}
      initialBusinessName={businessName}
      autoSubmit={autoSubmit}
      formRef={formRef}
      offerId={Number.isNaN(offerId) ? undefined : offerId}
    />
  );
} 