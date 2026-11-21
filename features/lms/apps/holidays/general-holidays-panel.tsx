'use client'
// ---------------------------------------------------------------------------
// holidays/_components/general-holidays-panel.tsx
// Left panel: system-wide general holidays with year tabs and card grid
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react'
import { Calendar, CalendarDays, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { groupByYear, getAvailableYears } from '@/features/lms/lib/holidays/utils'
import { HolidayDateCard } from './holiday-date-card'

interface GeneralHolidaysPanelProps {
  /** All general holiday date strings ("yyyy-MM-dd") */
  holidays: string[]
  /** Called when user removes a date */
  onRemoveDate: (date: string) => void
  /** Called when user wants to add dates */
  onAddClick: () => void
}

export function GeneralHolidaysPanel({
  holidays,
  onRemoveDate,
  onAddClick,
}: GeneralHolidaysPanelProps) {
  const { can } = usePermission()
  const canEditSchedule = can(PERMISSIONS.CLASS_SCHEDULE)

  // Group dates by year
  const yearMap = useMemo(() => groupByYear(holidays), [holidays])
  const years = useMemo(() => getAvailableYears(holidays), [holidays])

  // Default to the most recent year
  const [selectedYear, setSelectedYear] = useState<string>(() => years[0] ?? '')

  // Update selected year when years change (e.g., after removing all dates from a year)
  const currentYearDates = useMemo(() => {
    const effectiveYear = years.includes(selectedYear) ? selectedYear : years[0] ?? ''
    return yearMap[effectiveYear] ?? []
  }, [yearMap, years, selectedYear])

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          General Holidays
        </h3>
        {canEditSchedule && (
          <Button variant="outline" size="sm" onClick={onAddClick}>
            <Plus className="mr-1 h-3 w-3" />
            Add Holiday
          </Button>
        )}
      </div>

      {/* Year tabs */}
      {years.length > 0 && (
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex w-max rounded-lg bg-muted p-1">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={`rounded-md px-5 py-1.5 text-sm font-medium transition-all ${
                  selectedYear === year || (!years.includes(selectedYear) && year === years[0])
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Holiday cards */}
      <div className="flex-1 overflow-auto p-2">
        {currentYearDates.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Calendar className="mb-2 h-10 w-10 opacity-20" />
            <p className="text-sm">
              No holidays configured{selectedYear ? ` for ${selectedYear}` : ''}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-2 md:grid-cols-2 lg:grid-cols-3">
            {currentYearDates.map((date) => (
              <HolidayDateCard
                key={date}
                date={date}
                variant="default"
                onRemove={canEditSchedule ? () => onRemoveDate(date) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
