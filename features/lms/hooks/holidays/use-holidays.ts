'use client'
// ---------------------------------------------------------------------------
// hooks/holidays/use-holidays.ts
// TanStack Query hooks for Holidays Management
// CLIENT-ONLY — 'use client' required for hooks
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { holidayKeys } from '@/features/lms/lib/holidays/query-keys'
import { useAllClasses } from '@/features/lms/hooks/classes/use-classes'
import { fetchHolidays, saveHolidays, resetClassLessons } from '@/features/lms/lib/holidays/api'
import { parseHolidayRows } from '@/features/lms/lib/holidays/utils'

import type { HolidayData } from '@/features/lms/types/holiday'
import type { SaveHolidayInput } from '@/features/lms/types/holiday'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch all holidays for a user (campus-scoped).
 * Transforms raw HolidayRow[] into typed HolidayData via `select`.
 * Disabled when userId is empty.
 */
export function useHolidays(userId: string) {
  return useQuery({
    queryKey: holidayKeys.list(userId),
    queryFn: () => fetchHolidays(userId),
    select: (rows): HolidayData => parseHolidayRows(rows),
    enabled: !!userId,
  })
}

/**
 * Fetch active class list for the class exceptions dropdown.
 * Share the unpaginated active class query used by the Classes panel.
 */
export function useClassListForHolidays(userId: string) {
  return useAllClasses(0, !!userId)
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Save holidays mutation: POST /SaveHolidays → POST /ResetClassLessons.
 * On success: invalidates holiday queries, shows toast.
 * On failure: shows error toast, does NOT call ResetClassLessons.
 */
export function useSaveHolidays(userId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SaveHolidayInput[]) => {
      // Step 1: Save holidays
      await saveHolidays(payload)
      // Step 2: Rebuild class lesson schedules (chained after save)
      await resetClassLessons()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: holidayKeys.all })
      toast.success('Holidays saved successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to save holidays')
    },
  })
}
