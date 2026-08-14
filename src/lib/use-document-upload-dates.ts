"use client";

import { useEffect, useState } from "react";
import { fetchDriveFileUploadDates } from "@/lib/member-documents-api";

/** Load Drive createdTime (upload date) for the given file IDs. */
export function useDocumentUploadDates(
  fileIds: readonly string[],
  token?: string | null,
): Record<string, string> {
  const [dates, setDates] = useState<Record<string, string>>({});
  const key = [...new Set(fileIds.filter(Boolean))].sort().join("\n");

  useEffect(() => {
    if (!token || !key) return;
    let cancelled = false;
    void fetchDriveFileUploadDates(key.split("\n"), token).then((map) => {
      if (!cancelled) setDates(map);
    });
    return () => {
      cancelled = true;
    };
  }, [token, key]);

  return dates;
}
