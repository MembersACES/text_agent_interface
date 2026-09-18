import { getApiBaseUrl } from "@/lib/utils";
import type { RetailerApiKey } from "@/lib/invoicing-streams";

function authHeaders(token: string | undefined): HeadersInit {
  return { Authorization: `Bearer ${token ?? ""}` };
}

async function getJson(
  url: string,
  token: string | undefined
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, { headers: authHeaders(token) });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body };
}

export type OriginReadySummary = {
  rowCount: number;
  totalCommission: number;
  rowLabel: string;
};

export type StreamMetricState = {
  loading: boolean;
  error: boolean;
  primary: string | null;
  secondary: string | null;
};

export async function fetchOriginReadySummary(
  token: string | undefined,
  retailer: "origin-gas" | "origin-elec"
): Promise<OriginReadySummary> {
  const u = new URL(`${getApiBaseUrl()}/api/invoicing/commission-up-to-date-summary`);
  u.searchParams.set("retailer", retailer);
  const { ok, body } = await getJson(u.toString(), token);
  if (!ok) throw new Error("ready_summary_failed");
  return {
    rowCount: typeof body.row_count === "number" ? body.row_count : 0,
    totalCommission:
      typeof body.total_commission === "number" ? body.total_commission : 0,
    rowLabel:
      typeof body.row_label === "string" && body.row_label ? body.row_label : "row",
  };
}

export async function fetchCommissionFiguresClientCount(
  token: string | undefined,
  retailer: RetailerApiKey
): Promise<number> {
  const u = new URL(`${getApiBaseUrl()}/api/invoicing/commission-figures-client-count`);
  u.searchParams.set("retailer", retailer);
  const { ok, body } = await getJson(u.toString(), token);
  if (!ok) throw new Error("client_count_failed");
  if (typeof body.client_count !== "number") throw new Error("client_count_failed");
  return body.client_count;
}

export async function fetchTrojanUniqueClientCount(
  token: string | undefined
): Promise<number> {
  const { ok, body } = await getJson(
    `${getApiBaseUrl()}/api/invoicing/trojan-oil-unique-clients`,
    token
  );
  if (!ok) throw new Error("trojan_count_failed");
  if (typeof body.unique_client_count !== "number") {
    throw new Error("trojan_count_failed");
  }
  return body.unique_client_count;
}

export async function fetchRetailerSheetTabs(
  token: string | undefined,
  retailer: RetailerApiKey
): Promise<{ name: string; gid: string }[]> {
  const u = new URL(`${getApiBaseUrl()}/api/invoicing/retailer-sheet-tabs`);
  u.searchParams.set("retailer", retailer);
  const { ok, body } = await getJson(u.toString(), token);
  if (!ok || !Array.isArray(body.tabs)) return [];
  return (body.tabs as { name?: string; gid?: string }[])
    .filter((tab) => typeof tab.name === "string" && typeof tab.gid === "string")
    .map((tab) => ({ name: tab.name as string, gid: tab.gid as string }));
}

export const OMS_INVOICE_STATUSES = ["Generated", "Sent", "Paid"] as const;
export type OmsInvoiceStatus = (typeof OMS_INVOICE_STATUSES)[number];
export type DirectInvoiceStatus = OmsInvoiceStatus;

export type OmsInvoiceRow = {
  invoice_number: string;
  business_name: string;
  due_date: string;
  total_amount: number;
  status: string;
  invoice_file_id?: string;
  line_items?: { solution_label?: string }[];
};
export type DirectInvoiceRow = OmsInvoiceRow;

function asOmsInvoice(raw: unknown): OmsInvoiceRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const invoice_number = String(row.invoice_number ?? "").trim();
  const business_name = String(row.business_name ?? "").trim();
  if (!invoice_number || !business_name) return null;
  const amount = Number(row.total_amount);
  return {
    invoice_number,
    business_name,
    due_date: String(row.due_date ?? ""),
    total_amount: Number.isFinite(amount) ? amount : 0,
    status: String(row.status || "Generated").trim() || "Generated",
    invoice_file_id: row.invoice_file_id ? String(row.invoice_file_id) : "",
    line_items: Array.isArray(row.line_items)
      ? (row.line_items as { solution_label?: string }[])
      : [],
  };
}

export async function fetchOmsInvoices(
  token: string | undefined
): Promise<OmsInvoiceRow[]> {
  return fetchDirectClientInvoices(token, "one-month-savings");
}

export async function fetchDirectClientInvoices(
  token: string | undefined,
  streamId: string
): Promise<DirectInvoiceRow[]> {
  const u = new URL(`${getApiBaseUrl()}/api/invoicing/direct-client/invoices`);
  u.searchParams.set("stream", streamId);
  const { ok, body } = await getJson(u.toString(), token);
  if (!ok) throw new Error("direct_invoices_failed");
  const list = Array.isArray(body.invoices) ? body.invoices : [];
  return list
    .map(asOmsInvoice)
    .filter((row): row is DirectInvoiceRow => row !== null)
    .sort((a, b) =>
      b.invoice_number.localeCompare(a.invoice_number, undefined, { numeric: true })
    );
}

export async function updateOmsInvoiceStatus(input: {
  business_name: string;
  invoice_number: string;
  status: OmsInvoiceStatus;
}): Promise<void> {
  await updateDirectClientInvoiceStatus({
    stream: "one-month-savings",
    ...input,
  });
}

export async function updateDirectClientInvoiceStatus(input: {
  stream: string;
  business_name: string;
  invoice_number: string;
  status: DirectInvoiceStatus;
  invoice_file_id?: string;
}): Promise<void> {
  const res = await fetch("/api/invoicing/direct-client/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to update status");
  }
}
