'use client'
// ---------------------------------------------------------------------------
// _components/worklog-empty-state.tsx
// Empty state for the Calendar/Ledger tabs — shown when the browsed period
// has zero worklogs AND zero attendance rows.
// Pattern: same as schedule-empty-state.tsx / attendance-empty-state.tsx
// ---------------------------------------------------------------------------

import { CalendarX2 } from 'lucide-react'

interface WorklogEmptyStateProps {
  title?: string
  message?: string
}

export function WorklogEmptyState({
  title = 'No worklog data',
  message = 'No worklogs or attendance recorded for this period yet.',
}: WorklogEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
      <CalendarX2 className="h-10 w-10 stroke-[1.5]" />
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <p className="max-w-sm text-xs">{message}</p>
    </div>
  )
}
