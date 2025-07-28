import { NextRequest, NextResponse } from "next/server";
import PdfMerger from "pdf-merger-js";
import fetch from "node-fetch";

export async function POST(req: NextRequest) {
  try {
    const { pdf_urls } = await req.json();
    if (!Array.isArray(pdf_urls) || pdf_urls.length === 0) {
      return NextResponse.json({ error: "No PDF URLs provided." }, { status: 400 });
    }

    const merger = new PdfMerger();

    for (let i = 0; i < pdf_urls.length; i++) {
      const res = await fetch(pdf_urls[i]);
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch PDF at index ${i}` }, { status: 500 });
      }
      const buffer = await res.buffer();
      await merger.add(buffer);
    }

    const mergedBuffer = await merger.saveAsBuffer();
    return new NextResponse(mergedBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=merged_strategy.pdf",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
