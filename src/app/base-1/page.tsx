"use client";

import React, { useMemo, useEffect } from "react";

// Embed the existing hosted Base 1 Review Agent from the text_agent_template app.
// URL must be provided via NEXT_PUBLIC_BASE1_AGENT_URL.
const BASE1_AGENT_URL = process.env.NEXT_PUBLIC_BASE1_AGENT_URL || "";

// Optional: password to unlock the embedded agent (read-only display)
const BASE1_AGENT_PASSWORD =
  process.env.NEXT_PUBLIC_BASE1_AGENT_PASSWORD || "";

export default function Base1Page() {
  const iframeSrc = useMemo(() => BASE1_AGENT_URL, []);

  useEffect(() => {
    console.log("[Base1Page] NEXT_PUBLIC_BASE1_AGENT_URL:", BASE1_AGENT_URL);
    console.log("[Base1Page] window.location.href:", window.location.href);
    if (!BASE1_AGENT_URL) {
      console.warn(
        "[Base1Page] NEXT_PUBLIC_BASE1_AGENT_URL is empty; iframe will not load."
      );
    }
  }, []);

  return (
    <div className="space-y-3">
      {/* Password helper */}
      {BASE1_AGENT_PASSWORD && (
        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow-sm">
          <span className="font-semibold">Agent Password:</span>
          <span className="font-mono bg-white/70 px-2 py-0.5 rounded border border-amber-200 select-all">
            {BASE1_AGENT_PASSWORD}
          </span>
        </div>
      )}

      {/* Visible warning if URL is not configured */}
      {!BASE1_AGENT_URL && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 shadow-sm">
          NEXT_PUBLIC_BASE1_AGENT_URL is not set. The Base 1 agent iframe has no
          src and will not load.
        </div>
      )}

      <div className="w-full h-[80vh] rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <iframe
          src={iframeSrc}
          title="Base 1 Review Agent"
          className="w-full h-full border-0"
          allow="clipboard-write; clipboard-read"
          onLoad={() =>
            console.log("[Base1Page] iframe loaded successfully:", iframeSrc)
          }
          onError={(e) =>
            console.error("[Base1Page] iframe failed to load:", iframeSrc, e)
          }
        />
      </div>
    </div>
  );
}
