import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pudu Multilanguage Maintenance Text Agent - One Pager",
};

export default function PuduMultilanguageMaintenanceAgentOnePager() {
  return (
    <>
      <Breadcrumb pageName="Pudu Multilanguage Maintenance Text Agent - One Pager" />

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-4">Pudu Multilanguage Maintenance Text Agent</h1>
          <p className="text-xl text-purple-100">
            A multilingual text and voice support agent for Pudu CC1 robot maintenance, available in 10 languages
          </p>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">How It Works</h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Language Selection</h3>
                <p className="text-gray-600">
                  Users access the multilingual agent interface and select their preferred language from 
                  10 available options: English, Français, Español, Deutsch, Italiano, Português, 
                  简体中文, 한국어, ไทย. They can choose between text or voice communication modes.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Multilingual Agent Response</h3>
                <p className="text-gray-600">
                  The AI agent (Cindy) responds in the selected language, providing maintenance support 
                  and troubleshooting guidance tailored to the customer&apos;s language preference. 
                  Each language version uses native language responses for natural communication.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Maintenance Support</h3>
                <p className="text-gray-600">
                  The agent provides comprehensive support including:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 ml-0">
                  <li>Troubleshooting common issues (water leaks, power problems, suction issues, drainage)</li>
                  <li>Daily maintenance procedures and guidance</li>
                  <li>Consumable replacement schedules (brushes, filters, cloths, rubber strips)</li>
                  <li>Step-by-step repair instructions</li>
                  <li>Escalation to specialist technicians for complex issues</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Issue Resolution & Reporting</h3>
                <p className="text-gray-600">
                  The agent collects business information and issue details, provides solutions, and 
                  escalates complex problems to specialist technicians when needed. All interactions 
                  are logged for quality assurance and follow-up.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Supported Languages Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Supported Languages</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { code: "EN", name: "English", native: "English" },
              { code: "FR", name: "Français", native: "Français" },
              { code: "ES", name: "Español", native: "Español" },
              { code: "DE", name: "Deutsch", native: "Deutsch" },
              { code: "IT", name: "Italiano", native: "Italiano" },
              { code: "PT", name: "Português", native: "Português" },
              { code: "ZH", name: "简体中文", native: "简体中文" },
              { code: "KO", name: "한국어", native: "한국어" },
              { code: "TH", name: "ไทย", native: "ไทย" },
            ].map((lang) => (
              <div key={lang.code} className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 text-center">
                <div className="font-bold text-purple-700 text-lg mb-1">{lang.name}</div>
                <div className="text-xs text-gray-600 uppercase">{lang.code}</div>
                <div className="text-sm text-gray-700 mt-1">{lang.native}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Key Benefits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">🌍 Global Accessibility</h3>
              <p className="text-gray-600 text-sm">
                Support available in 10 languages, breaking down language barriers and enabling 
                customers worldwide to receive maintenance assistance in their native language.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">🕐 24/7 Multilingual Support</h3>
              <p className="text-gray-600 text-sm">
                Customers can access maintenance support at any time in their preferred language, 
                without waiting for business hours or language-specific staff availability.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">💬 Text & Voice Options</h3>
              <p className="text-gray-600 text-sm">
                Users can choose between text or voice communication modes, providing flexibility 
                for different preferences and situations.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">📚 Consistent Knowledge Base</h3>
              <p className="text-gray-600 text-sm">
                All language versions access the same comprehensive knowledge base, ensuring 
                consistent, accurate information regardless of language selection.
              </p>
            </div>
          </div>
        </div>

        {/* Example Use Case Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Example Use Case</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Scenario: International Customer Support</h3>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Setup:</span>
                <div>
                  <p>A customer in France needs help with their Pudu CC1 robot maintenance.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    They prefer to communicate in French rather than English.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Language Selection:</span>
                <div>
                  <p>The customer accesses the multilingual agent and selects &quot;Français&quot; (French).</p>
                  <p className="text-sm text-gray-600 mt-1">
                    They choose text communication mode for written documentation of the troubleshooting steps.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Support Interaction:</span>
                <div>
                  <p>The agent (Cindy) responds entirely in French, providing troubleshooting guidance 
                  and maintenance procedures in the customer&apos;s native language.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    The customer can understand instructions clearly without language barriers, 
                    leading to faster issue resolution.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Result:</span>
                <div>
                  <p>The customer successfully resolves their maintenance issue with clear, 
                  native-language guidance.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    No need for translation services or English-speaking staff, resulting in 
                    improved customer satisfaction and reduced support costs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Technical Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Access Method</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Web-based chatbot interface</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>10 language options</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Text and voice communication modes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Cloud-hosted solution</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Multilingual AI responses</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Shared knowledge base across all languages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Pudu CC1 maintenance expertise</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>24/7 availability</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-8 border border-purple-200 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Provide Multilingual Support?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Contact ACES to learn more about how the Pudu Multilanguage Maintenance Text Agent can 
            provide global customer support in 10 languages.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/solution-range"
              className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Back to Solution Range
            </a>
            <a
              href="/solution-range/pudu-multilanguage-agent"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Access Language Selector
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
