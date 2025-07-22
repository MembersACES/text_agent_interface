"use client";
import InfoToolPage from "@/components/InfoToolPage";

export default function SMEGasInfoPage() {
  return (
    <InfoToolPage
      title="SME Gas Information"
      description={"Enter a business name or MRIN to retrieve the latest SME gas invoice details."}
      endpoint="http://localhost:8000/api/get-gas-sme-info"
      secondaryField={{ name: "mrin", label: "MRIN" }}
    />
  );
} 