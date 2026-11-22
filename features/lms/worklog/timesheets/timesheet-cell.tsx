'use client'
// ---------------------------------------------------------------------------
// _components/timesheet-cell.tsx
// One read-only grid cell: summed score display + status ring. Click opens a
// popover listing the underlying entries (id, effortType, score, status),
// read-only, with approve/reject per entry. NO inline input — the WorkLog
// data model has no free-cell create path (entries originate from
// lesson-anchored flows), per phase-6 scope.
// ---------------------------------------------------------------------------

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { cellStatus, formatScore, type GridCell } from '@/features/lms/lib/worklog/grid-model'
import { WorkLogStatusV2, type WorkLogItemV2 } from '@/features/lms/types/worklog'
import { CellEntriesPopover } from './cell-entries-popover'

const STATUS_RING: Record<number, string> = {
  [WorkLogStatusV2.Waitting]: 'ring-1 ring-inset ring-amber-400/70',
  [WorkLogStatusV2.Accepted]: 'ring-1 ring-inset ring-emerald-400/70',
  [WorkLogStatusV2.Rejected]: 'ring-1 ring-inset ring-rose-400/70',
}

interface TimesheetCellProps {
  cell: GridCell | undefined
  dateLabel: string
  isWeekend: boolean
  isPrevMonth: boolean
  effortTypeLabel: (value: string) => string
  currentUserId: string | null
  canApprove: boolean
  onStatusChanged: (updated: WorkLogItemV2) => void
  onConflict: () => void
}

export function TimesheetCell({
  cell,
  dateLabel,
  isWeekend,
  isPrevMonth,
  effortTypeLabel,
  currentUserId,
  canApprove,
  onStatusChanged,
  onConflict,
}: TimesheetCellProps) {
  const baseBg = isWeekend
    ? 'bg-amber-50/30 dark:bg-amber-950/10'
    : isPrevMonth
      ? 'bg-muted/20'
      : 'bg-transparent'

  if (!cell || cell.entries.length === 0) {
    return (
      <td
        className={cn(
          'border-r border-b border-border p-1 text-center text-xs font-mono text-muted-foreground/30',
          baseBg,
        )}
      >
        ·
      </td>
    )
  }

  const status = cellStatus(cell)

  return (
    <td className={cn('border-r border-b border-border p-0 text-center', baseBg)}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full h-full min-h-[32px] px-1 py-1 text-xs font-mono tabular-nums font-semibold rounded-sm transition-colors hover:bg-primary/10 cursor-pointer',
              STATUS_RING[status],
            )}
            aria-label={`${dateLabel}: ${cell.entries.length} entr${cell.entries.length === 1 ? 'y' : 'ies'}, total ${formatScore(cell.score)}`}
          >
            {formatScore(cell.score)}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="center">
          <CellEntriesPopover
            dateLabel={dateLabel}
            entries={cell.entries}
            effortTypeLabel={effortTypeLabel}
            currentUserId={currentUserId}
            canApprove={canApprove}
            onStatusChanged={onStatusChanged}
            onConflict={onConflict}
          />
        </PopoverContent>
      </Popover>
    </td>
  )
}
