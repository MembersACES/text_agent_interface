// app/canva/connect/page.tsx
"use client";
import React from "react";

export default function CanvaConnectPage() {
  const handleConnect = async () => {
    const codeVerifier = generateCodeVerifier();
    sessionStorage.setItem("canva_code_verifier", codeVerifier);

    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const clientId = process.env.NEXT_PUBLIC_CANVA_CLIENT_ID!;
    const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_CANVA_REDIRECT_URI!);
    const state = crypto.randomUUID();
    sessionStorage.setItem("canva_state", state);

    const oauthUrl = `https://www.canva.com/oauth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid%20email%20profile&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = oauthUrl;
  };

  return (
    <div className="p-6">
      <button
        onClick={handleConnect}
        className="px-4 py-2 bg-indigo-600 text-white rounded"
      >
        Connect to Canva
      </button>
    </div>
  );
}

// PKCE helpers
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
