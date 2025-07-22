"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";

export default function OilInvoiceInfoPage() {
  const searchParams = useSearchParams();
  const businessName = searchParams.get("business_name") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
  const formRef = useRef<any>(null);

  return (
    <InfoToolPage
      title="Oil Invoice Information"
      description={"Enter a business name to retrieve the latest oil invoice details."}
      endpoint="http://localhost:8000/api/get-oil-info"
      initialBusinessName={businessName}
      autoSubmit={autoSubmit}
      formRef={formRef}
    />
  );
} 