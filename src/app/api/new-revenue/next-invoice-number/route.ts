import { NextRequest, NextResponse } from "next/server";
import { proxyNewRevenue } from "../_proxy";

export async function POST(req: NextRequest) {
  try {
    const response = await proxyNewRevenue(req, "/api/new-revenue/next-invoice-number");
    if (response.ok) return response;

    const omsRes = await fetch(new URL("/api/one-month-savings/next-invoice-number", req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
      body: JSON.stringify({}),
    });
    if (omsRes.ok) return NextResponse.json(await omsRes.json());

    const number = Math.floor(Math.random() * 9000) + 1000;
    return NextResponse.json({
      invoice_number: `RA${number}`,
      fallback: true,
    });
  } catch {
    const number = Math.floor(Math.random() * 9000) + 1000;
    return NextResponse.json({
      invoice_number: `RA${number}`,
      fallback: true,
    });
  }
}
