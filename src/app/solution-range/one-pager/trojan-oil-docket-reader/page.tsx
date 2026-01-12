import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trojan Oil Docket Reader - One Pager",
};

export default function TrojanOilDocketReaderOnePager() {
  return (
    <>
      <Breadcrumb pageName="Trojan Oil Docket Reader - One Pager" />

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-4">Trojan Oil Docket Reader</h1>
          <p className="text-xl text-purple-100">
            A streamlined client automation that converts photographed oil dockets into clean, structured data
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Photo Submission</h3>
                <p className="text-gray-600">
                  Delivery drivers capture photos of oil delivery dockets using their mobile phones. 
                  Photos are sent via SMS/MMS to a dedicated phone number (0482 086 553).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">OCR Processing</h3>
                <p className="text-gray-600">
                  Advanced OCR (Optical Character Recognition) technology extracts key data from the docket image, 
                  including customer details, product types, volumes, pricing, and delivery timestamps.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Data Extraction</h3>
                <p className="text-gray-600">
                  The system automatically identifies and extracts structured data fields such as:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                    <li>Customer name and delivery address</li>
                    <li>Product type and quantity</li>
                    <li>Unit pricing and total cost</li>
                    <li>Delivery date and time</li>
                    <li>Driver and vehicle information</li>
                  </ul>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">API Integration</h3>
                <p className="text-gray-600">
                  Extracted data is automatically processed through ACES' custom API and logged directly 
                  into a Google Sheets output document. The structured data is immediately available for 
                  integration with accounting systems, inventory management, and reporting tools.
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
              <h3 className="font-semibold text-green-800 mb-2">⚡ Eliminates Manual Entry</h3>
              <p className="text-gray-600 text-sm">
                No more time-consuming data entry. Drivers simply take a photo and the system handles the rest.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">📊 Real-Time Data Access</h3>
              <p className="text-gray-600 text-sm">
                Data is available instantly in Google Sheets for immediate access by admin teams and integration with other systems.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">🎯 Reduces Errors</h3>
              <p className="text-gray-600 text-sm">
                Automated extraction significantly reduces human error in data transcription and improves data accuracy.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">💼 Operational Efficiency</h3>
              <p className="text-gray-600 text-sm">
                Streamlines workflows for delivery teams, admin departments, and operational processes, 
                saving hours of manual processing time.
              </p>
            </div>
          </div>
        </div>

        {/* Example Use Case Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Example Use Case</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Scenario: Daily Delivery Processing</h3>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Morning:</span>
                <div>
                  <p>Delivery driver completes 15 oil deliveries throughout the day.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Each delivery includes capturing a photo of the docket and sending it via SMS to the dedicated number.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Afternoon:</span>
                <div>
                  <p>Admin team accesses the Google Sheets output document.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    All 15 delivery records are already processed, with customer details, quantities, 
                    pricing, and delivery timestamps automatically extracted and organized.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Result:</span>
                <div>
                  <p>Data is ready for invoicing, inventory updates, and customer reporting.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    What used to take 2-3 hours of manual data entry is now completed automatically in minutes.
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
              <h3 className="font-semibold text-gray-800 mb-3">Integration Points</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>SMS/MMS gateway (Twilio)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>OCR processing engine</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Google Sheets API</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Custom ACES API endpoints</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Data Output</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Structured Google Sheets format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Real-time updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>API-accessible data format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Exportable to CSV/Excel</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-8 border border-purple-200 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Automate Your Delivery Processing?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Contact ACES to learn more about how the Trojan Oil Docket Reader can streamline your operations 
            and eliminate manual data entry.
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
