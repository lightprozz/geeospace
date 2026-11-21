'use client'
// ---------------------------------------------------------------------------
// hooks/schedule/use-calendar-data.ts
// TanStack Query hook for Schedule calendar/timetable data
// CLIENT-ONLY — 'use client' required for hooks
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { scheduleKeys } from '@/features/lms/lib/schedule/query-keys'
import {
  fetchAllCalendarData,
  fetchCalendarByUserId,
  fetchCalendarByClassId,
} from '@/features/lms/lib/schedule/api'

// ---------------------------------------------------------------------------
// Calendar data hook
// ---------------------------------------------------------------------------

export interface UseCalendarDataOptions {
  mode: 'all' | 'user' | 'class'
  id?: string // userId or classId
}

/**
 * Fetch calendar events for the timetable view.
 */
export function useCalendarData({ mode, id }: UseCalendarDataOptions) {
  return useQuery({
    queryKey:
      mode === 'class'
        ? scheduleKeys.calendarClass(id ?? '')
        : mode === 'user'
        ? scheduleKeys.calendarUser(id ?? '')
        : scheduleKeys.calendarAll(),
    queryFn: () => {
      if (mode === 'class') return fetchCalendarByClassId(id!)
      if (mode === 'user') return fetchCalendarByUserId(id!)
      return fetchAllCalendarData()
    },
    enabled: mode === 'all' || !!id,
    // Calendar data can be slightly stale — poll every 60s
    refetchInterval: 60_000,
  })
}
