"use client";
import React, { useEffect, useState } from "react";
import CanvaPitchDeckTool from "@/components/CanvaPitchDeckTool";
import { useSearchParams } from "next/navigation";

export default function CanvaPitchDeckPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [codeVerifier, setCodeVerifier] = useState<string | null>(null);

  useEffect(() => {
    const storedVerifier = sessionStorage.getItem("canva_code_verifier");
    if (storedVerifier) setCodeVerifier(storedVerifier);

    if (code) {
      console.log("🔐 OAuth Code from URL:", code);
      console.log("🔐 PKCE Code Verifier from sessionStorage:", storedVerifier);
    }
  }, [code]);

  const handleConnect = async () => {
    // Skip all the manual OAuth setup, use your server endpoint instead
    window.location.href = "/api/canva/oauth-start";
  };

  return (
    <div className="p-6">
      {!code || !codeVerifier ? (
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-indigo-600 text-white rounded"
        >
          Connect to Canva
        </button>
      ) : (
        <CanvaPitchDeckTool
          token="" // Not using a session token here
          canvaAuthCode={code}
          codeVerifier={codeVerifier}
        />
      )}
    </div>
  );
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
