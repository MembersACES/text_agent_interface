export type AuPhoneCheck =
  | { ok: true; e164: string; kind: "mobile" | "landline" }
  | { ok: false; reason: string };

/**
 * Validate an Australian number and convert it to E.164, or explain why not.
 *
 * Matches autonomous_agent_backend `_to_e164_au` for the accepted branches
 * (04 / +614 mobile, 0[23578] landline with area code, 9-digit mobile missing
 * the leading 0). Rejects the backend's catch-all `return "+" + digits` —
 * that is how "8792 4400" became "+87924400" and was dialled as if real.
 */
export function checkAuPhone(raw: string): AuPhoneCheck {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "Enter a mobile number." };

  const digits = text.replace(/\D/g, "");
  if (!digits) return { ok: false, reason: "That doesn't contain any digits." };

  let national: string;
  if (text.startsWith("+") || digits.startsWith("61")) {
    national = `0${digits.replace(/^61/, "")}`;
  } else if (digits.length === 9 && digits.startsWith("4")) {
    national = `0${digits}`;
  } else {
    national = digits;
  }

  if (/^04\d{8}$/.test(national)) {
    return { ok: true, e164: `+61${national.slice(1)}`, kind: "mobile" };
  }
  if (/^0[23578]\d{8}$/.test(national)) {
    return { ok: true, e164: `+61${national.slice(1)}`, kind: "landline" };
  }

  if (national.replace(/^0/, "").length === 8) {
    return {
      ok: false,
      reason: "Looks like a landline without its area code — put 03, 02, 07 or 08 in front.",
    };
  }
  if (national.length < 10) {
    return {
      ok: false,
      reason: `Only ${digits.length} digits. An Australian mobile has 10, starting 04.`,
    };
  }
  return {
    ok: false,
    reason: "Doesn't look like an Australian number. Use 04XX XXX XXX or +61 4XX XXX XXX.",
  };
}
