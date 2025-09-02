"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import BusinessInfoTool from "@/components/BusinessInfoTool";

export default function BusinessInfoPage() {
  const { data: session, update } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to get a fresh token
  const refreshToken = async () => {
    setIsRefreshing(true);
    try {
      // Call your token refresh endpoint
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
      } else {
        // If refresh fails, force re-authentication
        window.location.href = '/api/auth/signin';
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Fallback to re-authentication
      window.location.href = '/api/auth/signin';
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (session) {
      const currentToken = session?.id_token || session?.accessToken || null;
      setToken(currentToken);
    }
  }, [session]);

  // Function to handle token validation before tool usage
  const getValidToken = async () => {
    if (!token) {
      await refreshToken();
      return token;
    }

    // Optional: Add token expiration check here
    // You can decode JWT and check exp claim
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = tokenPayload.exp * 1000 < Date.now();
      
      if (isExpired) {
        await refreshToken();
        return token;
      }
    } catch (error) {
      // If token parsing fails, refresh anyway
      await refreshToken();
      return token;
    }

    return token;
  };

  return (
    <div style={{ 
      maxWidth: 900, 
      margin: "24px auto", 
      padding: 32, 
      background: "#fff", 
      borderRadius: 10, 
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)" 
    }}>
      <h2 style={{ marginBottom: 24 }}>Business Info Tool</h2>
      {isRefreshing && (
        <div style={{ marginBottom: 16, color: "#666" }}>
          Refreshing authentication...
        </div>
      )}
      <BusinessInfoTool 
        token={token || ""} 
        onTokenExpired={refreshToken}
        getValidToken={getValidToken}
      />
    </div>
  );
}