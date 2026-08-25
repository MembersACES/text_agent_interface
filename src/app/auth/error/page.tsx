"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { reauthWithGoogle } from "@/lib/google-reauth";

function errorCopy(code: string): string {
  switch (code) {
    case "OAuthCallback":
      return "Google sign-in did not finish. Allow Drive and Sheets when Google asks, then try once more. Do not start a second sign-in while the first is still open.";
    case "AccessDenied":
      return "Access was denied. Sign in with your ACES or Carbon Zero Google account.";
    case "Configuration":
      return "Sign-in is misconfigured. Ask an admin to check NEXTAUTH_URL and the Google OAuth client.";
    default:
      return "Sign-in failed. Re-auth with Google and allow Drive and Sheets if prompted.";
  }
}

function AuthErrorInner() {
  const params = useSearchParams();
  const code = params.get("error") || "SignIn";

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 dark:bg-canvas-dark">
      <div className="max-w-md rounded-2xl border border-stroke bg-white p-8 text-center shadow-lg dark:border-dark-3 dark:bg-gray-dark">
        <p className="mb-1 text-lg font-semibold text-dark dark:text-white">{BRAND.name}</p>
        <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">
          {code === "OAuthCallback" ? "Google sign-in was interrupted" : "Could not sign in"}
        </p>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">{errorCopy(code)}</p>
        <Button onClick={() => void reauthWithGoogle("/")}>Re-auth with Google</Button>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <AuthErrorInner />
    </Suspense>
  );
}
