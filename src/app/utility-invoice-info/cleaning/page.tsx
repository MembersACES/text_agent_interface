"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { getApiBaseUrl } from "@/lib/utils";

export default function CleaningInvoiceInfoPage() {
  const searchParams = useSearchParams();
  const clientName = searchParams.get("client_name") || "";
  const businessName = searchParams.get("business_name") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
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
  console.log('Cleaning Page - URL Parameters:', {
    business_name: businessName,
    client_name: clientName,
    business_abn: searchParams.get("business_abn"),
    business_trading_name: searchParams.get("business_trading_name"),
    contact_email: searchParams.get("contact_email"),
    contact_phone: searchParams.get("contact_phone"),
    postal_address: searchParams.get("postal_address"),
  });
  console.log('Cleaning Page - initialExtraFields:', initialExtraFields);

  return (
    <InfoToolPage
      title="Cleaning Invoice Information"
      description={"Enter a business name or Client Name to retrieve the latest cleaning invoice details."}
      endpoint={`${getApiBaseUrl()}/api/get-cleaning-info`}
      secondaryField={{ name: "client_name", label: "Client Name" }}
      initialBusinessName={businessName}
      initialSecondaryValue={clientName}
      autoSubmit={autoSubmit}
      formRef={formRef}
      initialExtraFields={initialExtraFields}
    />
  );
}

