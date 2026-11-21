'use client'
// ---------------------------------------------------------------------------
// _components/worklog-summary-bar.tsx
// Personal shift-weight summary strip — bound to POST /worklog/summary/query.
// `total` is the BE-computed value (mt+mf+ct+half+alone+catchUp+other+sup,
// INCLUDES otherShift) — displayed as-is, never recomputed client-side (the
// contract explicitly warns the legacy TeacherTimebookSummary.Total omits
// otherShift; this module must not reconstruct that computation).
// ---------------------------------------------------------------------------

import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { TimebookSummary } from '@/features/lms/types/worklog'

interface WorklogSummaryBarProps {
  summary: TimebookSummary | undefined
  isLoading: boolean
  isError: boolean
}

const SUMMARY_FIELDS: { key: keyof TimebookSummary; label: string }[] = [
  { key: 'mtShift', label: 'MT' },
  { key: 'mfShift', label: 'MF' },
  { key: 'ctShift', label: 'CT' },
  { key: 'halfShift', label: 'Half' },
  { key: 'aloneShift', label: 'Alone' },
  { key: 'catchUpShift', label: 'Catch-up' },
  { key: 'otherShift', label: 'Other' },
  { key: 'supShift', label: 'Sup' },
  { key: 'daysOff', label: 'Days Off' },
]

function StatCell({
  label,
  value,
  emphasize,
}: {
  label: string
  value: number
  emphasize?: boolean
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 px-3 py-1">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-sm tabular-nums',
          emphasize ? 'font-bold text-primary' : 'text-foreground',
        )}
      >
        {value.toFixed(1)}
      </span>
    </div>
  )
}

export function WorklogSummaryBar({ summary, isLoading, isError }: WorklogSummaryBarProps) {
  if (isError) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        <AlertCircle className="size-3.5" />
        Couldn&apos;t load your summary for this period.
      </div>
    )
  }

  if (isLoading || !summary) {
    return (
      <div className="flex items-center gap-3 overflow-x-auto rounded-md border px-2 py-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-14 shrink-0 rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 divide-x overflow-x-auto rounded-md border">
      {SUMMARY_FIELDS.map(({ key, label }) => (
        <StatCell key={key} label={label} value={summary[key]} />
      ))}
      <StatCell label="Total" value={summary.total} emphasize />
    </div>
  )
}
