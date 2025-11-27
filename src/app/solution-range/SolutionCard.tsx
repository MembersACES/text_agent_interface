"use client";
import React, { useState } from "react";
import type { SolutionOption } from "./solutions-data";

type SubSolution = Omit<SolutionOption, "category" | "presentationId" | "enabled">;
type SolutionLike = SolutionOption | SubSolution;

const GOOGLE_SLIDES_BASE = "https://docs.google.com/presentation/d/";
const GOOGLE_DRIVE_PDF_BASE = "https://drive.google.com/file/d/";

const getCategoryColor = (category?: string) => {
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
  return category ? colors[category as keyof typeof colors] : "from-gray-400 to-gray-500";
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

export default function EnhancedSolutionCard({ solution }: { solution: SolutionLike }) {
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const isSubCard = !("presentationId" in solution) && !("pdfUrl" in solution);
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

  return (
    <div
      className={`group bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 
      ${isSubCard ? "p-4 shadow-sm hover:shadow-md" : "hover:shadow-xl hover:border-blue-300 hover:-translate-y-1"}`}
    >
      {/* Category indicator (only for top-level solutions) */}
      {!isSubCard && (
        <div
          className={`h-2 bg-gradient-to-r ${getCategoryColor(
            (solution as SolutionOption).category
          )}`}
        ></div>
      )}

      <div className={`${isSubCard ? "pt-0" : "p-5"}`}>
       {/* Header */}
       <div className="mb-4">
          <div className="flex items-start gap-2 mb-2">
            <div className="mt-1">
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getCategoryColor(
                  (solution as SolutionOption).category
                )} p-1.5 text-white`}
              >
                <svg
                  className="w-full h-full"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold ${
                  isSubCard ? "text-sm" : "text-base"
                } text-gray-900 group-hover:text-blue-600 transition-colors`}
              >
                {solution.name}
              </h3>
              <div
                className={`text-gray-600 mt-1 ${
                  isSubCard ? "text-xs" : "text-sm"
                } whitespace-pre-line`}
              >
                {solution.description.split('\n').map((line, index) => {
                  // Check if line starts with bullet point
                  if (line.trim().startsWith('•')) {
                    return (
                      <div key={index} className="flex items-start gap-2 mt-1 first:mt-0">
                        <span className="text-gray-500 mt-0.5">•</span>
                        <span>{line.trim().substring(1).trim()}</span>
                      </div>
                    );
                  }
                  // Regular paragraph line
                  return line.trim() ? (
                    <p key={index} className={index > 0 ? "mt-2" : ""}>
                      {line}
                    </p>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          {/* Linked Numbers (Top-level cards only) */}
          {!isSubCard && solution.phoneNumber && (
            <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-200 space-y-1.5">
              {typeof solution.phoneNumber === "string" ? (
                <PhoneDisplay label="Direct Line" number={solution.phoneNumber} />
              ) : (
                <>
                  <PhoneDisplay
                    label="Production"
                    number={solution.phoneNumber.production}
                  />
                  <PhoneDisplay
                    label="Development"
                    number={solution.phoneNumber.development}
                  />
                </>
              )}
            </div>
          )}
          {/* Action buttons for top-level only - moved below content */}
          {!isSubCard && (("presentationId" in solution && solution.presentationId) || ("pdfUrl" in solution && solution.pdfUrl)) && (
            <div className="flex gap-2 mt-3">
              {("presentationId" in solution && solution.presentationId) ? (() => {
                const presentationId = (solution as SolutionOption).presentationId!;
                const isPlaceholder = presentationId.includes("PLACEHOLDER");
                return (
                  <button
                    onClick={() => {
                      if (!isPlaceholder) {
                        window.open(
                          `${GOOGLE_SLIDES_BASE}${presentationId}`,
                          "_blank"
                        );
                      }
                    }}
                    disabled={isPlaceholder}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 shadow-md ${
                      isPlaceholder
                        ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed opacity-75"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
                    }`}
                  >
                    <span>{isPlaceholder ? "View (Placeholder)" : "View"}</span>
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
                  </button>
                );
              })() : ("pdfUrl" in solution && solution.pdfUrl) ? (() => {
                const pdfUrl = (solution as SolutionOption).pdfUrl!;
                const isPlaceholder = pdfUrl.includes("PLACEHOLDER");
                return (
                  <button
                    onClick={() => {
                      if (!isPlaceholder) {
                        window.open(
                          `${GOOGLE_DRIVE_PDF_BASE}${pdfUrl}/view`,
                          "_blank"
                        );
                      }
                    }}
                    disabled={isPlaceholder}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 shadow-md ${
                      isPlaceholder
                        ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed opacity-75"
                        : "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 hover:shadow-lg"
                    }`}
                  >
                    <span>{isPlaceholder ? "View PDF (Placeholder)" : "View PDF"}</span>
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
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                );
              })() : null}
              
              {/* Custom Sheet button - shows with custom label */}
              {(solution as SolutionOption).customSheetUrl && (
                <button
                  onClick={() =>
                    window.open((solution as SolutionOption).customSheetUrl, "_blank")
                  }
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <span>{(solution as SolutionOption).customSheetLabel || "Sheet"}</span>
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
                </button>
              )}
            </div>
          )}
        </div>

        {/* Agent info (for both types) */}
        {hasAgent && (
          <div
            className={`pt-4 border-t border-gray-100 ${
              isSubCard ? "mt-2" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-green-700">
                  AI Agent Available
                </span>
              </div>
              {solution.phoneNumber && (
                <span className="text-xs text-gray-500">24/7 Support</span>
              )}
            </div>

            {solution.agentCapabilities && solution.agentCapabilities.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCapabilities(!showCapabilities)}
                  className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                    <span>Agent Capabilities</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {solution.agentCapabilities.length}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      showCapabilities ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showCapabilities && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2">
                    {solution.agentCapabilities.map((capability, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="mt-1 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-3 h-3 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-700 leading-relaxed">
                          {capability}
                        </span>
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