"use client";
import React, { useState } from "react";
import type { SolutionOption } from "./solutions-data";

const GOOGLE_SLIDES_BASE = "https://docs.google.com/presentation/d/";

// Category color mapping
const getCategoryColor = (category: string) => {
  const colors = {
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
  };
  return colors[category as keyof typeof colors] || "from-gray-500 to-gray-600";
};

export default function EnhancedSolutionCard({ solution }: { solution: SolutionOption }) {
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const hasAgent = solution.phoneNumber || (solution.agentCapabilities?.length ?? 0) > 0;
  
  const handleCopyPhone = () => {
    if (solution.phoneNumber) {
      navigator.clipboard.writeText(solution.phoneNumber);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-blue-300 hover:-translate-y-1">
      {/* Card Header with Category Indicator */}
      <div className={`h-2 bg-gradient-to-r ${getCategoryColor(solution.category)}`}></div>
      
      <div className="p-5">
        {/* Main Content Section */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            {/* Title with Icon */}
            <div className="flex items-start gap-2 mb-2">
              <div className="mt-1">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getCategoryColor(solution.category)} p-1.5 text-white`}>
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors">
                  {solution.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {solution.description}
                </p>
              </div>
            </div>
          </div>

          {/* View Button */}
          <button
            onClick={() =>
              window.open(`${GOOGLE_SLIDES_BASE}${solution.presentationId}`, "_blank")
            }
            className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-medium flex items-center gap-2 whitespace-nowrap shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <span>View</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>

        {/* Digital Agent Section */}
        {hasAgent && (
          <div className="pt-4 border-t border-gray-100">
            {/* Agent Badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-green-700">AI Agent Available</span>
              </div>
              {solution.phoneNumber && (
                <span className="text-xs text-gray-500">24/7 Support</span>
              )}
            </div>

            {/* Phone Number Card */}
            {solution.phoneNumber && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Direct Line</p>
                      <span className="font-mono text-sm font-bold text-gray-900">
                        {solution.phoneNumber}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handleCopyPhone}
                      className="relative p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Copy number"
                    >
                      {copiedPhone ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => window.open(`tel:${solution.phoneNumber}`, "_blank")}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Call now"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Capabilities Section */}
            {solution.agentCapabilities && solution.agentCapabilities.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCapabilities(!showCapabilities)}
                  className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span>Agent Capabilities</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {solution.agentCapabilities.length}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${showCapabilities ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Capabilities List */}
                {showCapabilities && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2">
                    {solution.agentCapabilities.map((capability, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="mt-1 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-700 leading-relaxed">{capability}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}