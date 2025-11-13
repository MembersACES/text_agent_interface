'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function UploadLOAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessName = searchParams.get('businessName') || '';
  const businessInfo = searchParams.get('businessInfo') || ''; // 🧠 preserve this!

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setResult('❌ Please select a file.');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('utility_type', 'LOA');

    try {
      const res = await fetch('https://aces-api-63gwbzzcdq-km.a.run.app/v1/loa/process-document', {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        setError(`❌ Error parsing response:\n${text}`);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || res.statusText);
      }

      setResult(`✅ ${data.message || 'LOA document uploaded successfully!'}`);

      // ✅ Redirect with full business info
      setTimeout(() => {
        const params = new URLSearchParams();
        params.set('businessName', businessName);
        if (businessInfo) params.set('businessInfo', businessInfo);
        router.push(`/update-loa?${params.toString()}`);
      }, 1500);
    } catch (err: any) {
      setError(`❌ Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-4">Upload LOA Document</h1>

      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">LOA File</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="w-full"
            required
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading || !file}
        >
          {loading ? 'Uploading...' : 'Upload & Process LOA'}
        </button>
      </form>

      {result && (
        <div className="mt-4 text-green-700 font-medium whitespace-pre-wrap">
          {result}
        </div>
      )}
      {error && (
        <div className="mt-4 text-red-700 font-medium whitespace-pre-wrap">
          {error}
        </div>
      )}
    </div>
  );
}
