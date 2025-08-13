import React, { useState } from "react";
import BusinessInfoDisplay from "./BusinessInfoDisplay";
import { getApiBaseUrl } from "@/lib/utils";

export default function BusinessInfoTool({ token }: { token: string }) {
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
      const res = await fetch(
        `${getApiBaseUrl()}/api/get-business-info`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`, 
          },
          body: JSON.stringify({ business_name: businessName }),
        }
      );
      console.log("🔍 Fetch completed, response:", res);
      
      // Check for 401 Unauthorized status
      if (res.status === 401) {
        console.log("🔍 401 Unauthorized - dispatching reauthentication event");
        
        // Dispatch custom event to trigger automatic reauthentication
        const apiErrorEvent = new CustomEvent('api-error', {
          detail: { 
            error: 'REAUTHENTICATION_REQUIRED',
            status: 401,
            message: 'Authentication expired'
          }
        });
        window.dispatchEvent(apiErrorEvent);
        
        // Set a user-friendly error message
        setError("Session expired. Please wait while we refresh your authentication...");
        return; // Don't throw error, just return
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
            <BusinessInfoDisplay info={businessInfo} />
          ) : (
            <pre>{JSON.stringify(businessInfo, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}