"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AutonomousAgentWorkspace from "./_components/AutonomousAgentWorkspace";

export default function AutonomousAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const type = searchParams.get("type");

  useEffect(() => {
    if (!tab) return;
    if (tab === "templates") {
      const qs = type ? `?type=${encodeURIComponent(type)}` : "";
      router.replace(`/autonomous-agent/templates${qs}`);
      return;
    }
    if (tab === "resources") {
      router.replace("/autonomous-agent/resources");
    }
  }, [router, tab, type]);

  if (tab === "templates" || tab === "resources") {
    return <div className="p-6 text-sm text-gray-500">Opening…</div>;
  }

  return <AutonomousAgentWorkspace view="queue" />;
}
