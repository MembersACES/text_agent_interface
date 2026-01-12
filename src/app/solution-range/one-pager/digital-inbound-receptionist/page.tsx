import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Digital Inbound Receptionist - One Pager",
};

export default function DigitalInboundReceptionistOnePager() {
  return (
    <>
      <Breadcrumb pageName="Digital Inbound Receptionist - One Pager" />

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-4">Digital Inbound Receptionist</h1>
          <p className="text-xl text-purple-100">
            AI-powered voice agents that handle calls, route enquiries, and assist with energy, cleaning, and general business operations
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Call Reception</h3>
                <p className="text-gray-600">
                  Incoming calls are automatically answered by the AI receptionist system. Callers are greeted professionally 
                  and the AI determines the purpose of their call through natural conversation.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Intelligent Routing</h3>
                <p className="text-gray-600">
                  Based on the caller's enquiry, the system routes the call to the appropriate specialist agent:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                    <li><strong>ACES Receptionist (Mary):</strong> Primary receptionist handling general enquiries and transfers</li>
                    <li><strong>Energy Expert (Alex):</strong> Specialized agent for commercial & industrial electricity and gas enquiries</li>
                    <li><strong>Cleaning Expert (George):</strong> Specialized agent for autonomous cleaning robot enquiries</li>
                  </ul>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Conversational AI Processing</h3>
                <p className="text-gray-600">
                  The AI agents use natural language processing to understand caller needs, provide relevant information, 
                  collect details, and handle enquiries professionally. Each specialist agent has domain-specific knowledge 
                  and capabilities.
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
                  All calls are automatically transcribed and logged in Google Sheets. Complex enquiries are escalated 
                  to human staff members, while standard queries are handled end-to-end by the AI system.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Specialist Agents Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Specialist Agents</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <h3 className="font-bold text-purple-800 mb-3 text-lg">ACES Receptionist (Mary)</h3>
              <p className="text-gray-700 text-sm mb-4">
                Primary voice assistant handling all incoming calls, client enquiries, and transfers to specialist departments.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">✓</span>
                  <span>Greet callers and determine purpose of call</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">✓</span>
                  <span>Transfer to Energy or Cleaning agents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">✓</span>
                  <span>Collect details and log enquiries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">✓</span>
                  <span>Escalate complex issues</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-3 text-lg">Energy Expert (Alex)</h3>
              <p className="text-gray-700 text-sm mb-4">
                Specialized voice agent for commercial & industrial electricity and gas enquiries.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Explain electricity and gas concepts (NMI, MIRN, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Clarify bill structures and tariffs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Escalate contract/pricing queries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>C&I customers only</span>
                </li>
              </ul>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-3 text-lg">Cleaning Expert (George)</h3>
              <p className="text-gray-700 text-sm mb-4">
                Specialized voice agent for autonomous cleaning robot enquiries and trials.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Explain robot functionality, safety, and efficiency</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Discuss ROI and sustainability metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Collect trial enquiry details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Provide calm, informative explanations</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Key Benefits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">🕐 24/7 Availability</h3>
              <p className="text-gray-600 text-sm">
                Calls are answered instantly at any time of day or night, ensuring no enquiry goes unanswered 
                and improving customer service availability.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">⚡ Instant Response</h3>
              <p className="text-gray-600 text-sm">
                No waiting on hold or call queues. Callers receive immediate assistance and can be routed 
                to the right specialist instantly.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">🎯 Specialized Expertise</h3>
              <p className="text-gray-600 text-sm">
                Specialist agents provide domain-specific knowledge, ensuring callers receive accurate, 
                relevant information tailored to their enquiry type.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">📊 Comprehensive Logging</h3>
              <p className="text-gray-600 text-sm">
                All calls are automatically transcribed and logged, providing a complete record for 
                analysis, follow-up, and quality assurance.
              </p>
            </div>
          </div>
        </div>

        {/* Example Use Case Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Example Use Case</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Scenario: Energy Bill Enquiry</h3>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Caller dials:</span>
                <span>0340 519 216 (Production) or 0483 902 753 (Development)</span>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Mary answers:</span>
                <div>
                  <p>"Hello, thank you for calling ACES. How can I help you today?"</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Caller explains they have questions about their electricity bill.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Routing:</span>
                <div>
                  <p>Mary transfers the call to Alex, the Energy Expert.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Alex provides detailed explanations about bill structure, tariffs, and metering concepts.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Result:</span>
                <div>
                  <p>Caller's enquiry is resolved, and the conversation is logged in the transcript sheet.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    If pricing or contract queries arise, Alex escalates to human staff for follow-up.
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
              <h3 className="font-semibold text-gray-800 mb-3">Phone Numbers</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span><strong>Production:</strong> 0340 519 216</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span><strong>Development:</strong> 0483 902 753</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Twilio-powered voice routing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Natural language processing</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Integration Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Automatic call transcription</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Google Sheets logging</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Intelligent call routing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Multi-agent specialization</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-8 border border-purple-200 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Enhance Your Call Handling?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Contact ACES to learn more about how the Digital Inbound Receptionist can transform your 
            customer service operations with 24/7 AI-powered call handling.
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

