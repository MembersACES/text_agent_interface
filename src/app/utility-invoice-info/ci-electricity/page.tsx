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
  const autoOpenDMA = searchParams.get("autoOpenDMA") === "1";
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
  console.log('C&I Electricity Page - URL Parameters:', {
    business_name: businessName,
    nmi: nmi,
    business_abn: searchParams.get("business_abn"),
    business_trading_name: searchParams.get("business_trading_name"),
    contact_email: searchParams.get("contact_email"),
    contact_phone: searchParams.get("contact_phone"),
    postal_address: searchParams.get("postal_address"),
  });
  console.log('C&I Electricity Page - initialExtraFields:', initialExtraFields);

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
      autoOpenDMA={autoOpenDMA}
      formRef={formRef}
      initialExtraFields={initialExtraFields}
      offerId={Number.isNaN(offerId) ? undefined : offerId}
    />
  );
} 