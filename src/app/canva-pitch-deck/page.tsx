"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import CanvaPitchDeckTool from "@/components/CanvaPitchDeckTool";

export default function CanvaPitchDeckPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [canvaToken, setCanvaToken] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  useEffect(() => {
    // Check for Canva auth code in URL params (after OAuth redirect)
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code) {
      // Store the Canva auth code
      localStorage.setItem('canva_auth_code', code);
      setCanvaToken(code);
      setIsConnected(true);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check if we have a stored Canva token
      const storedCanvaToken = localStorage.getItem('canva_auth_code') || 
                               localStorage.getItem('canva_access_token');
      if (storedCanvaToken) {
        setCanvaToken(storedCanvaToken);
        setIsConnected(true);
      }
    }
  }, [searchParams]);

  const handleConnect = async () => {
    window.location.href = "/api/canva/oauth-start";
  };

  const handleDisconnect = () => {
    localStorage.removeItem('canva_auth_code');
    localStorage.removeItem('canva_access_token');
    setCanvaToken("");
    setIsConnected(false);
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