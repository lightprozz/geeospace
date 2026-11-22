'use client'
// ---------------------------------------------------------------------------
// exam-print-templates/default-template.tsx
// Default A4 print template for exam results
// Page 1: Header → Overall Performance Table → Academic Table
// Page 2+: Teacher's Comment (rich text HTML, auto-paginated)
// Template is PURE RENDER — no data fetching, no state, only props
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { A4Page } from './a4-page'
import type { PrintTemplateProps } from './types'

// ---------------------------------------------------------------------------
// A4 Pagination Constants (in mm)
// ---------------------------------------------------------------------------

/**
 * A4 page dimensions and typography metrics for pagination calculation.
 *
 * A4 = 210mm × 297mm
 * Padding = 12mm each side (set in a4-page.tsx)
 * Content area = 210 - 2×12 = 186mm wide × 297 - 2×12 = 273mm tall
 *
 * Font: text-sm (14px) + leading-relaxed (1.625) = 22.75px ≈ 6.02mm/line
 * Content width: 186mm at 14px ≈ 95 chars/line (measured from actual render)
 * Block margin: [&_p]:mb-2 = 8px ≈ 2.1mm
 *
 * Comment page header (h2 + h3 + margins) ≈ 22mm
 * Continuation header (italic label + margin) ≈ 10mm
 *
 * Available lines per page:
 *   First comment page: (273 - 22) × 0.9 / 6 ≈ 37 lines
 *   Continuation pages:  (273 - 10) × 0.9 / 6 ≈ 39 lines
 *
 * Safety factor: 0.9 (90%) to absorb measurement variance
 */
const LINE_HEIGHT_MM = 6.02
const CONTENT_HEIGHT_MM = 247 // 297mm - 2×20mm padding
const COMMENT_PAGE_HEADER_MM = 22 // h2 title + h3 section header + margins
const CONTINUATION_HEADER_MM = 10 // Small italic continuation label
const CONTENT_WIDTH_CHARS = 120 // Chars per line at 186mm width / 14px font
const BLOCK_MARGIN_MM = 2.5 // [&_p]:mb-2 = 8px ≈ 2.1mm + rounding
const SAFETY_FACTOR = 0.9 // 90% capacity to prevent edge-case overflow

// Available height for comment content per page type
const FIRST_COMMENT_PAGE_HEIGHT = (CONTENT_HEIGHT_MM - COMMENT_PAGE_HEADER_MM) * SAFETY_FACTOR
const CONTINUATION_PAGE_HEIGHT = (CONTENT_HEIGHT_MM - CONTINUATION_HEADER_MM) * SAFETY_FACTOR

// ---------------------------------------------------------------------------
// HTML Block Pagination Engine
// ---------------------------------------------------------------------------

interface HtmlBlock {
  html: string
  estimatedHeightMm: number
}

/**
 * Parse rich text HTML into individual block-level elements using DOMParser.
 * Lists (<ul>/<ol>) are FLATTENED — each <li> becomes its own block.
 * This prevents an entire long list from being treated as one massive block
 * that can never page-break.
 *
 * Height estimation: textLength / CONTENT_WIDTH_CHARS → lines → mm
 */
function parseHtmlBlocks(html: string): HtmlBlock[] {
  if (!html || html.trim() === '') return []

  // Use browser DOMParser for reliable HTML parsing (available in 'use client')
  if (typeof window === 'undefined') {
    // SSR fallback — treat as single block
    return [createBlockFromText(html, html.replace(/<[^>]*>/g, ''))]
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const blocks: HtmlBlock[] = []

  // Walk top-level children of <body>
  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? ''
      if (text) {
        blocks.push(createBlockFromText(`<p>${text}</p>`, text))
      }
      continue
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    // FLATTEN lists — each <li> becomes its own block
    if (tag === 'ul' || tag === 'ol') {
      const listItems = el.querySelectorAll(':scope > li')
      for (const li of Array.from(listItems)) {
        const liEl = li as HTMLElement
        const liHtml = `<${tag}><li>${liEl.innerHTML}</li></${tag}>`
        const liText = liEl.textContent?.trim() ?? ''
        blocks.push(createBlockFromText(liHtml, liText))
      }
      continue
    }

    // Standard block elements: <p>, <h1>-<h6>, <blockquote>, <div>, <hr>
    const outerHtml = el.outerHTML
    const textContent = el.textContent?.trim() ?? ''
    blocks.push(createBlockFromText(outerHtml, textContent))
  }

  // Fallback: if parsing produced nothing, treat entire HTML as one block
  if (blocks.length === 0 && html.trim()) {
    blocks.push(createBlockFromText(html, html.replace(/<[^>]*>/g, '')))
  }

  return blocks
}

/** Create a block with estimated height from pre-extracted text */
function createBlockFromText(html: string, plainText: string): HtmlBlock {
  const charCount = plainText.length

  if (charCount === 0) {
    return { html, estimatedHeightMm: LINE_HEIGHT_MM }
  }

  const lines = Math.ceil(charCount / CONTENT_WIDTH_CHARS)
  return {
    html,
    estimatedHeightMm: lines * LINE_HEIGHT_MM + BLOCK_MARGIN_MM,
  }
}

/**
 * Group HTML blocks into pages based on available height per page.
 * Returns array of HTML strings, one per page.
 */
function paginateHtmlBlocks(blocks: HtmlBlock[]): string[] {
  if (blocks.length === 0) return ['']

  const pages: string[] = []
  let currentPageBlocks: string[] = []
  let currentHeightUsed = 0
  let isFirstPage = true

  const getPageCapacity = () =>
    isFirstPage ? FIRST_COMMENT_PAGE_HEIGHT : CONTINUATION_PAGE_HEIGHT

  for (const block of blocks) {
    const capacity = getPageCapacity()

    // If adding this block would overflow the current page
    if (currentHeightUsed + block.estimatedHeightMm > capacity && currentPageBlocks.length > 0) {
      // Flush current page
      pages.push(currentPageBlocks.join(''))
      currentPageBlocks = []
      currentHeightUsed = 0
      isFirstPage = false
    }

    currentPageBlocks.push(block.html)
    currentHeightUsed += block.estimatedHeightMm
  }

  // Flush remaining blocks
  if (currentPageBlocks.length > 0) {
    pages.push(currentPageBlocks.join(''))
  }

  return pages
}

/**
 * Hook: paginate rich text HTML comment into A4-sized pages.
 * Splits at block element boundaries, estimates height per block.
 */
function usePaginatedComment(comment: string): string[] {
  return useMemo(() => {
    if (!comment || comment.trim() === '') return []
    const blocks = parseHtmlBlocks(comment)
    return paginateHtmlBlocks(blocks)
  }, [comment])
}

// ---------------------------------------------------------------------------
// Sub-component: Template Header
// ---------------------------------------------------------------------------

function TemplateHeader({
  examTitle,
  student,
  className: classNameProp,
  mainTeacher,
  coTeacher,
  startDate,
}: Pick<
  PrintTemplateProps,
  'examTitle' | 'student' | 'className' | 'mainTeacher' | 'coTeacher' | 'startDate'
>) {
  return (
    <div className="mb-4">
      <h1 className="text-3xl font-bold text-red-600 mb-2">{examTitle}</h1>
      <p className="text-lg italic text-black font-medium mb-4">
        Báo cáo kết quả kiểm tra của{' '}
        <span className="text-red-600 font-bold">
          {student.englishName} - {student.name}
        </span>
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div className="font-bold">
          Class: <span className="font-normal">{classNameProp}</span>
        </div>
        <div className="font-bold">
          Main Teacher: <span className="font-normal">{mainTeacher || '—'}</span>
        </div>
        <div className="font-bold">
          Start Date: <span className="font-normal">{startDate}</span>
        </div>
        <div className="font-bold">
          Co Teacher: <span className="font-normal">{coTeacher || '—'}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: Overall Performance Table
// ---------------------------------------------------------------------------

function OverallTable({
  scores,
  scales,
}: {
  scores: PrintTemplateProps['overallScores']
  scales: PrintTemplateProps['evaluationScales']
}) {
  return (
    <div className="mb-4">
      <div className="bg-gray-400 text-center py-1 border border-gray-400">
        <span className="text-red-600 font-bold uppercase text-sm">
          OVERALL PERFORMANCE (Đánh giá chung)
        </span>
      </div>
      <table className="w-full text-sm border-collapse border-l border-r border-b border-gray-400 border-dotted">
        <thead>
          <tr className="text-center border-b border-gray-400 border-dotted">
            <th className="p-2 border-r border-gray-400 border-dotted w-1/4">
              <div>Skills</div>
              <div className="text-xs font-normal">(Kỹ năng)</div>
            </th>
            <th className="p-0 border-r border-gray-400 border-dotted w-3/4">
              <div className="border-b border-gray-400 border-dotted p-1 font-bold">
                Evaluation (Thang điểm đánh giá)
              </div>
              <div className="grid grid-cols-4 h-full">
                {scales.map((scale, i) => (
                  <div
                    key={scale.value}
                    className={`p-1 flex flex-col justify-center items-center ${i < 3 ? 'border-r border-gray-400 border-dotted' : ''
                      }`}
                  >
                    <span className="font-bold">{scale.label}</span>
                  </div>
                ))}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {scores.map((skill) => (
            <tr
              key={skill.skillName}
              className="border-b border-gray-400 border-dotted last:border-0"
            >
              <td className="p-2 border-r border-gray-400 border-dotted font-bold text-center">
                {skill.skillName}
              </td>
              <td className="p-0">
                <div className="grid grid-cols-4 h-full">
                  {scales.map((scale, i) => (
                    <div
                      key={scale.value}
                      className={`p-2 flex items-center justify-center ${i < 3 ? 'border-r border-gray-400 border-dotted' : ''
                        }`}
                    >
                      {skill.value === scale.value ? '✓' : ''}
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: Academic Performance Table
// ---------------------------------------------------------------------------

function AcademicTable({
  scores,
  totalPercent,
  resultLabel,
}: {
  scores: PrintTemplateProps['academicScores']
  totalPercent: number
  resultLabel: string
}) {
  return (
    <div className="mb-6">
      <div className="bg-gray-400 text-center py-1 border border-gray-400">
        <span className="text-red-600 font-bold uppercase text-sm">
          ACADEMIC PERFORMANCE (Học thuật)
        </span>
      </div>
      <table className="w-full text-sm border-collapse border-l border-r border-b border-gray-400 border-dotted">
        <thead>
          <tr className="text-center border-b border-gray-400 border-dotted">
            <th className="p-2 border-r border-gray-400 border-dotted w-1/2">
              <div>Linguistic Aspects</div>
              <div className="text-xs font-normal">(Ngôn ngữ học)</div>
            </th>
            <th className="p-2 w-1/2">
              <div>Score (Điểm)</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {scores.map((item) => (
            <tr
              key={item.subjectName}
              className="border-b border-gray-400 border-dotted"
            >
              <td className="p-2 border-r border-gray-400 border-dotted text-center font-bold">
                {item.subjectName}
              </td>
              <td className="p-2 text-center">
                <div className="flex justify-between px-16">
                  <span>{item.score}</span>
                  <span>/{item.maxScore}</span>
                </div>
              </td>
            </tr>
          ))}
          <tr className="border-b border-gray-400 border-dotted">
            <td className="p-2 border-r border-gray-400 border-dotted text-center font-bold">
              TOTAL (Tổng điểm)
            </td>
            <td className="p-2 text-center font-bold">
              {totalPercent.toFixed(2)}%
            </td>
          </tr>
          <tr>
            <td className="p-2 border-r border-gray-400 border-dotted text-center font-bold text-red-600">
              RESULT (Kết quả)
            </td>
            <td className="p-2 text-center font-bold text-red-600 uppercase">
              {resultLabel}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Template Component
// ---------------------------------------------------------------------------

export function DefaultTemplate(props: PrintTemplateProps) {
  const commentPages = usePaginatedComment(props.comment)

  // Total pages: 1 (tables) + comment pages (minimum 1 for comment section)
  const commentPageCount = Math.max(commentPages.length, 1)
  const totalPages = 1 + commentPageCount

  return (
    <>
      {/* PAGE 1: Header + Tables */}
      <A4Page
        backgroundUrl={props.backgroundImageUrl}
        pageNumber={1}
        totalPages={totalPages}
      >
        <TemplateHeader
          examTitle={props.examTitle}
          student={props.student}
          className={props.className}
          mainTeacher={props.mainTeacher}
          coTeacher={props.coTeacher}
          startDate={props.startDate}
        />

        <div className="border-t border-black/20 border-dashed my-4" />

        <h2 className="text-xl font-bold text-red-600 mb-4">
          Thông tin đánh giá
        </h2>

        <OverallTable
          scores={props.overallScores}
          scales={props.evaluationScales}
        />

        <AcademicTable
          scores={props.academicScores}
          totalPercent={props.totalPercent}
          resultLabel={props.resultLabel}
        />
      </A4Page>

      {/* PAGE 2+: Teacher's Comment (auto-paginated) */}
      {commentPages.map((pageHtml, idx) => (
        <A4Page
          key={idx}
          backgroundUrl={props.backgroundImageUrl}
          pageNumber={2 + idx}
          totalPages={totalPages}
        >
          {/* Page header */}
          {idx === 0 ? (
            <>
              <h3 className="text-lg font-bold text-red-600 mb-3">
                TEACHER&apos;S COMMENT (Nhận xét)
              </h3>
            </>
          ) : (
            <p className="text-xs text-gray-400 mb-4 italic">
              Teacher&apos;s Comment — continued (page {idx + 1})
            </p>
          )}

          {/* Render paginated rich text HTML */}
          <div
            className="text-sm leading-relaxed prose prose-sm max-w-none
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                        [&_p]:mb-2 [&_strong]:font-bold [&_em]:italic [&_u]:underline"
            dangerouslySetInnerHTML={{ __html: pageHtml }}
          />
        </A4Page>
      ))}

      {/* If no comment, still show empty page 2 with placeholder */}
      {commentPages.length === 0 && (
        <A4Page
          backgroundUrl={props.backgroundImageUrl}
          pageNumber={2}
          totalPages={totalPages}
        >
          <h3 className="text-lg font-bold text-red-600 mb-3">
            TEACHER&apos;S COMMENT (Nhận xét)
          </h3>
          <p className="text-sm text-gray-400 italic">
            No comment provided.
          </p>
        </A4Page>
      )}
    </>
  )
}
