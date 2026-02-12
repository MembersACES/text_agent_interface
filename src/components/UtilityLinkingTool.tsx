import React, { useState } from "react";

const UTILITY_OPTIONS = {
  WASTE: "WASTE",
  COOKING_OIL: "COOKING OIL",
  ELECTRICITY_CI: "ELECTRICITY C&I",
  ELECTRICITY_SME: "ELECTRICITY SME",
  GAS_CI: "GAS C&I",
  GAS_SME: "GAS SME",
  GREASE_TRAP: "GREASE TRAP",
  WATER: "WATER",
  CLEANING: "CLEANING",
};

interface UtilityLinkingToolProps {
  token: string;
  businessName: string;
  onBack: () => void;
}

export default function UtilityLinkingTool({ token, businessName, onBack }: UtilityLinkingToolProps) {
  const [selectedUtility, setSelectedUtility] = useState<string>("");
  const [utilityData, setUtilityData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUtilitySelect = async (utilityType: string) => {
    setSelectedUtility(utilityType);
    setError(null);
    setUtilityData(null);
    setLoading(true);

    try {
      const res = await fetch('https://membersaces.app.n8n.cloud/webhook/return_utility_info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          utility_type: utilityType,
          business_name: businessName 
        }),
      });

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
        
        setError("Session expired. Please wait while we refresh your authentication...");
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || "Unknown error");
      }

      const data = await res.json();
      setUtilityData(data);
    } catch (err: any) {
      console.log("🔍 Error caught:", err);
      
      if (err.message !== 'REAUTHENTICATION_REQUIRED') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onBack}
          className="px-3 py-2 rounded bg-gray-500 text-white font-semibold hover:bg-gray-600 focus:outline-none"
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
          Link Utility for {businessName}
        </h2>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>
          Select Utility Type:
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: 12 
        }}>
          {Object.entries(UTILITY_OPTIONS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleUtilitySelect(key)}
              disabled={loading}
              className={`
                px-4 py-3 rounded border-2 font-semibold transition-colors
                ${selectedUtility === key 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
            >
              {loading && selectedUtility === key ? "Loading..." : label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ 
          color: "#dc2626", 
          backgroundColor: "#fef2f2", 
          border: "1px solid #fecaca", 
          borderRadius: 6, 
          padding: 12, 
          marginBottom: 20 
        }}>
          Error: {error}
        </div>
      )}

      {utilityData && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>
            {UTILITY_OPTIONS[selectedUtility as keyof typeof UTILITY_OPTIONS]} Utility Information:
          </h3>
          <div style={{ 
            backgroundColor: "#f8fafc", 
            border: "1px solid #e2e8f0", 
            borderRadius: 8, 
            padding: 16 
          }}>
            {typeof utilityData === 'object' && utilityData !== null ? (
              <div>
                {Object.entries(utilityData).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}:
                    </strong>{' '}
                    {typeof value === 'object' && value !== null 
                      ? JSON.stringify(value, null, 2)
                      : String(value)
                    }
                  </div>
                ))}
              </div>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {JSON.stringify(utilityData, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}