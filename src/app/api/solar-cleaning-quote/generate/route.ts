import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * n8n: copy template, fill placeholders, upload Doc + PDF. Path matches your workflow webhook URL.
 * Payload includes amount_*_text fields (AUD strings) for Google Docs replaceText — the API rejects
 * numeric replaceText; use those strings in batchUpdate, not amount_*_ex_gst numbers.
 * Response (object or single-element array): quote_doc_url, quote_pdf_url, quote_google_doc_id,
 * quote_pdf_file_id, optional folder_id, tcs_master_doc_id, applied_fields, extraction_warnings.
 */
const SOLAR_CLEANING_QUOTE_GENERATE_WEBHOOK_URL =
  "https://membersaces.app.n8n.cloud/webhook/solar-cleaning-quote-generation";

const WEBHOOK_TIMEOUT_MS = 180_000;

function unwrapN8nBody(raw: unknown): Record<string, unknown> {
  let o: Record<string, unknown>;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object" && raw[0] !== null) {
    o = { ...(raw[0] as Record<string, unknown>) };
  } else if (typeof raw === "object" && raw !== null) {
    o = { ...(raw as Record<string, unknown>) };
  } else {
    return {};
  }
  if (typeof o.data === "object" && o.data !== null && !Array.isArray(o.data)) {
    o = { ...o, ...(o.data as Record<string, unknown>) };
  }
  return o;
}

function extractGoogleDocIdFromUrl(url: string): string | undefined {
  const m = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return m?.[1];
}

function extractDriveFileIdFromUrl(url: string): string | undefined {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m?.[1];
}

/** Map alternate n8n keys to the shape the solar cleaning quote page expects. */
function normalizeGenerateResponse(obj: Record<string, unknown>) {
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = obj[k];
      if (v != null && String(v).trim() !== "") return String(v);
    }
    return undefined;
  };

  let quote_doc_url = pick("quote_doc_url", "quoteDocUrl", "google_doc_url", "doc_url");
  let quote_pdf_url = pick("quote_pdf_url", "quotePdfUrl", "pdf_url");

  /** Other ACES flows use `pdf_document_link` for the PDF; URL path tells Doc vs file. */
  const pdfDocumentLink = pick("pdf_document_link");
  if (pdfDocumentLink) {
    if (pdfDocumentLink.includes("/document/d/")) {
      quote_doc_url = quote_doc_url || pdfDocumentLink;
    } else if (pdfDocumentLink.includes("/file/d/")) {
      quote_pdf_url = quote_pdf_url || pdfDocumentLink;
    }
  }

  let quote_google_doc_id = pick(
    "quote_google_doc_id",
    "quoteGoogleDocId",
    "google_doc_id",
    "doc_id"
  );
  let quote_pdf_file_id = pick("quote_pdf_file_id", "quotePdfFileId", "pdf_file_id");

  if (!quote_google_doc_id && quote_doc_url) {
    quote_google_doc_id = extractGoogleDocIdFromUrl(quote_doc_url);
  }
  if (!quote_pdf_file_id && quote_pdf_url) {
    quote_pdf_file_id = extractDriveFileIdFromUrl(quote_pdf_url);
  }

  const explicitFail =
    obj.success === false ||
    (typeof obj.error === "string" && obj.error.trim().length > 0);
  const hasOutput = Boolean(quote_doc_url || quote_google_doc_id || quote_pdf_url || quote_pdf_file_id);
  const success = !explicitFail && hasOutput;

  return {
    success,
    quote_google_doc_id,
    quote_doc_url,
    quote_pdf_file_id,
    quote_pdf_url,
    folder_id: pick("folder_id", "folderId") ?? undefined,
    tcs_master_doc_id: pick("tcs_master_doc_id", "tcsMasterDocId") ?? undefined,
    vendor_quote_file_id: pick("vendor_quote_file_id", "vendorQuoteFileId") ?? undefined,
    extraction_warnings: Array.isArray(obj.extraction_warnings)
      ? obj.extraction_warnings
      : undefined,
    applied_fields: typeof obj.applied_fields === "object" && obj.applied_fields !== null
      ? obj.applied_fields
      : undefined,
    error: typeof obj.error === "string" ? obj.error : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const payload = {
      ...body,
      requested_by: (session.user as { email?: string })?.email ?? null,
      requested_at: new Date().toISOString(),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    let webhookRes: Response;
    try {
      webhookRes = await fetch(SOLAR_CLEANING_QUOTE_GENERATE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (e: unknown) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === "AbortError") {
        return NextResponse.json(
          { error: "Quote generation timed out. Try again or check the n8n workflow." },
          { status: 504 }
        );
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await webhookRes.text();
    let parsed: unknown = null;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch {
      return NextResponse.json(
        {
          error: `n8n returned non-JSON (${webhookRes.status}): ${responseText.slice(0, 500)}`,
        },
        { status: 502 }
      );
    }

    const obj = unwrapN8nBody(parsed);
    const normalized = normalizeGenerateResponse(obj);

    if (!webhookRes.ok) {
      const msg =
        normalized.error ||
        (typeof obj.message === "string" ? obj.message : null) ||
        responseText.slice(0, 300) ||
        `Webhook failed (${webhookRes.status})`;
      return NextResponse.json({ error: msg, success: false }, { status: 502 });
    }

    if (!normalized.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            normalized.error ||
            "n8n did not return quote_doc_url / quote_pdf_url / file ids. Check the workflow response.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(normalized);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
