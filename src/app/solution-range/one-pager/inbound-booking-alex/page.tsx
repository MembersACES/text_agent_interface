import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbound Booking Receptionist (Alex) - One Pager",
};

export default function InboundBookingAlexOnePager() {
  return (
    <>
      <Breadcrumb pageName="Inbound Booking Receptionist (Alex) - One Pager" />

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-4">Inbound Booking Receptionist (Alex)</h1>
          <p className="text-xl text-purple-100">
            Custom booking integration for Frankston RSL, managing reservations and booking enquiries via OBEE system
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
                  Callers dial the dedicated number (0468 004 047) and are immediately connected to Alex, 
                  the AI booking receptionist. Alex greets callers and understands their booking requirements.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">OBEE System Integration</h3>
                <p className="text-gray-600">
                  Alex integrates directly with the OBEE (Online Booking Engine) system via Twilio, 
                  accessing real-time availability, pricing, and booking information for Frankston RSL facilities.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Booking Management</h3>
                <p className="text-gray-600">
                  Alex handles reservation enquiries, checks availability, provides pricing information, 
                  and processes booking requests. The system manages:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                    <li>Venue availability queries</li>
                    <li>Pricing and package information</li>
                    <li>Booking confirmations</li>
                    <li>Reservation modifications</li>
                    <li>Cancellation requests</li>
                  </ul>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Automated Confirmation</h3>
                <p className="text-gray-600">
                  Booking confirmations are automatically processed and logged. All conversations are 
                  transcribed and stored in Google Sheets for record-keeping, follow-up, and quality assurance.
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
              <h3 className="font-bold text-purple-800 mb-3">Frankston RSL Booking Management</h3>
              <p className="text-gray-700 text-sm">
                Specialized booking management for Frankston RSL facilities, with comprehensive 
                knowledge of venues, packages, and booking requirements.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-3">OBEE System Integration</h3>
              <p className="text-gray-700 text-sm">
                Seamless integration with the OBEE booking system via Twilio, enabling real-time 
                access to availability, pricing, and reservation data.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-3">Reservation Enquiry Handling</h3>
              <p className="text-gray-700 text-sm">
                Comprehensive handling of booking enquiries, from initial availability checks 
                to final confirmation, with natural conversation flow.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <h3 className="font-bold text-orange-800 mb-3">Custom Twilio Integration</h3>
              <p className="text-gray-700 text-sm">
                Custom-built Twilio integration ensures reliable call handling and seamless 
                connection to the OBEE booking system for real-time data access.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Key Benefits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">🕐 24/7 Booking Availability</h3>
              <p className="text-gray-600 text-sm">
                Bookings can be made at any time, increasing revenue opportunities and customer 
                convenience without requiring staff availability.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">⚡ Instant Availability Checks</h3>
              <p className="text-gray-600 text-sm">
                Real-time integration with OBEE system provides instant availability information, 
                eliminating delays and callbacks for availability checks.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">📊 Complete Booking Records</h3>
              <p className="text-gray-600 text-sm">
                All booking conversations are automatically transcribed and logged, providing 
                comprehensive records for management and quality assurance.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">💼 Reduced Staff Burden</h3>
              <p className="text-gray-600 text-sm">
                Routine booking enquiries are handled automatically, freeing staff time for 
                complex requests, events, and customer relationship management.
              </p>
            </div>
          </div>
        </div>

        {/* Example Use Case Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Example Use Case</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Scenario: Function Room Booking</h3>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Call:</span>
                <div>
                  <p>Customer calls 0468 004 047 to book a function room for an upcoming event.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Alex answers:</span>
                <div>
                  <p>"Hello, thank you for calling Frankston RSL. I'm Alex, your booking assistant. 
                  How can I help you today?"</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Customer explains they need a function room for 50 people on a specific date.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Availability Check:</span>
                <div>
                  <p>Alex checks real-time availability via OBEE system integration.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    The system provides available rooms, capacity, pricing, and package options 
                    based on the customer's requirements.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Booking Process:</span>
                <div>
                  <p>Alex discusses options, answers questions, collects booking details, 
                  and processes the reservation.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    The booking is confirmed in the OBEE system, and details are logged 
                    in the transcript sheet for follow-up.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Result:</span>
                <div>
                  <p>Customer receives immediate confirmation without waiting for staff availability.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Booking is automatically logged, and conversation transcript is available 
                    for quality assurance and follow-up if needed.
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
                  <span><strong>Production/Development:</strong> 0468 004 047</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Custom Twilio integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>OBEE system connectivity</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Integration Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>OBEE booking system API</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Real-time availability access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Automatic booking confirmation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Google Sheets call logging</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-8 border border-purple-200 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Automate Your Booking System?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Contact ACES to learn more about how Inbound Booking Receptionist (Alex) can streamline 
            your reservation management with 24/7 AI-powered booking automation.
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

