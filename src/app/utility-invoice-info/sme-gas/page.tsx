"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";

export default function SMEGasInvoiceInfoPage() {
  const searchParams = useSearchParams();
  const mrin = searchParams.get("mrin") || "";
  const businessName = searchParams.get("business_name") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
  const formRef = useRef<any>(null);

  return (
    <InfoToolPage
      title="SME Gas Invoice Information"
      description={"Enter a business name or MRIN to retrieve the latest SME gas invoice details."}
      endpoint="http://localhost:8000/api/get-gas-sme-info"
      secondaryField={{ name: "mrin", label: "MRIN" }}
      initialBusinessName={businessName}
      initialSecondaryValue={mrin}
      autoSubmit={autoSubmit}
      formRef={formRef}
    />
  );
} 