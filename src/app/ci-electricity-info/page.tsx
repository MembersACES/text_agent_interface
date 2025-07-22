"use client";
import InfoToolPage from "@/components/InfoToolPage";

export default function CIElectricityInfoPage() {
  return (
    <InfoToolPage
      title="C&I Electricity Information"
      description={"Enter a business name or NMI to retrieve the latest C&I electricity invoice details."}
      endpoint="http://localhost:8000/api/get-electricity-ci-info"
      secondaryField={{ name: "nmi", label: "NMI" }}
    />
  );
} 