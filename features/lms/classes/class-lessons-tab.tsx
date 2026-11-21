'use client'
// ---------------------------------------------------------------------------
// _components/class-lessons-tab.tsx
// Lessons tab inside Class Detail — split-pane: lesson table + detail panel
// Data: GET /api/ClassLesson/{classId} (list) + class schedule from parent
// Design: follows rules/03-design-system.md Data Table Standard
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  ListChecks,
  Loader2,
  PlayCircle,
  Search,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClassLessons } from '@/features/lms/hooks/classes/use-classes'
import { useUnitsByLesson } from '@/features/lms/hooks/curriculum/use-unit-plans'
import type { ClassLessonGrid } from '@/features/lms/types/class-lesson'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Subject → Badge variant color mapping */
const SUBJECT_COLORS: Record<string, string> = {
  english: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800',
  math: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
  science: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
}

const DEFAULT_SUBJECT_COLOR =
  'bg-muted text-muted-foreground border-border'

function getSubjectColor(subject: string | null | undefined): string {
  if (!subject) return DEFAULT_SUBJECT_COLOR
  return SUBJECT_COLORS[subject.toLowerCase()] ?? DEFAULT_SUBJECT_COLOR
}

// ---------------------------------------------------------------------------
// HtmlContent — renders HTML string fields from unit plan data safely
// Unit plan fields (description, materials, teacherActivities, learningOutcome,
// note, procedures) are stored as HTML in the DB.
// ---------------------------------------------------------------------------

/**
 * Sanitize HTML by stripping script/style/iframe tags.
 * Uses regex since DOMParser is not available during SSR.
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')       // strip inline event handlers
    .replace(/on\w+='[^']*'/gi, '')
}

/** Check if string contains any HTML tags */
function hasHtmlTags(text: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(text)
}

interface HtmlContentProps {
  html: string
  className?: string
}

/**
 * Renders HTML content from unit plan fields.
 * If the string has no HTML tags, renders as plain text with whitespace preserved.
 */
function HtmlContent({ html, className = '' }: HtmlContentProps) {
  if (!hasHtmlTags(html)) {
    return <span className={className}>{html}</span>
  }

  return (
    <div
      className={`unit-html-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClassLessonsTabProps {
  classId: string
  /** Class schedule time from parent (e.g. "17:30") */
  classStartTime?: string
  /** Class schedule time from parent (e.g. "19:00") */
  classEndTime?: string
  /** Class schedule days from parent (e.g. "Mon, Wed") */
  classScheduleDays?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClassLessonsTab({
  classId,
  classStartTime,
  classEndTime,
  classScheduleDays,
}: ClassLessonsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)

  // ── Data ───────────────────────────────────────────────────────────────
  const { data: lessons, isLoading, error } = useClassLessons(classId)

  // Unit plans for selected lesson (fetches by lessonPlan ID)
  const selectedLessonPlanId = useMemo(() => {
    if (!selectedLessonId || !lessons) return ''
    const found = lessons.find((l) => l.id === selectedLessonId)
    return found?.lessonId ?? ''
  }, [selectedLessonId, lessons])

  const {
    data: unitPlans,
    isLoading: loadingUnits,
  } = useUnitsByLesson(selectedLessonPlanId)

  // ── Filtered lessons ──────────────────────────────────────────────────
  const filteredLessons = useMemo(() => {
    if (!lessons) return []
    if (!searchQuery.trim()) return lessons
    const q = searchQuery.toLowerCase()
    return lessons.filter(
      (l) =>
        l.lesson.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        l.content.toLowerCase().includes(q) ||
        (l.tb && l.tb.toLowerCase().includes(q)),
    )
  }, [lessons, searchQuery])

  const selectedLesson = useMemo(
    () => filteredLessons.find((l) => l.id === selectedLessonId) ?? null,
    [filteredLessons, selectedLessonId],
  )

  // ── Helpers ───────────────────────────────────────────────────────────
  const getLessonIndex = (lesson: ClassLessonGrid) => {
    if (!lessons) return 0
    return lessons.indexOf(lesson) + 1
  }

  const handleLetsLearn = (e: React.MouseEvent, lesson: ClassLessonGrid) => {
    e.stopPropagation()
    // Opens Let's Learn preview in new tab — pass classId for student roster
    window.open(`/lets-learn/${lesson.id}?preview=true&source=classLesson&classId=${classId}`, '_blank')
  }

  const handleViewPlan = (e: React.MouseEvent, lesson: ClassLessonGrid) => {
    e.stopPropagation()
    setSelectedLessonId(lesson.id)
  }

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) return <TableSkeleton />

  // ── Error ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <BookOpen className="size-10 opacity-15" />
        <p className="text-sm font-medium">Failed to load lessons</p>
        <p className="text-xs text-muted-foreground/60">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* ── Left Pane: Lesson List ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-4 pt-1 pb-1 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums ml-auto">
              {filteredLessons.length} lesson{filteredLessons.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px] text-center">Status</TableHead>
                <TableHead className="w-[180px]">Lesson</TableHead>
                {classScheduleDays && (
                  <TableHead className="w-[200px]">Schedule</TableHead>
                )}
                <TableHead className="w-[120px]">Subject</TableHead>
                {!selectedLesson && (
                  <>
                    <TableHead>Content</TableHead>
                    <TableHead className="w-[160px]">Textbook Ref</TableHead>
                  </>
                )}
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLessons.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={selectedLesson ? 5 : 7}
                    className="h-40 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <BookOpen className="size-8 opacity-15" />
                      <p className="text-sm font-medium">No lessons found</p>
                      {searchQuery && (
                        <p className="text-xs text-muted-foreground/60">
                          Try a different search term
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLessons.map((item) => {
                  const idx = getLessonIndex(item)
                  const isSelected = selectedLessonId === item.id

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => setSelectedLessonId(item.id)}
                      className={`cursor-pointer group border-l-4 transition-colors ${isSelected
                        ? 'bg-muted/60 border-l-primary'
                        : 'hover:bg-muted/30 border-l-transparent'
                        }`}
                    >
                      {/* Status Icon */}
                      <TableCell className="text-center">
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                      </TableCell>

                      {/* Lesson # / Level */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            Less. {idx}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Lvl {item.level}
                          </span>
                        </div>
                      </TableCell>

                      {/* Schedule (from class data) */}
                      {classScheduleDays && (
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center text-xs font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                              {classScheduleDays}
                            </div>
                            {classStartTime && classEndTime && (
                              <div className="flex items-center text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1.5" />
                                {classStartTime} – {classEndTime}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Subject Badge */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getSubjectColor(item.subject)}`}
                        >
                          {item.subject}
                        </span>
                      </TableCell>

                      {/* Content (hidden when detail panel open) */}
                      {!selectedLesson && (
                        <>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-foreground truncate max-w-[280px]">
                                {item.content}
                              </span>
                            </div>
                          </TableCell>

                          {/* TB Ref */}
                          <TableCell>
                            {item.tb && item.tb !== '-' ? (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-border w-fit">
                                <BookOpen className="h-3 w-3" />
                                <span className="truncate max-w-[100px]" title={item.tb}>
                                  {item.tb}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                        </>
                      )}

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => handleLetsLearn(e, item)}
                            aria-label="Preview lesson"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handleViewPlan(e, item)}
                            aria-label="View lesson plan"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-card/80 backdrop-blur-sm px-4 py-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {filteredLessons.length} of {lessons?.length ?? 0} lessons
          </span>
        </div>
      </div>

      {/* ── Right Pane: Lesson Detail ─────────────────────────────── */}
      {selectedLesson && (
        <div className="w-full lg:w-1/2 border-l flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-200">
          {/* Header */}
          <div className="flex flex-col gap-2 px-5 py-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Lesson Plan Detail
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground"
                onClick={() => setSelectedLessonId(null)}
                aria-label="Close detail panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <h4 className="text-base font-bold text-foreground leading-tight">
              {selectedLesson.content}
            </h4>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
              <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                Lesson {getLessonIndex(selectedLesson)}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getSubjectColor(selectedLesson.subject)}`}
              >
                {selectedLesson.subject}
              </span>
              {classScheduleDays && (
                <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{classScheduleDays}</span>
                  {classStartTime && classEndTime && (
                    <>
                      <Clock className="h-3.5 w-3.5 ml-1" />
                      <span>
                        {classStartTime} – {classEndTime}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
            {/* Lesson Info */}
            <div className="flex flex-col gap-2">
              <h5 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Lesson Information
              </h5>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground text-xs">Lesson</dt>
                <dd className="font-medium">{selectedLesson.lesson}</dd>
                <dt className="text-muted-foreground text-xs">Content</dt>
                <dd>{selectedLesson.content}</dd>
                <dt className="text-muted-foreground text-xs">Level</dt>
                <dd>
                  <Badge variant="secondary">{selectedLesson.level}</Badge>
                </dd>
                {selectedLesson.tb && selectedLesson.tb !== '-' && (
                  <>
                    <dt className="text-muted-foreground text-xs">Textbook</dt>
                    <dd className="flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                      {selectedLesson.tb}
                    </dd>
                  </>
                )}
              </dl>
            </div>

            {/* Unit Plan */}
            <div className="flex flex-col gap-2">
              <h5 className="text-sm font-semibold flex items-center gap-2">
                <ListChecks className="h-3.5 w-3.5 text-primary" />
                Unit Plan
                {unitPlans && unitPlans.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({unitPlans.length} step{unitPlans.length !== 1 ? 's' : ''})
                  </span>
                )}
              </h5>

              {loadingUnits ? (
                <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading unit plan…
                </div>
              ) : !unitPlans || unitPlans.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground/60">
                    No unit plan steps for this lesson yet.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {unitPlans
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                    .map((unit, idx) => (
                      <div
                        key={unit.id}
                        className="rounded-lg border border-border bg-background p-3 flex flex-col gap-1.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            {idx + 1}.{' '}
                            {unit.procedures ? (
                              <HtmlContent html={unit.procedures} className="inline" />
                            ) : (
                              'Step'
                            )}
                          </span>
                          <span className="text-[10px] tabular-nums text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {unit.time} min
                          </span>
                        </div>
                        {unit.description && (
                          <div className="text-xs text-muted-foreground leading-relaxed [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0">
                            <HtmlContent html={unit.description} />
                          </div>
                        )}
                        {unit.materials && (
                          <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground [&_p]:m-0">
                            <BookOpen className="h-3 w-3 shrink-0 mt-0.5" />
                            <HtmlContent html={unit.materials} className="truncate" />
                          </div>
                        )}
                        {unit.teacherActivities && (
                          <div className="text-[11px] text-muted-foreground/80 italic [&_p]:m-0">
                            <HtmlContent html={unit.teacherActivities} />
                          </div>
                        )}
                        {unit.learningOutcome && (
                          <div className="flex items-start gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 [&_p]:m-0">
                            <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                            <HtmlContent html={unit.learningOutcome} />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t bg-muted/20 shrink-0 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                setSelectedLessonId(null)
              }
            >
              <FileText data-icon="inline-start" />
              Close
            </Button>
            <Button
              className="flex-1"
              onClick={(e) => {
                if (selectedLesson) handleLetsLearn(e, selectedLesson)
              }}
            >
              <PlayCircle data-icon="inline-start" />
              Let&apos;s Learn
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table Skeleton — 8 rows matching column layout
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar skeleton */}
      <div className="px-4 pt-3 pb-2 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-20 ml-auto" />
        </div>
      </div>
      {/* Table body skeleton */}
      <div className="flex-1 overflow-hidden px-4 py-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-3 border-b border-border/50"
          >
            <Skeleton className="h-4 w-4 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-4 flex-1 max-w-[200px]" />
            <Skeleton className="h-5 w-20 rounded" />
            <div className="flex gap-1 ml-auto">
              <Skeleton className="h-7 w-7 rounded" />
              <Skeleton className="h-7 w-7 rounded" />
            </div>
          </div>
        ))}
      </div>
      {/* Footer skeleton */}
      <div className="shrink-0 border-t bg-card/80 backdrop-blur-sm px-4 py-2 flex justify-between">
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}
