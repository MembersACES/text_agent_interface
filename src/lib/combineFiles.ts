// lib/pdfUtils.ts
import { PDFDocument } from "pdf-lib";

export async function combineFilesIntoPdf(files: File[]): Promise<File> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const lowerName = file.name.toLowerCase();
    const isPdf =
      file.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isPng =
      file.type === "image/png" || lowerName.endsWith(".png");
    const isJpeg =
      file.type === "image/jpeg" ||
      file.type === "image/jpg" ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg");

    if (isPdf) {
      const pdf = await PDFDocument.load(bytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((p) => mergedPdf.addPage(p));
      continue;
    }

    if (isPng || isJpeg) {
      const image = isPng
        ? await mergedPdf.embedPng(bytes)
        : await mergedPdf.embedJpg(bytes);
      const { width, height } = image.size();
      const page = mergedPdf.addPage([width, height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width,
        height,
      });
      continue;
    }

    throw new Error(
      `Unsupported file type for PDF merge: ${file.type || lowerName}`,
    );
  }

  const mergedBytes = await mergedPdf.save();
  return new File([mergedBytes as BlobPart], "combined.pdf", {
    type: "application/pdf",
  });
}
