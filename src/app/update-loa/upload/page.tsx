'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { postLoaDocument } from '@/lib/invoice-api-endpoints';
import { ToolPageLayout } from '@/components/Layouts/ToolPageLayout';
import { Button } from '@/components/ui/button';
import { MemberAcesSheetPreview } from '@/components/MemberAcesSheetPreview';
import { useAuthToken } from '@/lib/use-auth-token';

export default function UploadLOAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isSessionLoading } = useAuthToken();
  const businessName = searchParams.get('businessName') || '';
  const businessInfo = searchParams.get('businessInfo') || ''; // 🧠 preserve this!

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);

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

    try {
      const { res, data: parsedData, rawText } = await postLoaDocument(() => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('utility_type', 'LOA');
        return formData;
      });

      if (rawText && !parsedData) {
        setError(`❌ Error parsing response:\n${rawText}`);
        setLoading(false);
        return;
      }

      const data = parsedData ?? {};

      if (!res.ok) {
        throw new Error(String(data.message || res.statusText));
      }

      setResult(`✅ ${String(data.message || 'LOA document uploaded successfully!')}`);
      setUploadComplete(true);

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
    <ToolPageLayout
      pageName="Update LOA"
      title="Upload LOA document"
      description={businessName ? `For ${businessName}` : undefined}
      width="md"
    >
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

        <Button type="submit" disabled={loading || !file} loading={loading}>
          Upload & process LOA
        </Button>
      </form>

      {result && (
        <div className="mt-4 text-green-700 font-medium whitespace-pre-wrap">
          {result}
        </div>
      )}
      {!isSessionLoading && token && uploadComplete ? (
        <MemberAcesSheetPreview
          className="mt-6"
          utilityType="LOA"
          token={token}
          expectedBusinessName={businessName}
          autoPoll
        />
      ) : null}
      {error && (
        <div className="mt-4 text-red-700 font-medium whitespace-pre-wrap">
          {error}
        </div>
      )}
    </ToolPageLayout>
  );
}
