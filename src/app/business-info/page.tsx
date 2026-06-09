"use client";

import { useSession, getSession } from "next-auth/react";
import BusinessInfoTool from "@/components/BusinessInfoTool";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";

export default function BusinessInfoPage() {
  const { data: session } = useSession();
  const token = session?.id_token || session?.accessToken || null;

  const getValidToken = async () => {
    const freshSession = await getSession();
    if (freshSession?.id_token || freshSession?.accessToken) {
      const newToken = freshSession.id_token || freshSession.accessToken || null;
      if (newToken && newToken.includes(".")) {
        try {
          const payload = JSON.parse(atob(newToken.split(".")[1]));
          if (payload.exp * 1000 < Date.now()) {
            const currentUrl = window.location.pathname + window.location.search;
            window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`;
            return null;
          }
        } catch {
          // use token as-is
        }
      }
      return newToken;
    }
    return token;
  };

  return (
    <ToolPageLayout
      pageName="Member profile"
      title="Member Profile"
      description="Search by business name to load LOA-linked member data from Airtable."
      width="2xl"
    >
      <BusinessInfoTool
        token={token || ""}
        onTokenExpired={async () => {}}
        getValidToken={getValidToken}
      />
    </ToolPageLayout>
  );
}
