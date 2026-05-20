/** ACES invoice processing API (aces-invoice-api Cloud Run). */
export const ACES_INVOICE_API_BASE =
  "https://aces-invoice-api-672026052958.australia-southeast2.run.app";

/** Legacy ACES API — LOA fallback only. */
export const ACES_LEGACY_API_BASE =
  "https://aces-api-63gwbzzcdq-km.a.run.app";

const invoiceApi = (path: string) => `${ACES_INVOICE_API_BASE}/v1/${path}`;

/** Invoice & Data Lodgement page — all utilities on aces-invoice-api. */
export const DOCUMENT_LODGEMENT_API_ENDPOINTS = {
  WASTE: invoiceApi("waste/process-invoice"),
  COOKING_OIL: invoiceApi("oil/process-invoice"),
  ELECTRICITY_CI: invoiceApi("electricity-ci-invoice/process-invoice"),
  ELECTRICITY_SME: invoiceApi("electricity-sme/process-invoice"),
  GAS_CI: invoiceApi("gas-ci-invoice/process-invoice"),
  GAS_SME: invoiceApi("gas-sme/process-invoice"),
  GREASE_TRAP: invoiceApi("grease-trap/process-invoice"),
  WATER: invoiceApi("water/process-invoice"),
  CLEANING: invoiceApi("cleaning-invoice/process-invoice"),
  LINEN_CLEANING: invoiceApi("linen-cleaning-invoice/process-invoice"),
  ELECTRICITY_CI_INTERVAL: invoiceApi(
    "interval-ci-electricity/process-interval-ci-electricity-data",
  ),
  EOI: invoiceApi("eoi/process-eoi"),
  CI_ELECTRICITY_CONTRACT: invoiceApi("ci-electricity-contract/process-contract"),
  CI_GAS_CONTRACT: invoiceApi("ci-gas-contract/process-contract"),
} as const;

/** LOA upload flow — utility invoice endpoints (no LOA fallback). */
export const LOA_UPLOAD_UTILITY_API_ENDPOINTS = {
  WASTE: invoiceApi("waste/process-invoice"),
  COOKING_OIL: invoiceApi("oil/process-invoice"),
  ELECTRICITY_CI: invoiceApi("electricity-ci-invoice/process-invoice"),
  ELECTRICITY_SME: invoiceApi("electricity-sme/process-invoice"),
  GAS_CI: invoiceApi("gas-ci-invoice/process-invoice"),
  GAS_SME: invoiceApi("gas-sme/process-invoice"),
  GREASE_TRAP: invoiceApi("grease-trap/process-invoice"),
  WATER: invoiceApi("water/process-invoice"),
} as const;

export type LoaUploadUtilityKey = keyof typeof LOA_UPLOAD_UTILITY_API_ENDPOINTS;

export const LOA_PROCESS_ENDPOINTS = [
  invoiceApi("loa/process-document"),
  `${ACES_LEGACY_API_BASE}/v1/loa/process-document`,
] as const;

export type FormDataPostResult = {
  res: Response;
  data: Record<string, unknown> | null;
  rawText: string | null;
  endpoint: string;
};

async function parseJsonResponse(res: Response): Promise<{
  data: Record<string, unknown> | null;
  rawText: string | null;
}> {
  try {
    const data = (await res.json()) as Record<string, unknown>;
    return { data, rawText: null };
  } catch {
    const rawText = await res.text();
    return { data: null, rawText };
  }
}

/** POST multipart form; tries each endpoint in order until one succeeds. */
export async function postFormWithEndpointFallback(
  endpoints: readonly string[],
  buildFormData: () => FormData,
): Promise<FormDataPostResult> {
  let last: FormDataPostResult | null = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: buildFormData(),
      });
      const { data, rawText } = await parseJsonResponse(res);
      const result: FormDataPostResult = { res, data, rawText, endpoint };
      if (res.ok) return result;
      last = result;
    } catch (err) {
      last = {
        res: new Response(null, { status: 0, statusText: "Network error" }),
        data: null,
        rawText: err instanceof Error ? err.message : "Unknown error",
        endpoint,
      };
    }
  }

  return last!;
}

export function postLoaDocument(
  buildFormData: () => FormData,
): Promise<FormDataPostResult> {
  return postFormWithEndpointFallback(LOA_PROCESS_ENDPOINTS, buildFormData);
}
