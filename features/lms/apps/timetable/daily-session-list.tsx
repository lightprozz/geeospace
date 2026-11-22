'use client'
// ---------------------------------------------------------------------------
// timetable/_components/daily-session-list.tsx
// Left pane: session cards for the selected day
// Matches TimetableView.tsx mockup layout
// ---------------------------------------------------------------------------

import { Calendar, Clock, MapPin, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CalendarSession } from '@/features/lms/types/schedule'
import { getShiftColor } from '@/features/lms/types/schedule'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DailySessionListProps {
  selectedDate: Date
  sessions: CalendarSession[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DailySessionList({ selectedDate, sessions }: DailySessionListProps) {
  const dayName = WEEKDAYS[selectedDate.getDay()]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">{dayName}</h3>
            <p className="text-xs text-muted-foreground">
              {formatFullDate(selectedDate)}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </Badge>
        </div>
      </div>

      {/* Session cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <>
          {sessions.length > 0 ? (
            sessions.map((session) => {
              const colors = getShiftColor(session.shiftCode)
              return (
                <div
                  key={session.id}
                  className="rounded-lg border p-3 space-y-2 hover:shadow-sm transition-shadow"
                >
                  {/* Shift badge + time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          'text-[10px] px-2 py-0.5 font-mono font-semibold border-0',
                          colors.bg,
                          colors.text,
                        )}
                      >
                        {session.shiftCode}
                      </Badge>
                      {session.isEvent && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 text-rose-600 border-rose-300 dark:text-rose-400 dark:border-rose-800"
                        >
                          Event
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {session.startTime} — {session.endTime}
                      </span>
                    </div>
                  </div>

                  {/* Class name */}
                  <p className="font-medium text-sm line-clamp-2">
                    {session.className}
                  </p>

                  {/* Room + Teacher */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {session.room && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.room}
                      </span>
                    )}
                    {session.teacher && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {session.teacher}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div
              key="empty-state"
              className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground"
            >
              <Calendar className="h-8 w-8 stroke-[1.5]" />
              <p className="text-sm">No classes scheduled.</p>
            </div>
          )}
        </>
      </div>
    </div>
  )
}
