import { NextRequest, NextResponse } from "next/server";
import { proxyNewRevenue } from "../_proxy";

const ALLOWED_STATUSES = ["Generated", "Sent", "Paid"] as const;

export async function PATCH(req: NextRequest) {
  try {
    const cloned = req.clone();
    const body = await cloned.json();
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    return await proxyNewRevenue(req, "/api/new-revenue/status", "PATCH");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
