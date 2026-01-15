import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pudu Maintenance Support Agent (Cindy) - One Pager",
};

export default function PuduMaintenanceAgentOnePager() {
  return (
    <>
      <Breadcrumb pageName="Pudu Maintenance Support Agent (Cindy) - One Pager" />

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-4">Pudu Maintenance Support Agent (Cindy)</h1>
          <p className="text-xl text-purple-100">
            Specialized maintenance support agent for troubleshooting, repairs, and daily care for the Pudu CC1 autonomous cleaning robot
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Customer Support Call</h3>
                <p className="text-gray-600">
                  Customers call the dedicated number (0482 086 553) and are connected to Cindy, 
                  the AI maintenance support agent. Cindy greets callers and understands their 
                  maintenance or troubleshooting needs.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Fault Diagnosis</h3>
                <p className="text-gray-600">
                  Cindy diagnoses common faults and issues with the Pudu CC1 robot, including:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                    <li>Water leaks and drainage problems</li>
                    <li>Power and charging issues</li>
                    <li>Suction and cleaning performance problems</li>
                    <li>Navigation and mapping errors</li>
                  </ul>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Step-by-Step Guidance</h3>
                <p className="text-gray-600">
                  Using a dedicated knowledge base, Cindy provides step-by-step repair guidance, 
                  advises on daily maintenance procedures, and recommends consumable replacement 
                  schedules for brushes, filters, cloths, and rubber strips.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Issue Reporting & Escalation</h3>
                <p className="text-gray-600">
                  Cindy collects business and issue details for reporting. Complex faults are escalated 
                  to specialist technicians, while end-of-call reports are automatically sent to n8n 
                  automation for tracking and follow-up.
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
              <h3 className="font-bold text-purple-800 mb-3">Troubleshooting & Diagnosis</h3>
              <p className="text-gray-700 text-sm mb-3">
                Comprehensive troubleshooting for common Pudu CC1 issues:
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Water leaks and drainage</li>
                <li>• Power problems</li>
                <li>• Suction issues</li>
                <li>• Navigation faults</li>
              </ul>
            </div>

            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-3">Repair Guidance</h3>
              <p className="text-gray-700 text-sm">
                Step-by-step repair instructions based on knowledge-base-driven responses, 
                ensuring accurate technical support for customers.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-3">Maintenance Procedures</h3>
              <p className="text-gray-700 text-sm">
                Daily maintenance advice and consumable replacement schedules, helping customers 
                maintain optimal robot performance.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <h3 className="font-bold text-orange-800 mb-3">Escalation & Reporting</h3>
              <p className="text-gray-700 text-sm">
                Complex issues are escalated to specialist technicians, while all calls are logged 
                and reported via n8n automation for tracking and follow-up.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Key Benefits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">🕐 24/7 Support Availability</h3>
              <p className="text-gray-600 text-sm">
                Customers can access maintenance support at any time, reducing downtime and 
                ensuring issues are addressed promptly.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">⚡ Immediate Assistance</h3>
              <p className="text-gray-600 text-sm">
                No waiting on hold or callbacks. Customers receive instant troubleshooting 
                guidance and repair instructions when they need them most.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">📚 Knowledge-Base Driven</h3>
              <p className="text-gray-600 text-sm">
                Responses are based on accurate, up-to-date technical information from a 
                dedicated knowledge base, ensuring reliable guidance.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">💼 Reduced Support Costs</h3>
              <p className="text-gray-600 text-sm">
                Routine maintenance queries are handled automatically, allowing support staff 
                to focus on complex technical issues and strategic customer relationships.
              </p>
            </div>
          </div>
        </div>

        {/* Example Use Case Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Example Use Case</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Scenario: Cleaning Performance Issue</h3>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Call:</span>
                <div>
                  <p>Customer calls 0482 086 553 to report that their Pudu CC1 is not cleaning effectively.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Cindy answers:</span>
                <div>
                  <p>"Hello, this is Cindy, your Pudu maintenance support agent. I'm here to help 
                  with your CC1 robot. What issue are you experiencing?"</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Customer explains the cleaning performance problem.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Diagnosis:</span>
                <div>
                  <p>Cindy asks targeted questions to diagnose the issue, identifying potential causes 
                  such as clogged filters, worn brushes, or incorrect settings.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Using the knowledge base, Cindy narrows down the most likely causes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Guidance:</span>
                <div>
                  <p>Cindy provides step-by-step instructions to check filters, clean brushes, 
                  and verify settings.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    If consumables need replacement, Cindy advises on the replacement schedule 
                    and part numbers.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Result:</span>
                <div>
                  <p>Customer follows the guidance and resolves the issue, or if it's complex, 
                  Cindy collects details and escalates to a specialist technician.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Call is logged in the maintenance logs, and if escalation is needed, 
                    a report is sent to n8n automation for follow-up.
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
                  <span><strong>Production/Development:</strong> 0482 086 553</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Twilio-powered voice routing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Knowledge base integration</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Integration Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Dedicated maintenance knowledge base</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>n8n automation integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Maintenance logs & call transcripts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Escalation to specialist technicians</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-8 border border-purple-200 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Enhance Robot Support?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Contact ACES to learn more about how Pudu Maintenance Support Agent (Cindy) can provide 
            24/7 technical support for your autonomous cleaning robot customers.
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

