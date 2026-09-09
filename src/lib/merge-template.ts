export type MergeField = { key: string; label: string };

export const INTELLIGENCE_SENTINEL = "__intelligence__";

export const MERGE_FIELDS: MergeField[] = [
  { key: "first_name", label: "First name" },
  { key: "contact_name", label: "Contact name" },
  { key: "company_name", label: "Company name" },
  { key: "contact_email", label: "Contact email" },
  { key: "contact_phone", label: "Contact phone" },
  { key: "state", label: "State" },
  { key: "city", label: "City" },
  { key: "postcode", label: "Postcode" },
  { key: "industry", label: "Industry" },
];

export const MERGE_FIELD_KEYS = new Set(MERGE_FIELDS.map((field) => field.key));

export const MERGE_FIELD_BY_KEY = Object.fromEntries(
  MERGE_FIELDS.map((field) => [field.key, field]),
) as Record<string, MergeField>;

const TOKEN_RE = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF\u00AD]/g;

const HEADER_ALIASES: Record<string, string> = {
  first_name: "first_name",
  firstname: "first_name",
  first: "first_name",
  contact_name: "contact_name",
  contact: "contact_name",
  full_name: "contact_name",
  name: "contact_name",
  company_name: "company_name",
  company: "company_name",
  business: "company_name",
  business_name: "company_name",
  contact_email: "contact_email",
  email: "contact_email",
  e_mail: "contact_email",
  contact_phone: "contact_phone",
  phone: "contact_phone",
  mobile: "contact_phone",
  telephone: "contact_phone",
  tel: "contact_phone",
  state: "state",
  city: "city",
  suburb: "city",
  postcode: "postcode",
  post_code: "postcode",
  zip: "postcode",
  zipcode: "postcode",
  zip_code: "postcode",
  industry: "industry",
};

export function normalizeTemplate(template: string): string {
  return template
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(ZERO_WIDTH_RE, "");
}

function tokenRegex(): RegExp {
  return new RegExp(TOKEN_RE.source, "g");
}

export function extractTokens(template: string): string[] {
  const source = normalizeTemplate(template);
  const tokens: string[] = [];
  const re = tokenRegex();
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    tokens.push(match[1]);
  }
  return tokens;
}

export function validateTemplate(
  template: string,
  allowed: MergeField[],
): { ok: true } | { ok: false; unknown: string[] } {
  const allowedKeys = new Set(allowed.map((field) => field.key));
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const token of extractTokens(template)) {
    if (allowedKeys.has(token) || seen.has(token)) continue;
    seen.add(token);
    unknown.push(token);
  }
  return unknown.length === 0 ? { ok: true } : { ok: false, unknown };
}

export type TokenIssueKind = "ok" | "held_back" | "unknown";

export function classifyToken(
  token: string,
  mappedKeys: ReadonlySet<string>,
): TokenIssueKind {
  if (mappedKeys.has(token)) return "ok";
  if (MERGE_FIELD_KEYS.has(token)) return "held_back";
  return "unknown";
}

export function renderTemplate(
  template: string,
  row: Record<string, string>,
): { output: string; unresolved: string[] } {
  const source = normalizeTemplate(template);
  const unresolved: string[] = [];
  const seen = new Set<string>();
  const output = source.replace(tokenRegex(), (full, token: string) => {
    if (!(token in row)) return full;
    const value = row[token] ?? "";
    if (value === "" && !seen.has(token)) {
      seen.add(token);
      unresolved.push(token);
    }
    return value;
  });
  return { output, unresolved };
}

export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li)>/gi, "\n");

  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(withBreaks, "text/html");
    return collapseText(doc.body.textContent ?? "");
  }

  const stripped = withBreaks
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return collapseText(stripped);
}

function collapseText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function suggestMergeKey(header: string): string | null {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;
  if (HEADER_ALIASES[normalized]) return HEADER_ALIASES[normalized];
  if (MERGE_FIELD_KEYS.has(normalized)) return normalized;
  return null;
}

export function firstNameFromContact(contactName: string): string {
  const token = contactName.trim().split(/\s+/)[0] ?? "";
  return token;
}

export function initialColumnMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  for (const header of headers) {
    const suggestion = suggestMergeKey(header);
    if (suggestion && !used.has(suggestion)) {
      map[header] = suggestion;
      used.add(suggestion);
    } else {
      map[header] = INTELLIGENCE_SENTINEL;
    }
  }
  return map;
}

export function mappedMergeFields(
  columnMap: Record<string, string>,
): MergeField[] {
  const keys = mappedKeys(columnMap);
  return MERGE_FIELDS.filter((field) => keys.has(field.key));
}

export function mappedKeys(columnMap: Record<string, string>): Set<string> {
  const keys = new Set<string>();
  let hasContactName = false;
  let hasFirstName = false;
  for (const dest of Object.values(columnMap)) {
    if (dest === INTELLIGENCE_SENTINEL) continue;
    keys.add(dest);
    if (dest === "contact_name") hasContactName = true;
    if (dest === "first_name") hasFirstName = true;
  }
  if (hasContactName && !hasFirstName) keys.add("first_name");
  return keys;
}

export function isFirstNameDerived(columnMap: Record<string, string>): boolean {
  let hasContactName = false;
  let hasFirstName = false;
  for (const dest of Object.values(columnMap)) {
    if (dest === "contact_name") hasContactName = true;
    if (dest === "first_name") hasFirstName = true;
  }
  return hasContactName && !hasFirstName;
}

export function buildMergeRow(
  headers: string[],
  cells: string[],
  columnMap: Record<string, string>,
): Record<string, string> {
  const row: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const dest = columnMap[headers[i]];
    if (!dest || dest === INTELLIGENCE_SENTINEL) continue;
    row[dest] = (cells[i] ?? "").trim();
  }
  if (isFirstNameDerived(columnMap) && row.contact_name) {
    row.first_name = firstNameFromContact(row.contact_name);
  } else if (isFirstNameDerived(columnMap)) {
    row.first_name = "";
  }
  return row;
}

export function buildMergeRows(
  headers: string[],
  rows: string[][],
  columnMap: Record<string, string>,
): Record<string, string>[] {
  return rows.map((cells) => buildMergeRow(headers, cells, columnMap));
}

export type TokenCoverage = {
  key: string;
  label: string;
  emptyCount: number;
  total: number;
};

export function coverageByToken(
  templates: string[],
  rows: Record<string, string>[],
  allowed: MergeField[],
): TokenCoverage[] {
  const allowedKeys = new Set(allowed.map((field) => field.key));
  const used: string[] = [];
  const seen = new Set<string>();
  for (const template of templates) {
    for (const token of extractTokens(template)) {
      if (!allowedKeys.has(token) || seen.has(token)) continue;
      seen.add(token);
      used.push(token);
    }
  }
  const total = rows.length;
  return used.map((key) => {
    const emptyCount = rows.filter((row) => !(row[key] ?? "").trim()).length;
    return {
      key,
      label: MERGE_FIELD_BY_KEY[key]?.label ?? key,
      emptyCount,
      total,
    };
  });
}
