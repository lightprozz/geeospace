'use client'
// ---------------------------------------------------------------------------
// hooks/schedule/use-schedule-lookups.ts
// TanStack Query hooks for Schedule-related lookup data
// Reuses existing Classes module endpoints
// CLIENT-ONLY — 'use client' required for hooks
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { campusKeys } from '@/features/lms/lib/classes/query-keys'
import { fetchCampusList } from '@/features/lms/lib/classes/api'

// ---------------------------------------------------------------------------
// Campus list (reuse from classes module)
// ---------------------------------------------------------------------------

/**
 * Fetch campus list for filter dropdowns (timetable branch filter).
 * Reuses the same endpoint & cache key as the classes module.
 * @param userId - logged-in user's `sub` claim
 */
export function useCampusList(userId: string) {
  return useQuery({
    queryKey: campusKeys.byUser(userId),
    queryFn: () => fetchCampusList(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}
