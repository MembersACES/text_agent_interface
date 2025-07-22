"use client";
import { useSession } from "next-auth/react";
import BusinessInfoTool from "@/components/BusinessInfoTool";

export default function BusinessInfoPage() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 32, background: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <h2 style={{ marginBottom: 24 }}>Business Info Tool</h2>
      <BusinessInfoTool token={token} />
    </div>
  );
} 