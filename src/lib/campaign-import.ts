import {
  INTELLIGENCE_SENTINEL,
  MERGE_FIELD_BY_KEY,
  MERGE_FIELDS,
  mappedKeys,
  type MergeField,
} from "./merge-template";

const AU_STATES = new Set([
  "nsw",
  "vic",
  "qld",
  "sa",
  "wa",
  "tas",
  "nt",
  "act",
]);
const SHAPE_THRESHOLD = 0.9;

export type RecipientGroup = {
  id: string;
  email: string | null;
  sourceIndexes: number[];
  identical: boolean;
  differingKeys: string[];
};

export type ResolvedRecipient = {
  id: string;
  email: string | null;
  sourceIndex: number;
  duplicateCount: number;
  mergeRow: Record<string, string>;
};

export function groupRecipients(
  mergeRows: Record<string, string>[],
): RecipientGroup[] {
  const groups = new Map<string, { email: string | null; indexes: number[] }>();
  const order: string[] = [];

  mergeRows.forEach((row, index) => {
    const email = (row.contact_email ?? "").trim().toLowerCase();
    const id = email ? `email:${email}` : `row:${index}`;
    const existing = groups.get(id);
    if (existing) {
      existing.indexes.push(index);
      return;
    }
    groups.set(id, { email: email || null, indexes: [index] });
    order.push(id);
  });

  return order.map((id) => {
    const group = groups.get(id)!;
    const rows = group.indexes.map((index) => mergeRows[index]);
    const differingKeys = differingMappedKeys(rows);
    return {
      id,
      email: group.email,
      sourceIndexes: group.indexes,
      identical: differingKeys.length === 0,
      differingKeys,
    };
  });
}

function differingMappedKeys(rows: Record<string, string>[]): string[] {
  if (rows.length <= 1) return [];
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  const differing: string[] = [];
  for (const key of keys) {
    const first = (rows[0][key] ?? "").trim().toLowerCase();
    if (rows.some((row) => (row[key] ?? "").trim().toLowerCase() !== first)) {
      differing.push(key);
    }
  }
  return differing;
}

export function resolveRecipients(
  mergeRows: Record<string, string>[],
  groups: RecipientGroup[],
  picks: Record<string, number>,
): ResolvedRecipient[] {
  const resolved: ResolvedRecipient[] = [];
  for (const group of groups) {
    const sourceIndex = representativeIndex(group, picks);
    if (sourceIndex == null) continue;
    resolved.push({
      id: group.id,
      email: group.email,
      sourceIndex,
      duplicateCount: group.sourceIndexes.length,
      mergeRow: mergeRows[sourceIndex],
    });
  }
  return resolved;
}

function representativeIndex(
  group: RecipientGroup,
  picks: Record<string, number>,
): number | null {
  if (group.sourceIndexes.length === 1) return group.sourceIndexes[0];
  if (group.identical) return group.sourceIndexes[0];
  const picked = picks[group.id];
  if (picked == null) return null;
  return group.sourceIndexes.includes(picked) ? picked : null;
}

export type ShapeWarning = {
  key: string;
  label: string;
  okCount: number;
  failCount: number;
  total: number;
  okFraction: number;
};

function uniqueRowIndexes(
  headers: string[],
  rows: string[][],
  columnMap: Record<string, string>,
): number[] {
  const emailHeader = headers.find((header) => columnMap[header] === "contact_email");
  const emailIndex = emailHeader != null ? headers.indexOf(emailHeader) : -1;
  const seen = new Set<string>();
  const indexes: number[] = [];
  rows.forEach((row, index) => {
    const email =
      emailIndex >= 0 ? (row[emailIndex] ?? "").trim().toLowerCase() : "";
    const id = email ? `email:${email}` : `row:${index}`;
    if (seen.has(id)) return;
    seen.add(id);
    indexes.push(index);
  });
  return indexes;
}

export function columnShapeWarnings(
  headers: string[],
  rows: string[][],
  columnMap: Record<string, string>,
): ShapeWarning[] {
  const warnings: ShapeWarning[] = [];
  if (rows.length === 0) return warnings;
  const uniqueIndexes = uniqueRowIndexes(headers, rows, columnMap);
  const uniqueRows = uniqueIndexes.map((index) => rows[index]);
  const total = uniqueRows.length;
  if (total === 0) return warnings;

  for (const header of headers) {
    const key = columnMap[header];
    if (!key || key === INTELLIGENCE_SENTINEL) continue;
    const checker = shapeChecker(key);
    if (!checker) continue;
    const headerIndex = headers.indexOf(header);
    let okCount = 0;
    for (const row of uniqueRows) {
      if (checker((row[headerIndex] ?? "").trim())) okCount += 1;
    }
    const failCount = total - okCount;
    const okFraction = okCount / total;
    if (okFraction < SHAPE_THRESHOLD) {
      warnings.push({
        key,
        label: MERGE_FIELD_BY_KEY[key]?.label ?? header,
        okCount,
        failCount,
        total,
        okFraction,
      });
    }
  }

  return warnings;
}

function shapeChecker(key: string): ((value: string) => boolean) | null {
  switch (key) {
    case "contact_email":
      return (value) => value.includes("@");
    case "contact_phone":
      return (value) => value.replace(/\D/g, "").length >= 8;
    case "state":
      return (value) => AU_STATES.has(value.toLowerCase());
    case "postcode":
      return (value) => /^\d{4}$/.test(value);
    default:
      return null;
  }
}

export function mappingCounts(columnMap: Record<string, string>): {
  sent: number;
  held: number;
} {
  const sent = mappedKeys(columnMap).size;
  const held = Object.values(columnMap).filter(
    (dest) => dest === INTELLIGENCE_SENTINEL,
  ).length;
  return { sent, held };
}

export function allowedFieldsFromMap(
  columnMap: Record<string, string>,
): MergeField[] {
  const keys = mappedKeys(columnMap);
  return MERGE_FIELDS.filter((field) => keys.has(field.key));
}
