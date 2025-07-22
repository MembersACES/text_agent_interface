"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";

const requestTypes = [
  "Supplier Data", "Signed Agreement", "Other"
];

export default function DataRequestPage() {
  const searchParams = useSearchParams();
  const businessName = searchParams.get("business_name") || "";
  const supplierName = searchParams.get("supplier_name") || "";
  const requestType = searchParams.get("request_type") || "";
  const details = searchParams.get("details") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
  const formRef = useRef<any>(null);

  return (
    <InfoToolPage
      title="Data Request"
      description={"Request data from a supplier or client. Select business, request type, and enter any additional details."}
      endpoint="http://localhost:8000/api/data-request"
      extraFields={[
        { name: "supplier_name", label: "Supplier Name" },
        { name: "request_type", label: "Request Type", type: "select", options: requestTypes },
        { name: "details", label: "Additional Details", type: "textarea" }
      ]}
      initialBusinessName={businessName}
      autoSubmit={autoSubmit}
      formRef={formRef}
      // Pre-fill extra fields
      {...(supplierName && { initialExtraFields: { supplier_name: supplierName } })}
      {...(requestType && { initialExtraFields: { ...(supplierName && { supplier_name: supplierName }), request_type: requestType } })}
      {...(details && { initialExtraFields: { ...(supplierName && { supplier_name: supplierName }), ...(requestType && { request_type: requestType }), details } })}
    />
  );
} 