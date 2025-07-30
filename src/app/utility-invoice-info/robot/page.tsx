"use client";
import InfoToolPage from "@/components/InfoToolPage";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { getApiBaseUrl } from "@/lib/utils";

export default function RobotDataInfoPage() {
  const searchParams = useSearchParams();
  const robotNumber = searchParams.get("robot_number") || "";
  const businessName = searchParams.get("business_name") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "1";
  const formRef = useRef<any>(null);

  return (
    <InfoToolPage
      title="Robot Cleaning Data"
      description="Enter a Robot Number to retrieve cleaning activity, map links, and related business information."
      endpoint={`${getApiBaseUrl()}/api/get-robot-data`}
      secondaryField={{ name: "robot_number", label: "Robot Number" }}
      initialBusinessName={businessName}
      initialSecondaryValue={robotNumber}
      autoSubmit={autoSubmit}
      formRef={formRef}
    />
  );
}
