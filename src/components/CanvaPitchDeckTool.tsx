import React, { useState } from "react";
import { getCanvaApiBaseUrl, getApiBaseUrl } from "@/lib/utils";

const COVER_PAGE_ID = "EAGubwPi5xA";

const PITCH_DECK_TEMPLATES = [
  {
    category: "Test Templates",
    options: [
      { label: "Test Template 1", templateId: "EAGubwdp7rQ" },
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
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [canvaUrls, setCanvaUrls] = useState<string[]>([]);
  const [workflowInstructions, setWorkflowInstructions] = useState<string[]>([]);
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
    setFetchingInfo(true);
    setBusinessInfo(null);
    setMergedPdfUrl(null);
    setCanvaUrls([]);
    setWorkflowInstructions([]);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/get-business-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ business_name: businessName }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch business info");
      setBusinessInfo(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetchingInfo(false);
    }
  };

  const generateDeck = async () => {
    setLoading(true);
    setMergedPdfUrl(null);
    setCanvaUrls([]);
    setWorkflowInstructions([]);
    setError(null);
    try {
      const now = new Date();
      const payload = {
        business_name: businessName,
        business_info: businessInfo,
        selected_templates: [COVER_PAGE_ID, ...selectedTemplateIds],
        placeholders: {
          business_name: businessInfo?.business_details?.trading_name || businessName,
          month: now.toLocaleString("default", { month: "long" }),
          year: now.getFullYear().toString(),
        },
      };

      const res = await fetch(`${getCanvaApiBaseUrl()}/api/generate-canva-pitch-deck`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, canva_token: canvaToken }),
      });

      const result = await res.json();
      console.log("🎯 Full API response:", result);
      
      if (!res.ok) throw new Error(result.error || "Failed to generate deck");

      if (result.canva_urls && Array.isArray(result.canva_urls)) {
        console.log("✅ Found canva_urls:", result.canva_urls);
        setCanvaUrls(result.canva_urls);
        
        if (result.detailed_instructions) {
          setWorkflowInstructions(result.detailed_instructions);
        }
        
        console.log("ℹ️ Teams workflow - showing edit URLs for manual combination");
        
      } else if (result.pdf_urls && Array.isArray(result.pdf_urls)) {
        console.log("📄 Found PDF URLs - attempting merge");
        const mergeRes = await fetch("/api/merge-pdfs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf_urls: result.pdf_urls }),
        });

        if (!mergeRes.ok) throw new Error("Failed to merge PDFs");
        const blob = await mergeRes.blob();
        setMergedPdfUrl(URL.createObjectURL(blob));
      } else {
        console.error("❌ Unexpected response format:", result);
        throw new Error("No template URLs found in response. Check if templates exist and are accessible.");
      }
    } catch (err: any) {
      console.error("🔥 Generate deck error:", err);
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
                  /> {option.label}
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

      {canvaUrls.length > 0 && (
        <div style={{ marginTop: 30, padding: 20, backgroundColor: "#f0f9ff", borderRadius: 8, border: "1px solid #0ea5e9" }}>
          <h3>🎯 Your Strategy Templates are Ready!</h3>
          <p style={{ marginBottom: 16, color: "#0c4a6e" }}>
            <strong>Teams Account Workflow:</strong> Open your templates below, combine them manually, and download as one PDF.
          </p>
          
          <div style={{ marginBottom: 20 }}>
            <h4>📋 Template Links:</h4>
            {canvaUrls.map((url, index) => (
              <div key={index} style={{ marginBottom: 8 }}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    backgroundColor: "#0ea5e9",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: "4px",
                    fontWeight: 500,
                    marginRight: 8
                  }}
                >
                  {index === 0 ? "🎯 Main Template" : `📋 Template ${index + 1}`}
                </a>
                <span style={{ color: "#64748b", fontSize: "14px" }}>
                  {index === 0 ? "(Edit this one)" : "(Copy content from this)"}
                </span>
              </div>
            ))}
          </div>

          {workflowInstructions.length > 0 && (
            <div>
              <h4>📝 Step-by-Step Instructions:</h4>
              <ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
                {workflowInstructions.map((instruction, index) => (
                  <li key={index} style={{ marginBottom: 4 }}>
                    {instruction}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {mergedPdfUrl && (
        <div style={{ marginTop: 30 }}>
          <h3>Merged Strategy PDF:</h3>
          <a
            href={mergedPdfUrl}
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
            Open Merged PDF
          </a>
        </div>
      )}
    </div>
  );
}