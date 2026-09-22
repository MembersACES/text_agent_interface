"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AutonomousAgentRunsRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const group = searchParams.get("group") || "running";
    router.replace(`/autonomous-agent?group=${encodeURIComponent(group)}`);
  }, [router, searchParams]);

  return <div className="p-6 text-sm text-gray-500">Opening queue…</div>;
}
