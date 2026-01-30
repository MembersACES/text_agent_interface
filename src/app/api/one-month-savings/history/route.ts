import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: Get One Month Savings Invoice History
 *
 * This endpoint fetches invoice history for a specific business
 * from Google Sheets via an n8n webhook.
 */

const N8N_WEBHOOK_URL = "https://membersaces.app.n8n.cloud/webhook/one-month-savings-history";

export async function POST(req: NextRequest) {
  try {
    const { business_name } = await req.json();

    if (!business_name) {
      return NextResponse.json(
        { error: "Missing required field: business_name" },
        { status: 400 }
      );
    }

    // Fetch from n8n webhook (which reads from Google Sheets)
    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ business_name }),
    });

    if (!webhookResponse.ok) {
      console.error("n8n webhook error:", await webhookResponse.text());
      return NextResponse.json({
        invoices: [],
        message: "Could not fetch invoice history",
      });
    }

    const data = await webhookResponse.json();

    // Transform the response to match our expected format
    // n8n returns an array directly with keys: Member, Solution (with trailing space), Amount, Invoice Number, Due Date
    const rows = Array.isArray(data) ? data : [];
    const invoices = rows.map((row: any) => {
      // Handle "Solution " key with trailing space
      const solution = row["Solution "] || row["Solution"] || "";
      
      // Parse amount - handle both number and string formats
      let amount = 0;
      if (typeof row["Amount"] === "number") {
        amount = row["Amount"];
      } else if (typeof row["Amount"] === "string") {
        amount = parseFloat(row["Amount"].replace(/[$,]/g, "")) || 0;
      }

      return {
        invoice_number: row["Invoice Number"] || row.invoice_number || "",
        business_name: row["Member"] || row.business_name || "",
        business_abn: row["Business ABN"] || row.business_abn || "",
        contact_name: row["Contact Name"] || row.contact_name || "",
        contact_email: row["Contact Email"] || row.contact_email || "",
        invoice_date: row["Invoice Date"] || row.invoice_date || "",
        due_date: row["Due Date"] || row.due_date || "",
        subtotal: row["Subtotal"] ? parseFloat(String(row["Subtotal"]).replace(/[$,]/g, "")) : amount / 1.1, // Estimate if not provided
        total_gst: row["GST"] ? parseFloat(String(row["GST"]).replace(/[$,]/g, "")) : amount * 0.1 / 1.1, // Estimate if not provided
        total_amount: amount,
        status: row["Status"] || row.status || "Generated",
        created_at: row["Created At"] || row.created_at || "",
        line_items: solution ? [{ solution_label: solution.trim() }] : [],
      };
    });
  

    return NextResponse.json({
      invoices,
      count: invoices.length,
    });
  } catch (error: any) {
    console.error("Error fetching invoice history:", error);
    return NextResponse.json(
      { invoices: [], error: error.message || "Failed to fetch history" },
      { status: 500 }
    );
  }
}

