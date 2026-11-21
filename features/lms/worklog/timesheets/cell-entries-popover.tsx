'use client'
// ---------------------------------------------------------------------------
// _components/cell-entries-popover.tsx
// Read-only expansion of a grid cell's underlying WorkLogItemV2 entries
// (id, effortType, score, status) + per-entry approve/reject action.
// No create/edit/delete UI — cells are read-only display (phase-6 scope).
// ---------------------------------------------------------------------------

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { WorkLogStatusV2 } from '@/features/lms/types/worklog'
import type { WorkLogItemV2, WorkLogStatusV2Value } from '@/features/lms/types/worklog'
import { TimesheetRowActions } from './timesheet-row-actions'

const STATUS_BADGE: Record<WorkLogStatusV2Value, { label: string; className: string }> = {
  [WorkLogStatusV2.Waitting]: {
    label: 'Waiting',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
  },
  [WorkLogStatusV2.Accepted]: {
    label: 'Accepted',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
  },
  [WorkLogStatusV2.Rejected]: {
    label: 'Rejected',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
  },
}

interface CellEntriesPopoverProps {
  dateLabel: string
  entries: WorkLogItemV2[]
  effortTypeLabel: (value: string) => string
  currentUserId: string | null
  canApprove: boolean
  onStatusChanged: (updated: WorkLogItemV2) => void
  onConflict: () => void
}

export function CellEntriesPopover({
  dateLabel,
  entries,
  effortTypeLabel,
  currentUserId,
  canApprove,
  onStatusChanged,
  onConflict,
}: CellEntriesPopoverProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{dateLabel}</span>
        <span className="text-[10px] text-muted-foreground">
          {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
        </span>
      </div>
      <Separator />
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {entries.map((entry, idx) => {
          const badge = STATUS_BADGE[entry.status as WorkLogStatusV2Value] ?? STATUS_BADGE[WorkLogStatusV2.Waitting]
          const isOwnEntry = !!currentUserId && entry.teacherId === currentUserId

          return (
            <div
              key={entry.id}
              className={cn(
                'flex flex-col gap-1.5 rounded-md border border-border p-2',
                idx > 0 && 'mt-0.5',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-muted-foreground truncate" title={entry.id}>
                  {entry.id.slice(0, 8)}
                </span>
                <Badge variant="outline" className={cn('text-[9px] font-semibold', badge.className)}>
                  {badge.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-foreground">{effortTypeLabel(entry.effortType)}</span>
                <span className="text-xs font-mono tabular-nums font-semibold text-primary">
                  {entry.score}
                </span>
              </div>
              {entry.comment && (
                <p className="text-[10px] text-muted-foreground line-clamp-2">{entry.comment}</p>
              )}
              {canApprove && (
                <TimesheetRowActions
                  entry={entry}
                  isOwnEntry={isOwnEntry}
                  onStatusChanged={onStatusChanged}
                  onConflict={onConflict}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
