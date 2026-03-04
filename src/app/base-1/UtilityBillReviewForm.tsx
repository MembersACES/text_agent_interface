"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";

const WEBHOOK_URL = "/api/base1-submit";

/** Time to wait for proxy → n8n (server has 25 min; client waits slightly longer). */
const SUBMISSION_TIMEOUT_MS = 26 * 60 * 1000; // 26 minutes

/** Response from n8n Respond to Webhook when Base 1 review is ready */
interface WebhookSuccessResponse {
  company?: string;
  g_drive_folder?: string;
  Base_1_review_sheet?: string;
  email_html?: string;
}

const STATES = ["", "NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;
const VALID_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export default function UtilityBillReviewForm() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<WebhookSuccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const toAdd: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      if (!VALID_TYPES.includes(file.type)) {
        setError(`${file.name}: invalid type. Use PDF, JPG, or PNG.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: max size 10MB.`);
        return;
      }
      const exists = files.some((f) => f.name === file.name && f.size === file.size);
      if (!exists) toAdd.push(file);
    }
    setError(null);
    setFiles((prev) => [...prev, ...toAdd]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please upload at least one utility invoice file.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setErrorDetail(null);
    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("companyName", companyName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("state", state);
    formData.append("additionalInfo", additionalInfo);
    formData.append("timestamp", new Date().toISOString());
    files.forEach((file, i) => formData.append("file_" + i, file));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUBMISSION_TIMEOUT_MS);
    const startTime = Date.now();
    try {
      console.log("[Base1] Submitting to webhook...", { url: WEBHOOK_URL, fileCount: files.length });
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log("[Base1] Response received", { status: res.status, statusText: res.statusText, elapsedSeconds: elapsed });
      if (res.ok) {
        try {
          const data = (await res.json()) as WebhookSuccessResponse;
          if (data && (data.email_html != null || data.Base_1_review_sheet != null || data.g_drive_folder != null)) {
            setWebhookResponse(data);
          }
        } catch {
          // Response wasn't JSON or unexpected shape – show generic success
        }
        setSuccess(true);
      } else {
        const bodyText = await res.text();
        const detail = `HTTP ${res.status} ${res.statusText}${bodyText ? ` — ${bodyText.slice(0, 200)}` : ""}`;
        console.error("[Base1] Non-OK response", { status: res.status, statusText: res.statusText, body: bodyText });
        setErrorDetail(detail);
        // 524/504 = proxy or upstream timeout; n8n workflow often still completes and emails the result
        const isUpstreamTimeout = res.status === 524 || res.status === 504;
        if (isUpstreamTimeout) {
          setError(
            "The request timed out before we could show the result here. Your submission was received—check the Lead Pipeline (Base 1) below and your email; the review will appear once processing finishes. Contact business@acesolutions.com.au only if it doesn’t."
          );
        } else {
          setError("Submission failed. Please try again or contact business@acesolutions.com.au");
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      const detail = isTimeout
        ? `Request aborted after ${elapsed}s (client timeout)`
        : err instanceof Error
          ? `${err.name}: ${err.message} (after ${elapsed}s)`
          : String(err);
      console.error("[Base1] Request failed", { err, isTimeout, elapsedSeconds: elapsed });
      if (isTimeout) {
        setErrorDetail(detail);
        setError(
          "The request timed out before we could show the result. Your submission was received—check the Lead Pipeline (Base 1) below; your review should appear there once processing finishes. Contact business@acesolutions.com.au only if it doesn’t appear."
        );
      } else {
        setErrorDetail(detail);
        setError("Submission failed. Please try again or contact business@acesolutions.com.au");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-dark dark:text-white dark:border-dark-3 dark:bg-dark-2 focus:border-[#2d6b5a] focus:outline-none focus:ring-0";
  const labelClass = "mb-1.5 block text-sm font-semibold text-dark dark:text-white";

  if (success) {
    const hasReport = webhookResponse?.email_html != null || webhookResponse?.Base_1_review_sheet != null || webhookResponse?.g_drive_folder != null;

    return (
      <Card className="overflow-hidden border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark">
        <div className="bg-gradient-to-br from-[#1a4d3e] to-[#2d6b5a] px-6 py-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl">✅</div>
          <h3 className="text-xl font-semibold">
            {hasReport ? "Base 1 Review Complete" : "Submission Received!"}
          </h3>
          <p className="mt-1 opacity-90">
            {hasReport
              ? "Your utility analysis is ready"
              : "Thank you for submitting your utility invoices"}
          </p>
        </div>
        <CardContent className="p-6">
          {hasReport ? (
            <div className="space-y-6">
              {webhookResponse?.company && (
                <p className="text-center text-lg font-semibold text-dark dark:text-white">
                  {webhookResponse.company}
                </p>
              )}
              {(webhookResponse?.Base_1_review_sheet != null || webhookResponse?.g_drive_folder != null) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {webhookResponse?.Base_1_review_sheet && (
                    <div className="rounded-lg border border-[#2d6b5a]/20 bg-gray-50 p-4 dark:bg-dark-2">
                      <p className="mb-2 text-sm font-semibold text-dark dark:text-white">Base 1 Review Sheet</p>
                      <a
                        href={webhookResponse.Base_1_review_sheet}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-[#2d6b5a] underline hover:no-underline"
                      >
                        Open review sheet →
                      </a>
                    </div>
                  )}
                  {webhookResponse?.g_drive_folder && (
                    <div className="rounded-lg border border-[#2d6b5a]/20 bg-gray-50 p-4 dark:bg-dark-2">
                      <p className="mb-2 text-sm font-semibold text-dark dark:text-white">Google Drive Folder</p>
                      <a
                        href={`https://drive.google.com/drive/folders/${webhookResponse.g_drive_folder}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-[#2d6b5a] underline hover:no-underline"
                      >
                        Open Drive folder →
                      </a>
                    </div>
                  )}
                </div>
              )}
              {webhookResponse?.email_html && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-dark dark:text-white">Base 1 Review Report</h4>
                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-dark-3">
                    <iframe
                      title="Base 1 Review Report"
                      sandbox="allow-same-origin"
                      srcDoc={webhookResponse.email_html}
                      className="h-[70vh] w-full border-0 bg-white dark:bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
                We&apos;ve received your utility bill information and our sustainability experts will begin your cost analysis shortly. You can expect to hear from our team within <strong>1–2 business days</strong>.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { icon: "🔍", label: "Step 1", desc: "We review & analyse your utility invoices" },
                  { icon: "📊", label: "Step 2", desc: "We identify savings & optimisation opportunities" },
                  { icon: "📞", label: "Step 3", desc: "We contact you with a tailored cost reduction plan" },
                ].map((step) => (
                  <div
                    key={step.label}
                    className="rounded-lg border border-[#2d6b5a]/20 bg-white p-4 text-center dark:bg-dark-2"
                  >
                    <span className="text-2xl">{step.icon}</span>
                    <div className="mt-2 text-xs font-bold uppercase tracking-wide text-[#2d6b5a]">{step.label}</div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{step.desc}</div>
                  </div>
                ))}
              </div>
              <p className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-[#2d6b5a]/20 bg-white px-4 py-3 text-sm text-gray-600 dark:bg-dark-2 dark:text-gray-400">
                <span>💬</span>
                Questions? Email us at{" "}
                <a href="mailto:business@acesolutions.com.au" className="font-semibold text-[#2d6b5a] hover:underline">
                  business@acesolutions.com.au
                </a>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark">
      <div className="bg-gradient-to-br from-[#1a4d3e] to-[#2d6b5a] px-6 py-8 text-center text-white">
        <h2 className="text-xl font-semibold tracking-wide">Base 1 Review Form</h2>
        <p className="mt-2 text-sm opacity-90">Complete cost analysis for all your utility services</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 border-t border-white/20 pt-4">
          {["⚡ Electricity", "🔥 Gas", "💧 Water", "🗑️ Waste", "🍳 Cooking Oil"].map((u) => (
            <span key={u} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {u}
            </span>
          ))}
        </div>
      </div>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="fullName" className={labelClass}>
                Member Contact Name <span className="text-red-600">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="companyName" className={labelClass}>
                Company Name <span className="text-red-600">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>
                Email Address (this will recieve the Base 1 review report & email) <span className="text-red-600">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone Number <span className="text-red-600">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                required
                placeholder="0400 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="state" className={labelClass}>
              State <span className="text-red-600">*</span>
            </label>
            <select
              id="state"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={inputClass}
            >
              <option value="">Select State</option>
              {STATES.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Upload Utility Invoices <span className="text-red-600">*</span></label>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Upload bills for Electricity, Gas, Water, Waste, and/or Cooking Oil services
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#2d6b5a] bg-gray-50 py-10 transition hover:bg-gray-100 dark:bg-dark-2 dark:hover:bg-dark-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <span className="text-4xl text-[#2d6b5a]">📄</span>
              <span className="mt-3 font-semibold text-dark dark:text-white">Click to upload your utility invoices</span>
              <span className="mt-1 text-sm text-gray-500">PDF, JPG, PNG • Max 10MB per file • Multiple files allowed</span>
            </label>
            {files.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {files.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-dark-3 dark:bg-dark-2"
                  >
                    <div>
                      <div className="font-medium text-dark dark:text-white">{file.name}</div>
                      <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="additionalInfo" className={labelClass}>Additional Information</label>
            <textarea
              id="additionalInfo"
              rows={4}
              placeholder="Tell us about your facility, current utility challenges, or any specific concerns..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
              <strong>Submission Error</strong>
              <p className="mt-1 text-sm">{error}</p>
              {errorDetail && (
                <p className="mt-2 font-mono text-xs opacity-90" title="Use this when reporting the issue">
                  {errorDetail}
                </p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || files.length === 0}
            className="w-full rounded-lg bg-[#2d6b5a] px-6 py-4 text-lg font-semibold text-white shadow transition hover:bg-[#1a4d3e] disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting ? "Processing..." : "Submit Application"}
          </button>
        </form>
      </CardContent>
      {submitting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
          <div className="rounded-xl bg-white p-8 text-center shadow-xl dark:bg-gray-dark">
            <div className="mx-auto flex flex-col items-center gap-4">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-gray-200 border-t-[#2d6b5a] dark:border-dark-3" />
              <div className="space-y-1">
                <p className="font-semibold text-dark dark:text-white">Processing your submission</p>
                <p className="text-sm text-gray-500">We&apos;re analysing your utility invoices. This can take up to 25 minutes—please keep this tab open.</p>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#2d6b5a] [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#2d6b5a] [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#2d6b5a] [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

