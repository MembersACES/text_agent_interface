import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dynamic Outbound (Andrew) - One Pager",
};

export default function DynamicOutboundAndrewOnePager() {
  return (
    <>
      <Breadcrumb pageName="Dynamic Outbound (Andrew) - One Pager" />

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-4">Dynamic Outbound (Andrew)</h1>
          <p className="text-xl text-purple-100">
            A dynamic outbound calling engine for campaigns, follow-ups, and data-driven messaging with personalized, consistent, and compliant conversations
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Campaign Setup</h3>
                <p className="text-gray-600">
                  Campaign data is prepared in Google Sheets with contact information, context variables, 
                  and logic conditions. The system reads this data to determine call parameters and messaging approach.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Intelligent Outbound Dialing</h3>
                <p className="text-gray-600">
                  Andrew automatically dials contacts from the campaign sheet. Each call is personalized 
                  based on the contact's data, using sheet-based variables to tailor the conversation 
                  approach and messaging.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Dynamic Flow Adjustment</h3>
                <p className="text-gray-600">
                  During the call, Andrew adapts the conversation using real-time logic splits and conditional flows:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                    <li><strong>Electricity Demand Response Flow:</strong> Presents tailored demand response program information</li>
                    <li><strong>Gas Discrepancy Review Flow:</strong> Explains discrepancies and gathers confirmation</li>
                    <li><strong>Default Logic Flow:</strong> Handles unclassified situations with graceful fallback</li>
                  </ul>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Call Logging & Follow-up</h3>
                <p className="text-gray-600">
                  All outbound calls are automatically logged in Google Sheets with conversation details, 
                  outcomes, and follow-up requirements. The system tracks campaign progress and manages 
                  automated follow-ups based on call results.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Special Features Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Special Features</h2>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-600 font-bold text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-yellow-800 font-semibold">OUTBOUND CALLS ONLY</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Andrew does not answer incoming calls. This number is exclusively for outbound campaigns and inbound callbacks.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <h3 className="font-bold text-purple-800 mb-3">Data-Driven Personalization</h3>
              <p className="text-gray-700 text-sm">
                Each call is personalized using data from Google Sheets, ensuring relevant, context-aware 
                conversations that resonate with each contact.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-3">Logic-Based Routing</h3>
              <p className="text-gray-700 text-sm">
                Dynamic logic splits determine conversation flow based on contact type, eligibility, 
                and campaign parameters, ensuring appropriate messaging for each situation.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-3">Compliant Conversations</h3>
              <p className="text-gray-700 text-sm">
                All conversations follow compliance guidelines and regulatory requirements, with 
                built-in safeguards for data handling and consent management.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <h3 className="font-bold text-orange-800 mb-3">Campaign Management</h3>
              <p className="text-gray-700 text-sm">
                Full campaign tracking and management capabilities, with automated follow-ups, 
                outcome tracking, and performance reporting.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Key Benefits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">⚡ Scalable Outreach</h3>
              <p className="text-gray-600 text-sm">
                Automate outbound calling campaigns at scale, reaching hundreds of contacts efficiently 
                while maintaining personalized communication quality.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">🎯 Personalized Messaging</h3>
              <p className="text-gray-600 text-sm">
                Each call is tailored using contact data and context variables, ensuring relevant, 
                engaging conversations that improve response rates.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">📊 Complete Tracking</h3>
              <p className="text-gray-600 text-sm">
                Every call is logged with detailed outcomes, enabling comprehensive campaign analysis 
                and performance optimization.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">💼 Time Efficiency</h3>
              <p className="text-gray-600 text-sm">
                Automate routine outbound calls, freeing staff time for complex follow-ups and 
                strategic relationship building.
              </p>
            </div>
          </div>
        </div>

        {/* Example Use Case Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Example Use Case</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Scenario: Electricity Demand Response Campaign</h3>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Setup:</span>
                <div>
                  <p>Campaign sheet is prepared with eligible business contacts, including business type, 
                  electricity usage profiles, and eligibility status.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Outbound Call:</span>
                <div>
                  <p>Andrew dials each contact and presents tailored demand response program information.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Logic splits determine the conversation flow based on business type and eligibility, 
                    ensuring appropriate messaging for each contact.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Interaction:</span>
                <div>
                  <p>During the call, Andrew answers questions, handles objections, and collects interest levels.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    The conversation adapts in real-time based on the contact's responses and engagement level.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Result:</span>
                <div>
                  <p>Call outcomes are logged, including interest level, next steps, and follow-up requirements.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Interested contacts are automatically scheduled for follow-up, while outcomes are tracked 
                    for campaign performance analysis.
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
              <h3 className="font-semibold text-gray-800 mb-3">Phone Number</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span><strong>Production/Development:</strong> 0483 938 365</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Outbound calls and inbound callbacks only</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Twilio-powered voice routing</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Integration Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Google Sheets campaign data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Dynamic logic splits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Automatic call logging</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Campaign performance tracking</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-8 border border-purple-200 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Automate Your Outbound Campaigns?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Contact ACES to learn more about how Dynamic Outbound (Andrew) can transform your 
            outreach campaigns with personalized, scalable, and compliant calling automation.
          </p>
          <a
            href="/solution-range"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Back to Solution Range
          </a>
        </div>
      </div>
    </>
  );
}

