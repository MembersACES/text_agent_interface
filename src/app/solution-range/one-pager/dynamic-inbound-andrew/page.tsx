import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dynamic Inbound (Andrew) - One Pager",
};

export default function DynamicInboundAndrewOnePager() {
  return (
    <>
      <Breadcrumb pageName="Dynamic Inbound (Andrew) - One Pager" />

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-4">Dynamic Inbound (Andrew)</h1>
          <p className="text-xl text-purple-100">
            A fully customized inbound agent for member-specific enquiries, connected directly to live data sheets and Twilio voice routing
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Member Call Reception</h3>
                <p className="text-gray-600">
                  Members call the dedicated number (0468 050 399) and are immediately connected to Andrew. 
                  The system identifies the caller and links to their member profile and partnership information.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Live Data Access</h3>
                <p className="text-gray-600">
                  Andrew accesses live data sheets connected to member-specific solutions, enabling real-time 
                  access to work in progress, action items, project status, and account information.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Personalized Responses</h3>
                <p className="text-gray-600">
                  The AI delivers personalized responses based on the member's specific data, handling complex 
                  logic splits and providing context-aware assistance. Each member receives information tailored 
                  to their partnership and active projects.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Instant Solution Access</h3>
                <p className="text-gray-600">
                  Member-specific solution sheets are accessed instantly, giving callers accurate, context-aware 
                  assistance without wait times. The system handles gas member enquiries, solution status updates, 
                  and project information requests.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Key Capabilities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <h3 className="font-bold text-purple-800 mb-3">Member-Specific Solution Handling</h3>
              <p className="text-gray-700 text-sm">
                Each member's enquiry is handled with access to their specific solutions, projects, 
                and partnership details, ensuring personalized and relevant responses.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-3">Dynamic Routing Based on Data</h3>
              <p className="text-gray-700 text-sm">
                Conversation flow adapts based on member data, enquiry type, and solution status, 
                ensuring the right information is delivered at the right time.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-3">Twilio-Powered Integration</h3>
              <p className="text-gray-700 text-sm">
                Seamless Twilio voice integration enables reliable call handling and routing, 
                with real-time connection to member data systems.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <h3 className="font-bold text-orange-800 mb-3">Gas Member Enquiry Management</h3>
              <p className="text-gray-700 text-sm">
                Specialized handling for gas member enquiries, with access to gas-specific solutions, 
                billing information, and account details.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Key Benefits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">⚡ Instant Access to Live Data</h3>
              <p className="text-gray-600 text-sm">
                Members receive real-time information from live data sheets, ensuring accurate, 
                up-to-date responses without delays or data sync issues.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">🎯 Personalized Member Experience</h3>
              <p className="text-gray-600 text-sm">
                Each member receives customized responses based on their specific solutions, projects, 
                and partnership status, creating a tailored experience.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">📊 Zero Wait Times</h3>
              <p className="text-gray-600 text-sm">
                Context-aware assistance is delivered instantly, with direct access to member-specific 
                solution sheets eliminating the need for lookups or callbacks.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">💼 Complex Logic Handling</h3>
              <p className="text-gray-600 text-sm">
                Advanced logic splits handle complex enquiry scenarios, ensuring members receive 
                appropriate information regardless of their enquiry type or data state.
              </p>
            </div>
          </div>
        </div>

        {/* Example Use Case Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Example Use Case</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Scenario: Gas Member Enquiry</h3>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Call:</span>
                <div>
                  <p>Member calls 0468 050 399 to check on the status of their gas solution project.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Identification:</span>
                <div>
                  <p>Andrew identifies the caller and links to their member profile and gas solution data.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    The system accesses live data sheets connected to the member's specific gas solution.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Response:</span>
                <div>
                  <p>Andrew provides real-time project status, including current phase, completed milestones, 
                  and next steps, all pulled from live member-specific solution sheets.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Information is personalized and context-aware, with logic splits handling different 
                    project states and enquiry types.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Result:</span>
                <div>
                  <p>Member receives immediate, accurate information without waiting for staff availability 
                  or callbacks.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    The conversation is logged for follow-up if needed, and the member's enquiry is fully resolved.
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
                  <span><strong>Production/Development:</strong> 0468 050 399</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Twilio-powered voice routing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Direct member profile integration</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Integration Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Live data sheet connections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Member-specific solution sheets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Complex logic split handling</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Real-time data synchronization</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-8 border border-purple-200 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Enhance Member Support?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Contact ACES to learn more about how Dynamic Inbound (Andrew) can provide personalized, 
            real-time member support with instant access to live data and member-specific solutions.
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

