import { NextRequest, NextResponse } from "next/server";
import { proxyNewRevenue } from "../_proxy";

export async function POST(req: NextRequest) {
  try {
    return await proxyNewRevenue(req, "/api/new-revenue/log");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to log invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
