'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ConfirmLOAPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const businessInfoEncoded = searchParams.get('businessInfo');
  const loaDataEncoded = searchParams.get('loaData');
  const businessName = searchParams.get('businessName') || '';

  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [loaData, setLoaData] = useState<any>(null);
  const [editableLoaData, setEditableLoaData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Decode incoming data
  useEffect(() => {
    try {
      if (businessInfoEncoded) {
        setBusinessInfo(JSON.parse(decodeURIComponent(businessInfoEncoded)));
      }
      if (loaDataEncoded) {
        const decoded = JSON.parse(decodeURIComponent(loaDataEncoded));
        setLoaData(decoded);
        setEditableLoaData(decoded);
      }
    } catch (err) {
      console.error('Error decoding query params:', err);
    }
  }, [businessInfoEncoded, loaDataEncoded]);

  // Handle input edits
  const handleEditChange = (key: string, value: string) => {
    setEditableLoaData((prev: any) => ({ ...prev, [key]: value }));
  };

  // Handle updates
  const handleUpdate = async (updateType: 'contact' | 'business') => {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('https://membersaces.app.n8n.cloud/webhook/update_loa_record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_type: updateType,
          business_name: businessName,
          loa_data: editableLoaData,
          existing_business_info: businessInfo, // passed silently
        }),
      });

      if (!res.ok) throw new Error(`Webhook failed: ${res.statusText}`);

      const data = await res.json();
      setStatus(`✅ ${data.message || 'LOA update successful!'}`);
    } catch (err: any) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-10">
        <div className="bg-white rounded-lg shadow-sm p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Confirm Updated LOA for {businessInfo?.['Business Name'] || businessName || 'Business'}
          </h1>

          {/* Editable LOA Data Only */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-10">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Latest Processed LOA Data (Editable)
            </h2>
            {loaData ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                {Object.entries(editableLoaData).map(([key, rawValue]) => {
                  if (key === 'row_number') return null;

                  const value =
                    rawValue === null || rawValue === undefined
                      ? ''
                      : typeof rawValue === 'object'
                      ? JSON.stringify(rawValue)
                      : String(rawValue);

                  // Capitalize each word for labels
                  const cleanKey = key
                    .replace(/_/g, ' ')
                    .replace(/:/g, '')
                    .replace(/\b\w/g, (l) => l.toUpperCase());

                  const isMultiline = value.length > 60;

                  return (
                    <div key={key} className="flex flex-col">
                      <label className="font-semibold text-gray-700 mb-1">{cleanKey}</label>
                      {isMultiline ? (
                        <textarea
                          value={value}
                          onChange={(e) => handleEditChange(key, e.target.value)}
                          rows={3}
                          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleEditChange(key, e.target.value)}
                          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No LOA data found.</p>
            )}
          </div>

          {/* Status message */}
          {status && (
            <div
              className={`mt-6 p-4 rounded text-sm font-medium ${
                status.startsWith('✅')
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {status}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2 text-lg">Update Contact Details</h3>
              <p className="text-sm text-gray-700 mb-4">
                Use this if the business and ABN are unchanged, but the contact person has changed.
              </p>
              <button
                onClick={() => handleUpdate('contact')}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Contact Details'}
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2 text-lg">Update Business Details</h3>
              <p className="text-sm text-gray-700 mb-4">
                Use this if the business or ABN has changed. All related business records will be updated. Including Folder Names & Name in system. 
              </p>
              <button
                onClick={() => handleUpdate('business')}
                disabled={loading}
                className="w-full bg-yellow-600 text-white py-2 rounded font-semibold hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Business Details'}
              </button>
            </div>
          </div>

          <div className="mt-10 flex justify-end">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 rounded bg-gray-400 text-white font-medium hover:bg-gray-500"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
