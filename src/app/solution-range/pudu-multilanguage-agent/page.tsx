"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

const CHATBOT_URL = "https://pudu-chatbot-672026052958.australia-southeast2.run.app/";

const languages = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", nativeName: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", nativeName: "Português", flag: "🇵🇹" },
  { code: "zh", name: "简体中文", nativeName: "简体中文", flag: "🇨🇳" },
  { code: "ko", name: "한국어", nativeName: "한국어", flag: "🇰🇷" },
  { code: "th", name: "ไทย", nativeName: "ไทย", flag: "🇹🇭" },
];

export default function PuduMultilanguageAgentPage() {
  const handleLanguageSelect = (languageCode: string, mode: "text" | "voice") => {
    // Open the chatbot URL - the chatbot interface already handles language selection
    window.open(CHATBOT_URL, "_blank");
  };

  return (
    <>
      <Breadcrumb pageName="Pudu Multilanguage Maintenance Text Agent" />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">ROBOT MAINTENANCE SUPPORT TERMINAL</h1>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
              <span className="text-sm">TEXT</span>
              <span className="text-gray-400">|</span>
              <span className="text-sm">VOICE</span>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Select Language & Communication Mode
              </h2>
              <p className="text-gray-600">
                Choose your language and how you&apos;d like to interact with the maintenance agent
              </p>
            </div>

            {/* Language Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {languages.map((lang) => (
                <div
                  key={lang.code}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{lang.flag}</span>
                      <div>
                        <div className="font-semibold text-gray-900">{lang.name}</div>
                        <div className="text-xs text-gray-500 uppercase">{lang.code}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLanguageSelect(lang.code, "text")}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      TEXT
                    </button>
                    <button
                      onClick={() => handleLanguageSelect(lang.code, "voice")}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      VOICE
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Access Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => window.open(CHATBOT_URL, "_blank")}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium flex items-center justify-center gap-2"
              >
                <span>Access Full Chatbot Interface</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">About the Multilanguage Agent</h3>
            <p className="text-gray-600 mb-4">
              The Pudu Multilanguage Maintenance Text Agent (Cindy) provides 24/7 support for Pudu CC1 
              robot maintenance in 10 languages. The agent can help with:
            </p>
            <ul className="space-y-2 text-gray-600 list-disc list-inside">
              <li>Troubleshooting common issues (water leaks, power problems, suction issues, drainage)</li>
              <li>Daily maintenance procedures and guidance</li>
              <li>Consumable replacement schedules (brushes, filters, cloths, rubber strips)</li>
              <li>Step-by-step repair instructions</li>
              <li>Escalation to specialist technicians for complex issues</li>
            </ul>
          </div>

          {/* Back Button */}
          <div className="mt-6 text-center">
            <a
              href="/solution-range"
              className="inline-block px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Solution Range
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
