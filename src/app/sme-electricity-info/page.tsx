"use client";
import InfoToolPage from "@/components/InfoToolPage";

export default function SMEElectricityInfoPage() {
  return (
    <InfoToolPage
      title="SME Electricity Information"
      description={"Enter a business name or NMI to retrieve the latest SME electricity invoice details."}
      endpoint="http://localhost:8000/api/get-electricity-sme-info"
      secondaryField={{ name: "nmi", label: "NMI" }}
    />
  );
} 