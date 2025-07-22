import React, { useState } from "react";
import BusinessInfoDisplay from "./BusinessInfoDisplay";
import { getApiBaseUrl } from "@/lib/utils";

export default function BusinessInfoTool({ token }: { token: string }) {
  const [businessName, setBusinessName] = useState("Frankston RSL");
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getBusinessInfo = async () => {
    setError(null);
    setBusinessInfo(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/get-business-info?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business_name: businessName }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Unknown error");
      }
      const data = await res.json();
      setBusinessInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
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
        style={{ padding: "10px 20px", fontSize: "16px" }}
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