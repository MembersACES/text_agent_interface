'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react'; 
import { Alert } from '../../components/ui-elements/alert';

const UTILITY_TYPES = [
  { label: 'Waste Invoice', value: 'WASTE' },
  { label: 'Grease Trap Invoice', value: 'GREASE_TRAP' },
  { label: 'Cooking Oil Invoice', value: 'COOKING_OIL' },
  { label: 'Electricity Invoice CI', value: 'ELECTRICITY_CI' },
  { label: 'Electricity Invoice SME', value: 'ELECTRICITY_SME' },
  { label: 'Gas Invoice CI', value: 'GAS_CI' },
  { label: 'Gas Invoice SME', value: 'GAS_SME' },
  { label: 'Water Invoice', value: 'WATER' },
];

const API_ENDPOINTS: Record<string, string> = {
  WASTE: 'https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/waste/process-invoice',
  COOKING_OIL: 'https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/oil/process-invoice',
  ELECTRICITY_CI: 'https://aces-api-63gwbzzcdq-km.a.run.app/v1/electricity-ci/process-invoice',
  ELECTRICITY_SME: 'https://aces-api-63gwbzzcdq-km.a.run.app/v1/electricity-sme/process-invoice',
  GAS_CI: 'https://aces-api-63gwbzzcdq-km.a.run.app/v1/gas-ci/process-invoice',
  GAS_SME: 'https://aces-api-63gwbzzcdq-km.a.run.app/v1/gas-sme/process-invoice',
  GREASE_TRAP: 'https://aces-api-63gwbzzcdq-km.a.run.app/v1/grease-trap/process-invoice',
  WATER: 'https://aces-api-63gwbzzcdq-km.a.run.app/v1/water/process-invoice',
};

export default function UtilityInvoiceLodgementPage() {
  const { data: session } = useSession();
  const token = session?.id_token;
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('WASTE');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
  
    if (!token) {
      setAuthError(true);
      setResult("Session expired. Please log in again.");
      return;
    }
  
    setLoading(true);
    setResult(null);
    setAuthError(false);
  
    const endpoint = API_ENDPOINTS[docType];
    if (!endpoint) {
      setResult('Invalid document type selected.');
      setLoading(false);
      return;
    }
  
    const formData = new FormData();
    formData.append('file', file);
    formData.append('utility_type', docType);
  
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
      const data = await res.json();
  
      if (data.message && /invalid token|token expired|expired token/i.test(data.message)) {
        setAuthError(true);
        setResult(null);
      } else {
        setResult(data.message || 'Upload successful!');
      }
    } catch {
      setResult('Error uploading document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-4">Utility Invoice Lodgement</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Utility Type</label>
          <select
            className="w-full border rounded p-2"
            value={docType}
            onChange={e => setDocType(e.target.value)}
          >
            {UTILITY_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium mb-1">File</label>
          <input type="file" onChange={handleFileChange} className="w-full" required />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading || !file}
        >
          {loading ? 'Uploading...' : 'Lodge Document'}
        </button>
      </form>
      {result && <div className="mt-4 text-center font-medium">{result}</div>}
      {authError && (
        <Alert
          variant="error"
          title="Session Expired"
          description="Invalid token: Please re-authenticate. Log out and log in again."
        />
      )}
    </div>
  );
}
