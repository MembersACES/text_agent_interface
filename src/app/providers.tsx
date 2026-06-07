"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";
import { SessionProvider, useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPaletteProvider } from "@/components/CommandPaletteContext";
import { AppCopyright } from "@/components/Layouts/AppCopyright";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      // Preserve the current URL when redirecting to sign in
      const currentUrl = window.location.pathname + window.location.search;
      signIn("google", { callbackUrl: currentUrl });
    }
  }, [status]);

  // Handle token refresh errors
  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      console.log("Token refresh failed, redirecting to sign in...");
      // Preserve the current URL when redirecting to sign in
      const currentUrl = window.location.pathname + window.location.search;
      signIn("google", { callbackUrl: currentUrl }); // Force re-authentication
    }
  }, [session]);

  // Check domain validation
  const allowedDomain = "acesolutions.com.au";
  const userEmail = session?.user?.email || "";
  const userDomain = userEmail.split("@")[1];
  const isDomainValid = session && userDomain === allowedDomain;

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas dark:bg-canvas-dark">
        <div className="text-center">
          <Spinner className="mx-auto mb-4 size-8 text-primary" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading authentication…
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas dark:bg-canvas-dark">
        <div className="max-w-sm rounded-2xl border border-stroke bg-white p-8 text-center shadow-lg dark:border-dark-3 dark:bg-gray-dark">
          <p className="mb-1 text-lg font-semibold text-dark dark:text-white">
            {BRAND.name}
          </p>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
            Sign in with your @{allowedDomain} account to continue.
          </p>
          <Button
            onClick={() => {
              const currentUrl = window.location.pathname + window.location.search;
              signIn("google", { callbackUrl: currentUrl });
            }}
          >
            Sign in with Google
          </Button>
          <AppCopyright className="mt-6 text-xs text-gray-400 dark:text-gray-500" compact />
        </div>
      </div>
    );
  }

  // Check if user is from allowed domain
  if (session && !isDomainValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas dark:bg-canvas-dark">
        <div className="max-w-md rounded-2xl border border-stroke bg-white p-8 text-center shadow-lg dark:border-dark-3 dark:bg-gray-dark">
          <p className="mb-1 text-lg font-semibold text-dark dark:text-white">
            Access denied
          </p>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
            You must be signed in with an @{allowedDomain} email address to
            access this application.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              const currentUrl = window.location.pathname + window.location.search;
              signIn("google", { callbackUrl: currentUrl });
            }}
          >
            Sign in with a different account
          </Button>
          <AppCopyright className="mt-6 text-xs text-gray-400 dark:text-gray-500" compact />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider defaultTheme="light" attribute="class">
        <SidebarProvider>
          <ToastProvider>
            <CommandPaletteProvider>
              <AuthGate>{children}</AuthGate>
            </CommandPaletteProvider>
          </ToastProvider>
        </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}