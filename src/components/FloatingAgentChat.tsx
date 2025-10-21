"use client";
import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, X } from "lucide-react";

const AGENT_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3005/"
    : "https://aces-text-agent-dev-672026052958.australia-southeast2.run.app";

export default function FloatingAgentChat() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const token =
    (session as any)?.id_token || (session as any)?.accessToken;

  const iframeSrc = useMemo(() => {
    if (token) {
      return `${AGENT_BASE_URL}?auth_token=${encodeURIComponent(token)}`;
    }
    return AGENT_BASE_URL;
  }, [token]);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:bg-emerald-700 transition"
      >
        {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-[400px] h-[600px] bg-white border border-gray-300 rounded-2xl shadow-2xl overflow-hidden">
          <iframe
            src={iframeSrc}
            title="ACES AI Agent"
            className="w-full h-full"
            allow="clipboard-write; clipboard-read"
          />
        </div>
      )}
    </>
  );
}
