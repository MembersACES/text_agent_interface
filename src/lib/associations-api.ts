import { getApiBaseUrl } from "@/lib/utils";

export type AssociationStatus = "targeting" | "working_with";

export const ASSOCIATION_STATUS_OPTIONS: { id: AssociationStatus; label: string }[] = [
  { id: "targeting", label: "Targeting" },
  { id: "working_with", label: "Working with" },
];

export function associationStatusLabel(status: string): string {
  return ASSOCIATION_STATUS_OPTIONS.find((option) => option.id === status)?.label ?? status;
}

export type Association = {
  id: number;
  name: string;
  status: string;
  endorsed: boolean;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  testimonials_folder_id: string | null;
  contacts_sheet_id: string | null;
  contacts_sheet_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  results_note: string | null;
  testimonial_count: number;
  approved_testimonial_count: number;
  warnings: string[];
  created_at: string;
  updated_at: string;
};

export type AssociationListResponse = {
  parent_folder_id: string;
  parent_folder_url: string;
  associations: Association[];
};

export type AssociationSyncResponse = AssociationListResponse & {
  adopted: number;
  linked: number;
  skipped: string[];
};

export type AssociationFile = {
  id: string;
  name: string;
  mime_type: string;
  file_type: string;
  web_view_link: string;
  preview_url?: string | null;
  created_time?: string | null;
  modified_time?: string | null;
  size?: string | null;
};

export type AssociationPathItem = {
  id: string;
  name: string;
  folder_url: string;
};

export type AssociationDocumentsResponse = {
  association_id: number;
  current_folder: AssociationPathItem;
  path: AssociationPathItem[];
  folders: AssociationFile[];
  files: AssociationFile[];
};

export type AssociationTestimonial = {
  id: number;
  business_name: string;
  file_name: string;
  file_id: string;
  status: string;
  testimonial_savings?: string | null;
  testimonial_solution_type_id?: string | null;
  association_id?: number | null;
  created_at?: string | null;
};

export type AssociationUploadResult = {
  id: string;
  name: string;
  web_view_link: string;
  folder_id: string;
  folder_url: string;
  association_id: number;
  testimonial?: AssociationTestimonial | null;
};

export type AssociationInput = {
  name: string;
  status: AssociationStatus;
  contact_name?: string;
  contact_email?: string;
  notes?: string;
  results_note?: string;
};

function authHeaders(token: string | undefined, accessToken?: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${token ?? ""}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { "X-Google-Access-Token": accessToken } : {}),
  };
}

function detailMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(String).join(", ");
  return fallback;
}

function asAssociation(data: unknown): Association {
  const row = (data ?? {}) as Partial<Association>;
  return {
    id: Number(row.id),
    name: row.name ?? "",
    status: row.status ?? "targeting",
    endorsed: Boolean(row.endorsed),
    drive_folder_id: row.drive_folder_id ?? null,
    drive_folder_url: row.drive_folder_url ?? null,
    testimonials_folder_id: row.testimonials_folder_id ?? null,
    contacts_sheet_id: row.contacts_sheet_id ?? null,
    contacts_sheet_url: row.contacts_sheet_url ?? null,
    contact_name: row.contact_name ?? null,
    contact_email: row.contact_email ?? null,
    notes: row.notes ?? null,
    results_note: row.results_note ?? null,
    testimonial_count: Number(row.testimonial_count ?? 0),
    approved_testimonial_count: Number(row.approved_testimonial_count ?? 0),
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function fetchAssociations(
  token: string | undefined,
): Promise<AssociationListResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/associations`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to load associations (${res.status})`));
  }
  return {
    parent_folder_id: data.parent_folder_id ?? "",
    parent_folder_url: data.parent_folder_url ?? "",
    associations: Array.isArray(data.associations) ? data.associations.map(asAssociation) : [],
  };
}

export async function createAssociation(
  token: string | undefined,
  input: AssociationInput,
  accessToken?: string,
): Promise<Association> {
  const res = await fetch(`${getApiBaseUrl()}/api/associations`, {
    method: "POST",
    headers: authHeaders(token, accessToken, true),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to create association (${res.status})`));
  }
  return asAssociation(data);
}

export async function updateAssociation(
  token: string | undefined,
  id: number,
  input: Partial<AssociationInput>,
  accessToken?: string,
): Promise<Association> {
  const res = await fetch(`${getApiBaseUrl()}/api/associations/${id}`, {
    method: "PATCH",
    headers: authHeaders(token, accessToken, true),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to update association (${res.status})`));
  }
  return asAssociation(data);
}

export async function syncAssociationsFromDrive(
  token: string | undefined,
  accessToken?: string,
): Promise<AssociationSyncResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/associations/sync`, {
    method: "POST",
    headers: authHeaders(token, accessToken),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to adopt Drive folders (${res.status})`));
  }
  return {
    parent_folder_id: data.parent_folder_id ?? "",
    parent_folder_url: data.parent_folder_url ?? "",
    associations: Array.isArray(data.associations) ? data.associations.map(asAssociation) : [],
    adopted: Number(data.adopted ?? 0),
    linked: Number(data.linked ?? 0),
    skipped: Array.isArray(data.skipped) ? data.skipped.map(String) : [],
  };
}

export async function fetchAssociationDocuments(
  token: string | undefined,
  associationId: number,
  folderId: string | null,
  accessToken?: string,
): Promise<AssociationDocumentsResponse> {
  const params = new URLSearchParams();
  if (folderId) params.set("folder_id", folderId);
  const qs = params.toString();
  const res = await fetch(
    `${getApiBaseUrl()}/api/associations/${associationId}/files${qs ? `?${qs}` : ""}`,
    { headers: authHeaders(token, accessToken) },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to load documents (${res.status})`));
  }
  return {
    association_id: Number(data.association_id),
    current_folder: data.current_folder,
    path: Array.isArray(data.path) ? data.path : [],
    folders: Array.isArray(data.folders) ? data.folders : [],
    files: Array.isArray(data.files) ? data.files : [],
  };
}

export async function fetchAssociationTestimonials(
  token: string | undefined,
  associationId: number,
): Promise<AssociationTestimonial[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/associations/${associationId}/testimonials`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to load testimonials (${res.status})`));
  }
  return Array.isArray(data) ? (data as AssociationTestimonial[]) : [];
}

export async function registerAssociationTestimonial(
  token: string | undefined,
  associationId: number,
  fileId: string,
  fileName: string,
  testimonialSavings?: string,
  accessToken?: string,
): Promise<AssociationTestimonial> {
  const res = await fetch(`${getApiBaseUrl()}/api/associations/${associationId}/testimonials`, {
    method: "POST",
    headers: authHeaders(token, accessToken, true),
    body: JSON.stringify({
      file_id: fileId,
      file_name: fileName,
      testimonial_savings: testimonialSavings?.trim() || null,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to register testimonial (${res.status})`));
  }
  return data as AssociationTestimonial;
}

export async function uploadAssociationDocument(
  token: string | undefined,
  associationId: number,
  folderId: string | null,
  file: File,
  accessToken?: string,
  displayName?: string,
  registerTestimonial?: boolean,
  testimonialSavings?: string,
): Promise<AssociationUploadResult> {
  const form = new FormData();
  form.append("file", file);
  if (folderId) form.append("folder_id", folderId);
  if (displayName?.trim()) form.append("filename", displayName.trim());
  if (registerTestimonial) form.append("register_testimonial", "true");
  if (testimonialSavings?.trim()) form.append("testimonial_savings", testimonialSavings.trim());
  if (accessToken) form.append("google_access_token", accessToken);
  const res = await fetch(`${getApiBaseUrl()}/api/associations/${associationId}/files`, {
    method: "POST",
    headers: authHeaders(token, accessToken),
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to upload (${res.status})`));
  }
  return data as AssociationUploadResult;
}

export type AssociationContact = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  mobile: string;
  primary: boolean;
  notes: string;
};

export type AssociationContactInput = {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  primary?: boolean;
  notes?: string;
};

export type AssociationContactsResponse = {
  contacts_sheet_id: string;
  contacts_sheet_url: string;
  contact_name: string | null;
  contact_email: string | null;
  contacts: AssociationContact[];
};

function asContact(data: unknown): AssociationContact {
  const row = (data ?? {}) as Partial<AssociationContact>;
  return {
    id: String(row.id ?? ""),
    name: row.name ?? "",
    role: row.role ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    mobile: row.mobile ?? "",
    primary: Boolean(row.primary),
    notes: row.notes ?? "",
  };
}

function asContactsResponse(data: unknown): AssociationContactsResponse {
  const row = (data ?? {}) as Partial<AssociationContactsResponse> & { contacts?: unknown };
  return {
    contacts_sheet_id: row.contacts_sheet_id ?? "",
    contacts_sheet_url: row.contacts_sheet_url ?? "",
    contact_name: row.contact_name ?? null,
    contact_email: row.contact_email ?? null,
    contacts: Array.isArray(row.contacts) ? row.contacts.map(asContact) : [],
  };
}

export async function ensureAssociationContacts(
  token: string | undefined,
  associationId: number,
  accessToken?: string,
): Promise<AssociationContactsResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/associations/${associationId}/contacts/sheet`, {
    method: "POST",
    headers: authHeaders(token, accessToken),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to open contacts (${res.status})`));
  }
  return asContactsResponse(data);
}

export async function createAssociationContact(
  token: string | undefined,
  associationId: number,
  input: AssociationContactInput,
  accessToken?: string,
): Promise<AssociationContactsResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/associations/${associationId}/contacts`, {
    method: "POST",
    headers: authHeaders(token, accessToken, true),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to add contact (${res.status})`));
  }
  return asContactsResponse(data);
}

export async function updateAssociationContact(
  token: string | undefined,
  associationId: number,
  contactId: string,
  input: AssociationContactInput,
  accessToken?: string,
): Promise<AssociationContactsResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/associations/${associationId}/contacts/${encodeURIComponent(contactId)}`,
    {
      method: "PATCH",
      headers: authHeaders(token, accessToken, true),
      body: JSON.stringify(input),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to update contact (${res.status})`));
  }
  return asContactsResponse(data);
}

export async function deleteAssociationContact(
  token: string | undefined,
  associationId: number,
  contactId: string,
  accessToken?: string,
): Promise<AssociationContactsResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/associations/${associationId}/contacts/${encodeURIComponent(contactId)}`,
    {
      method: "DELETE",
      headers: authHeaders(token, accessToken),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(data, `Failed to remove contact (${res.status})`));
  }
  return asContactsResponse(data);
}
