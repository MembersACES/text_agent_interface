"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";

export default function SMEElectricityInvoiceInfoPage() {
  const searchParams = useSearchParams();
  const nmi = searchParams.get("nmi") || "";
  const businessName = searchParams.get("business_name") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
  const formRef = useRef<any>(null);

  return (
    <InfoToolPage
      title="SME Electricity Invoice Information"
      description={"Enter a business name or NMI to retrieve the latest SME electricity invoice details."}
      endpoint="http://localhost:8000/api/get-electricity-sme-info"
      secondaryField={{ name: "nmi", label: "NMI" }}
      initialBusinessName={businessName}
      initialSecondaryValue={nmi}
      autoSubmit={autoSubmit}
      formRef={formRef}
    />
  );
} 