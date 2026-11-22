'use client'
// ---------------------------------------------------------------------------
// _components/reports-card.tsx
// Attendance heatmap + performance chart — design system compliant
// Enhanced: class-aware coloring, tooltip per cell, multi-class indicators
// ---------------------------------------------------------------------------

import { useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Activity,
  Star,
  Download,
} from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { StudentLearningOutcome } from '@/features/lms/types/student'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const WEEK_DAYS = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon']

/**
 * Color palette for class distinction — each class gets a unique color pair.
 * present = solid, absent = light/faded variant
 * present = -1 (No Attendance) → amber/warning theme for ALL classes
 */
const CLASS_COLORS: Array<{
  present: string
  absent: string
  label: string
}> = [
    { present: 'bg-blue-500', absent: 'bg-blue-200 dark:bg-blue-900/50', label: 'bg-blue-500' },
    { present: 'bg-emerald-500', absent: 'bg-emerald-200 dark:bg-emerald-900/50', label: 'bg-emerald-500' },
    { present: 'bg-violet-500', absent: 'bg-violet-200 dark:bg-violet-900/50', label: 'bg-violet-500' },
    { present: 'bg-rose-500', absent: 'bg-rose-200 dark:bg-rose-900/50', label: 'bg-rose-500' },
    { present: 'bg-cyan-500', absent: 'bg-cyan-200 dark:bg-cyan-900/50', label: 'bg-cyan-500' },
    { present: 'bg-orange-500', absent: 'bg-orange-200 dark:bg-orange-900/50', label: 'bg-orange-500' },
    { present: 'bg-pink-500', absent: 'bg-pink-200 dark:bg-pink-900/50', label: 'bg-pink-500' },
    { present: 'bg-teal-500', absent: 'bg-teal-200 dark:bg-teal-900/50', label: 'bg-teal-500' },
  ]

/** Warning theme for present = -1 (No Attendance) */
const WARNING_COLOR = 'bg-amber-400/70 dark:bg-amber-500/50'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HeatmapEntry {
  id: string
  present: number
  lesson: string | null
  subject: string | null
  className: string | null
  level: string | null
}

interface HeatmapDayData {
  entries: HeatmapEntry[]
  bestStatus: number // 1=any present, 0=all absent, -1=noAttendance
  isMultiClass: boolean // 2+ different classes on same day
  primaryClass: string | null // first class for coloring
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse logDateTime from backend format "MM/dd/yyyy hh:mm tt" → YYYY-MM-DD
 * Also handles ISO 8601 format as fallback
 */
function parseLogDateTime(raw: string): string | null {
  // Try US format first: "03/15/2024 09:30 AM"
  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) {
    const [, m, d, y] = usMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Fallback: try ISO
  try {
    const date = new Date(raw)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch {
    // skip
  }
  return null
}

/** Format YYYY-MM-DD → dd/MM/yyyy for display */
function formatDateDisplay(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

/** Get weekday name from YYYY-MM-DD */
function getWeekdayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

/** Status config: label + Badge variant for shadcn semantic styling */
const STATUS_CONFIG: Record<number, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  1: { label: 'Present', variant: 'default' },
  0: { label: 'Absent', variant: 'destructive' },
  [-1]: { label: 'No Attendance', variant: 'outline' },
}

function getStatusConfig(present: number) {
  return STATUS_CONFIG[present] ?? { label: `Status ${present}`, variant: 'outline' as const }
}

/** Get cell color based on class index and status */
function getDayCellColor(status: number | undefined, classIndex: number): string {
  if (status === undefined) return 'bg-muted/40'

  // present = -1 → warning theme (amber)
  if (status === -1) return WARNING_COLOR

  const palette = CLASS_COLORS[classIndex % CLASS_COLORS.length]
  if (status === 1) return palette.present
  if (status === 0) return palette.absent

  return 'bg-muted-foreground/20'
}

/** Get today's date as YYYY-MM-DD */
function getTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportsCardProps {
  learningOutcomes: StudentLearningOutcome[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportsCard({ learningOutcomes }: ReportsCardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const todayMarkerRef = useRef<HTMLDivElement>(null)

  // ── Extract unique classes (ordered by first appearance) ──────────────
  const classOrder = useMemo(() => {
    const order: string[] = []
    const seen = new Set<string>()

    const sorted = [...learningOutcomes]
      .filter((lo) => lo.logDateTime)
      .sort((a, b) => {
        const da = parseLogDateTime(a.logDateTime!) ?? ''
        const db = parseLogDateTime(b.logDateTime!) ?? ''
        return da.localeCompare(db)
      })

    for (const lo of sorted) {
      const cls = lo.className ?? 'Unknown'
      if (!seen.has(cls)) {
        seen.add(cls)
        order.push(cls)
      }
    }
    return order
  }, [learningOutcomes])

  // Map className → color index
  const classIndexMap = useMemo(() => {
    const map: Record<string, number> = {}
    classOrder.forEach((cls, i) => { map[cls] = i })
    return map
  }, [classOrder])

  // ── Attendance Heatmap Data (enhanced with class info) ────────────────
  const heatmapData = useMemo(() => {
    const map: Record<string, HeatmapDayData> = {}
    for (const lo of learningOutcomes) {
      if (!lo.logDateTime) continue
      const date = parseLogDateTime(lo.logDateTime)
      if (!date) continue

      const entry: HeatmapEntry = {
        id: lo.id,
        present: lo.present,
        lesson: lo.lesson,
        subject: lo.subject,
        className: lo.className,
        level: lo.levelName,
      }

      if (!map[date]) {
        map[date] = {
          entries: [entry],
          bestStatus: lo.present,
          isMultiClass: false,
          primaryClass: lo.className,
        }
      } else {
        map[date].entries.push(entry)
        if (lo.present > map[date].bestStatus) {
          map[date].bestStatus = lo.present
        }
        const classes = new Set(map[date].entries.map((e) => e.className))
        map[date].isMultiClass = classes.size > 1
      }
    }
    return map
  }, [learningOutcomes])

  // Year range from data
  const { years, startYear, endYear } = useMemo(() => {
    const dates = Object.keys(heatmapData)
    if (dates.length === 0) {
      const now = new Date().getFullYear()
      return { years: [now], startYear: now, endYear: now }
    }
    const yearsSet = new Set(dates.map((d) => parseInt(d.substring(0, 4))))
    const sorted = Array.from(yearsSet).sort()
    // Always include current year
    const currentYear = new Date().getFullYear()
    if (!sorted.includes(currentYear)) sorted.push(currentYear)
    return {
      years: sorted,
      startYear: sorted[0],
      endYear: sorted[sorted.length - 1],
    }
  }, [heatmapData])

  // Scroll to place "today" at approximately 3/4 of viewport width
  const scrollToToday = useCallback(() => {
    const container = scrollContainerRef.current
    const marker = todayMarkerRef.current
    if (!container || !marker) {
      // Fallback: scroll to end
      if (container) container.scrollLeft = container.scrollWidth
      return
    }
    const markerLeft = marker.offsetLeft
    const viewportWidth = container.clientWidth
    // Position today at 3/4 of the viewport
    const targetScroll = markerLeft - viewportWidth * 0.75
    container.scrollLeft = Math.max(0, targetScroll)
  }, [])

  useEffect(() => {
    // Small delay to ensure layout is computed
    const timer = setTimeout(scrollToToday, 50)
    return () => clearTimeout(timer)
  }, [scrollToToday, heatmapData])

  // ── Performance Chart Data ───────────────────────────────────────────
  const scoreData = useMemo(() => {
    return learningOutcomes
      .filter((lo) => lo.starScore > 0 && lo.logDateTime)
      .sort((a, b) => {
        const da = parseLogDateTime(a.logDateTime!) ?? ''
        const db = parseLogDateTime(b.logDateTime!) ?? ''
        return da.localeCompare(db)
      })
      .slice(-15)
      .map((lo) => lo.starScore)
  }, [learningOutcomes])

  const latestScore = scoreData.length > 0 ? scoreData[scoreData.length - 1] : null

  // ── Attendance summary stats ─────────────────────────────────────────
  const attendanceSummary = useMemo(() => {
    const values = Object.values(heatmapData)
    const present = values.filter((v) => v.bestStatus === 1).length
    const absent = values.filter((v) => v.bestStatus === 0).length
    const noAttendance = values.filter((v) => v.bestStatus === -1).length
    return { total: values.length, present, absent, noAttendance }
  }, [heatmapData])

  const hasData = learningOutcomes.length > 0
  const todayStr = getTodayStr()

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between border-b h-9 py-0 space-y-0">
        <CardTitle className="flex items-center gap-1.5 text-xs">
          <Activity className="size-3.5" />
          Reports
        </CardTitle>
        <CardAction className="self-center mt-0">
          <Button variant="outline" size="icon" className="size-6" aria-label="Download reports">
            <Download />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-8">
        {/* ── Attendance Heatmap ───────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs md:text-sm font-semibold">
              Attendance History ({startYear}
              {endYear !== startYear ? ` – ${endYear}` : ''})
            </h4>
          </div>

          {/* Legend + Summary — single row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
            {/* Class colors (only when multiple) */}
            {classOrder.length > 1 &&
              classOrder.map((cls, i) => (
                <span key={cls} className="flex items-center gap-1">
                  <span className={cn('size-2 rounded-[2px]', CLASS_COLORS[i % CLASS_COLORS.length].label)} />
                  {cls}
                </span>
              ))
            }
            {classOrder.length > 1 && <Separator orientation="vertical" className="h-3 mx-0.5" />}

            {/* Status legend */}
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-[2px] bg-blue-500" />
              Present ({attendanceSummary.present})
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-[2px] bg-blue-200 dark:bg-blue-900/50" />
              Absent ({attendanceSummary.absent})
            </span>
            {attendanceSummary.noAttendance > 0 && (
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-[2px] bg-amber-400/70 dark:bg-amber-500/50" />
                No Attendance ({attendanceSummary.noAttendance})
              </span>
            )}
            {classOrder.length > 1 && (
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-[2px] ring-[1.5px] ring-amber-400 bg-transparent" />
                Multi-class
              </span>
            )}
          </div>

          {hasData ? (
            <TooltipProvider delayDuration={80}>
              <div className="w-full border rounded-lg p-3 bg-background overflow-hidden flex">
                {/* Sticky weekday labels */}
                <div className="flex flex-col gap-1 pt-12 pr-2 text-[8px] text-muted-foreground font-medium text-right shrink-0 bg-background z-10 border-r border-border/50">
                  {WEEK_DAYS.map((d, i) => (
                    <span key={i} className="h-2.5 flex items-center justify-end leading-none">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Scrollable heatmap — visible thin scrollbar */}
                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-x-auto pb-1 scroll-smooth"
                >
                  <div className="flex gap-6 pl-2 min-w-max">
                    {years.map((year) => (
                      <div key={year} className="flex flex-col gap-2">
                        <Badge variant="outline" className="w-fit text-[10px] tabular-nums">
                          {year}
                        </Badge>
                        <div className="flex gap-3">
                          {MONTHS.map((monthName, monthIndex) => {
                            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
                            const firstDay = new Date(year, monthIndex, 1).getDay()
                            const startOffset = (firstDay - 2 + 7) % 7
                            const cols = Math.ceil((daysInMonth + startOffset) / 7)

                            return (
                              <div key={monthName} className="flex flex-col gap-1.5">
                                <span className="text-[8px] font-semibold text-muted-foreground uppercase">
                                  {monthName}
                                </span>
                                <div
                                  className="grid grid-rows-7 grid-flow-col gap-0.5"
                                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                                >
                                  {Array.from({ length: cols * 7 }).map((_, idx) => {
                                    const dayNumber = idx - startOffset + 1
                                    const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth
                                    const dateStr = isValidDay
                                      ? `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
                                      : null
                                    const dayData = dateStr ? heatmapData[dateStr] : undefined
                                    const isToday = dateStr === todayStr

                                    if (!isValidDay) {
                                      return <div key={idx} className="size-2.5 bg-transparent" />
                                    }

                                    // Today marker ref — invisible anchor for scroll calculation
                                    const refProp = isToday ? { ref: todayMarkerRef } : {}

                                    // No data for this day
                                    if (!dayData) {
                                      return (
                                        <div
                                          key={idx}
                                          {...refProp}
                                          className={cn(
                                            'size-2.5 rounded-[2px] bg-muted/40 transition-colors',
                                            isToday && 'ring-1 ring-foreground/40',
                                          )}
                                        />
                                      )
                                    }

                                    // Determine color from primary class
                                    const classIdx = classIndexMap[dayData.primaryClass ?? ''] ?? 0
                                    const colorClass = getDayCellColor(dayData.bestStatus, classIdx)

                                    return (
                                      <Tooltip key={idx}>
                                        <TooltipTrigger asChild>
                                          <div
                                            {...refProp}
                                            className={cn(
                                              'size-2.5 rounded-[2px] transition-colors cursor-default',
                                              colorClass,
                                              isToday && 'ring-1 ring-foreground/40',
                                              dayData.isMultiClass && 'ring-[1.5px] ring-amber-400',
                                            )}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="flex item-center flex-col items-stretch max-w-[220px] p-0 overflow-hidden border-border bg-popover text-popover-foreground shadow-md"
                                        >
                                          {/* Hàng 1: Thứ, ngày tháng năm */}
                                          <div className="px-3 py-2 border-b border-border/60 bg-muted/30">
                                            <p className="text-[11px] font-semibold text-foreground whitespace-normal break-words leading-tight">
                                              {getWeekdayName(dateStr!)}, {formatDateDisplay(dateStr!)}
                                            </p>
                                          </div>

                                          {/* Multi-class note */}
                                          {dayData.isMultiClass && (
                                            <div className="px-3 py-1 border-b border-border/60 bg-muted/10">
                                              <span className="text-[9px] font-medium text-foreground">
                                                ⚠ Multiple classes on this day
                                              </span>
                                            </div>
                                          )}

                                          <div className="flex flex-col px-3 py-2 gap-2">
                                            {dayData.entries.map((entry, ei) => {
                                              const cfg = getStatusConfig(entry.present)
                                              return (
                                                <div key={entry.id} className="flex flex-col gap-1.5">
                                                  {ei > 0 && <Separator className="my-0.5" />}

                                                  {/* Hàng 2: Classname + tên bài học + Thông tin present*/}
                                                  <p className="text-[10px] space-2 font-medium text-foreground whitespace-normal break-words leading-tight">
                                                    <span className="font-bold">{entry.className}</span>
                                                    {entry.lesson || entry.subject ? ' · ' : ''}
                                                    {entry.lesson ? `L${entry.lesson}` : ''}
                                                    {entry.lesson && entry.subject ? ' - ' : ''}
                                                    {entry.subject}
                                                    <span className='ps-2'>
                                                      <Badge
                                                        variant={cfg.variant}
                                                        className="text-[9px] ps-2 px-2 py-0 h-4 font-semibold"
                                                      >
                                                        {cfg.label}
                                                      </Badge>
                                                    </span>
                                                  </p>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TooltipProvider>
          ) : (
            <div className="w-full border rounded-lg p-8 bg-background flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No attendance data yet</p>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Performance Score Chart ──────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs md:text-sm font-semibold flex items-center gap-2">
              <Star className="size-3.5 text-amber-500" />
              Performance Score
            </h4>
            {latestScore !== null && (
              <div className="text-[10px] text-muted-foreground">
                Last: <strong className="text-foreground tabular-nums">{latestScore}.0</strong>
              </div>
            )}
          </div>

          {scoreData.length > 1 ? (
            <div className="h-32 w-full relative border-l border-b border-border mt-2">
              {/* Horizontal grid lines */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-border/40"
                  style={{ bottom: `${i * 20}%` }}
                />
              ))}

              {/* Y-axis labels */}
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="absolute -left-5 text-[8px] text-muted-foreground tabular-nums"
                  style={{ bottom: `${i * 20 - 3}%` }}
                >
                  {i}
                </span>
              ))}

              {/* SVG line + dots */}
              <svg
                className="absolute inset-0 h-full w-full overflow-visible"
                preserveAspectRatio="none"
              >
                <polyline
                  fill="none"
                  stroke="oklch(0.5338 0.2118 26.32)"
                  strokeWidth="1.5"
                  points={scoreData
                    .map((score, i) => {
                      const x = (i / (scoreData.length - 1)) * 100
                      const y = 100 - score * 20
                      return `${x}%,${y}%`
                    })
                    .join(' ')}
                />
                {scoreData.map((score, i) => {
                  const x = (i / (scoreData.length - 1)) * 100
                  const y = 100 - score * 20
                  return (
                    <circle
                      key={i}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="2.5"
                      className="fill-background stroke-primary stroke-[1.5]"
                    />
                  )
                })}
              </svg>
            </div>
          ) : scoreData.length === 1 ? (
            <div className="h-32 w-full relative border-l border-b border-border mt-2 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary tabular-nums">{scoreData[0]}.0</div>
                <div className="text-[10px] text-muted-foreground">Only 1 score recorded</div>
              </div>
            </div>
          ) : (
            <div className="h-32 w-full relative border rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No score data yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
