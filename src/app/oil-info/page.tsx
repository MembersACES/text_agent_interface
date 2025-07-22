"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { getApiBaseUrl } from "@/lib/utils";

export default function OilInfoPage() {
  return (
    <InfoToolPage
      title="Oil Information"
      description={"Enter a business name to retrieve the latest oil invoice details."}
      endpoint={`${getApiBaseUrl()}/api/get-oil-info`}
    />
  );
} 