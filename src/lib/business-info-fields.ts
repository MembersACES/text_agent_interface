/** Read-only field extraction from get-business-info / LOA-shaped payloads. */

export function getTradingName(info: Record<string, unknown> | null | undefined): string | null {
  if (!info) return null;
  const biz = info.business_details as Record<string, unknown> | undefined;
  const name = biz?.trading_name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function getSiteAbn(info: Record<string, unknown> | null | undefined): string | null {
  if (!info) return null;
  const details = info.business_details as Record<string, unknown> | undefined;
  if (!details) return null;
  const abn = details.abn ?? details.ABN;
  return typeof abn === "string" && abn.trim() ? abn.trim() : null;
}

export function getContactName(info: Record<string, unknown> | null | undefined): string | null {
  if (!info) return null;
  const rep = info.representative_details as Record<string, unknown> | undefined;
  const name = rep?.contact_name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function getContactEmail(info: Record<string, unknown> | null | undefined): string | null {
  if (!info) return null;
  const contact = info.contact_information as Record<string, unknown> | undefined;
  const email = contact?.email;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

export function getContactPhone(info: Record<string, unknown> | null | undefined): string | null {
  if (!info) return null;
  const contact = info.contact_information as Record<string, unknown> | undefined;
  const phone = contact?.telephone ?? contact?.phone;
  return typeof phone === "string" && phone.trim() ? phone.trim() : null;
}

export function getSiteAddress(info: Record<string, unknown> | null | undefined): string | null {
  if (!info) return null;
  const contact = info.contact_information as Record<string, unknown> | undefined;
  const site = contact?.site_address;
  return typeof site === "string" && site.trim() ? site.trim() : null;
}

export function getDriveUrl(
  info: Record<string, unknown> | null | undefined,
  crmDriveUrl?: string | null
): string | null {
  const fromCrm = crmDriveUrl?.trim();
  if (fromCrm) return fromCrm;
  if (!info) return null;
  const gdrive = info.gdrive as Record<string, unknown> | undefined;
  const url = gdrive?.folder_url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

export function getRecordId(info: Record<string, unknown> | null | undefined): string | null {
  if (!info) return null;
  const id = info.record_ID;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

/** True when get-business-info returned a real LOA/member payload (not an error-only body). */
export function isValidBusinessInfoResponse(
  info: Record<string, unknown> | null | undefined,
): boolean {
  if (!info || typeof info !== "object") return false;
  const biz = info.business_details as Record<string, unknown> | undefined;
  const name = biz?.name ?? biz?.["Business Name"];
  if (typeof name === "string" && name.trim()) return true;
  return Boolean(getRecordId(info));
}

/** Extract user-facing message from a failed get-business-info response. */
export function getBusinessInfoErrorMessage(
  info: Record<string, unknown> | null | undefined,
): string {
  const formatted = info?._formatted_output;
  if (typeof formatted === "string" && formatted.trim()) {
    return formatted.trim();
  }
  return "Could not find that business name.";
}

/** True only when returned LOA record matches the CRM member's linked rec…. */
export function isBusinessInfoVerified(
  info: Record<string, unknown> | null | undefined,
  expectedExternalBusinessId: string | null | undefined
): boolean {
  const expected = expectedExternalBusinessId?.trim();
  const returned = getRecordId(info);
  return Boolean(expected && returned && expected === returned);
}
