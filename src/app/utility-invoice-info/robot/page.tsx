"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CleaningRobotDashboard } from "@/components/crm-member/CleaningRobotDashboard";

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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {status === "loading" ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading session…</p>
      ) : !idToken ? (
        <p className="text-sm text-red-600 dark:text-red-400">Sign in to view Pudu robot analytics.</p>
      ) : (
        <CleaningRobotDashboard
          robotSerial={robotNumber}
          initialShopId={shopIdParam || null}
          idToken={idToken}
          businessName={businessName || undefined}
        />
      )}
    </div>
  );
}
