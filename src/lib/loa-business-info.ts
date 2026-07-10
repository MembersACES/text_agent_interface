export type LoaBusinessInfo = Record<string, string>;

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function tryParseBusinessInfoJson(raw: string): Record<string, unknown> | null {
  const candidates = [raw];
  try {
    candidates.push(decodeURIComponent(raw));
  } catch {
    // raw may already be decoded
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

/** Build the flat LOA business-info payload used in update-loa URL params. */
export function buildLoaBusinessInfoFromCrm(
  info: Record<string, unknown>,
  fallbackName = "",
): LoaBusinessInfo {
  const business = (info.business_details as Record<string, unknown>) ?? {};
  const contact = (info.contact_information as Record<string, unknown>) ?? {};
  const rep = (info.representative_details as Record<string, unknown>) ?? {};

  return {
    "Business Name": str(business.name || fallbackName),
    "Business ABN": str(business.abn),
    "Trading As": str(business.trading_name),
    "Postal Address": str(contact.postal_address),
    "Site Address": str(contact.site_address),
    "Telephone": str(contact.telephone),
    "Contact Email": str(contact.email),
    "Contact Name": str(rep.contact_name),
    "Contact Position": str(rep.position),
  };
}

/** Parse businessInfo from update-loa query params (flat, snake_case, or nested CRM shapes). */
export function parseLoaBusinessInfoParam(raw: string | null): LoaBusinessInfo | null {
  if (!raw?.trim()) return null;

  const decoded = tryParseBusinessInfoJson(raw);
  if (!decoded) return null;

  const business =
    (decoded.Business as Record<string, unknown> | undefined) ??
    (decoded.business_details as Record<string, unknown> | undefined) ??
    {};
  const contact =
    (decoded.Contact as Record<string, unknown> | undefined) ??
    (decoded.contact_information as Record<string, unknown> | undefined) ??
    {};
  const rep =
    (decoded.Representative as Record<string, unknown> | undefined) ??
    (decoded.representative_details as Record<string, unknown> | undefined) ??
    {};

  const formatted: LoaBusinessInfo = {
    "Business Name":
      str(decoded["Business Name"]) ||
      str(decoded.name) ||
      str(business.Name) ||
      str(business.name),
    "Business ABN":
      str(decoded["Business ABN"]) ||
      str(decoded.abn) ||
      str(business.ABN) ||
      str(business.abn),
    "Trading As":
      str(decoded["Trading As"]) ||
      str(decoded.trading_name) ||
      str(business["Trading As"]) ||
      str(business.trading_name),
    "Postal Address":
      str(decoded["Postal Address"]) ||
      str(decoded.postal_address) ||
      str(contact["Postal Address"]) ||
      str(contact.postal_address),
    "Site Address":
      str(decoded["Site Address"]) ||
      str(decoded.site_address) ||
      str(contact["Site Address"]) ||
      str(contact.site_address),
    "Telephone":
      str(decoded.Telephone) ||
      str(decoded.telephone) ||
      str(contact.Telephone) ||
      str(contact.telephone),
    "Contact Email":
      str(decoded["Contact Email"]) ||
      str(decoded.email) ||
      str(contact["Contact Email"]) ||
      str(contact.email),
    "Contact Name":
      str(decoded["Contact Name"]) ||
      str(decoded.contact_name) ||
      str(rep["Contact Name"]) ||
      str(rep.contact_name),
    "Contact Position":
      str(decoded["Contact Position"]) ||
      str(decoded.position) ||
      str(rep["Contact Position"]) ||
      str(rep.position),
  };

  const hasAnyValue = Object.values(formatted).some((value) => value.length > 0);
  return hasAnyValue ? formatted : null;
}

export function encodeLoaBusinessInfoParam(info: LoaBusinessInfo): string {
  return encodeURIComponent(JSON.stringify(info));
}
