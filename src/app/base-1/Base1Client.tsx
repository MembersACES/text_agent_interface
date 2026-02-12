"use client";

import React, { useMemo, useEffect } from "react";

interface Base1ClientProps {
  base1Url: string;
  base1Password?: string;
}

export default function Base1Client({
  base1Url,
  base1Password = "",
}: Base1ClientProps) {
  const iframeSrc = useMemo(() => base1Url, [base1Url]);

  useEffect(() => {
    console.log("[Base1Client] base1Url prop:", base1Url);
    console.log("[Base1Client] window.location.href:", window.location.href);
    if (!base1Url) {
      console.warn(
        "[Base1Client] base1Url is empty; iframe will not load."
      );
    }
  }, [base1Url]);

  return (
    <div className="space-y-3">
      {/* Password helper */}
      {base1Password && (
        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow-sm">
          <span className="font-semibold">Agent Password:</span>
          <span className="font-mono bg-white/70 px-2 py-0.5 rounded border border-amber-200 select-all">
            {base1Password}
          </span>
        </div>
      )}

      {/* Visible warning if URL is not configured */}
      {!base1Url && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 shadow-sm">
          Base 1 agent URL is not set. The iframe has no src and will not load.
        </div>
      )}

      <div className="w-full h-[80vh] rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <iframe
          src={iframeSrc}
          title="Base 1 Review Agent"
          className="w-full h-full border-0"
          allow="clipboard-write; clipboard-read"
          onLoad={() =>
            console.log("[Base1Client] iframe loaded successfully:", iframeSrc)
          }
          onError={(e) =>
            console.error("[Base1Client] iframe failed to load:", iframeSrc, e)
          }
        />
      </div>
    </div>
  );
}


