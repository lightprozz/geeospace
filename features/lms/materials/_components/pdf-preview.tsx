"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export default function PdfPreview({ url }: { url: string }) {
  const [pages, setPages] = useState(0);
  return <div className="h-full overflow-auto"><Document file={url} loading={<p role="status">Loading PDF…</p>} error={<p role="alert">Unable to load PDF.</p>} onLoadSuccess={({ numPages }) => setPages(numPages)}>{Array.from({ length: pages }, (_, index) => <Page key={index} pageNumber={index + 1} width={680} renderTextLayer={false} renderAnnotationLayer={false} />)}</Document></div>;
}
