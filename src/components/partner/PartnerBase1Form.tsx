"use client";

import { FormEvent, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitPartnerBase1 } from "@/lib/partner-api";

const STATES = ["", "NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;
const MAX_FILES = 15;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".heic", ".heif"]);

function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PartnerBase1Form() {
  const { data: session } = useSession();
  const token = (session as { id_token?: string } | null)?.id_token;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      const ext = extensionOf(file.name);
      if (!ALLOWED_EXT.has(ext)) {
        setError(`${file.name}: PDF, JPG, PNG, or HEIC only`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name}: max size is 8MB`);
        return;
      }
      if (!next.some((row) => row.name === file.name && row.size === file.size)) {
        next.push(file);
      }
    }
    if (next.length > MAX_FILES) {
      setError("You can upload at most 15 files.");
      return;
    }
    const total = next.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setError("Total upload exceeds 30MB.");
      return;
    }
    setError(null);
    setFiles(next);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("Sign in again to submit.");
      return;
    }
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (files.length === 0) {
      setError("Upload at least one utility invoice.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const form = new FormData();
    form.append("companyName", companyName.trim());
    form.append("fullName", fullName);
    form.append("email", email);
    form.append("phone", phone);
    form.append("state", state);
    form.append("additionalInfo", additionalInfo);
    files.forEach((file) => form.append("files", file));
    try {
      const result = await submitPartnerBase1(token, form);
      if (result.kind === "received") {
        setSuccess(
          "We received your documents. Our team will review them and be in touch.",
        );
      } else {
        setSuccess("Submitted. You can find this client in your client list.");
      }
      setFiles([]);
      setCompanyName("");
      setFullName("");
      setPhone("");
      setState("");
      setAdditionalInfo("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again shortly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        pageName="Base 1"
        title="Submit a Base 1 review"
        description="Upload utility invoices for a site you want ACES to review. PDF, JPG, PNG, or HEIC. Up to 15 files, 8MB each, 30MB total."
      />
      <Card>
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-dark dark:text-white">
                Company name
              </span>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-dark dark:text-white">
                Contact name
              </span>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-dark dark:text-white">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-dark dark:text-white">
                  Phone
                </span>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-dark dark:text-white">
                  State
                </span>
                <select
                  className="h-10 w-full rounded-lg border border-stroke bg-white px-3 text-sm dark:border-dark-3 dark:bg-gray-dark"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  {STATES.map((item) => (
                    <option key={item || "blank"} value={item}>
                      {item || "Select"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-dark dark:text-white">
                Additional info
              </span>
              <textarea
                className="min-h-24 w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-gray-dark"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
              />
            </label>
            <div>
              <p className="mb-1 text-sm font-medium text-dark dark:text-white">
                Utility invoices
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,application/pdf,image/jpeg,image/png,image/heic,image/heif"
                multiple
                onChange={(e) => addFiles(e.target.files)}
              />
              {files.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex justify-between gap-2">
                      <span>
                        {file.name} ({formatSize(file.size)})
                      </span>
                      <button
                        type="button"
                        className="text-primary"
                        onClick={() =>
                          setFiles((prev) => prev.filter((_, item) => item !== index))
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {error && (
              <p className="text-sm text-red" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-700 dark:text-green-400" role="status">
                {success}
              </p>
            )}
            <Button type="submit" loading={submitting} disabled={submitting}>
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
