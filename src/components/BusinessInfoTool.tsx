import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import BusinessInfoDisplay from "./BusinessInfoDisplay";
import { getApiBaseUrl } from "@/lib/utils";

interface BusinessInfoToolProps {
  token: string;
  onTokenExpired?: () => Promise<void>;
  getValidToken?: () => Promise<string | null>;
}

export default function BusinessInfoTool({ 
  token, 
  onTokenExpired, 
  getValidToken 
}: BusinessInfoToolProps) {
  const [businessName, setBusinessName] = useState("Frankston RSL");
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasAutoSubmitted = useRef(false);

  const getBusinessInfo = async () => {
    console.log("🔍 API Base URL:", getApiBaseUrl());
    console.log("🔍 Full URL:", `${getApiBaseUrl()}/api/get-business-info`);
    console.log("🔍 Environment:", process.env.NEXT_PUBLIC_API_BASE_URL);
    setError(null);
    //setBusinessInfo(null);
    setLoading(true);
    console.log("🔍 About to make fetch request...");
    
    try {
      // Get a fresh token if available
      let currentToken = token;
      console.log("🔍 Initial token:", currentToken ? "Present" : "Missing");
      
      if (getValidToken) {
        const freshToken = await getValidToken();
        console.log("🔍 Fresh token from getValidToken:", freshToken ? "Present" : "Missing");
        if (freshToken) {
          currentToken = freshToken;
          console.log("🔍 Using fresh token");
        }
      }
      
      console.log("🔍 Final token being used:", currentToken ? "Present" : "Missing");
      console.log("🔍 Token preview:", currentToken ? currentToken.substring(0, 50) + "..." : "No token");

      // If we still don't have a token, trigger re-authentication
      if (!currentToken && onTokenExpired) {
        await onTokenExpired();
        setError("Authentication required. Please try again.");
        return;
      }

      const res = await fetch(
        `${getApiBaseUrl()}/api/get-business-info`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`, 
          },
          body: JSON.stringify({ business_name: businessName }),
        }
      );
      console.log("🔍 Fetch completed, response:", res);
      
      // Check for 401 Unauthorized status
      if (res.status === 401) {
        console.log("🔍 401 Unauthorized - triggering token refresh");
        
        if (onTokenExpired) {
          await onTokenExpired();
          setError("Session expired. Authentication refreshed - please try again.");
        } else {
          // Fallback: redirect to sign in with current page as callback
          const currentUrl = window.location.pathname + window.location.search;
          window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`;
          setError("Session expired. Redirecting to sign in...");
        }
        return;
      }
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Unknown error");
      }
      
      const data = await res.json();
      setBusinessInfo(data);
    } catch (err: any) {
      console.log("🔍 Error caught:", err);
      
      // Only set error if it's not a reauthentication issue
      if (err.message !== 'REAUTHENTICATION_REQUIRED') {
        setError(err.message);
      }
    } finally {
      console.log("🔍 Finally block reached");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAutoSubmitted.current) {
      const params = new URLSearchParams(window.location.search);
      const urlBusinessName = params.get('businessName');
      
      if (urlBusinessName) {
        setBusinessName(urlBusinessName);
        hasAutoSubmitted.current = true;
        
        // Trigger search after a short delay to ensure state is updated
        const timer = setTimeout(() => {
          getBusinessInfo();
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [businessName]); // Add businessName to dependencies

  const handleLinkUtility = () => {
    const params = new URLSearchParams();
    const actualBusinessName = businessInfo?.business_details?.name || businessName;
    params.set('businessName', actualBusinessName);
    params.set('token', token);
    
    const url = `/utility-linking?${params.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label htmlFor="business-name-input" style={{ fontWeight: 600, fontSize: 18 }}>
          Business Name:
        </label>
        <input
          id="business-name-input"
          type="text"
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          placeholder="Enter a business name..."
          style={{ padding: "10px 16px", fontSize: "18px", minWidth: 280, borderRadius: 6, border: '1px solid #ccc', outline: 'none', flex: '1 1 auto', maxWidth: 400 }}
        />
        <button
          onClick={getBusinessInfo}
          className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Loading..." : "Get Client Profile"}
        </button>
      </div>
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
      {businessInfo && typeof businessInfo === "object" && businessInfo !== null && (businessInfo as any).client_id != null && (
        <div style={{ marginTop: 10, fontSize: 14, color: "var(--color-fg-muted, #57606a)" }}>
          Client saved.{" "}
          <Link href={`/clients/${(businessInfo as any).client_id}`} className="text-blue-600 hover:underline">
            View client
          </Link>
        </div>
      )}
      {businessInfo && (
        <div style={{ marginTop: 20, textAlign: "left" }}>
          {typeof businessInfo === 'object' && businessInfo !== null ? (
            <BusinessInfoDisplay 
              info={businessInfo} 
              onLinkUtility={handleLinkUtility}
              setInfo={setBusinessInfo}
            />
          ) : (
            <pre>{JSON.stringify(businessInfo, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}