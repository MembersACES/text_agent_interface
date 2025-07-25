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
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem("canva_code_verifier", verifier);

    const clientId = process.env.NEXT_PUBLIC_CANVA_CLIENT_ID!;
    const redirectUri = process.env.NEXT_PUBLIC_CANVA_REDIRECT_URI!;
    const scope = "data_autofill";

    const authUrl = `https://www.canva.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scope}&code_challenge=${challenge}&code_challenge_method=S256`;

    window.location.href = authUrl;
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
