export type ProcessedFileMap = Record<string, unknown>;
export type BusinessDocsMap = Record<string, any>;

export const KEY_DOC_LABELS = {
  loa: "LOA",
  sfa: "Service Fee Agreement",
  wip: "Work in Progress (WIP)",
  amortisation: "Amortisation / Asset List",
} as const;

export function getProcessedAndDocs(
  businessInfo: Record<string, unknown> | null
): { processed: ProcessedFileMap; docs: BusinessDocsMap } {
  if (!businessInfo) {
    return { processed: {}, docs: {} };
  }

  const processed =
    ((businessInfo as any)._processed_file_ids as ProcessedFileMap) ?? {};

  const rawDocs = (businessInfo as any).business_documents;
  const docs: BusinessDocsMap =
    rawDocs &&
    typeof rawDocs === "object" &&
    rawDocs !== null &&
    !Array.isArray(rawDocs)
      ? (rawDocs as BusinessDocsMap)
      : {};

  return { processed, docs };
}

export function getBusinessDocumentFileUrl(
  doc: string,
  processed: ProcessedFileMap
): string | undefined {
  const specialKeyMap: Record<string, string> = {
    "Floor Plan (Exit Map)": "business_site_map_upload",
  };

  const docKey = `business_${doc}`;
  const normalizedDocKey = `business_${doc
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")}`;
  const specialMappedKey = specialKeyMap[doc];

  const value =
    (processed[docKey] as string | undefined) ??
    (processed[normalizedDocKey] as string | undefined) ??
    (specialMappedKey
      ? (processed[specialMappedKey] as string | undefined)
      : undefined);

  return typeof value === "string" ? value : undefined;
}

export function getKeyDocumentsFromProcessed(processed: ProcessedFileMap) {
  const loaRaw =
    processed["business_LOA"] ??
    // Legacy variations
    processed["businessLOA"];

  const loaUrl = typeof loaRaw === "string" ? loaRaw : undefined;

  const sfaRaw =
    processed["business_Service Fee Agreement"] ??
    processed["business_service_fee_agreement"] ??
    processed["business_SFA"] ??
    processed["businessSFA"] ??
    processed["Service Fee Agreement"] ??
    processed["service_fee_agreement"] ??
    processed["businessService Fee Agreement"] ??
    processed["businessservicefeeagreement"];

  const sfaUrl = typeof sfaRaw === "string" ? sfaRaw : undefined;

  const wipRaw =
    processed["business_WIP"] ??
    // Legacy variation
    processed["businessWIP"];
  const wipUrl = typeof wipRaw === "string" ? wipRaw : undefined;

  const amortExcelRaw =
    processed["business_amortisation_excel"] ??
    processed["businessamortisationexcel"];
  const amortPdfRaw =
    processed["business_amortisation_pdf"] ??
    processed["businessamortisationpdf"];

  const amortExcelUrl =
    typeof amortExcelRaw === "string" ? amortExcelRaw : undefined;
  const amortPdfUrl =
    typeof amortPdfRaw === "string" ? amortPdfRaw : undefined;

  return { loaUrl, sfaUrl, wipUrl, amortExcelUrl, amortPdfUrl };
}

export function getKeyDocumentsFromBusinessInfo(
  businessInfo: Record<string, unknown> | null
) {
  const { processed } = getProcessedAndDocs(businessInfo);
  return getKeyDocumentsFromProcessed(processed);
}

export function getDocumentsCountFromBusinessInfo(
  businessInfo: Record<string, unknown> | null
): number {
  if (!businessInfo) return 0;

  const { processed, docs } = getProcessedAndDocs(businessInfo);
  const { loaUrl, sfaUrl, wipUrl, amortExcelUrl, amortPdfUrl } =
    getKeyDocumentsFromProcessed(processed);

  const businessDocsCount = Object.keys(docs).filter((name) =>
    getBusinessDocumentFileUrl(name, processed)
  ).length;

  const hasAmortisation = !!(amortExcelUrl || amortPdfUrl);

  return (
    businessDocsCount +
    (loaUrl ? 1 : 0) +
    (sfaUrl ? 1 : 0) +
    (wipUrl ? 1 : 0) +
    (hasAmortisation ? 1 : 0)
  );
}

const CONTRACT_LABELS = [
  "C&I Electricity",
  "SME Electricity",
  "C&I Gas",
  "SME Gas",
  "Waste",
  "Oil",
  "DMA",
] as const;

export type ContractLabel = (typeof CONTRACT_LABELS)[number];

export function getContractsFromProcessed(processed: ProcessedFileMap) {
  return CONTRACT_LABELS.map((key) => ({
    key,
    url: processed[`contract_${key}`] as string | undefined,
    status: processed[`contract_${key}_status`] as string | undefined,
  }));
}

export function getContractsFromBusinessInfo(
  businessInfo: Record<string, unknown> | null
) {
  const { processed } = getProcessedAndDocs(businessInfo);
  return getContractsFromProcessed(processed);
}

export function getBusinessDocumentsForOverview(
  businessInfo: Record<string, unknown> | null
): { name: string; url: string }[] {
  const { processed, docs } = getProcessedAndDocs(businessInfo);

  const excluded = new Set<string>([
    KEY_DOC_LABELS.loa,
    KEY_DOC_LABELS.sfa,
    KEY_DOC_LABELS.wip,
    KEY_DOC_LABELS.amortisation,
  ]);

  return Object.keys(docs)
    .filter((name) => !excluded.has(name))
    .map((name) => ({
      name,
      url: getBusinessDocumentFileUrl(name, processed),
    }))
    .filter((item): item is { name: string; url: string } => !!item.url);
}

