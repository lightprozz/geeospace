'use client'
// ---------------------------------------------------------------------------
// timetable/_components/month-calendar-grid.tsx
// Custom 7-column month grid with shift-colored session indicators
// Matches TimetableView.tsx mockup — no react-big-calendar dependency
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CalendarSession } from '@/features/lms/types/schedule'
import { getShiftColor } from '@/features/lms/types/schedule'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MonthCalendarGridProps {
  currentDate: Date
  selectedDate: Date
  sessions: CalendarSession[]
  onDateSelect: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  sessions: CalendarSession[]
}

function getMonthDays(year: number, month: number, sessions: CalendarSession[]): CalendarDay[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Monday start: (getDay() + 6) % 7
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalDays = lastDay.getDate()

  const days: CalendarDay[] = []

  // Previous month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push({ date, isCurrentMonth: false, sessions: [] })
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d)
    const daySessions = sessions.filter((s) => isSameDay(s.date, date))
    days.push({ date, isCurrentMonth: true, sessions: daySessions })
  }

  // Next month padding (fill to complete rows)
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false, sessions: [] })
    }
  }

  return days
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonthCalendarGrid({
  currentDate,
  selectedDate,
  sessions,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
}: MonthCalendarGridProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const days = useMemo(
    () => getMonthDays(year, month, sessions),
    [year, month, sessions],
  )

  return (
    <div className="flex min-h-0 flex-col h-full overflow-y-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h3 className="font-semibold text-sm">{monthName}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Previous month"
            onClick={onPrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Next month"
            onClick={onNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b shrink-0">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day, idx) => {
          const selected = isSameDay(day.date, selectedDate)
          const today = isToday(day.date)
          const maxVisible = 2
          const overflow = day.sessions.length - maxVisible

          return (
            <button
              key={idx}
              onClick={() => onDateSelect(day.date)}
              className={cn(
                'relative min-w-0 flex flex-col items-start p-1.5 border-b border-r text-left transition-colors min-h-[60px] @5xl/lms-panel:min-h-[80px]',
                !day.isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                day.isCurrentMonth && 'hover:bg-accent/50',
                selected && 'ring-1 ring-primary ring-inset bg-primary/5',
              )}
            >
              {/* Date number */}
              <span
                className={cn(
                  'text-xs font-medium leading-none mb-1',
                  today &&
                    'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]',
                )}
              >
                {day.date.getDate()}
              </span>

              {/* Session indicators */}
              <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                {day.sessions.slice(0, maxVisible).map((session) => {
                  const colors = getShiftColor(session.shiftCode)
                  return (
                    <div
                      key={session.id}
                      className={cn(
                        'rounded px-1 py-0.5 text-[9px] leading-tight truncate',
                        colors.bg,
                        colors.text,
                      )}
                    >
                      <span className="font-mono font-semibold mr-1">
                        {session.shiftCode}
                      </span>
                      <span className="hidden @7xl/lms-panel:inline">
                        {session.className}
                      </span>
                    </div>
                  )
                })}

                {overflow > 0 && (
                  <span className="text-[9px] text-muted-foreground pl-1">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
