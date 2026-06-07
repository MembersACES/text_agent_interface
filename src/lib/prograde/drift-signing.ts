/**
 * Prograde DRIFT_EVENT v1 §4.2 HMAC verification (browser/Node).
 * Port of PC3 mock_service/signing.py — keep in sync.
 */
import { createHmac, timingSafeEqual } from "crypto";

const SCHEME = "v1";
const DEFAULT_TOLERANCE_SECONDS = 300;

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function parseSignatureHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

export function signPayload(
  body: string | Buffer,
  secret: string,
  timestamp?: number,
): { t: number; v1: string } {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const bodyBytes = typeof body === "string" ? Buffer.from(body, "utf-8") : body;
  const signedPayload = Buffer.concat([Buffer.from(`${t}.`, "utf-8"), bodyBytes]);
  const v1 = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return { t, v1 };
}

export function verifySignature(
  body: string | Buffer,
  header: string,
  secret: string,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  now?: number,
): VerifyResult {
  const parsed = parseSignatureHeader(header);
  if (!parsed.t) return { ok: false, reason: "missing timestamp (t) in signature header" };
  if (!parsed[SCHEME]) return { ok: false, reason: `missing ${SCHEME} scheme in signature header` };

  const t = parseInt(parsed.t, 10);
  if (Number.isNaN(t)) return { ok: false, reason: "timestamp (t) is not an integer" };

  const current = now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(current - t) > toleranceSeconds) {
    return {
      ok: false,
      reason: `timestamp outside tolerance window (|${current} - ${t}| > ${toleranceSeconds}s)`,
    };
  }

  const bodyBytes = typeof body === "string" ? Buffer.from(body, "utf-8") : body;
  const { v1: expected } = signPayload(bodyBytes, secret, t);
  const received = Buffer.from(parsed[SCHEME], "utf-8");
  const expectedBuf = Buffer.from(expected, "utf-8");
  if (received.length !== expectedBuf.length || !timingSafeEqual(received, expectedBuf)) {
    return { ok: false, reason: "signature mismatch" };
  }
  return { ok: true };
}
