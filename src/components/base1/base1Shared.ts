import { getApiBaseUrl } from "@/lib/utils";

export type LeadStatus =
  | "Base 1 Review Conducted"
  | "Contacted"
  | "LOA & SFA Recieved"
  | "Not a fit";

export const LEAD_STATUSES: LeadStatus[] = [
  "Base 1 Review Conducted",
  "Contacted",
  "LOA & SFA Recieved",
  "Not a fit",
];

export interface Lead {
  id: string;
  company_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_number?: string | null;
  state?: string | null;
  timestamp?: string | null;
  drive_folder_url?: string | null;
  base1_review_url?: string | null;
  utility_types?: string | null;
  status: LeadStatus;
}

export interface DragState {
  leadId: string;
  fromStatus: LeadStatus;
}

export const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; dot: string; accent: string }
> = {
  "Base 1 Review Conducted": {
    label: "Base 1 Review Conducted",
    dot: "bg-gray-400",
    accent: "border-t-gray-400",
  },
  Contacted: {
    label: "Contacted",
    dot: "bg-blue-400",
    accent: "border-t-blue-400",
  },
  "LOA & SFA Recieved": {
    label: "LOA & SFA Recieved",
    dot: "bg-emerald-400",
    accent: "border-t-emerald-400",
  },
  "Not a fit": {
    label: "Not a fit",
    dot: "bg-red-400",
    accent: "border-t-red-400",
  },
};

export function normalizeStatus(raw: unknown): LeadStatus {
  const v = String(raw || "").toLowerCase();
  if (v === "contacted") return "Contacted";
  if (v === "loa & sfa recieved") return "LOA & SFA Recieved";
  if (v === "not a fit" || v === "not_a_fit" || v === "not-fit") return "Not a fit";
  return "Base 1 Review Conducted";
}

export function mapRowToLead(row: any): Lead {
  return {
    id: String(row.id ?? row.company_name ?? crypto.randomUUID()),
    company_name: String(row.company_name ?? ""),
    contact_name: row.contact_name ?? null,
    contact_email: row.contact_email ?? null,
    contact_number: row.contact_number ?? null,
    state: row.state ?? null,
    timestamp: row.timestamp ?? null,
    drive_folder_url: row.drive_folder_url ?? null,
    base1_review_url: row.base1_review_url ?? null,
    utility_types: row.utility_types ?? null,
    status: normalizeStatus(row.status),
  };
}

export function groupLeadsByStatus(
  leads: Lead[]
): Record<LeadStatus, Lead[]> {
  const grouped: Record<LeadStatus, Lead[]> = {
    "Base 1 Review Conducted": [],
    Contacted: [],
    "LOA & SFA Recieved": [],
    "Not a fit": [],
  };
  for (const lead of leads) {
    grouped[lead.status].push(lead);
  }
  for (const status of LEAD_STATUSES) {
    grouped[status].sort((a, b) => a.company_name.localeCompare(b.company_name));
  }
  return grouped;
}

export async function postLeadStatusUpdate(options: {
  token: string;
  companyName: string;
  toStatus: LeadStatus;
}): Promise<void> {
  const { token, companyName, toStatus } = options;
  const res = await fetch(`${getApiBaseUrl()}/api/client-status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_name: companyName,
      note: toStatus,
      note_type: "lead_status",
    }),
  });

  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || "Failed to update lead status");
  }
}

