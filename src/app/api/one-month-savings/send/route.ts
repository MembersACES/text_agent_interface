import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      invoice_number,
      business_name,
      client_name,
      client_email,
      subject,
      html_body,
      attachment_filename,
      pdf_base64,
      invoice_file_id,
      invoice_date,
      due_date,
      subtotal,
      total_gst,
      total_amount,
      line_items,
    } = body || {};

    if (!invoice_number || !business_name || !client_email || !subject) {
      return NextResponse.json(
        { error: "Missing required fields: invoice_number, business_name, client_email, subject" },
        { status: 400 }
      );
    }

    const webhookUrl = "https://membersaces.app.n8n.cloud/webhook/1st_month_savings_send";

    const payload = {
      event: "one_month_savings_send_invoice",
      requested_by: (session.user as any)?.email || null,
      requested_at: new Date().toISOString(),
      invoice: {
        invoice_number,
        business_name,
        invoice_file_id: invoice_file_id || null,
        invoice_date: invoice_date || null,
        due_date: due_date || null,
        subtotal: subtotal ?? null,
        total_gst: total_gst ?? null,
        total_amount: total_amount ?? null,
        line_items: Array.isArray(line_items) ? line_items : [],
      },
      recipient: {
        client_name: client_name || "",
        client_email,
      },
      message: {
        subject,
        html_body: html_body || "",
      },
      attachment: {
        filename: attachment_filename || `${invoice_number}.pdf`,
        content_base64: pdf_base64 || "",
        content_type: "application/pdf",
      },
    };

    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!webhookRes.ok) {
      const errorText = await webhookRes.text();
      return NextResponse.json(
        { error: `Webhook call failed (${webhookRes.status}): ${errorText}` },
        { status: 502 }
      );
    }

    const responseText = await webhookRes.text();
    let webhookData: any = null;
    try {
      webhookData = responseText ? JSON.parse(responseText) : null;
    } catch {
      webhookData = { raw: responseText };
    }

    return NextResponse.json({
      success: true,
      webhook_response: webhookData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to submit send request" },
      { status: 500 }
    );
  }
}
