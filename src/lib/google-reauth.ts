"use client";

import { signIn } from "next-auth/react";

export function isGoogleReauthError(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    m.includes("reauthentication_required") ||
    m.includes("drive cannot see") ||
    m.includes("this login") ||
    m.includes("access token") ||
    m.includes("oauthcallback") ||
    m.includes("refreshaccesstokenerror")
  );
}

export function reauthWithGoogle(callbackUrl?: string) {
  const url =
    callbackUrl ||
    (typeof window !== "undefined" ? window.location.href : "/");
  return signIn("google", {
    callbackUrl: url,
    prompt: "consent",
  });
}
