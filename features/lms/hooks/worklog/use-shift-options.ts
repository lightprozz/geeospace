'use client'
// ---------------------------------------------------------------------------
// hooks/worklog/use-shift-options.ts
// TanStack Query hook for GET /worklog/shift-options
// CLIENT-ONLY — 'use client' required for hooks
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { fetchShiftOptions } from '@/features/lms/lib/worklog/api'
import { worklogKeys } from '@/features/lms/lib/worklog/query-keys'

/**
 * Fetch shift-type options, optionally scoped to a class's level.
 * Cached indefinitely — shift types rarely change during a session.
 */
export function useShiftOptions(classId?: string) {
  return useQuery({
    queryKey: worklogKeys.shiftOptions(classId),
    queryFn: () => fetchShiftOptions(classId),
    staleTime: Infinity,
  })
}
