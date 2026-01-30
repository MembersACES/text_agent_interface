import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: Log One Month Savings Invoice to Google Sheets
 *
 * This endpoint receives invoice data and logs it to a Google Sheet
 * via an n8n webhook for tracking purposes.
 */

const N8N_WEBHOOK_URL = "https://membersaces.app.n8n.cloud/webhook/one-month-savings-log";

export async function POST(req: NextRequest) {
  try {
    const invoiceData = await req.json();

    // Validate required fields
    if (!invoiceData.invoice_number || !invoiceData.business_name) {
      return NextResponse.json(
        { error: "Missing required fields: invoice_number and business_name" },
        { status: 400 }
      );
    }

    // Flatten line items for the sheet
    const lineItemsSummary = invoiceData.line_items
      ?.map((item: any) => `${item.solution_label}: $${item.savings_amount.toFixed(2)}`)
      .join("; ") || "";

    // Prepare payload for Google Sheets
    const sheetPayload = {
      invoice_number: invoiceData.invoice_number,
      business_name: invoiceData.business_name,
      business_abn: invoiceData.business_abn || "",
      contact_name: invoiceData.contact_name || "",
      contact_email: invoiceData.contact_email || "",
      invoice_date: invoiceData.invoice_date,
      due_date: invoiceData.due_date,
      services: lineItemsSummary,
      subtotal: invoiceData.subtotal?.toFixed(2) || "0.00",
      gst: invoiceData.total_gst?.toFixed(2) || "0.00",
      total_amount: invoiceData.total_amount?.toFixed(2) || "0.00",
      status: invoiceData.status || "Generated",
      created_at: invoiceData.created_at || new Date().toISOString(),
      // Store full line items as JSON for detailed tracking
      line_items_json: JSON.stringify(invoiceData.line_items || []),
    };

    // Send to n8n webhook (which writes to Google Sheets)
    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sheetPayload),
    });

    if (!webhookResponse.ok) {
      console.error("n8n webhook error:", await webhookResponse.text());
      // Don't fail the request - invoice was still generated
      return NextResponse.json({
        success: true,
        logged: false,
        message: "Invoice generated but logging failed",
      });
    }

    return NextResponse.json({
      success: true,
      logged: true,
      invoice_number: invoiceData.invoice_number,
    });
  } catch (error: any) {
    console.error("Error logging invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log invoice" },
      { status: 500 }
    );
  }
}

