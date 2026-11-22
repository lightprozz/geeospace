'use client'
// ---------------------------------------------------------------------------
// _components/schedule-empty-state.tsx
// Empty state for schedule list — shown when search yields no results
// Pure presentational — no hooks
// ---------------------------------------------------------------------------

import { Calendar } from 'lucide-react'

interface ScheduleEmptyStateProps {
  message?: string
}

export function ScheduleEmptyState({
  message = 'No schedules found.',
}: ScheduleEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Calendar className="h-10 w-10 stroke-[1.5]" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
