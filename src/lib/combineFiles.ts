// lib/pdfUtils.ts
import { PDFDocument } from "pdf-lib";

export async function combineFilesIntoPdf(files: File[]): Promise<File> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((p) => mergedPdf.addPage(p));
  }

  const mergedBytes = await mergedPdf.save();
  return new File([mergedBytes], "combined.pdf", { type: "application/pdf" });
}
