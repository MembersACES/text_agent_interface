/** Placeholder question lists. Replace the sections when the real electricity and gas checklists are supplied. */

export type ChecklistFuel = "electricity" | "gas";

export type ChecklistStatus = "draft" | "complete";

export type ChecklistFieldType = "yes_no" | "text" | "number" | "date" | "select";

export type ChecklistField = {
  key: string;
  label: string;
  type: ChecklistFieldType;
  options?: { value: string; label: string }[];
};

export type ChecklistSection = {
  title: string;
  fields: ChecklistField[];
};

export type ChecklistDefinition = {
  fuel: ChecklistFuel;
  templateVersion: number;
  sections: ChecklistSection[];
};

export type UtilityChecklistRecord = {
  id: number;
  client_id: number;
  fuel: ChecklistFuel;
  utility_type: string;
  identifier: string;
  status: ChecklistStatus;
  answers: Record<string, unknown>;
  template_version: number;
  row_version: number;
  completed_at: string | null;
  updated_by: string | null;
  drive_file_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const FUEL_BY_UTILITY_TYPE: Record<string, ChecklistFuel> = {
  electricity_ci: "electricity",
  electricity_sme: "electricity",
  gas_ci: "gas",
  gas_sme: "gas",
};

export const UTILITY_TYPE_LABELS: Record<string, string> = {
  electricity_ci: "C&I Electricity",
  electricity_sme: "SME Electricity",
  gas_ci: "C&I Gas",
  gas_sme: "SME Gas",
};

export const CHECKLIST_ROW_KEYS = new Set([
  "C&I Electricity",
  "SME Electricity",
  "C&I Gas",
  "SME Gas",
]);

const METER_OPTIONS = [
  { value: "", label: "Select" },
  { value: "basic", label: "Basic" },
  { value: "interval", label: "Interval" },
  { value: "unknown", label: "Unknown" },
];

/** One saved checklist per fuel. Account rows stay on the Airtable utility records. */
export const FUEL_CHECKLIST_ID = "*";

/** Retailer on this type is an Airtable lookup, so the utility record cannot be patched. */
const LOOKUP_RETAILER_TYPES = new Set(["C&I Electricity"]);

export type LinkedAccount = {
  utilityType: string;
  identifier: string;
  retailer: string;
  contractEnd: string;
  dmaEnd: string;
  retailerWritable: boolean;
};

const CHECKLIST_SEED_MAX_AGE_MS = 30 * 60 * 1000;

export function checklistSeedKey(clientId: number, fuel: ChecklistFuel): string {
  return `utility-checklist-seed:${clientId}:${fuel}`;
}

function isLinkedAccount(value: unknown): value is LinkedAccount {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.utilityType === "string" &&
    typeof row.identifier === "string" &&
    row.identifier.length > 0 &&
    typeof row.retailer === "string" &&
    typeof row.contractEnd === "string" &&
    typeof row.dmaEnd === "string" &&
    typeof row.retailerWritable === "boolean"
  );
}

/** Accounts already on the CRM utilities tab. The checklist reads this instead of searching Airtable again. */
export function writeChecklistSeed(clientId: number, fuel: ChecklistFuel, accounts: LinkedAccount[]): void {
  try {
    localStorage.setItem(
      checklistSeedKey(clientId, fuel),
      JSON.stringify({ savedAt: Date.now(), accounts }),
    );
  } catch {
    /* private mode or a full store */
  }
}

export function readChecklistSeed(clientId: number, fuel: ChecklistFuel): LinkedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(checklistSeedKey(clientId, fuel));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { savedAt?: number; accounts?: unknown };
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > CHECKLIST_SEED_MAX_AGE_MS) return [];
    if (!Array.isArray(parsed.accounts)) return [];
    return parsed.accounts.filter(isLinkedAccount);
  } catch {
    return [];
  }
}

export const ELECTRICITY_CHECKLIST: ChecklistDefinition = {
  fuel: "electricity",
  templateVersion: 1,
  sections: [
    {
      title: "Checklist",
      fields: [
        { key: "meter_type", label: "Meter type", type: "select", options: METER_OPTIONS },
        { key: "demand_charges", label: "Demand charges on the bill", type: "yes_no" },
        { key: "notes", label: "Notes", type: "text" },
      ],
    },
  ],
};

export const GAS_CHECKLIST: ChecklistDefinition = {
  fuel: "gas",
  templateVersion: 1,
  sections: [
    {
      title: "Checklist",
      fields: [
        { key: "mdq", label: "MDQ", type: "number" },
        { key: "daily_charge", label: "Daily charge on the bill", type: "yes_no" },
        { key: "notes", label: "Notes", type: "text" },
      ],
    },
  ],
};

export function fuelForUtilityType(utilityType: string): ChecklistFuel | null {
  return FUEL_BY_UTILITY_TYPE[utilityType] ?? null;
}

export function definitionForFuel(fuel: ChecklistFuel): ChecklistDefinition {
  return fuel === "gas" ? GAS_CHECKLIST : ELECTRICITY_CHECKLIST;
}

export function normaliseChecklistIdentifier(value: string): string {
  return value.trim().toUpperCase();
}

export function checklistButtonLabel(
  rows: { fuel: string; identifier: string; status: string }[],
  fuel: ChecklistFuel,
): string {
  const row = rows.find((item) => item.fuel === fuel && item.identifier === FUEL_CHECKLIST_ID);
  const name = fuel === "gas" ? "Gas checklist" : "Electricity checklist";
  if (!row) return name;
  if (row.status === "complete") return `${name} (done)`;
  if (row.status === "draft") return `${name} (draft)`;
  return name;
}

export function findChecklist(
  rows: UtilityChecklistRecord[],
  fuel: ChecklistFuel,
): UtilityChecklistRecord | undefined {
  return rows.find((item) => item.fuel === fuel && item.identifier === FUEL_CHECKLIST_ID);
}

export function toIsoDate(value: unknown): string {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const match = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!match) return "";
  let first = Number(match[1]);
  let second = Number(match[2]);
  let year = match[3];
  if (year.length === 2) year = `20${year}`;
  if (second > 12 && first <= 12) {
    const month = first;
    first = second;
    second = month;
  }
  if (first > 31 || second > 12 || second < 1) return "";
  return `${year}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`;
}

export type IdentifierMatchKind = "exact" | "checksum" | "one_digit";

/** Same trailing-digit rules as the signed-contract sheet lookup. */
export function identifierMatchKind(
  leftRaw: string,
  rightRaw: string,
  fuel: ChecklistFuel,
): IdentifierMatchKind | null {
  const left = fuel === "gas" ? leftRaw.replace(/\D/g, "") : leftRaw.trim().toUpperCase();
  const right = fuel === "gas" ? rightRaw.replace(/\D/g, "") : rightRaw.trim().toUpperCase();
  if (!left || !right) return null;
  if (left === right) return "exact";
  if (fuel === "electricity" && !(/^\d+$/.test(left) && /^\d+$/.test(right))) return null;
  if (right.length === left.length + 1 && right.startsWith(left)) return "checksum";
  if (left.length === right.length + 1 && left.startsWith(right)) return "checksum";
  if (
    left.length === right.length &&
    left.length >= 2 &&
    left.slice(0, -1) === right.slice(0, -1) &&
    left.slice(-1) !== right.slice(-1)
  ) {
    return "one_digit";
  }
  return null;
}

export type AccountGroup = {
  primary: LinkedAccount;
  others: { account: LinkedAccount; kind: "checksum" | "one_digit" }[];
};

function pickPrimary(members: LinkedAccount[]): LinkedAccount {
  return [...members].sort((a, b) => {
    if (Boolean(a.contractEnd) !== Boolean(b.contractEnd)) return a.contractEnd ? -1 : 1;
    const lengthGap = b.identifier.replace(/\D/g, "").length - a.identifier.replace(/\D/g, "").length;
    if (lengthGap !== 0) return lengthGap;
    if (Boolean(a.retailer) !== Boolean(b.retailer)) return a.retailer ? -1 : 1;
    return a.identifier.localeCompare(b.identifier);
  })[0];
}

/** Collapse Airtable rows that are one check digit apart into a single site. */
export function groupLinkedAccounts(accounts: LinkedAccount[], fuel: ChecklistFuel): AccountGroup[] {
  const used = new Array(accounts.length).fill(false);
  const groups: AccountGroup[] = [];
  for (let i = 0; i < accounts.length; i += 1) {
    if (used[i]) continue;
    used[i] = true;
    const members = [accounts[i]];
    for (let j = i + 1; j < accounts.length; j += 1) {
      if (used[j] || accounts[j].utilityType !== accounts[i].utilityType) continue;
      const kind = identifierMatchKind(accounts[i].identifier, accounts[j].identifier, fuel);
      if (kind !== "checksum" && kind !== "one_digit") continue;
      used[j] = true;
      members.push(accounts[j]);
    }
    const primary = pickPrimary(members);
    groups.push({
      primary,
      others: members
        .filter((account) => account !== primary)
        .map((account) => ({
          account,
          kind: (identifierMatchKind(primary.identifier, account.identifier, fuel) ??
            "checksum") as "checksum" | "one_digit",
        })),
    });
  }
  return groups;
}

function retailerAt(retailers: unknown, index: number): string {
  if (Array.isArray(retailers)) {
    const value = retailers[index];
    return value == null ? "" : String(value);
  }
  if (typeof retailers === "string") return retailers;
  return "";
}

function accountsFromUtilityValue(
  utilityType: string,
  value: unknown,
  retailers: unknown,
  extraList: unknown,
): LinkedAccount[] {
  const extras = Array.isArray(extraList) ? extraList : [];
  const writable = !LOOKUP_RETAILER_TYPES.has(utilityType);

  if (Array.isArray(value) && value.length > 0 && value[0] != null && typeof value[0] === "object" && "identifier" in (value[0] as object)) {
    return value
      .map((entry) => {
        const row = entry as Record<string, unknown>;
        const identifier = normaliseChecklistIdentifier(String(row.identifier ?? ""));
        if (!identifier) return null;
        const extra = extras.find((item) => {
          const candidate = item as Record<string, unknown>;
          return normaliseChecklistIdentifier(String(candidate.identifier ?? "")) === identifier;
        }) as Record<string, unknown> | undefined;
        return {
          utilityType,
          identifier,
          retailer: String(row.retailer ?? extra?.retailer ?? ""),
          contractEnd: toIsoDate(row.ced ?? row.contract_end_date ?? extra?.contract_end_date),
          dmaEnd: toIsoDate(row.dma_end_date ?? extra?.dma_end_date),
          retailerWritable: writable,
        };
      })
      .filter((row): row is LinkedAccount => row != null);
  }

  const identifiers =
    typeof value === "string"
      ? value.split(",").map((part) => part.trim()).filter(Boolean)
      : Array.isArray(value)
        ? value.map((part) => (typeof part === "string" || typeof part === "number" ? String(part) : "")).filter(Boolean)
        : [];

  return identifiers.map((identifier, index) => {
    const extra = (extras[index] ?? {}) as Record<string, unknown>;
    return {
      utilityType,
      identifier: normaliseChecklistIdentifier(identifier),
      retailer: String(extra.retailer ?? retailerAt(retailers, index)),
      contractEnd: toIsoDate(extra.contract_end_date ?? extra.ced),
      dmaEnd: toIsoDate(extra.dma_end_date),
      retailerWritable: writable,
    };
  });
}

export function accountsForFuel(
  businessInfo: Record<string, unknown> | null,
  fuel: ChecklistFuel,
): LinkedAccount[] {
  const linkedDetails = (businessInfo?.Linked_Details as Record<string, unknown> | undefined) ?? {};
  const linked = (linkedDetails.linked_utilities as Record<string, unknown> | undefined) ?? {};
  const retailers = (linkedDetails.utility_retailers as Record<string, unknown> | undefined) ?? {};
  const extra = (linkedDetails.linked_utility_extra as Record<string, unknown> | undefined) ?? {};
  const keys = fuel === "electricity"
    ? ["C&I Electricity", "SME Electricity"]
    : linked["SME Gas"]
      ? ["C&I Gas", "SME Gas"]
      : ["C&I Gas", "Small Gas"];
  const accounts: LinkedAccount[] = [];
  for (const key of keys) {
    const displayType = key === "Small Gas" ? "SME Gas" : key;
    accounts.push(
      ...accountsFromUtilityValue(displayType, linked[key], retailers[key], extra[key] ?? extra[displayType]),
    );
  }
  return accounts.filter((account) => account.identifier.length > 0);
}
