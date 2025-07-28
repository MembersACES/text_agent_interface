import { NextRequest, NextResponse } from "next/server";
import { PdfMerger } from "pdf-merger-js";
import fetch from "node-fetch";

export async function POST(req: NextRequest) {
  try {
    const { pdf_urls } = await req.json();
    if (!Array.isArray(pdf_urls) || pdf_urls.length === 0) {
      return NextResponse.json({ error: "No PDF URLs provided." }, { status: 400 });
    }

    const merger = new (require("pdf-merger-js"))();
    for (const url of pdf_urls) {
      const res = await fetch(url);
      const buf = await res.buffer();
      await merger.add(buf);
    }

    const mergedBuffer = await merger.saveAsBuffer();
    return new NextResponse(mergedBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=merged_strategy.pdf",
      },
    });
  } catch (err: any) {
    console.error("❌ Merge error:", err.message);
    return NextResponse.json({ error: "Failed to merge PDFs" }, { status: 500 });
  }
}
