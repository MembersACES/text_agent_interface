"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import BusinessInfoTool from "@/components/BusinessInfoTool";

export default function BusinessInfoPage() {
  const { data: session, update } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to handle re-authentication
  const refreshToken = async () => {
    setIsRefreshing(true);
    try {
      // Simply redirect to sign-in - no need for complex refresh logic
      window.location.href = '/api/auth/signin';
    } catch (error) {
      console.error("Re-authentication failed:", error);
      window.location.href = '/api/auth/signin';
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (session) {
      // Use ID token for basic authentication
      const currentToken = session?.id_token || null;
      setToken(currentToken);
      console.log("🔍 Session:", session);
      console.log("🔍 Using ID token:", currentToken ? "Present" : "Missing");
    }
  }, [session]);

  // Function to handle token validation before tool usage
  const getValidToken = async () => {
    if (!token) {
      await refreshToken();
      return null;
    }

    // Check if token is expired
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = tokenPayload.exp * 1000 < Date.now();
      
      if (isExpired) {
        await refreshToken();
        return null;
      }
    } catch (error) {
      // If token parsing fails, assume it's invalid
      await refreshToken();
      return null;
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