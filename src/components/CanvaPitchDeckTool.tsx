import React, { useState } from "react";
import { getCanvaApiBaseUrl, getApiBaseUrl } from "@/lib/utils";

const COVER_PAGE_ID = "DAGuCqKd5EY";

const PITCH_DECK_TEMPLATES = [
  {
    category: "Test Templates",
    options: [
      { label: "Test Template 1", templateId: "DAGeGhhx5IE" },
      { label: "Solar Car Park", templateId: "DAGeGvaQLD4" },
    ],
  },
  {
    category: "Event Referral Program",
    options: [
      { label: "Event Referral Program", templateId: "DAGnh2YWW-o" },
    ],
  },
  {
    category: "Robotic AI & LLM",
    options: [
      { label: "All Bots", templateId: "DAGir91I0VU" },
    ],
  },
  {
    category: "Waste Sustainable Comparison",
    options: [
      { label: "Waste Review", templateId: "DAGkrjKiKr8" },
      { label: "Waste Solutions", templateId: "DAGeGjYauOo" },
    ],
  },
];

export default function CanvaPitchDeckTool({
  token,
  canvaToken,
}: {
  token: string;
  canvaToken: string;
}) {
  const [businessName, setBusinessName] = useState("Frankston RSL");
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [deckUrl, setDeckUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const getBusinessInfo = async () => {
    // Add these debug lines at the start
    console.log("🔍 API Base URL:", getApiBaseUrl());
    console.log("🔍 Full URL:", `${getApiBaseUrl()}/api/get-business-info`);
    console.log("🔍 Environment:", process.env.NEXT_PUBLIC_API_BASE_URL);
    console.log("🔍 Token (first 20 chars):", token?.substring(0, 20) + "...");
    console.log("🔍 Token type:", typeof token);
    console.log("🔍 Token length:", token?.length);
    
    setFetchingInfo(true);
    setBusinessInfo(null);
    setDeckUrl(null);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/get-business-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ business_name: businessName }),
      });
      console.log("📬 Response status:", res.status);
      console.log("📬 Response headers:", Object.fromEntries(res.headers.entries()));
      if (!res.ok) {
        const err = await res.json();
        console.log("❌ Error response:", err);
        throw new Error(err.detail || err.message || "Failed to fetch business info");
      }
      const data = await res.json();
      console.log("✅ Success response:", data);
      setBusinessInfo(data);
    } catch (err: any) {
      console.error("❌ Full error:", err);
      setError(err.message);
    } finally {
      setFetchingInfo(false);
    }
  };

  const generateDeck = async () => {
    setLoading(true);
    setDeckUrl(null);
    setError(null);
    try {
      const now = new Date();
      const payload = {
        business_name: businessName,
        business_info: businessInfo,
        selected_templates: [COVER_PAGE_ID, ...selectedTemplateIds],
        placeholders: {
          business_name: businessInfo?.business_details?.trading_name || businessName,
          month: now.toLocaleString('default', { month: 'long' }),
          year: now.getFullYear().toString(),
        },
      };
  
      console.log("📦 Canva payload:", payload);
  
      const res = await fetch(`${getCanvaApiBaseUrl()}/api/generate-canva-pitch-deck`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          canva_token: canvaToken,
        }),
      });      
  
      console.log("📬 Canva response status:", res.status);
  
      const result = await res.json();
      console.log("📨 Canva response body:", result);
  
      if (!res.ok) {
        if (res.status === 401) {
          setError("Canva connection expired. Please reconnect to Canva.");
          return;
        }
        throw new Error(result.error || "Failed to generate deck");
      }
  
      setDeckUrl(result.canva_url);
    } catch (err: any) {
      console.error("❌ Deck generation error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const businessDetails = businessInfo?.business_details || {};
  const representativeDetails = businessInfo?.representative_details || {};

  return (
    <div>
      <h2>Strategy Generator</h2>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="business-name-input" style={{ fontWeight: 600 }}>
          Business Name:
        </label>
        <input
          id="business-name-input"
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          style={{ marginLeft: 8, padding: 8, minWidth: 280 }}
        />
        <button onClick={getBusinessInfo} style={{ marginLeft: 10 }}>
        {fetchingInfo ? "Fetching..." : "Fetch Info"}
        </button>
        {fetchingInfo && <div style={{ marginTop: 8 }}>Retrieving business info...</div>}
      </div>

      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}

      {businessInfo && (
        <>
          <div style={{ marginBottom: 16 }}>
            <strong>Trading Name:</strong> {businessDetails.trading_name || "N/A"}
            <br />
            <strong>Client Name:</strong> {representativeDetails.contact_name || "N/A"}
            <br />
            <strong>ABN:</strong> {businessDetails.abn || "N/A"}
          </div>

          <h3>Select Strategy Pages:</h3>
          {PITCH_DECK_TEMPLATES.map(section => (
            <div key={section.category} style={{ marginBottom: 10 }}>
              <strong>{section.category}</strong>
              {section.options.map(option => (
                <label key={option.templateId} style={{ display: "block", marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={selectedTemplateIds.includes(option.templateId)}
                    onChange={() => toggleTemplate(option.templateId)}
                  />{" "}
                  {option.label}
                </label>
              ))}
            </div>
          ))}

          <button
            onClick={generateDeck}
            disabled={loading || selectedTemplateIds.length === 0}
            style={{ marginTop: 16 }}
          >
            {loading ? "Generating..." : "Generate Strategy"}
          </button>
        </>
      )}

      {deckUrl && (
        <div style={{ marginTop: 30 }}>
          <h3>Generated Strategy:</h3>
          <a
            href={deckUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#00c4cc",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: 600,
            }}
          >
            Open Strategy in Canva
          </a>
        </div>
      )}
    </div>
  );
}
