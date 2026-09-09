import { NextRequest, NextResponse } from "next/server";
import { proxyNewRevenue } from "../_proxy";

export async function PATCH(req: NextRequest) {
  try {
    return await proxyNewRevenue(req, "/api/new-revenue/file-id", "PATCH");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update file_id";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
