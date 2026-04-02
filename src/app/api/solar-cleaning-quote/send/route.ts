import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** n8n workflow: solar cleaning quote email + Drive moves (update path if the workflow URL changes). */
const SOLAR_CLEANING_QUOTE_SEND_WEBHOOK_URL =
  "https://membersaces.app.n8n.cloud/webhook/solar-cleaning-quote-email";

/**
 * Forwards solar cleaning quote send to n8n (email + file moves).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      client_id,
      business_name,
      client_folder_url,
      quote_number,
      quote_google_doc_id,
      quote_pdf_file_id,
      tcs_master_doc_id,
      tc_reference,
      recipient_name,
      recipient_email,
      cc_emails,
      subject,
      html_body,
    } = body || {};

    if (!recipient_email?.trim() || !subject?.trim()) {
      return NextResponse.json(
        { error: "recipient_email and subject are required" },
        { status: 400 }
      );
    }

    const payload = {
      event: "solar_cleaning_quote_send",
      requested_by: (session.user as { email?: string })?.email || null,
      requested_at: new Date().toISOString(),
      client: {
        client_id: client_id ?? null,
        business_name: business_name ?? null,
        client_folder_url: client_folder_url ?? null,
      },
      quote: {
        quote_number: quote_number ?? null,
        quote_google_doc_id: quote_google_doc_id ?? null,
        quote_pdf_file_id: quote_pdf_file_id ?? null,
      },
      terms: {
        tcs_master_doc_id: tcs_master_doc_id ?? null,
        tc_reference: tc_reference ?? null,
      },
      recipient: {
        name: recipient_name || "",
        email: String(recipient_email).trim(),
      },
      cc: Array.isArray(cc_emails)
        ? cc_emails.filter((e: unknown) => typeof e === "string" && e.trim())
        : [],
      message: {
        subject: String(subject).trim(),
        html_body: typeof html_body === "string" ? html_body : "",
      },
    };

    const webhookRes = await fetch(SOLAR_CLEANING_QUOTE_SEND_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookRes.ok) {
      const errorText = await webhookRes.text();
      return NextResponse.json(
        { error: `Webhook failed (${webhookRes.status}): ${errorText}` },
        { status: 502 }
      );
    }

    const responseText = await webhookRes.text();
    let webhookData: unknown = null;
    try {
      webhookData = responseText ? JSON.parse(responseText) : null;
    } catch {
      webhookData = { raw: responseText };
    }

    return NextResponse.json({ success: true, webhook_response: webhookData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
