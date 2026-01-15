import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member Agent SLM - Frankston RSL - One Pager",
};

export default function FrankstonRSLAgentOnePager() {
  return (
    <>
      <Breadcrumb pageName="Member Agent SLM - Frankston RSL - One Pager" />

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-4">Member Agent SLM - Frankston RSL</h1>
          <p className="text-xl text-purple-100">
            Custom AI agent solution providing personalized member support and information access
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Member Access</h3>
                <p className="text-gray-600">
                  Frankston RSL members access the AI agent through a dedicated web interface widget. 
                  The agent is linked directly to the member's profile and partnership information with ACES.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Intelligent Query Handling</h3>
                <p className="text-gray-600">
                  The AI agent understands natural language queries and provides personalized responses 
                  based on the member's specific account information, services, and partnership details.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Information Access</h3>
                <p className="text-gray-600">
                  Members can query and access various types of information including:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                    <li>Work in progress and active projects</li>
                    <li>Action items and pending tasks</li>
                    <li>Client profile and account details</li>
                    <li>Invoice information and payment status</li>
                    <li>Service agreements and contracts</li>
                    <li>Partnership and membership details</li>
                  </ul>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Seamless Integration</h3>
                <p className="text-gray-600">
                  The agent integrates directly with ACES systems to provide real-time, accurate information. 
                  Responses are contextually aware and tailored to the member's specific relationship 
                  with ACES and Frankston RSL.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Key Benefits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">🕐 24/7 Member Support</h3>
              <p className="text-gray-600 text-sm">
                Members can access information and get answers to questions at any time, 
                without waiting for business hours or staff availability.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">🎯 Personalized Experience</h3>
              <p className="text-gray-600 text-sm">
                Each member receives customized responses based on their specific account, 
                services, and partnership details with ACES.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">📊 Instant Information Access</h3>
              <p className="text-gray-600 text-sm">
                Members can quickly retrieve account information, invoice details, project status, 
                and other relevant data without navigating multiple systems or contacting support staff.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">💼 Reduced Support Burden</h3>
              <p className="text-gray-600 text-sm">
                The AI agent handles routine queries and information requests, allowing support staff 
                to focus on complex issues and strategic member engagement.
              </p>
            </div>
          </div>
        </div>

        {/* Example Use Case Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Example Use Cases</h2>
          
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">Scenario 1: Invoice Inquiry</h3>
              
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start gap-3">
                  <span className="font-bold text-purple-600">Member asks:</span>
                  <span>"When is my next invoice due?"</span>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="font-bold text-purple-600">Agent responds:</span>
                  <div>
                    <p>Provides the exact due date, invoice amount, and payment status</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Information is pulled directly from the member's account in real-time
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">Scenario 2: Project Status Check</h3>
              
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start gap-3">
                  <span className="font-bold text-purple-600">Member asks:</span>
                  <span>"What's the status of the energy efficiency project?"</span>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="font-bold text-purple-600">Agent responds:</span>
                  <div>
                    <p>Provides current project phase, completed milestones, and next steps</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Pulls information from work-in-progress tracking and project management systems
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">Scenario 3: Service Agreement Review</h3>
              
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start gap-3">
                  <span className="font-bold text-purple-600">Member asks:</span>
                  <span>"What services are covered under our current agreement?"</span>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="font-bold text-purple-600">Agent responds:</span>
                  <div>
                    <p>Lists all active services, contract terms, and key partnership details</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Accesses member-specific contract and service agreement information
                    </p>
                  </div>
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
                  <span>Web-based widget interface</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Embedded in member portal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Secure member authentication</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Cloud-hosted solution</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Integration Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Real-time data synchronization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Member profile integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Secure API connections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Natural language processing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-8 border border-purple-200 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Enhance Member Experience?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Contact ACES to learn more about how custom AI agents can provide personalized support 
            and information access for your members.
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

