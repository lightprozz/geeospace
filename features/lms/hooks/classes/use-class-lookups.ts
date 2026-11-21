'use client'
// ---------------------------------------------------------------------------
// hooks/classes/use-class-lookups.ts
// TanStack Query hooks for class form dropdown data
// CLIENT-ONLY — 'use client' required for hooks
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { campusKeys } from '@/features/lms/lib/classes/query-keys'
import { fetchCampusList } from '@/features/lms/lib/classes/api'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch campus list for dropdown in class create/edit form.
 * Disabled when userId is empty.
 *
 * NOTE: For Level dropdown, re-use existing `useStudyLevels()` from
 * `hooks/curriculum/use-study-levels.ts` — NO duplication.
 */
export function useCampusList(userId: string) {
  return useQuery({
    queryKey: campusKeys.byUser(userId),
    queryFn: () => fetchCampusList(userId),
    enabled: !!userId,
  })
}
