"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import CanvaPitchDeckTool from "@/components/CanvaPitchDeckTool";

// Helper function to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default function CanvaPitchDeckPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [canvaToken, setCanvaToken] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return; // Don't run on server
    
    console.log("🔍 Page loaded, checking for Canva auth...");
    console.log("🔍 Current URL:", window.location.href);
    console.log("🔍 Search params:", Object.fromEntries(searchParams.entries()));
    
    // Check for Canva token in cookies (this is where it's actually stored!)
    const cookieToken = getCookie('canva_access_token');
    console.log("🔍 Cookie token:", cookieToken?.substring(0, 20) + "...");
    
    // Check for Canva auth code in URL params (after OAuth redirect)
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    console.log("🔍 Code from URL:", code);
    console.log("🔍 State from URL:", state);
    
    if (cookieToken) {
      console.log("✅ Found Canva token in cookies!");
      setCanvaToken(cookieToken);
      setIsConnected(true);
    } else if (code) {
      console.log("✅ Found auth code in URL, storing...");
      // Store the Canva auth code in localStorage as backup
      localStorage.setItem('canva_auth_code', code);
      setCanvaToken(code);
      setIsConnected(true);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      console.log("🔍 No cookie token, checking localStorage...");
      // Check if we have a stored Canva token
      const storedCanvaToken = localStorage.getItem('canva_auth_code') || 
                               localStorage.getItem('canva_access_token');
      console.log("🔍 Stored token:", storedCanvaToken?.substring(0, 20) + "...");
      
      if (storedCanvaToken) {
        console.log("✅ Found stored token, setting connected state");
        setCanvaToken(storedCanvaToken);
        setIsConnected(true);
      } else {
        console.log("❌ No token found anywhere");
      }
    }
  }, [searchParams, mounted]);

  const handleConnect = async () => {
    console.log("🚀 Connecting to Canva...");
    window.location.href = "/api/canva/oauth-start";
  };

  const handleDisconnect = () => {
    console.log("🔌 Disconnecting from Canva...");
    // Clear both localStorage and cookie
    if (typeof window !== 'undefined') {
      localStorage.removeItem('canva_auth_code');
      localStorage.removeItem('canva_access_token');
      // Clear cookie
      document.cookie = 'canva_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
    setCanvaToken("");
    setIsConnected(false);
  };

  // Add debugging info to the UI
  const debugInfo = {
    mounted,
    isConnected,
    canvaTokenLength: canvaToken?.length || 0,
    hasCookieToken: mounted ? !!getCookie('canva_access_token') : 'checking...',
    hasStoredToken: mounted ? !!localStorage.getItem('canva_auth_code') : 'checking...',
    urlParams: Object.fromEntries(searchParams.entries())
  };

  if (!token) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Please log in to use this feature.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Debug info */}
      <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
        <strong>Debug Info:</strong>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>

      <div className="mb-4 flex gap-2">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Connect to Canva
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-green-600">✅ Connected to Canva</span>
            <button
              onClick={handleDisconnect}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
      
      {isConnected ? (
        <CanvaPitchDeckTool token={token} canvaToken={canvaToken} />
      ) : (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          Please connect to Canva first to generate strategies.
        </div>
      )}
    </div>
  );
}