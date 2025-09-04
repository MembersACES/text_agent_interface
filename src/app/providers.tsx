"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";
import { SessionProvider, useSession, signIn } from "next-auth/react";
import { useEffect } from "react";

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg mb-4">Redirecting to sign in...</p>
          <button 
            onClick={() => {
              const currentUrl = window.location.pathname + window.location.search;
              signIn("google", { callbackUrl: currentUrl });
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  // Check if user is from allowed domain
  if (session && !isDomainValid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg mb-4">Access Denied</p>
          <p className="text-gray-600 mb-4">
            You must be signed in with an @{allowedDomain} email address to access this application.
          </p>
          <button 
            onClick={() => {
              const currentUrl = window.location.pathname + window.location.search;
              signIn("google", { callbackUrl: currentUrl });
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sign In with Different Account
          </button>
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
          <AuthGate>{children}</AuthGate>
        </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}