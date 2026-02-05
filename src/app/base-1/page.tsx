"use client";

import React, { useMemo } from "react";

// Embed the existing hosted Base 1 Review Agent from the text_agent_template app.
// URL must be provided via NEXT_PUBLIC_BASE1_AGENT_URL.
const BASE1_AGENT_URL = process.env.NEXT_PUBLIC_BASE1_AGENT_URL || "";

// Optional: password to unlock the embedded agent (read-only display)
const BASE1_AGENT_PASSWORD =
  process.env.NEXT_PUBLIC_BASE1_AGENT_PASSWORD || "";

export default function Base1Page() {
  const iframeSrc = useMemo(() => BASE1_AGENT_URL, []);

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

      <div className="w-full h-[80vh] rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <iframe
          src={iframeSrc}
          title="Base 1 Review Agent"
          className="w-full h-full border-0"
          allow="clipboard-write; clipboard-read"
        />
      </div>
    </div>
  );
}
