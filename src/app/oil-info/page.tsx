"use client";
import InfoToolPage from "@/components/InfoToolPage";

export default function OilInfoPage() {
  return (
    <InfoToolPage
      title="Oil Information"
      description={"Enter a business name to retrieve the latest oil invoice details."}
      endpoint="http://localhost:8000/api/get-oil-info"
    />
  );
} 