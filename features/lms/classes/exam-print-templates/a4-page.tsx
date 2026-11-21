// ---------------------------------------------------------------------------
// exam-print-templates/a4-page.tsx
// Reusable A4 paper wrapper for print templates
// Renders children inside a 210mm × 297mm container with optional background
// Includes optional page number footer
// Uses fixed mm units + pageBreakAfter for reliable multi-page printing
// ---------------------------------------------------------------------------

interface A4PageProps {
  children: React.ReactNode
  backgroundUrl?: string
  /** Additional className for the page container */
  className?: string
  /** Current page number (1-indexed) */
  pageNumber?: number
  /** Total number of pages */
  totalPages?: number
}

export function A4Page({
  children,
  backgroundUrl,
  className = '',
  pageNumber,
  totalPages,
}: A4PageProps) {
  return (
    <div
      className={`bg-white text-black relative flex flex-col
                  shadow-lg print:shadow-none print:m-0 ${className}`}
      style={{
        // Fixed A4 dimensions in mm — works both on-screen and in print
        width: '210mm',
        minHeight: '297mm',
        padding: '25mm',
        // Background image
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // Print: force page break AFTER each A4 page
        pageBreakAfter: 'always',
        // Allow content to flow naturally — do NOT use pageBreakInside: 'avoid'
        // or overflow: 'hidden' as they prevent multi-page rendering
        boxSizing: 'border-box',
      }}
    >
      {/* Semi-transparent overlay for readability over background */}
      <div className="absolute inset-0 bg-white/90 opacity-0 z-0" />

      {/* Content — z-index above overlay, flex-1 pushes footer to bottom */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex-1">{children}</div>

        {/* Page number footer — pinned at bottom of each page */}
        {pageNumber != null && totalPages != null && (
          <div className="mt-auto pt-4 border-t border-gray-300/50 flex items-center justify-between text-[10px] text-gray-400 shrink-0">
            <span>Gee-O English&apos;s Exam Report</span>
            <span>
              Page {pageNumber} / {totalPages}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
