"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { getApiBaseUrl } from "@/lib/utils";

export default function WasteInvoiceInfoPage() {
  const searchParams = useSearchParams();
  const accountNumber = searchParams.get("account_number") || "";
  const businessName = searchParams.get("business_name") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
  const offerIdParam = searchParams.get("offerId");
  const offerId = offerIdParam ? parseInt(offerIdParam, 10) : NaN;
  const formRef = useRef<any>(null);

  return (
    <InfoToolPage
      title="Waste Invoice Information"
      description={"Enter a business name or Account Number to retrieve the latest waste invoice details."}
      endpoint={`${getApiBaseUrl()}/api/get-waste-info`}
      secondaryField={{ name: "account_number", label: "Account Number" }}
      initialBusinessName={businessName}
      initialSecondaryValue={accountNumber}
      autoSubmit={autoSubmit}
      formRef={formRef}
      offerId={Number.isNaN(offerId) ? undefined : offerId}
    />
  );
} 