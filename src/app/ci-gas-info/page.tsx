"use client";
import InfoToolPage from "@/components/InfoToolPage";

export default function CIGasInfoPage() {
  return (
    <InfoToolPage
      title="C&I Gas Information"
      description={"Enter a business name or MRIN to retrieve the latest C&I gas invoice details."}
      endpoint="http://localhost:8000/api/get-gas-ci-info"
      secondaryField={{ name: "mrin", label: "MRIN" }}
    />
  );
} 