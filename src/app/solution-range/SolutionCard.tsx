"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { SolutionOption } from "./solutions-data";

type SubSolution = Omit<SolutionOption, "category" | "presentationId" | "enabled">;
type SolutionLike = SolutionOption | SubSolution;

const GOOGLE_SLIDES_BASE = "https://docs.google.com/presentation/d/";
const GOOGLE_DRIVE_PDF_BASE = "https://drive.google.com/file/d/";

const getCategoryColor = (category?: string) => {
  const colors: Record<string, string> = {
    platform: "from-green-500 to-emerald-600",
    ai_bots: "from-blue-500 to-indigo-600",
    ai_automation: "from-purple-500 to-pink-600",
    referral: "from-orange-500 to-red-600",
    profile_reset: "from-cyan-500 to-teal-600",
    renewable_energy: "from-yellow-500 to-orange-600",
    resource_recovery: "from-teal-500 to-cyan-600",
    asset_optimisation: "from-indigo-500 to-purple-600",
    other_solutions: "from-gray-500 to-slate-600",
    ghg: "from-green-600 to-teal-600",
    robot_finance: "from-amber-500 to-yellow-600",
    client_automation: "from-violet-500 to-purple-600",
    business_automation: "from-blue-600 to-indigo-700", // Added this line
  };
  return category ? colors[category] || "from-gray-500 to-gray-600" : "from-gray-400 to-gray-500";
};

function PhoneDisplay({ label, number }: { label?: string; number: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm border border-blue-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-2">
        {label && (
          <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
            {label}
          </span>
        )}
        <span className="font-mono text-sm font-medium text-gray-900">{number}</span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={handleCopy}
          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
          title="Copy number"
        >
          {copied ? "✅" : "📋"}
        </button>
        <button
          onClick={() => window.open(`tel:${number}`, "_blank")}
          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
          title="Call number"
        >
          ☎️
        </button>
      </div>
    </div>
  );
}

// Helper function to convert solution ID to URL slug
const solutionIdToSlug = (id: string): string => {
  const slugMap: Record<string, string> = {
    // Client Automation
    trojan_oil_docket_reader_client: "trojan-oil-docket-reader",
    extrusions_purchase_order_reader: "extrusions-purchase-order-reader",
    frankston_rsl_client_agent: "frankston-rsl-agent",
    pudu_multilanguage_maintenance_text_agent: "pudu-multilanguage-maintenance-agent",
    // AI Automation (Digital Voice Agents & Numbers)
    digital_voice_agents: "digital-inbound-receptionist",
    outbound_agent: "dynamic-outbound-andrew",
    dynamic_inbound_andrew: "dynamic-inbound-andrew",
    inbound_booking_alex: "inbound-booking-alex",
    pudu_maintenance_agent: "pudu-maintenance-agent",
    trojan_oil_docket_reader: "trojan-oil-api-docket-reader",
  };
  return slugMap[id] || id.replace(/_/g, "-");
};

export default function EnhancedSolutionCard({ solution }: { solution: SolutionLike }) {
  const router = useRouter();
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [activeTab, setActiveTab] = useState<"production" | "development">("production");

  // Check if this is a sub-solution (no category means it's nested)
  const isSubCard = !("category" in solution) || !solution.category;
  
  const hasAgent =
    Boolean(solution.phoneNumber) || (solution.agentCapabilities?.length ?? 0) > 0;

  const handleCopyPhone = () => {
    if (solution.phoneNumber) {
      navigator.clipboard.writeText(
        typeof solution.phoneNumber === "string"
          ? solution.phoneNumber
          : solution.phoneNumber.production
      );
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  // Extract agent name from solution name (e.g., "Inbound Booking Receptionist (Alex)" -> "Alex")
  const extractAgentName = (name: string): string | null => {
    const match = name.match(/\(([^)]+)\)/);
    return match ? match[1] : null;
  };

  // Get integration name from description or ID mapping
  const getIntegrationName = (solution: SolutionLike): string => {
    // Try to extract from description first
    const desc = solution.description.toLowerCase();
    if (desc.includes("obee")) return "OBEE System";
    if (desc.includes("n8n")) return "n8n Integration";
    if (desc.includes("twilio")) return "Twilio";
    if (desc.includes("aces api") || desc.includes("custom api")) return "ACES API";
    
    // Fallback to ID-based mapping
    if (solution.id === "inbound_booking_alex") return "OBEE System";
    if (solution.id === "pudu_maintenance_agent") return "n8n Integration";
    if (solution.id === "trojan_oil_docket_reader") return "ACES API";
    if (solution.id === "dynamic_inbound_andrew") return "Twilio";
    if (solution.id === "digital_voice_agents") return "Twilio";
    
    return "AI Agent";
  };

  const agentName = extractAgentName(solution.name);
  const integrationName = getIntegrationName(solution);
  const phoneNumber = typeof solution.phoneNumber === "string" 
    ? solution.phoneNumber 
    : (solution.phoneNumber && typeof solution.phoneNumber === "object"
      ? (solution.phoneNumber[activeTab] || solution.phoneNumber.production)
      : null);

  // Get the category, defaulting to a visible color if not present
  const category = "category" in solution ? solution.category : undefined;

  return (
    <div
      className={`group bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 
      ${isSubCard ? "p-4 shadow-sm hover:shadow-md" : "hover:shadow-xl hover:border-blue-300 hover:-translate-y-1"}`}
    >
      {/* Gradient Header Section - Always show for main cards */}
      {!isSubCard && (
        <div
          className={`bg-gradient-to-r ${getCategoryColor(category)} p-5 text-white`}
        >
          <div className="flex items-start gap-3">
            {/* Calendar Icon */}
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm p-2 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-white mb-1">
                {solution.name}
              </h3>
              {agentName && (
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>{agentName}</span>
                  {solution.id === "inbound_booking_alex" && <span>— Frankston RSL</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* White Background Section */}
      <div className={`${isSubCard ? "pt-0 p-4" : "p-5"}`}>
        {/* Description */}
        <div className="mb-4">
          <div className="text-sm text-gray-600 leading-relaxed">
            {solution.description.split('\n').map((line, index) => {
              if (line.trim().startsWith('•')) {
                return (
                  <div key={index} className="flex items-start gap-2 mt-1 first:mt-0">
                    <span className="text-gray-500 mt-0.5">•</span>
                    <span>{line.trim().substring(1).trim()}</span>
                  </div>
                );
              }
              return line.trim() ? (
                <p key={index} className={index > 0 ? "mt-2" : ""}>
                  {line}
                </p>
              ) : null;
            })}
          </div>
        </div>

        {/* Tabs for Production/Development (if phone number is an object) */}
        {!isSubCard && solution.phoneNumber && typeof solution.phoneNumber === "object" && (
          <div className="mb-4 flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("production")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "production"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Production
            </button>
            <button
              onClick={() => setActiveTab("development")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "development"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Development
            </button>
          </div>
        )}

        {/* Info Boxes: Phone Number and Integration */}
        {!isSubCard && (solution.phoneNumber || hasAgent) && (
          <div className={`grid gap-3 mb-4 ${solution.phoneNumber && hasAgent ? "grid-cols-2" : "grid-cols-1"}`}>
            {/* Phone Number Box */}
            {solution.phoneNumber && phoneNumber && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Phone Number
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span className="font-semibold text-gray-900 text-sm">
                    {phoneNumber}
                  </span>
                </div>
              </div>
            )}

            {/* Integration Box */}
            {hasAgent && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Integration
                </div>
                <div className="font-semibold text-gray-900 text-sm">
                  {integrationName}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Agent Available Banner */}
        {hasAgent && (
          <div className="mb-4 bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700">
                  AI Agent Available
                </span>
              </div>
              {solution.phoneNumber && (
                <span className="text-xs font-medium text-green-700 bg-white px-2 py-1 rounded-full">
                  24/7 Support
                </span>
              )}
            </div>
          </div>
        )}

        {/* Agent Capabilities Section */}
        {solution.agentCapabilities && solution.agentCapabilities.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Agent Capabilities</h4>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                {solution.agentCapabilities.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {solution.agentCapabilities.map((capability, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
                >
                  {capability.replace(/^[🤖📧📁🔗✅🔄📋📄⚠️]/g, '').trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isSubCard && (
          <div className="space-y-3">
            {/* Main View Button */}
            {((("presentationId" in solution && solution.presentationId) || 
               ("pdfUrl" in solution && solution.pdfUrl) || 
               ((solution as SolutionOption).customSheetUrl))) && (
              <button
                onClick={() => {
                  if ("presentationId" in solution && solution.presentationId && !solution.presentationId.includes("PLACEHOLDER")) {
                    window.open(`${GOOGLE_SLIDES_BASE}${solution.presentationId}`, "_blank");
                  } else if ("pdfUrl" in solution && solution.pdfUrl && !solution.pdfUrl.includes("PLACEHOLDER")) {
                    window.open(`${GOOGLE_DRIVE_PDF_BASE}${solution.pdfUrl}/view`, "_blank");
                  } else if ((solution as SolutionOption).customSheetUrl) {
                    const url = (solution as SolutionOption).customSheetUrl!;
                    if (url.startsWith("http") || url.startsWith("/")) {
                      if (url.startsWith("/")) {
                        router.push(url);
                      } else {
                        window.open(url, "_blank");
                      }
                    }
                  }
                }}
                className={`w-full px-4 py-3 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-md bg-gradient-to-r ${getCategoryColor(category)} text-white hover:shadow-lg hover:scale-[1.02]`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <span>
                  {hasAgent ? "View Agent Details" : "View Details"}
                </span>
              </button>
            )}

            {/* Transcripts and One Pager Buttons */}
            {(((solution as SolutionOption).customSheetUrl && 
               (solution as SolutionOption).customSheetLabel?.toLowerCase().includes("transcript")) ||
              (((solution as SolutionOption).category === "client_automation") || 
               ((solution as SolutionOption).category === "ai_automation"))) && (
              <div className={`grid gap-3 ${(
                ((solution as SolutionOption).customSheetUrl && 
                 (solution as SolutionOption).customSheetLabel?.toLowerCase().includes("transcript")) &&
                (((solution as SolutionOption).category === "client_automation") || 
                 ((solution as SolutionOption).category === "ai_automation"))
              ) ? "grid-cols-2" : "grid-cols-1"}`}>
                {/* Transcripts Button */}
                {((solution as SolutionOption).customSheetUrl && 
                  (solution as SolutionOption).customSheetLabel?.toLowerCase().includes("transcript")) && (
                  <button
                    onClick={() => {
                      const url = (solution as SolutionOption).customSheetUrl!;
                      if (url.startsWith("http")) {
                        window.open(url, "_blank");
                      }
                    }}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Transcripts</span>
                  </button>
                )}

                {/* One Pager Button */}
                {(((solution as SolutionOption).category === "client_automation") || 
                   ((solution as SolutionOption).category === "ai_automation")) && (
                  <button
                    onClick={() => {
                      const slug = solutionIdToSlug(solution.id);
                      router.push(`/solution-range/one-pager/${slug}`);
                    }}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>One Pager</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}