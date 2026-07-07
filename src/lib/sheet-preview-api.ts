import { getApiBaseUrl } from "@/lib/utils";

export type SheetPreviewRow = {
  row_number: number;
  cells: Record<string, string>;
  is_latest: boolean;
};

export type SheetPreviewResponse = {
  utility_type: string;
  tab: string | null;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  latest_row_number: number;
  columns: string[];
  rows: SheetPreviewRow[];
  fetched_at: string;
};

export async function fetchSheetPreview(
  utilityType: string,
  token: string,
  rows = 5,
): Promise<SheetPreviewResponse> {
  const params = new URLSearchParams({
    utility_type: utilityType,
    rows: String(rows),
  });

  const res = await fetch(`${getApiBaseUrl()}/api/sheet-preview?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    throw new Error("REAUTHENTICATION_REQUIRED");
  }

  if (!res.ok) {
    let detail = "Failed to load sheet preview";
    try {
      const err = await res.json();
      detail = String(err.detail || err.message || detail);
    } catch {
      detail = res.statusText || detail;
    }
    throw new Error(detail);
  }

  return res.json();
}

/** Fingerprint for the latest (row 2) preview row — used to detect sheet updates. */
export function latestRowFingerprint(preview: SheetPreviewResponse | null): string {
  if (!preview?.rows?.length) return "";
  const latest = preview.rows.find((r) => r.is_latest) ?? preview.rows[0];
  return preview.columns.map((col) => String(latest.cells[col] ?? "").trim()).join("|");
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when the latest row business name loosely matches the expected value. */
export function latestRowMatchesBusiness(
  preview: SheetPreviewResponse | null,
  expectedBusinessName: string,
): boolean {
  const expected = normalizeName(expectedBusinessName);
  if (!expected || !preview?.rows?.length) return false;

  const latest = preview.rows.find((r) => r.is_latest) ?? preview.rows[0];
  const nameKeys = ["Business Name", "Client Name", "Account Name", "Member Name"];
  for (const key of nameKeys) {
    const val = normalizeName(String(latest.cells[key] ?? ""));
    if (!val) continue;
    if (val === expected || val.includes(expected) || expected.includes(val)) {
      return true;
    }
  }
  return false;
}

export function formatPreviewColumnLabel(column: string): string {
  return column
    .replace(/_/g, " ")
    .replace(/:/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map a preview row to LOA business-details keys used by BusinessDetailsDisplay. */
export function sheetPreviewRowToLoaDetails(
  row: SheetPreviewRow,
): Record<string, string | number> {
  return {
    ...row.cells,
    row_number: row.row_number,
  };
}

/** Map a preview row to a utility invoice record (all preview cells + row_number). */
export function sheetPreviewRowToUtilityRecord(
  row: SheetPreviewRow,
): Record<string, string | number> {
  return {
    ...row.cells,
    row_number: row.row_number,
  };
}
