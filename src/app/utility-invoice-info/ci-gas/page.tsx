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
  const offerIdParam = searchParams.get("offerId");
  const offerId = offerIdParam ? parseInt(offerIdParam, 10) : NaN;
  const formRef = useRef<any>(null);

  // Extract business information from URL parameters
  const initialExtraFields = {
    business_abn: searchParams.get("business_abn") || "",
    business_trading_name: searchParams.get("business_trading_name") || "",
    business_industry: searchParams.get("business_industry") || "",
    business_website: searchParams.get("business_website") || "",
    postal_address: searchParams.get("postal_address") || "",
    contact_phone: searchParams.get("contact_phone") || "",
    contact_email: searchParams.get("contact_email") || "",
    contact_name: searchParams.get("contact_name") || "",
    contact_position: searchParams.get("contact_position") || "",
    loa_sign_date: searchParams.get("loa_sign_date") || "",
  };

  // Debug logging
  console.log('C&I Gas Page - URL Parameters:', {
    business_name: businessName,
    mrin: mrin,
    business_abn: searchParams.get("business_abn"),
    business_trading_name: searchParams.get("business_trading_name"),
    contact_email: searchParams.get("contact_email"),
    contact_phone: searchParams.get("contact_phone"),
    postal_address: searchParams.get("postal_address"),
  });
  console.log('C&I Gas Page - initialExtraFields:', initialExtraFields);

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
      initialExtraFields={initialExtraFields}
      offerId={Number.isNaN(offerId) ? undefined : offerId}
    />
  );
} 