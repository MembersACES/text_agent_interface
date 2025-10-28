"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { getApiBaseUrl } from "@/lib/utils";

const filingTypes = [
  "loa",
  "savings",
  "revenue",
  "site_profiling",
  "cleaning_invoice_upload",
  "telecommunication_invoice_upload",
  "site_map_upload",
  "signed_CI_E",
  "signed_SME_E",
  "signed_CI_G",
  "signed_SME_G",
  "signed_WASTE",
  "signed_OIL",
  "signed_DMA",
  "amortisation_excel",
  "amortisation_pdf"
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
      description="Upload a document to file it in the client’s Google Drive. Select business, filing type, and upload file."
      endpoint={`${getApiBaseUrl()}/api/drive-filing`}
      extraFields={[
        {
          name: "filing_type",
          label: "Filing Type",
          type: "select",
          options: filingTypes,
          required: true,
        },
      ]}
      isFileUpload={true}
      initialBusinessName={businessName}
      initialExtraFields={filingType ? { filing_type: filingType } : {}}
      autoSubmit={autoSubmit}
      formRef={formRef}
    />
  );
}
