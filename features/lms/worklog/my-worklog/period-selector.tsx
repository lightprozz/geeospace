'use client'
// ---------------------------------------------------------------------------
// _components/period-selector.tsx
// Prev/next navigation across payroll periods (26→25 cycle). Self-contained
// period math built only on lib/worklog/payroll-cycle's exported helpers —
// does NOT import from the phase-6 Timesheets grid.
// ---------------------------------------------------------------------------

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  periodKeyFor,
  periodRange,
  type DateKey,
  type PeriodKey,
} from '@/features/lms/lib/worklog/payroll-cycle'

interface PeriodSelectorProps {
  periodKey: PeriodKey
  onChange: (periodKey: PeriodKey) => void
}

const RANGE_FORMAT = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * Adds `delta` calendar days to a "YYYY-MM-DD" key using UTC arithmetic —
 * same TZ-independent calendar-math approach as payroll-cycle.ts (pure
 * calendar-day string in, pure calendar-day string out; no local-timezone
 * conversion).
 */
function addDaysToDateKey(dateKey: DateKey, delta: number): DateKey {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + delta))
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Shifts to the adjacent period without reimplementing month-rollover math:
 * the day right after the current period's `to` (or right before its
 * `from`) always belongs to the adjacent period, so periodKeyFor resolves
 * it directly.
 */
function shiftPeriod(periodKey: PeriodKey, delta: 1 | -1): PeriodKey {
  const { from, to } = periodRange(periodKey)
  const anchor = delta === 1 ? addDaysToDateKey(to, 1) : addDaysToDateKey(from, -1)
  return periodKeyFor(anchor)
}

function formatRange(periodKey: PeriodKey): string {
  const { from, to } = periodRange(periodKey)
  const fromDate = new Date(`${from}T00:00:00Z`)
  const toDate = new Date(`${to}T00:00:00Z`)
  return `${RANGE_FORMAT.format(fromDate)} – ${RANGE_FORMAT.format(toDate)}`
}

export function PeriodSelector({ periodKey, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous period"
        onClick={() => onChange(shiftPeriod(periodKey, -1))}
      >
        <ChevronLeft className="size-3.5" />
      </Button>
      <span className="min-w-[170px] text-center text-xs font-medium tabular-nums text-foreground">
        {formatRange(periodKey)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next period"
        onClick={() => onChange(shiftPeriod(periodKey, 1))}
      >
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  )
}
