import { NextRequest, NextResponse } from "next/server";
import PdfMerger from "pdf-merger-js";

type MergePdfsBody = {
  pdf_urls?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const { pdf_urls } = (await req.json()) as MergePdfsBody;

    if (!Array.isArray(pdf_urls) || pdf_urls.length === 0) {
      return NextResponse.json(
        { error: "No PDF URLs provided." },
        { status: 400 }
      );
    }

    const merger = new PdfMerger();

    for (let i = 0; i < pdf_urls.length; i++) {
      const url = pdf_urls[i];
      if (typeof url !== "string" || !url.trim()) {
        return NextResponse.json(
          { error: `Invalid PDF URL at index ${i}` },
          { status: 400 }
        );
      }

      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF at index ${i}` },
          { status: 500 }
        );
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await merger.add(buffer);
    }

    const mergedBuffer = await merger.saveAsBuffer();
    const body = Uint8Array.from(mergedBuffer as ArrayLike<number>);

    return new NextResponse(body as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="merged_strategy.pdf"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
