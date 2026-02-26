"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import UtilityBillReviewForm from "./UtilityBillReviewForm";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, MessageCircle, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Base1ClientProps {
  base1Url: string;
  base1Password?: string;
}

type Base1Mode = "choice" | "form" | "chat";

/** One row from the Base 1 Landing Page Responses sheet (no Email HTML) */
type LandingRow = Record<string, string>;

const BASE1_SHEET_URL = "https://docs.google.com/spreadsheets/d/1FNQXlecyp-qrzao2TOzbndKoCfUPGFN_HgbkNmAs0jw/edit";

function formatTimestamp(ts: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("en-AU", { dateStyle: "medium" }) + " " + d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

export default function Base1Client({
  base1Url,
  base1Password = "",
}: Base1ClientProps) {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;

  const [mode, setMode] = useState<Base1Mode>("choice");
  const [landingRows, setLandingRows] = useState<LandingRow[]>([]);
  const [loadingLanding, setLoadingLanding] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);
  const iframeSrc = useMemo(() => base1Url, [base1Url]);

  /** Rows sorted by Timestamp descending (most recent first) */
  const sortedLandingRows = useMemo(() => {
    if (!landingRows.length) return [];
    return [...landingRows].sort((a, b) => {
      const ta = a["Timestamp"] ?? "";
      const tb = b["Timestamp"] ?? "";
      if (!ta) return 1;
      if (!tb) return -1;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });
  }, [landingRows]);

  useEffect(() => {
    console.log("[Base1Client] base1Url prop:", base1Url);
    console.log("[Base1Client] window.location.href:", window.location.href);
    if (!base1Url) {
      console.warn(
        "[Base1Client] base1Url is empty; iframe will not load."
      );
    }
  }, [base1Url]);

  useEffect(() => {
    if (mode !== "choice" || !token) return;
    setLandingError(null);
    setLoadingLanding(true);
    fetch("/api/base1-landing-responses", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) setLandingError("Please sign in to view Base 1 runs.");
          else if (res.status === 502) setLandingError("Backend unavailable. Deploy text_agent_backend with the latest code (GET /api/base1-landing-responses) and ensure it is running.");
          else setLandingError("Couldn't load Base 1 runs. Try again.");
          return { rows: [] };
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data?.rows)) setLandingRows(data.rows);
        else setLandingRows([]);
      })
      .catch(() => {
        setLandingError(
          "Couldn't load Base 1 runs. Check your connection and that the backend is running."
        );
        setLandingRows([]);
      })
      .finally(() => setLoadingLanding(false));
  }, [mode, token]);

  function retryLandingFetch() {
    if (!token) return;
    setLandingError(null);
    setLoadingLanding(true);
    fetch("/api/base1-landing-responses", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) setLandingError("Please sign in to view Base 1 runs.");
          else if (res.status === 502) setLandingError("Backend unavailable. Deploy text_agent_backend with the latest code (GET /api/base1-landing-responses) and ensure it is running.");
          else setLandingError("Couldn't load Base 1 runs. Try again.");
          return { rows: [] };
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data?.rows)) setLandingRows(data.rows);
        else setLandingRows([]);
      })
      .catch(() => {
        setLandingError(
          "Couldn't load Base 1 runs. Check your connection and that the backend is running."
        );
        setLandingRows([]);
      })
      .finally(() => setLoadingLanding(false));
  }

  if (mode === "form") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setMode("choice")}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to options
        </button>
        <UtilityBillReviewForm />
      </div>
    );
  }

  if (mode === "chat") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setMode("choice")}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to options
        </button>
        {base1Password && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow-sm dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-200">
            <span className="font-semibold">Agent Password:</span>
            <span className="font-mono bg-white/70 px-2 py-0.5 rounded border border-amber-200 select-all dark:bg-dark-2 dark:border-amber-700">
              {base1Password}
            </span>
          </div>
        )}
        {!base1Url && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
            Base 1 agent URL is not set. The iframe has no src and will not load.
          </div>
        )}
        <div className="w-full h-[80vh] rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-dark-3 dark:bg-gray-dark">
          <iframe
            src={iframeSrc}
            title="Base 1 Review Agent"
            className="w-full h-full border-0"
            allow="clipboard-write; clipboard-read"
            onLoad={() =>
              console.log("[Base1Client] iframe loaded successfully:", iframeSrc)
            }
            onError={(e) =>
              console.error("[Base1Client] iframe failed to load:", iframeSrc, e)
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Current Base 1 runs from sheet */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-dark dark:text-white">Base 1 runs</h2>
          <a
            href={BASE1_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2d6b5a] hover:underline"
          >
            Open sheet <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        {!token ? (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-dark-3 dark:bg-dark-2 dark:text-gray-400">
            Sign in to view current Base 1 runs.
          </p>
        ) : loadingLanding ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : landingError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            <p className="font-medium">{landingError}</p>
            <button
              type="button"
              onClick={() => retryLandingFetch()}
              className="mt-2 rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Retry
            </button>
          </div>
        ) : landingRows.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-dark-3 dark:bg-dark-2 dark:text-gray-400">
            No Base 1 runs yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-dark-3">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-dark-2">
                  <TableHead className="font-semibold">Company Name</TableHead>
                  <TableHead className="font-semibold">Contact Name</TableHead>
                  <TableHead className="font-semibold">Contact Email</TableHead>
                  <TableHead className="font-semibold">Contact Number</TableHead>
                  <TableHead className="font-semibold">State</TableHead>
                  <TableHead className="font-semibold">Timestamp</TableHead>
                  <TableHead className="font-semibold">Google Drive Folder</TableHead>
                  <TableHead className="font-semibold">Base 1 Review</TableHead>
                  <TableHead className="font-semibold">Utility Types</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLandingRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row["Company Name"] ?? ""}</TableCell>
                    <TableCell>{row["Contact Name"] ?? ""}</TableCell>
                    <TableCell>{row["Contact Email"] ?? ""}</TableCell>
                    <TableCell>{row["Contact Number"] ?? ""}</TableCell>
                    <TableCell>{row["State"] ?? ""}</TableCell>
                    <TableCell className="whitespace-nowrap text-gray-600 dark:text-gray-400">{formatTimestamp(row["Timestamp"] ?? "")}</TableCell>
                    <TableCell>
                      {row["Google Drive Folder"] ? (
                        <a
                          href={row["Google Drive Folder"]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#2d6b5a] hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {row["Base 1 Review"] ? (
                        <a
                          href={row["Base 1 Review"]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#2d6b5a] hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{row["Utility Types"] ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Section 2: New Base 1 review */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-dark dark:text-white">New Base 1 review</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose how you want to start your Base 1 review:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer border-2 border-stroke transition hover:border-[#2d6b5a] hover:shadow-md dark:border-dark-3 dark:hover:border-[#2d6b5a]"
            onClick={() => setMode("form")}
          >
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2d6b5a]/10 text-[#2d6b5a]">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-dark dark:text-white">Utility Bill Review Form</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fill out the form and upload your utility invoices to trigger a cost analysis.
              </p>
              <span className="text-sm font-medium text-[#2d6b5a]">Start form →</span>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer border-2 border-stroke transition hover:border-primary hover:shadow-md dark:border-dark-3 dark:hover:border-primary"
            onClick={() => setMode("chat")}
          >
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-dark dark:text-white">Chat with Base 1 Agent</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Open the conversational agent to discuss your utility review in chat.
              </p>
              <span className="text-sm font-medium text-primary">Open agent →</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


