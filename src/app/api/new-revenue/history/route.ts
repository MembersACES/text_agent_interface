import { NextRequest, NextResponse } from "next/server";
import { proxyNewRevenue } from "../_proxy";

/**
 * Invoice history for discrepancy / new revenue.
 * Proxies to FastAPI which reads the New Revenue Invoices Google Sheet tab.
 * Returns an empty list if the backend/sheet is not ready yet.
 */
export async function POST(req: NextRequest) {
  try {
    const response = await proxyNewRevenue(req, "/api/new-revenue/history");
    if (response.status === 401) return response;
    if (!response.ok) {
      return NextResponse.json({ invoices: [], message: "Could not fetch invoice history" });
    }
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch history";
    return NextResponse.json({ invoices: [], error: message });
  }
}
