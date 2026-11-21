'use client'
// ---------------------------------------------------------------------------
// _components/worklog-ledger-tab.tsx
// Dense timesheet ledger over the browsed payroll period (mockup
// WorkRecordsView "Bảng Chấm Công (Ledger)" design) — read-only, the
// small-screen fallback for the Calendar tab's bento grid.
//
// Reconciliation (Đối soát): worklog Score is a shift-weight, not clock hours,
// so the check is presence-based (matching the mockup's own >0 logic): a day
// with teaching worklogs but NO check-in attendance is "Lệch" (taught without
// clocking in) and its row is amber-tinted; a day with both is "Khớp".
// The mockup's Sửa / Sửa công action column is intentionally omitted — this
// page is read-only, and correction requests belong to the Forms/Flows module.
// ---------------------------------------------------------------------------

import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatScore, roundAwayFromZero } from '@/features/lms/lib/worklog/grid-model'
import { todayDateKeyInSaigon, type DayColumn } from '@/features/lms/lib/worklog/payroll-cycle'
import {
  ShiftTypeConstant,
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

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const STATUS_RING: Record<number, string> = {
  [WorkLogStatusV2.Waitting]: 'ring-amber-500/40',
  [WorkLogStatusV2.Accepted]: 'ring-emerald-500/40',
  [WorkLogStatusV2.Rejected]: 'ring-rose-500/40',
}

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6
}

const TH =
  'border-b border-r border-border p-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground'
const TD = 'border-b border-r border-border p-2 align-top'

interface WorklogLedgerTabProps {
  columns: DayColumn[]
  worklogsByDate: Map<string, WorkLogItemV2[]>
  attendanceByDate: Map<string, AttendanceItem[]>
  shiftOptionsMap: Map<string, ShiftOption>
  isLoading: boolean
}

export function WorklogLedgerTab({
  columns,
  worklogsByDate,
  attendanceByDate,
  shiftOptionsMap,
  isLoading,
}: WorklogLedgerTabProps) {
  const todayKey = todayDateKeyInSaigon()

  if (isLoading) return <LedgerTabSkeleton />

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

  return (
    <div className="flex-1 overflow-auto p-2">
      <table className="w-full border-separate border-spacing-0 text-left text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted/90">
            <th className={cn(TH, 'w-10 text-center')}>STT</th>
            <th className={cn(TH, 'w-24')}>Ngày</th>
            <th className={cn(TH, 'w-12 text-center')}>Thứ</th>
            <th className={cn(TH, 'w-16 text-center')}>Vào</th>
            <th className={cn(TH, 'w-16 text-center')}>Ra</th>
            <th className={cn(TH, 'w-20 text-right')}>Giờ công</th>
            <th className={TH}>Lớp dạy (Worklog)</th>
            <th className={cn(TH, 'w-20 text-right text-primary')}>Giờ dạy</th>
            <th className={cn(TH, 'w-20 border-r-0 text-center')}>Đối soát</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column, idx) => {
            const worklogs = worklogsByDate.get(column.dateKey) ?? []
            const attendance = attendanceByDate.get(column.dateKey) ?? []
            // BE-rounded (Math.Round(x, 1, AwayFromZero) parity) day total.
            const totalScore = roundAwayFromZero(worklogs.reduce((sum, w) => sum + w.score, 0))
            const attHours = attendance.reduce((s, a) => s + a.workHours, 0)
            const weekend = isWeekend(column.weekday)
            const isToday = column.dateKey === todayKey
            // Presence-based reconciliation (mockup parity): taught but never
            // clocked in => Lệch; both present => Khớp; otherwise nothing to
            // reconcile.
            const worked = worklogs.some((worklog) => worklog.effortType !== ShiftTypeConstant.Off)
            const hasDiscrepancy = worked && attendance.length === 0
            const isMatched = worked && attendance.length > 0

            return (
              <tr
                key={column.dateKey}
                className={cn(
                  'transition-colors hover:bg-muted/40',
                  hasDiscrepancy && 'bg-amber-500/5',
                  weekend && !hasDiscrepancy && 'bg-muted/30',
                  column.isPrevMonth && 'opacity-60',
                  isToday && '[&>td:first-child]:border-l-2 [&>td:first-child]:border-l-primary',
                )}
              >
                <td className={cn(TD, 'text-center font-mono text-muted-foreground')}>
                  {idx + 1}
                </td>
                <td className={cn(TD, 'font-medium')}>
                  <span className="tabular-nums">{String(column.dayNum).padStart(2, '0')}</span>
                  {column.isPrevMonth && (
                    <span className="block text-[8px] text-muted-foreground">(Chu kỳ trước)</span>
                  )}
                </td>
                <td className={cn(TD, 'text-center font-bold text-muted-foreground')}>
                  {WEEKDAY_LABELS[column.weekday]}
                </td>
                <td className={cn(TD, 'text-center font-mono')}>
                  {attendance[0]?.checkInTime?.slice(11, 16) ?? '—'}
                </td>
                <td className={cn(TD, 'text-center font-mono')}>
                  {attendance[0]?.checkOutTime?.slice(11, 16) ?? '—'}
                </td>
                <td className={cn(TD, 'text-right font-mono font-semibold')}>
                  {attendance.length > 0 ? (
                    <span title={WORK_TYPE_LABELS[attendance[0].workType] ?? undefined}>
                      {attHours.toFixed(1)}h
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className={TD}>
                  {worklogs.length === 0 ? (
                    <span className="text-muted-foreground/40">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {worklogs.map((wl) => (
                        <span
                          key={wl.id}
                          className={cn(
                            'inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/10 px-1 text-[9px] font-bold text-primary ring-1 ring-inset',
                            STATUS_RING[wl.status] ?? 'ring-transparent',
                          )}
                          title={`${shiftOptionsMap.get(wl.effortType)?.label ?? wl.effortType} · ${
                            STATUS_LABEL[wl.status] ?? ''
                          }`}
                        >
                          <span className="truncate">
                            {wl.className ??
                              shiftOptionsMap.get(wl.effortType)?.label ??
                              wl.effortType}
                          </span>
                          <span className="font-mono tabular-nums">{wl.score.toFixed(1)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className={cn(TD, 'text-right font-mono font-semibold text-primary')}>
                  {totalScore > 0 ? formatScore(totalScore) : '—'}
                </td>
                <td className={cn(TD, 'border-r-0 text-center')}>
                  {hasDiscrepancy ? (
                    <span className="inline-flex items-center justify-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-500">
                      <AlertCircle className="size-3" />
                      Lệch
                    </span>
                  ) : isMatched ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500">
                      Khớp
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const STATUS_LABEL: Record<number, string> = {
  [WorkLogStatusV2.Waitting]: 'Chờ duyệt',
  [WorkLogStatusV2.Accepted]: 'Đã duyệt',
  [WorkLogStatusV2.Rejected]: 'Từ chối',
}

function LedgerTabSkeleton() {
  return (
    <div className="flex-1 space-y-2 overflow-hidden p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
