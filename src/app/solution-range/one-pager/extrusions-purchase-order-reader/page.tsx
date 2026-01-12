import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Extrusions Purchase Order Reader - One Pager",
};

export default function ExtrusionsPurchaseOrderReaderOnePager() {
  return (
    <>
      <Breadcrumb pageName="Extrusions Purchase Order Reader - One Pager" />

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-4">Extrusions Purchase Order Reader</h1>
          <p className="text-xl text-purple-100">
            Intelligent OCR solution that automatically extracts data from photographed purchase orders
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Purchase Order Capture</h3>
                <p className="text-gray-600">
                  Staff members photograph purchase orders using mobile devices or scanners. 
                  The images can be submitted via email, mobile app, or integrated upload system.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Smart OCR Processing</h3>
                <p className="text-gray-600">
                  Advanced OCR technology with machine learning capabilities recognizes and extracts 
                  key information from purchase order documents, handling various formats and layouts.
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
                  The system automatically identifies and extracts structured data fields including:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                    <li>Item codes and part numbers</li>
                    <li>Quantities and unit measurements</li>
                    <li>Unit pricing and line totals</li>
                    <li>Supplier details and contact information</li>
                    <li>Purchase order numbers and dates</li>
                    <li>Delivery addresses and special instructions</li>
                  </ul>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">System Integration</h3>
                <p className="text-gray-600">
                  Extracted data is automatically processed and formatted for direct integration with 
                  operational systems, accounting software, and inventory management platforms. 
                  Data is available in real-time via Google Sheets API output.
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
              <h3 className="font-semibold text-green-800 mb-2">🚫 Eliminates Manual Entry Errors</h3>
              <p className="text-gray-600 text-sm">
                Automated data extraction eliminates transcription errors that can occur with manual entry, 
                ensuring data accuracy and consistency.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">⚡ Accelerates Processing</h3>
              <p className="text-gray-600 text-sm">
                Purchase orders are processed in seconds rather than minutes, dramatically reducing 
                the time between receipt and system entry.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">📊 Streamlined Workflows</h3>
              <p className="text-gray-600 text-sm">
                Clean, structured data flows directly into accounting and operational systems, 
                eliminating double-handling and reducing processing bottlenecks.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">💰 Cost Savings</h3>
              <p className="text-gray-600 text-sm">
                Reduces labor costs associated with manual data entry and enables staff to focus 
                on higher-value tasks such as vendor management and procurement strategy.
              </p>
            </div>
          </div>
        </div>

        {/* Example Use Case Section */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Example Use Case</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Scenario: Manufacturing Purchase Order Processing</h3>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Receipt:</span>
                <div>
                  <p>Procurement team receives 30+ purchase orders per day from various suppliers.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Orders arrive in various formats: email attachments, fax copies, and physical documents.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Processing:</span>
                <div>
                  <p>Staff photograph or scan each purchase order.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    The system automatically extracts item codes, quantities, pricing, supplier details, 
                    and delivery requirements from each document.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Integration:</span>
                <div>
                  <p>Data is immediately available in the output sheet for accounting and inventory systems.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Purchase orders that previously required 10-15 minutes of manual entry each are now 
                    processed automatically, freeing up 5-7 hours of staff time daily.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="font-bold text-purple-600">Result:</span>
                <div>
                  <p>Accurate, timely data entry with zero transcription errors.</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Procurement team can focus on strategic vendor relationships and cost optimization 
                    rather than data entry tasks.
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
              <h3 className="font-semibold text-gray-800 mb-3">Document Formats Supported</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>PDF documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Image formats (JPG, PNG, TIFF)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Scanned documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Multi-page documents</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Data Output Format</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Google Sheets API output</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Structured CSV format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>API-accessible JSON format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Real-time updates</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-8 border border-purple-200 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Automate Your Purchase Order Processing?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Contact ACES to learn more about how the Extrusions Purchase Order Reader can transform 
            your procurement workflows and eliminate manual data entry.
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

