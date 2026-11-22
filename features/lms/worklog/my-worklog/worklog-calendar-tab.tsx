'use client'
// ---------------------------------------------------------------------------
// _components/worklog-calendar-tab.tsx
// Bento calendar — a week-aligned 7-column grid over the browsed payroll
// period (mockup WorkRecordsView "Lịch Bento" design). Read-only: entry
// create/edit lives in the lesson-anchored Class Detail pane, not here.
// Clicking a day opens a read-only detail dialog; it never opens an editor.
//
// Cell background encodes the day's WORKLOG APPROVAL status (not attendance
// punctuality — v2 AttendanceItem has no on-time/late taxonomy): any Rejected
// -> rose, else any Waiting -> amber, else all-Accepted -> emerald, else a
// neutral card. Weekend days are muted; today gets a primary ring.
// ---------------------------------------------------------------------------

import { useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatScore, roundAwayFromZero } from '@/features/lms/lib/worklog/grid-model'
import { todayDateKeyInSaigon, type DayColumn } from '@/features/lms/lib/worklog/payroll-cycle'
import { useWorklogSelectedDay } from '@/features/lms/stores/use-worklog-store'
import {
  WorkLogStatusV2,
  type AttendanceItem,
  type ShiftOption,
  type WorkLogItemV2,
} from '@/features/lms/types/worklog'
import { WorklogEmptyState } from './worklog-empty-state'

// workType: 0 Office | 1 HalfDay | 2 Off | 3 Online — verbatim from the v2
// contract; no v1/old-app label precedent found in-repo.
const WORK_TYPE_LABELS: Record<number, string> = {
  0: 'Office',
  1: 'Half Day',
  2: 'Off',
  3: 'Online',
}

// Sunday-first weekday headers to match DayColumn.weekday (0=Sun..6=Sat).
const WEEKDAY_HEADERS = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

const STATUS_BADGE: Record<number, { label: string; className: string }> = {
  [WorkLogStatusV2.Waitting]: {
    label: 'Waiting',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0',
  },
  [WorkLogStatusV2.Accepted]: {
    label: 'Accepted',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0',
  },
  [WorkLogStatusV2.Rejected]: {
    label: 'Rejected',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0',
  },
}

function StatusBadge({ status }: { status: number }) {
  const cfg = STATUS_BADGE[status]
  if (!cfg) return null
  return <Badge className={cn('text-[9px]', cfg.className)}>{cfg.label}</Badge>
}

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6
}

// Day-level worklog approval rollup → bento cell tint. Precedence follows the
// approval severity: a single Rejected dominates, then any pending Waiting,
// then a fully-Accepted day; days without worklogs stay neutral.
type DayTone = 'rejected' | 'waiting' | 'accepted' | 'none'

function dayTone(worklogs: WorkLogItemV2[]): DayTone {
  if (worklogs.length === 0) return 'none'
  if (worklogs.some((w) => w.status === WorkLogStatusV2.Rejected)) return 'rejected'
  if (worklogs.some((w) => w.status === WorkLogStatusV2.Waitting)) return 'waiting'
  return 'accepted'
}

const TONE_CELL: Record<DayTone, string> = {
  rejected: 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20',
  waiting: 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20',
  accepted: 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20',
  none: 'bg-card hover:border-primary/50 border-border',
}

const TONE_DOT: Record<Exclude<DayTone, 'none'>, string> = {
  rejected: 'bg-rose-500',
  waiting: 'bg-amber-500',
  accepted: 'bg-emerald-500',
}

const FULL_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatFullDate(dateKey: string): string {
  return FULL_DATE_FORMAT.format(new Date(`${dateKey}T00:00:00Z`))
}

interface WorklogCalendarTabProps {
  columns: DayColumn[]
  worklogsByDate: Map<string, WorkLogItemV2[]>
  attendanceByDate: Map<string, AttendanceItem[]>
  shiftOptionsMap: Map<string, ShiftOption>
  isLoading: boolean
}

export function WorklogCalendarTab({
  columns,
  worklogsByDate,
  attendanceByDate,
  shiftOptionsMap,
  isLoading,
}: WorklogCalendarTabProps) {
  const { selectedDay, selectDay, closeDay } = useWorklogSelectedDay()
  const detailTrigger = useRef<HTMLButtonElement>(null)
  const todayKey = todayDateKeyInSaigon()

  if (isLoading) return <CalendarTabSkeleton />

  const hasAnyData = columns.some(
    (c) => worklogsByDate.has(c.dateKey) || attendanceByDate.has(c.dateKey),
  )

  if (!hasAnyData) {
    return (
      <WorklogEmptyState
        title="No worklog data"
        message="No worklogs or attendance recorded for this period yet."
      />
    )
  }

  // Week-align the strip of period days into a 7-col grid: pad the leading
  // weekday gap (period starts on the 26th, rarely a Sunday) and the trailing
  // gap so the last week row is full. Offsets derive from DayColumn.weekday —
  // no extra data needed.
  const leadingBlanks = columns.length > 0 ? columns[0].weekday : 0
  const trailingBlanks =
    columns.length > 0 ? (6 - columns[columns.length - 1].weekday + 7) % 7 : 0

  const selectedWorklogs = selectedDay ? (worklogsByDate.get(selectedDay) ?? []) : []
  const selectedAttendance = selectedDay ? (attendanceByDate.get(selectedDay) ?? []) : []

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Legend + hint */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <span className="text-[11px] font-medium text-muted-foreground">
          Bấm vào từng ô để xem chi tiết chấm công và lớp dạy trong ngày.
        </span>
        <div className="flex gap-3 text-[9px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" /> Chờ duyệt
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" /> Đã duyệt
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-rose-500" /> Từ chối
          </span>
        </div>
      </div>

      {/* Weekday header */}
      <div className="mb-1 grid grid-cols-7 gap-1.5 rounded bg-muted/40 py-1 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div
            key={`lead-${i}`}
            className="aspect-square rounded-lg border border-dashed border-border/30 bg-muted/10 opacity-40 select-none"
          />
        ))}

        {columns.map((column) => {
          const worklogs = worklogsByDate.get(column.dateKey) ?? []
          const attendance = attendanceByDate.get(column.dateKey) ?? []
          // BE-rounded (Math.Round(x, 1, AwayFromZero) parity) day total.
          const totalScore = roundAwayFromZero(worklogs.reduce((sum, w) => sum + w.score, 0))
          const tone = dayTone(worklogs)
          const weekend = isWeekend(column.weekday)
          const attHours = attendance.reduce((s, a) => s + a.workHours, 0)
          const firstWorklog = worklogs[0]

          return (
            <button
              key={column.dateKey}
              type="button"
              aria-label={`View worklog for ${column.dateKey}`}
              aria-haspopup="dialog"
              onClick={(event) => {
                detailTrigger.current = event.currentTarget
                selectDay(column.dateKey)
              }}
              className={cn(
                'group relative flex aspect-square flex-col justify-between overflow-hidden rounded-xl border p-2 text-left shadow-2xs transition-all hover:-translate-y-0.5',
                tone === 'none' && weekend ? 'border-border/60 bg-muted/10' : TONE_CELL[tone],
                column.isPrevMonth && 'opacity-60',
                column.dateKey === todayKey && 'ring-1 ring-primary ring-inset',
              )}
            >
              {/* top: day number + status dot */}
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    'font-mono text-xs font-black',
                    column.isPrevMonth ? 'text-muted-foreground/60' : 'text-foreground',
                  )}
                >
                  {column.dayNum}
                </span>
                {tone !== 'none' && (
                  <span className={cn('size-1.5 rounded-full', TONE_DOT[tone])} />
                )}
              </div>

              {/* middle: attendance in→out */}
              <div className="my-1 min-w-0">
                {attendance.length > 0 ? (
                  <div className="flex flex-col">
                    <span className="truncate font-mono text-[9px] font-semibold text-foreground">
                      {attendance[0].checkInTime?.slice(11, 16) ?? '—'} ➔{' '}
                      {attendance[0].checkOutTime?.slice(11, 16) ?? 'Open'}
                    </span>
                    <span className="font-mono text-[8px] text-muted-foreground">
                      {attHours.toFixed(1)}h công
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] text-muted-foreground/50 italic">
                    {weekend ? 'Cuối tuần' : 'Không chấm công'}
                  </span>
                )}
              </div>

              {/* bottom: first class chip + more-count */}
              <div className="w-full">
                {firstWorklog ? (
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex min-w-0 items-center gap-1 rounded border border-primary/15 bg-primary/10 px-1 text-[8px] font-bold text-primary">
                      <span className="truncate">
                        {firstWorklog.className ??
                          shiftOptionsMap.get(firstWorklog.effortType)?.label ??
                          firstWorklog.effortType}
                      </span>
                      <span className="shrink-0 font-black tabular-nums">
                        {formatScore(totalScore)}
                      </span>
                    </span>
                    {worklogs.length > 1 && (
                      <span className="shrink-0 text-[8px] font-semibold text-muted-foreground">
                        +{worklogs.length - 1}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="font-mono text-[8px] text-muted-foreground/40">No class</span>
                )}
              </div>

              {/* hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">
                  Chi tiết
                </span>
              </div>
            </button>
          )
        })}

        {Array.from({ length: trailingBlanks }).map((_, i) => (
          <div
            key={`trail-${i}`}
            className="aspect-square rounded-lg border border-dashed border-border/30 bg-muted/10 opacity-40 select-none"
          />
        ))}
      </div>

      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && closeDay()}>
        <DialogContent className="sm:max-w-md" onCloseAutoFocus={(event) => {
          if (!detailTrigger.current?.isConnected) return
          event.preventDefault()
          detailTrigger.current.focus()
        }}>
          <DialogHeader>
            <DialogTitle>{selectedDay ? formatFullDate(selectedDay) : ''}</DialogTitle>
            <DialogDescription>
              Read-only — worklog entries are created from the lesson delivery flow.
            </DialogDescription>
          </DialogHeader>

          {selectedDay && (
            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
              {selectedAttendance.length > 0 && (
                <div className="flex flex-col gap-1.5 rounded-md border p-2.5">
                  <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                    Attendance
                  </span>
                  {selectedAttendance.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <span>
                        {a.checkInTime?.slice(11, 16) ?? '—'} –{' '}
                        {a.checkOutTime?.slice(11, 16) ?? 'Open'}
                      </span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {a.workHours.toFixed(1)}h ·{' '}
                        {WORK_TYPE_LABELS[a.workType] ?? `Type ${a.workType}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                  Worklog Entries
                </span>
                {selectedWorklogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic">
                    No worklog entries for this day.
                  </p>
                ) : (
                  selectedWorklogs.map((wl) => (
                    <div
                      key={wl.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-medium">
                          {shiftOptionsMap.get(wl.effortType)?.label ?? wl.effortType}
                          {wl.className ? ` · ${wl.className}` : ''}
                        </span>
                        {wl.comment && (
                          <span className="truncate text-muted-foreground">{wl.comment}</span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {wl.score.toFixed(1)}
                        </span>
                        <StatusBadge status={wl.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CalendarTabSkeleton() {
  return (
    <div className="flex-1 overflow-hidden p-3">
      <div className="mb-1 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-5 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  )
}
