"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CleaningRobotDashboard } from "@/components/crm-member/CleaningRobotDashboard";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";
import { Skeleton } from "@/components/ui/skeleton";

export default function RobotDataInfoPage() {
  const searchParams = useSearchParams();
  const robotNumber = (searchParams.get("robot_number") || "").trim();
  const businessName = searchParams.get("business_name") || "";
  const shopIdParam = (searchParams.get("shop_id") || "").trim();

  const { data: session, status } = useSession();
  const idToken =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { accessToken?: string } | null)?.accessToken;

  return (
    <ToolPageLayout
      pageName="Robot dashboard"
      title="Cleaning robot utility data"
      description={
        businessName
          ? `Pudu analytics for ${businessName}${robotNumber ? ` · ${robotNumber}` : ""}`
          : "Pudu robot analytics and utility invoice data."
      }
      width="2xl"
    >
      {status === "loading" ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : !idToken ? (
        <p className="text-sm text-semantic-block">Sign in to view Pudu robot analytics.</p>
      ) : (
        <CleaningRobotDashboard
          robotSerial={robotNumber}
          initialShopId={shopIdParam || null}
          idToken={idToken}
          businessName={businessName || undefined}
        />
      )}
    </ToolPageLayout>
  );
}
