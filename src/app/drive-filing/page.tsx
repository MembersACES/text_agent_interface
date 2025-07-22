"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";

const filingTypes = [
  "LOA",
  "Savings",
  "Revenue",
  "Site Profiling",
  "Signed Contract - C&I Electricity",
  "Signed Contract - SME Electricity",
  "Signed Contract - C&I Gas",
  "Signed Contract - SME Gas",
  "Signed Contract - Waste",
  "Signed Contract - Oil",
  "Signed Contract - DMA",
  "Cleaning Invoice Upload",
  "Telecommunication Invoice Upload",
  "Site Map Upload"
];

export default function DriveFilingPage() {
  const searchParams = useSearchParams();
  const businessName = searchParams.get("business_name") || "";
  const filingType = searchParams.get("filing_type") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
  const formRef = useRef<any>(null);

  return (
    <InfoToolPage
      title="Drive Filing"
      description={"Upload a document to file it in the client’s Google Drive. Select business, filing type, and upload file."}
      endpoint="http://localhost:8000/api/drive-filing"
      extraFields={[{ name: "filing_type", label: "Filing Type", type: "text" }]}
      isFileUpload={true}
      initialBusinessName={businessName}
      initialExtraFields={filingType ? { filing_type: filingType } : {}}
      autoSubmit={autoSubmit}
      formRef={formRef}
    />
  );
} 