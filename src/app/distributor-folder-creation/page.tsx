"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  createDistributorFolder,
  extractDistributorAgreement,
  appendDistributorMasterListFromBrowser,
  type DistributorExtractResult,
} from "@/lib/member-folder-api";
import { isGoogleReauthError, reauthWithGoogle } from "@/lib/google-reauth";

const FIELD_LABELS: { key: keyof DistributorExtractResult; label: string }[] = [
  { key: "distributor_business", label: "Distributor Business" },
  { key: "trading_as", label: "Trading As" },
  { key: "abn", label: "ABN" },
  { key: "acn", label: "ACN" },
  { key: "contact_name", label: "Contact Name" },
  { key: "contact_position", label: "Contact Position" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "mobile", label: "Mobile" },
  { key: "address", label: "Address" },
  { key: "state", label: "State" },
  { key: "postcode", label: "Postcode" },
  { key: "start_date", label: "Start Date" },
  { key: "signed_date", label: "Signed Date" },
  { key: "initial_term_months", label: "Initial Term (months)" },
  { key: "territory", label: "Territory / Area" },
  { key: "exclusivity", label: "Exclusivity" },
  { key: "status", label: "Status" },
  { key: "folder_name", label: "Folder Name" },
  { key: "notes", label: "Notes" },
];

function fieldToFormKey(key: string): string {
  return key;
}

export default function DistributorFolderCreationPage() {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { accessToken?: string } | null)?.accessToken ??
    "";
  const accessToken =
    (session as { accessToken?: string } | null)?.accessToken ?? "";

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [details, setDetails] = useState<DistributorExtractResult>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Select the distribution agreement PDF.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const extracted = await extractDistributorAgreement(token, file);
      setDetails(extracted);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: keyof DistributorExtractResult, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = async () => {
    if (!file) return;
    const folderName = String(details.folder_name || "").trim();
    const business = String(details.distributor_business || "").trim();
    if (!folderName || !business) {
      setError("Distributor Business and Folder Name are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fields: Record<string, string> = {};
      for (const { key } of FIELD_LABELS) {
        fields[fieldToFormKey(String(key))] = String(details[key] ?? "");
      }
      const created = await createDistributorFolder(token, file, fields, accessToken);
      setResultUrl(created.folder_url || null);
      let warn = created.warnings?.length ? `\n${created.warnings.join("\n")}` : "";
      const pdfNote = created.agreement_file_url ? "\nAgreement PDF uploaded." : "";
      let sheetNote = created.sheet?.spreadsheet_url ? "\nMaster list row written." : "";
      if (!created.sheet?.spreadsheet_url && accessToken && created.sheet_row?.length) {
        try {
          const sheetUrl = await appendDistributorMasterListFromBrowser(accessToken, created.sheet_row);
          sheetNote = `\nMaster list row written.\n${sheetUrl}`;
          const leftover = (created.warnings || []).filter(
            (w) => !/master list|could not be written/i.test(w),
          );
          warn = leftover.length ? `\n${leftover.join("\n")}` : "";
        } catch (sheetErr: unknown) {
          const message = sheetErr instanceof Error ? sheetErr.message : String(sheetErr);
          warn = `\nMaster list still failed: ${message}`;
        }
      }
      setResultMessage(
        `Distributor folder ${created.folder_created ? "created" : "already existed"}: ${created.folder_name || folderName}.${pdfNote}${sheetNote}${warn}`,
      );
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        pageName="Distributor folders"
        title="Distributor Folder Creation"
        description="Upload a signed Distribution Agreement (scans are fine), confirm the extracted details, then create an empty A - folder under 003-Distributors."
        actions={
          <Link href="/distributors" className="text-sm font-medium text-primary hover:underline">
            View master list
          </Link>
        }
      />
      <Card>
        <CardContent className="pt-6 space-y-4">
          {step === 1 && (
            <form onSubmit={handleExtract} className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Distribution Agreement PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  required
                  className="w-full"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button type="submit" disabled={loading || !file} loading={loading}>
                Extract details
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {(details.extraction_warnings || []).length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  {(details.extraction_warnings || []).map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
              )}
              {FIELD_LABELS.map(({ key, label }) => (
                <div key={String(key)}>
                  <label className="block font-medium mb-1">{label}</label>
                  {key === "notes" || key === "address" ? (
                    <textarea
                      className="w-full border rounded p-2 dark:border-dark-3 dark:bg-dark-2"
                      rows={2}
                      value={String(details[key] ?? "")}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                    />
                  ) : (
                    <input
                      className="w-full border rounded p-2 dark:border-dark-3 dark:bg-dark-2"
                      value={String(details[key] ?? "")}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                    />
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleConfirm} disabled={loading} loading={loading}>
                  Confirm and create folder
                </Button>
                <Button variant="secondary" type="button" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 whitespace-pre-wrap">
              <p>{resultMessage}</p>
              {resultUrl ? (
                <a
                  href={resultUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-medium underline"
                >
                  Open folder in Google Drive
                </a>
              ) : null}
              <div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStep(1);
                    setFile(null);
                    setDetails({});
                    setResultMessage(null);
                    setResultUrl(null);
                  }}
                >
                  Create another
                </Button>
              </div>
            </div>
          )}

          {error ? (
            <div className="space-y-2">
              <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
              {isGoogleReauthError(error) ? (
                <Button onClick={() => void reauthWithGoogle()}>Re-auth with Google</Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
