"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/utils";
import { isGoogleReauthError, reauthWithGoogle } from "@/lib/google-reauth";

type FieldSource = "ef" | "sheet" | "crm" | "estimated" | "default" | "manual" | "missing" | "query";

interface DraftField {
  value: string;
  source: FieldSource | string;
  estimated?: boolean;
}

interface Draft {
  request_kind: string;
  match_kind?: string;
  estimated?: boolean;
  loa_file_id?: string;
  loa_available?: boolean;
  gdrive_folder_url?: string;
  gdrive_folder_id?: string;
  fields: Record<string, DraftField>;
}

interface ExtractResponse {
  extract?: Record<string, string>;
  extraction_warnings?: string[];
  contract?: { match_kind?: string; contracts?: unknown[] };
  draft?: Draft;
  email_subject?: string;
  email_html_content?: string;
  recipient?: string;
  detail?: string;
}

const MEMBER_FIELDS: { key: string; label: string }[] = [
  { key: "company_name", label: "Company name" },
  { key: "acn_abn", label: "ACN / ABN" },
  { key: "address", label: "Address" },
  { key: "tel", label: "Tel" },
  { key: "contact_name", label: "Contact name" },
  { key: "email", label: "Email" },
  { key: "mirn", label: "MIRN" },
];

const PERIOD_FIELDS: { key: string; label: string }[] = [
  { key: "start_date", label: "Start date" },
  { key: "end_date", label: "End date" },
  { key: "price_per_gj", label: "Price per GJ" },
  { key: "commission_per_gj", label: "Commission" },
];

const CONDITION_FIELDS: { key: string; label: string }[] = [
  { key: "cpq_gj", label: "Contract Period Quantity (GJ)" },
  { key: "min_cpq_gj", label: "Minimum CPQ (GJ)" },
  { key: "min_cpq_pct", label: "Minimum CPQ (% of CPQ)" },
  { key: "mdq_gj", label: "Maximum Daily Quantity (GJ)" },
];

function fieldValue(draft: Draft | null, key: string): string {
  return draft?.fields?.[key]?.value ?? "";
}

function sourceLabel(field: DraftField | undefined): string {
  if (!field) return "";
  if (field.estimated) return "estimated";
  return String(field.source || "");
}

function sourceClass(field: DraftField | undefined): string {
  const source = sourceLabel(field);
  if (source === "sheet") return "text-emerald-700 dark:text-emerald-300";
  if (source === "estimated" || source === "missing") return "text-amber-700 dark:text-amber-300";
  if (source === "ef") return "text-sky-700 dark:text-sky-300";
  return "text-gray-400";
}

function AlintaGasAgreementRequestPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { accessToken?: string } | null)?.accessToken ??
    "";

  const prefillBusiness = searchParams.get("businessName") ?? "";
  const prefillMirn = searchParams.get("mirn") ?? "";
  const prefillClientId = searchParams.get("clientId") ?? "";

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [businessName, setBusinessName] = useState(prefillBusiness);
  const [mrinHint, setMrinHint] = useState(prefillMirn);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recipient, setRecipient] = useState("data.quote@fornrg.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [sentSubject, setSentSubject] = useState<string | null>(null);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(null);

  const uploadedEfUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (uploadedEfUrl) URL.revokeObjectURL(uploadedEfUrl);
    };
  }, [uploadedEfUrl]);

  const reviewEfLink = uploadedEfUrl ? (
    <a
      href={uploadedEfUrl}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary hover:underline"
    >
      Open uploaded EF
    </a>
  ) : null;

  const subject = useMemo(() => {
    if (!draft) return "";
    const company = fieldValue(draft, "company_name") || "Member";
    const mirn = fieldValue(draft, "mirn");
    const cpq = fieldValue(draft, "cpq_gj") || "—";
    const kind = draft.request_kind || "Retention";
    return `Agreement Request: G-C&I (GJ) ${cpq} ${kind} ${company} MIRN ${mirn}`.trim();
  }, [draft]);

  const updateField = (key: string, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: {
          ...prev.fields,
          [key]: { value, source: "manual", estimated: false },
        },
      };
    });
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Select the signed Alinta engagement form PDF.");
      return;
    }
    if (!token) {
      setError("Please sign in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (businessName.trim()) fd.append("business_name", businessName.trim());
      if (mrinHint.trim()) fd.append("mrin", mrinHint.trim());
      const res = await fetch(`${getApiBaseUrl()}/api/alinta-gas-agreement/extract`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = (await res.json()) as ExtractResponse;
      if (res.status === 401) {
        throw new Error("REAUTHENTICATION_REQUIRED");
      }
      if (!res.ok) {
        throw new Error(String(data.detail || "Extract failed"));
      }
      if (!data.draft) {
        throw new Error("Extract did not return a draft.");
      }
      setDraft(data.draft);
      setWarnings(data.extraction_warnings || []);
      setRecipient(data.recipient || "data.quote@fornrg.com");
      if (!businessName.trim() && data.draft.fields.company_name?.value) {
        setBusinessName(data.draft.fields.company_name.value);
      }
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!file || !draft) return;
    if (!token) {
      setError("Please sign in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append(
        "draft_json",
        JSON.stringify({
          draft,
          request_kind: draft.request_kind,
          loa_file_id: draft.loa_file_id,
          gdrive_folder_url: draft.gdrive_folder_url,
          business_name: fieldValue(draft, "company_name") || businessName,
          client_id: prefillClientId || undefined,
        }),
      );
      const res = await fetch(`${getApiBaseUrl()}/api/alinta-gas-agreement/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        email_subject?: string;
        detail?: string;
        ef_file_url?: string;
        drive_folder_url?: string;
        client_folder_url?: string;
      };
      if (res.status === 401) {
        throw new Error("REAUTHENTICATION_REQUIRED");
      }
      if (!res.ok) {
        throw new Error(String(data.detail || data.message || "Send failed"));
      }
      setResultMessage(data.message || "Sent.");
      setSentSubject(data.email_subject || subject);
      setDriveFolderUrl(data.client_folder_url || data.drive_folder_url || draft.gdrive_folder_url || null);
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const renderFields = (fields: { key: string; label: string }[]) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(({ key, label }) => {
        const field = draft?.fields?.[key];
        const wide = key === "address";
        return (
          <div key={key} className={wide ? "sm:col-span-2" : undefined}>
            <label className="mb-1 flex items-baseline justify-between gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <span>{label}</span>
              <span className={`text-[11px] font-normal uppercase tracking-wide ${sourceClass(field)}`}>
                {sourceLabel(field)}
              </span>
            </label>
            {wide ? (
              <textarea
                className="w-full rounded-md border border-gray-200 p-2 text-sm dark:border-dark-3 dark:bg-dark-2"
                rows={2}
                value={field?.value ?? ""}
                onChange={(e) => updateField(key, e.target.value)}
              />
            ) : (
              <input
                className="w-full rounded-md border border-gray-200 p-2 text-sm dark:border-dark-3 dark:bg-dark-2"
                value={field?.value ?? ""}
                onChange={(e) => updateField(key, e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <ToolPageLayout
      pageName="Send Alinta gas agreement"
      title="Send Alinta gas agreement"
      description="Upload a signed Alinta C&I gas engagement form (scans are fine). We extract the details, look up the MIRN on the signed C&I gas sheet, then email the EF and LOA to data.quote."
      width="2xl"
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
          <p>{error}</p>
          {isGoogleReauthError(error) ? (
            <Button className="mt-2" onClick={() => void reauthWithGoogle()}>
              Re-auth with Google
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-4 pt-6">
          {step === 1 && (
            <form onSubmit={handleExtract} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Signed Alinta EF (PDF)</label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  required
                  className="w-full text-sm"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Business name (optional)</label>
                  <input
                    className="w-full rounded-md border border-gray-200 p-2 text-sm dark:border-dark-3 dark:bg-dark-2"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Used to find the LOA"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">MIRN (optional)</label>
                  <input
                    className="w-full rounded-md border border-gray-200 p-2 text-sm dark:border-dark-3 dark:bg-dark-2"
                    value={mrinHint}
                    onChange={(e) => setMrinHint(e.target.value)}
                    placeholder="If not printed clearly on the EF"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading || !file} loading={loading}>
                Extract details
              </Button>
            </form>
          )}

          {step === 2 && draft && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    draft.request_kind === "Retention"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                  }`}
                >
                  {draft.request_kind}
                  {draft.match_kind && draft.match_kind !== "none" ? ` · ${draft.match_kind} MIRN match` : " · no signed contract found"}
                </span>
                {draft.loa_available ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-dark-2 dark:text-gray-300">
                    LOA on file
                  </span>
                ) : (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
                    LOA missing — send is blocked
                  </span>
                )}
                <span className="text-xs text-gray-500">To: {recipient}</span>
                {reviewEfLink}
              </div>

              {warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  {warnings.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">Account type</label>
                <select
                  className="rounded-md border border-gray-200 p-2 text-sm dark:border-dark-3 dark:bg-dark-2"
                  value={draft.request_kind}
                  onChange={(e) =>
                    setDraft((prev) => (prev ? { ...prev, request_kind: e.target.value } : prev))
                  }
                >
                  <option value="Retention">Retention</option>
                  <option value="Acquisition">Acquisition</option>
                </select>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5">
                  <section>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Member</h3>
                    {renderFields(MEMBER_FIELDS)}
                  </section>
                  <section>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Period</h3>
                    {reviewEfLink ? (
                      <p className="-mt-2 mb-3 text-xs text-gray-500">
                        Check dates against the form — {reviewEfLink}
                      </p>
                    ) : null}
                    {renderFields(PERIOD_FIELDS)}
                  </section>
                  <section>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Conditions</h3>
                    {renderFields(CONDITION_FIELDS)}
                  </section>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email preview</h3>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-dark-3 dark:bg-dark-2">
                    <p className="mb-3 font-medium text-gray-900 dark:text-white">{subject}</p>
                    <div className="space-y-2 whitespace-pre-wrap text-gray-700 dark:text-gray-200">
                      <p>Hello Team,</p>
                      <p>I hope this email finds you well.</p>
                      <p>
                        This is an Agreement Request for our member, {fieldValue(draft, "company_name")} (MIRN{" "}
                        {fieldValue(draft, "mirn")}).
                      </p>
                      <p>
                        Please note this is a {draft.request_kind === "Retention" ? "retention" : "acquisition"}{" "}
                        account.
                      </p>
                      <p>
                        Company Name: {fieldValue(draft, "company_name")}
                        {"\n"}ACN/ABN:{fieldValue(draft, "acn_abn")}
                        {"\n"}Address: {fieldValue(draft, "address")}
                        {"\n"}Tel: {fieldValue(draft, "tel")}
                        {"\n"}Contact Name: {fieldValue(draft, "contact_name")}
                        {"\n"}Email: {fieldValue(draft, "email")}
                      </p>
                      <p>
                        Period
                        {"\n"}Start date:{fieldValue(draft, "start_date")}
                        {"\n"}End date: {fieldValue(draft, "end_date")}
                        {"\n"}Price per GJ: {fieldValue(draft, "price_per_gj")}
                        {"\n"}Commission: {fieldValue(draft, "commission_per_gj")}
                      </p>
                      <p>
                        Conditions:
                        {"\n"}Contract Period Quantity (GJ) {fieldValue(draft, "cpq_gj")}
                        {"\n"}Minimum Contract Period Quantity (GJ) {fieldValue(draft, "min_cpq_gj")}
                        {"\n"}Minimum Contract Period Quantity (%of CPQ) {fieldValue(draft, "min_cpq_pct")}
                        {"\n"}Contract Maximum Daily Quantity (GJ) {fieldValue(draft, "mdq_gj")}
                      </p>
                      <p>Attached are both the LOA & the signed engagement form.</p>
                      <p>Kind regards,</p>
                      <p>Alice</p>
                      <p>
                        FORNRG Pty Ltd
                        {"\n"}1300 938 638
                        {"\n"}W: http://www.fornrg.com/
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void handleSend()} disabled={loading} loading={loading}>
                  Send to data.quote
                </Button>
                <Button variant="secondary" type="button" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 whitespace-pre-wrap text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{sentSubject}</p>
              <p>{resultMessage}</p>
              {reviewEfLink ? <p>{reviewEfLink}</p> : null}
              {driveFolderUrl ? (
                <p>
                  <a href={driveFolderUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                    Open member Drive folder
                  </a>
                </p>
              ) : null}
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setStep(1);
                  setDraft(null);
                  setFile(null);
                  setResultMessage(null);
                  setWarnings([]);
                  setDriveFolderUrl(null);
                }}
              >
                Send another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </ToolPageLayout>
  );
}

export default function AlintaGasAgreementRequestPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <AlintaGasAgreementRequestPageInner />
    </Suspense>
  );
}
