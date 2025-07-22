"use client";
import React, { useMemo } from "react";
import { useSession } from "next-auth/react";

const AGENT_BASE_URL = "https://aces-text-agent-2-672026052958.australia-southeast2.run.app/";

const AgentPage = () => {
  const { data: session } = useSession();
  // Prefer id_token if available, otherwise use accessToken
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  // Memoize the iframe src to avoid unnecessary rerenders
  const iframeSrc = useMemo(() => {
    if (token) {
      return `${AGENT_BASE_URL}?token=${encodeURIComponent(token)}`;
    }
    return AGENT_BASE_URL;
  }, [token]);

  return (
    <div style={{ width: "100%", height: "80vh", border: "1px solid #eee" }}>
      <iframe
        src={iframeSrc}
        title="AI Text Agent"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: "8px",
          background: "#fff"
        }}
        allow="clipboard-write; clipboard-read"
      />
    </div>
  );
};

export default AgentPage; 