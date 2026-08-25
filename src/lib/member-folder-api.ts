import { getApiBaseUrl } from "@/lib/utils";

export type DriveFolderOption = {
  id: string;
  name: string;
  url: string;
};

export type MemberFolderCreatePayload = {
  business_name: string;
  trading_as: string;
  classification: string;
  state: string;
  classification_folder_id?: string;
  state_folder_id?: string;
  loa_record_id?: string;
};

export type LoaCandidate = {
  record_id: string;
  trading_name?: string | null;
  site_address?: string | null;
  abn?: string | null;
};

export type MemberFolderCreateResult = {
  ok: boolean;
  folder_id?: string;
  folder_url?: string;
  folder_name?: string;
  folder_created?: boolean;
  template_files_copied?: number;
  loa_file?: { id?: string; url?: string; name?: string } | null;
  wip_file?: { id?: string; url?: string; name?: string; created?: boolean } | null;
  agreement_file_url?: string;
  sheet?: { spreadsheet_url?: string };
  sheet_row?: string[];
  warnings?: string[];
  n8n_fallback_used?: boolean;
  n8n_fallback_ok?: boolean;
  loa_candidates?: LoaCandidate[];
  error?: string;
  airtable?: Record<string, unknown>;
};

export type DistributorExtractResult = {
  distributor_business?: string;
  trading_as?: string;
  abn?: string;
  acn?: string;
  contact_name?: string;
  contact_position?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  state?: string;
  postcode?: string;
  start_date?: string;
  signed_date?: string;
  initial_term_months?: string;
  territory?: string;
  exclusivity?: string;
  status?: string;
  folder_name?: string;
  notes?: string;
  extraction_warnings?: string[];
};

async function parseError(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return { detail: res.statusText };
  }
}

export async function fetchIndustryFolders(token: string): Promise<DriveFolderOption[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/member-folders/industries`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("REAUTHENTICATION_REQUIRED");
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(String((err as { detail?: string }).detail || "Failed to list industry folders"));
  }
  const data = (await res.json()) as { folders?: DriveFolderOption[] };
  return data.folders ?? [];
}

export async function fetchSubfolders(token: string, parentId: string): Promise<DriveFolderOption[]> {
  const params = new URLSearchParams({ parent_id: parentId });
  const res = await fetch(`${getApiBaseUrl()}/api/member-folders/subfolders?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("REAUTHENTICATION_REQUIRED");
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(String((err as { detail?: string }).detail || "Failed to list subfolders"));
  }
  const data = (await res.json()) as { folders?: DriveFolderOption[] };
  return data.folders ?? [];
}

export async function createMemberFolder(
  token: string,
  payload: MemberFolderCreatePayload,
  accessToken?: string,
): Promise<MemberFolderCreateResult> {
  const res = await fetch(`${getApiBaseUrl()}/api/member-folders/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(accessToken ? { "X-Google-Access-Token": accessToken } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) throw new Error("REAUTHENTICATION_REQUIRED");
  const data = (await parseError(res)) as MemberFolderCreateResult & {
    detail?: MemberFolderCreateResult | string;
  };
  if (res.status === 409) {
    const raw = data as { detail?: MemberFolderCreateResult | string };
    const detail = raw.detail;
    if (detail && typeof detail === "object") {
      return { ok: false, ...detail };
    }
    return { ok: false, error: String(detail || "Multiple LOA records matched") };
  }
  if (!res.ok) {
    const detail = (data as { detail?: unknown }).detail;
    const message =
      typeof detail === "string"
        ? detail
        : (detail as MemberFolderCreateResult | undefined)?.error || "Folder creation failed";
    throw new Error(String(message));
  }
  return data as MemberFolderCreateResult;
}

export async function extractDistributorAgreement(
  token: string,
  file: File,
): Promise<DistributorExtractResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${getApiBaseUrl()}/api/distributors/extract`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (res.status === 401) throw new Error("REAUTHENTICATION_REQUIRED");
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(String((err as { detail?: string }).detail || "Failed to extract agreement"));
  }
  return res.json();
}

export async function createDistributorFolder(
  token: string,
  file: File,
  fields: Record<string, string>,
  accessToken?: string,
): Promise<MemberFolderCreateResult & { details?: DistributorExtractResult; sheet?: { spreadsheet_url?: string } }> {
  const form = new FormData();
  form.append("file", file);
  if (accessToken) {
    form.append("google_access_token", accessToken);
  }
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value ?? "");
  }
  const res = await fetch(`${getApiBaseUrl()}/api/distributors/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(accessToken ? { "X-Google-Access-Token": accessToken } : {}),
    },
    body: form,
  });
  if (res.status === 401) throw new Error("REAUTHENTICATION_REQUIRED");
  const data = await parseError(res);
  if (!res.ok) {
    const detail = (data as { detail?: string }).detail;
    throw new Error(String(detail || "Distributor folder creation failed"));
  }
  return data as MemberFolderCreateResult & {
    details?: DistributorExtractResult;
    sheet?: { spreadsheet_url?: string };
    sheet_row?: string[];
  };
}

const DEFAULT_MASTER_LIST_ID = "1kj9K6XG7477gdIGfZf3BY6Ozm9K6ImVVFAYOpjXgMkwU";

async function googleJson(url: string, accessToken: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } })?.error?.message || res.statusText;
    throw new Error(`Google ${res.status}: ${message}`);
  }
  return data;
}

async function resolveDistributorMasterSheet(accessToken: string): Promise<{ fileId: string; tab: string }> {
  let fileId = DEFAULT_MASTER_LIST_ID;
  try {
    await googleJson(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType&supportsAllDrives=true`,
      accessToken,
    );
  } catch {
    const listed = (await googleJson(
      "https://www.googleapis.com/drive/v3/files?q=" +
        encodeURIComponent("name contains 'Distributor Master' and trashed=false") +
        "&fields=files(id,name,mimeType)&pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true",
      accessToken,
    )) as { files?: { id?: string; name?: string }[] };
    const hit = listed.files?.[0];
    if (!hit?.id) {
      throw new Error("Drive cannot see Distributor Master List with this login.");
    }
    fileId = hit.id;
  }
  const meta = (await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}?fields=sheets.properties.title`,
    accessToken,
  )) as { sheets?: { properties?: { title?: string } }[] };
  const tab = meta.sheets?.[0]?.properties?.title || "Sheet1";
  return { fileId, tab };
}

export async function appendDistributorMasterListFromBrowser(
  accessToken: string,
  row: string[],
): Promise<string> {
  const { fileId, tab } = await resolveDistributorMasterSheet(accessToken);
  const quoted = `'${tab.replace(/'/g, "''")}'`;
  await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${encodeURIComponent(`${quoted}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
  );
  return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
}

export type DistributorMasterRow = Record<string, string | number>;

export type DistributorMasterList = {
  spreadsheet_id: string;
  spreadsheet_url: string;
  tab: string;
  columns: string[];
  rows: DistributorMasterRow[];
};

async function fetchDistributorMasterListFromBrowser(
  accessToken: string,
): Promise<DistributorMasterList> {
  const { fileId, tab } = await resolveDistributorMasterSheet(accessToken);
  const quoted = `'${tab.replace(/'/g, "''")}'`;
  const valuesResp = (await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${encodeURIComponent(`${quoted}!A1:AZ500`)}`,
    accessToken,
  )) as { values?: string[][] };
  const values = valuesResp.values || [];
  const headers = (values[0] || []).map((h, i) => String(h || "").trim() || `Column ${i + 1}`);
  const rows: DistributorMasterRow[] = [];
  values.slice(1).forEach((row, idx) => {
    const obj: DistributorMasterRow = { _row_number: idx + 2 };
    headers.forEach((key, j) => {
      obj[key] = row[j] ?? "";
    });
    if (headers.some((key) => String(obj[key] ?? "").trim())) {
      rows.push(obj);
    }
  });
  rows.reverse();
  return {
    spreadsheet_id: fileId,
    spreadsheet_url: `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
    tab,
    columns: headers,
    rows,
  };
}

export async function fetchDistributorMasterList(
  token: string,
  accessToken?: string,
): Promise<DistributorMasterList> {
  const res = await fetch(`${getApiBaseUrl()}/api/distributors`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(accessToken ? { "X-Google-Access-Token": accessToken } : {}),
    },
  });
  if (res.status === 401) throw new Error("REAUTHENTICATION_REQUIRED");
  if (res.ok) {
    return res.json();
  }
  if (accessToken) {
    return fetchDistributorMasterListFromBrowser(accessToken);
  }
  const data = await parseError(res);
  throw new Error(String((data as { detail?: string }).detail || "Failed to load distributors"));
}
