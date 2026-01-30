"use client";

import React, { useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function OneMonthSavingsTestPage() {
  const [logResult, setLogResult] = useState<any>(null);
  const [historyResult, setHistoryResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("Test Business Pty Ltd");

  // Sample invoice data for testing
  const sampleInvoiceData = {
    invoice_number: "RA" + Math.floor(Math.random() * 9000) + 1000,
    business_name: businessName,
    business_abn: "12 345 678 901",
    contact_name: "John Smith",
    contact_email: "john.smith@testbusiness.com.au",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    line_items: [
      {
        id: "1",
        solution_type: "ci_electricity",
        solution_label: "C&I Electricity Reviews",
        savings_amount: 1500.0,
        gst: 150.0,
        total: 1650.0,
      },
      {
        id: "2",
        solution_type: "waste",
        solution_label: "Waste Reviews",
        savings_amount: 800.0,
        gst: 80.0,
        total: 880.0,
      },
    ],
    subtotal: 2300.0,
    total_gst: 230.0,
    total_amount: 2530.0,
    status: "Generated",
    created_at: new Date().toISOString(),
  };

  const testLogEndpoint = async () => {
    setLoading(true);
    setLogResult(null);

    try {
      const response = await fetch("/api/one-month-savings/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleInvoiceData),
      });

      const data = await response.json();
      setLogResult({
        status: response.status,
        statusText: response.statusText,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      setLogResult({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const testHistoryEndpoint = async () => {
    setLoading(true);
    setHistoryResult(null);

    try {
      const response = await fetch("/api/one-month-savings/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: businessName }),
      });

      const data = await response.json();
      setHistoryResult({
        status: response.status,
        statusText: response.statusText,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      setHistoryResult({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="One Month Savings - Webhook Test" />

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Webhook Test Page</h1>
          <p className="text-gray-600">
            Use this page to test the n8n webhooks for the 1 Month Savings Invoice feature.
          </p>
        </div>

        <div className="space-y-6">
          {/* Test Log Endpoint */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Log Endpoint</h2>
            <p className="text-sm text-gray-600 mb-4">
              Tests the endpoint that logs invoices to Google Sheets via n8n webhook.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name (for test data):
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter business name"
              />
            </div>

            <button
              onClick={testLogEndpoint}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Testing..." : "Test Log Endpoint"}
            </button>

            {logResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">Response:</h3>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-96">
                  {JSON.stringify(logResult, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Sample Payload:</h3>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                {JSON.stringify(sampleInvoiceData, null, 2)}
              </pre>
            </div>
          </div>

          {/* Test History Endpoint */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Test History Endpoint</h2>
            <p className="text-sm text-gray-600 mb-4">
              Tests the endpoint that fetches invoice history from Google Sheets via n8n webhook.
            </p>
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Expected n8n Response Format:</strong> An array with objects containing: 
                <code className="block mt-1">Member, Solution (with trailing space), Amount, Invoice Number, Due Date</code>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name:
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter business name"
              />
            </div>

            <button
              onClick={testHistoryEndpoint}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Testing..." : "Test History Endpoint"}
            </button>

            {historyResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">Response:</h3>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-96">
                  {JSON.stringify(historyResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* cURL Commands Reference */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">cURL Commands (for terminal testing)</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Test Log Endpoint:</h3>
                <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">
{`curl -X POST http://localhost:3000/api/one-month-savings/log \\
  -H "Content-Type: application/json" \\
  -d '{
    "invoice_number": "RA1234",
    "business_name": "Test Business Pty Ltd",
    "business_abn": "12 345 678 901",
    "contact_name": "John Smith",
    "contact_email": "john@test.com",
    "invoice_date": "${new Date().toISOString().split("T")[0]}",
    "due_date": "${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}",
    "line_items": [
      {
        "id": "1",
        "solution_type": "ci_electricity",
        "solution_label": "C&I Electricity Reviews",
        "savings_amount": 1500.0,
        "gst": 150.0,
        "total": 1650.0
      }
    ],
    "subtotal": 1500.0,
    "total_gst": 150.0,
    "total_amount": 1650.0,
    "status": "Generated",
    "created_at": "${new Date().toISOString()}"
  }'`}
                </pre>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Test History Endpoint:</h3>
                <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">
{`curl -X POST http://localhost:3000/api/one-month-savings/history \\
  -H "Content-Type: application/json" \\
  -d '{"business_name": "Test Business Pty Ltd"}'`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

