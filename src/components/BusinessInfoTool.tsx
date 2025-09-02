import React, { useState } from "react";
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

  const getBusinessInfo = async () => {
    console.log("🔍 API Base URL:", getApiBaseUrl());
    console.log("🔍 Full URL:", `${getApiBaseUrl()}/api/get-business-info`);
    console.log("🔍 Environment:", process.env.NEXT_PUBLIC_API_BASE_URL);
    setError(null);
    setBusinessInfo(null);
    setLoading(true);
    console.log("🔍 About to make fetch request...");
    
    try {
      // Get a fresh token if available
      let currentToken = token;
      if (getValidToken) {
        const freshToken = await getValidToken();
        if (freshToken) {
          currentToken = freshToken;
        }
      }

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
          // Fallback to custom event if onTokenExpired not available
          const apiErrorEvent = new CustomEvent('api-error', {
            detail: { 
              error: 'REAUTHENTICATION_REQUIRED',
              status: 401,
              message: 'Authentication expired'
            }
          });
          window.dispatchEvent(apiErrorEvent);
          setError("Session expired. Please wait while we refresh your authentication...");
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
      <div style={{ marginBottom: 24 }}>
        <label htmlFor="business-name-input" style={{ marginRight: 12, fontWeight: 600, fontSize: 18 }}>
          Business Name:
        </label>
        <input
          id="business-name-input"
          type="text"
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          placeholder="Enter a business name..."
          style={{ padding: "10px 16px", fontSize: "18px", minWidth: 280, borderRadius: 6, border: '1px solid #ccc', outline: 'none' }}
        />
      </div>
      <button
        onClick={getBusinessInfo}
        className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
        disabled={loading}
      >
        {loading ? "Loading..." : "Get Business Info"}
      </button>
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
      {businessInfo && (
        <div style={{ marginTop: 20, textAlign: "left" }}>
          <h3>Business Info:</h3>
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