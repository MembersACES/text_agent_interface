"use client";

import React, { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUtilityInvoiceUploadEndpoint } from "@/lib/invoice-api-endpoints";
import { cn } from "@/lib/utils";

type UtilityInvoiceUploadBarProps = {
  utilityType: string;
  disabled?: boolean;
  className?: string;
  onUploadSuccess?: (message: string) => void;
};

export function UtilityInvoiceUploadBar({
  utilityType,
  disabled = false,
  className,
  onUploadSuccess,
}: UtilityInvoiceUploadBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const endpoint = getUtilityInvoiceUploadEndpoint(utilityType);

  const handleFile = async (file: File) => {
    if (!endpoint) {
      setFeedback({ tone: "err", text: "Upload is not available for this utility type." });
      return;
    }
    if (!/\.pdf$/i.test(file.name)) {
      setFeedback({ tone: "err", text: "Please upload a PDF invoice." });
      return;
    }

    setUploading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData });
      let data: Record<string, unknown> | null = null;
      let rawText: string | null = null;
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        rawText = await res.text();
      }

      if (rawText && !data) {
        setFeedback({ tone: "err", text: `Error parsing response: ${res.status} ${res.statusText}` });
        return;
      }

      if (!res.ok) {
        setFeedback({
          tone: "err",
          text: String(data?.message || res.statusText || "Upload failed"),
        });
        return;
      }

      const message = String(data?.message || "Invoice uploaded successfully.");
      setFeedback({ tone: "ok", text: message });
      onUploadSuccess?.(message);
    } catch (err: unknown) {
      setFeedback({
        tone: "err",
        text: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (!endpoint) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-stroke bg-gray/30 px-3 py-2.5 dark:border-dark-3 dark:bg-dark-2/50",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        size="sm"
        disabled={disabled || uploading}
        loading={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
        Upload invoice
      </Button>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Lodges a PDF to the {utilityType.replace(/_/g, " ")} processor — new data appears on row 2.
      </span>
      {feedback ? (
        <span
          className={cn(
            "text-xs font-medium",
            feedback.tone === "ok" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400",
          )}
        >
          {feedback.tone === "ok" ? `✅ ${feedback.text}` : `❌ ${feedback.text}`}
        </span>
      ) : null}
    </div>
  );
}
