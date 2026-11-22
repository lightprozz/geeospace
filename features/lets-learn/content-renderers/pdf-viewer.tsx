'use client'
// ---------------------------------------------------------------------------
// PDF Viewer — uses react-pdf for page-by-page rendering
// Toolbar: filename, page navigation, zoom, download, print
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Menu, Minus, Plus, Download, Printer, Loader2 } from 'lucide-react'
import type { LessonUnitMaterial } from '@/features/lms/types/lets-learn'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PdfViewerProps {
  material: LessonUnitMaterial
  title: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PdfViewer({ material, title }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loadError, setLoadError] = useState(false)

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total)
    },
    [],
  )

  const onDocumentLoadError = useCallback(() => {
    setLoadError(true)
  }, [])

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(numPages, p + 1))
  }

  const handleZoomOut = () => {
    setScale((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10))
  }

  const handleZoomIn = () => {
    setScale((s) => Math.min(2.5, Math.round((s + 0.1) * 10) / 10))
  }

  const handleDownload = () => {
    if (material.url) {
      const link = document.createElement('a')
      link.href = material.url
      link.download = material.fileName ?? 'document.pdf'
      link.target = '_blank'
      link.click()
    }
  }

  const handlePrint = () => {
    if (material.url) {
      window.open(material.url, '_blank')
    }
  }

  const fileName = material.fileName ?? `${title}.pdf`

  // If no URL, show placeholder
  if (!material.url) {
    return <PdfPlaceholder title={title} />
  }

  // If load error
  if (loadError) {
    return (
      <div className="w-full h-full max-w-7xl bg-card rounded-xl shadow-lg border border-border flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-300">
        <p className="text-destructive font-medium">Unable to load PDF</p>
        <p className="text-muted-foreground text-sm mt-2">{fileName}</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full max-w-7xl bg-card rounded-xl shadow-lg border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Toolbar */}
      <div className="h-12 border-b border-border bg-muted/50 flex items-center justify-between px-4 shrink-0">
        {/* Left: menu + filename */}
        <div className="flex items-center gap-3">
          <Menu className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium text-sm truncate max-w-[200px] md:max-w-xs">
            {fileName}
          </span>
        </div>

        {/* Right: page nav + zoom + actions */}
        <div className="flex items-center gap-2 sm:gap-4 text-muted-foreground overflow-x-auto no-scrollbar">
          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-0.5 rounded hover:text-foreground disabled:opacity-40 transition-colors"
              aria-label="Previous page"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm whitespace-nowrap select-none">
              {currentPage} / {numPages || '–'}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className="p-0.5 rounded hover:text-foreground disabled:opacity-40 transition-colors"
              aria-label="Next page"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 border-l border-r border-border px-4">
            <button
              onClick={handleZoomOut}
              className="p-0.5 rounded hover:text-foreground transition-colors"
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm w-12 text-center select-none">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-0.5 rounded hover:text-foreground transition-colors"
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={handleDownload}
            className="p-1 rounded hover:text-foreground shrink-0 transition-colors"
            aria-label="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="p-1 rounded hover:text-foreground shrink-0 transition-colors"
            aria-label="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 bg-muted/20 overflow-auto p-4 sm:p-8 flex justify-center">
        <Document
          file={material.url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer
            renderAnnotationLayer
            loading={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          />
        </Document>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Static placeholder when no PDF URL (matches mockup "In This Unit" page)
// ---------------------------------------------------------------------------

function PdfPlaceholder({ title }: { title: string }) {
  return (
    <div className="w-full h-full max-w-7xl bg-card rounded-xl shadow-lg border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="h-12 border-b border-border bg-muted/50 flex items-center px-4 shrink-0">
        <Menu className="w-5 h-5 text-muted-foreground mr-3" />
        <span className="font-medium text-sm truncate">{title}</span>
      </div>
      <div className="flex-1 bg-muted/20 overflow-auto p-4 sm:p-8 flex justify-center">
        <div className="w-full max-w-[700px] min-h-[900px] h-fit bg-white dark:bg-card shadow-md border border-border flex flex-col p-8 sm:p-12">
          <div className="border-b-4 border-primary pb-4 mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              {title}
            </h1>
          </div>
          <p className="text-muted-foreground">
            No PDF content is attached to this unit.
          </p>
        </div>
      </div>
    </div>
  )
}
