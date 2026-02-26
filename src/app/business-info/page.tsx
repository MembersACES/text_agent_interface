"use client";
import { useSession, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import BusinessInfoTool from "@/components/BusinessInfoTool";

export default function BusinessInfoPage() {
  const { data: session } = useSession();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      // Use ID token for Google authentication (backend expects this)
      const currentToken = session?.id_token || session?.accessToken || null;
      setToken(currentToken);
      console.log("Session:", session);
      console.log("Access token:", session?.accessToken ? "Present" : "Missing");
      console.log("ID token:", session?.id_token ? "Present" : "Missing");
      console.log("Using token:", currentToken ? "Present" : "Missing");
    }
  }, [session]);

  // Get fresh token from session when needed
  const getValidToken = async () => {
    console.log("🔄 Getting fresh token...");
    console.log("🔄 Current token:", token ? "Present" : "Missing");
    
    // Get the latest session data which includes refreshed tokens
    const freshSession = await getSession();
    console.log("🔄 Fresh session:", freshSession ? "Present" : "Missing");
    console.log("🔄 Fresh session accessToken:", freshSession?.accessToken ? "Present" : "Missing");
    console.log("🔄 Fresh session id_token:", freshSession?.id_token ? "Present" : "Missing");
    
    if (freshSession?.id_token || freshSession?.accessToken) {
      const newToken = freshSession.id_token || freshSession.accessToken || null;
      
      // Check if ID token is expired
      if (newToken && newToken.includes('.')) {
        try {
          const payload = JSON.parse(atob(newToken.split('.')[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          console.log("🔄 Token expiration check:", isExpired ? "EXPIRED" : "VALID");
          console.log("🔄 Token expires at:", new Date(payload.exp * 1000));
          
          if (isExpired) {
            console.log("🔄 ID token expired, forcing re-authentication");
            // Force re-authentication by redirecting to sign in with current page as callback
            const currentUrl = window.location.pathname + window.location.search;
            window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`;
            return null;
          }
        } catch (error) {
          console.log("🔄 Could not parse token, using anyway");
        }
      }
      
      setToken(newToken);
      console.log("🔄 Updated token from fresh session");
      return newToken;
    }
    
    console.log("🔄 Using existing token");
    return token;
  };

  return (
    <div style={{ 
      maxWidth: 1600, 
      margin: "24px auto", 
      padding: 32, 
      background: "#fff", 
      borderRadius: 10, 
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      textAlign: "center"
    }}>
      <h1 style={{ 
        fontSize: "3rem", 
        fontWeight: "bold", 
        marginBottom: 32, 
        textAlign: "center",
        color: "#1f2937",
        letterSpacing: "-0.02em"
      }}>Member Profile</h1>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <BusinessInfoTool 
          token={token || ""} 
          onTokenExpired={async () => {}} // AuthGate will handle re-authentication
          getValidToken={getValidToken}
        />
      </div>
    </div>
  );
}