"use client";
import InfoToolPage from "@/components/InfoToolPage";

export default function WasteInfoPage() {
  return (
    <InfoToolPage
      title="Waste Information"
      description={"Enter a business name or Account Number to retrieve the latest waste invoice details."}
      endpoint="http://localhost:8000/api/get-waste-info"
      secondaryField={{ name: "account_number", label: "Account Number" }}
    />
  );
} 