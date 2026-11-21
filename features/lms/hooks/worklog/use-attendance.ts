'use client'
// ---------------------------------------------------------------------------
// hooks/worklog/use-attendance.ts
// TanStack Query hooks for check-in/check-out + attendance/me
// CLIENT-ONLY — 'use client' required for hooks
// ---------------------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { checkIn, checkOut, fetchMyAttendance } from '@/features/lms/lib/worklog/api'
import { worklogKeys } from '@/features/lms/lib/worklog/query-keys'

/** GET /attendance/me?from=&to= — own WorkingTime rows for the range. */
export function useAttendanceMe(from: string, to: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: worklogKeys.attendance(from, to),
    queryFn: () => fetchMyAttendance(from, to),
    enabled: options?.enabled ?? true,
  })
}

/**
 * POST /check-in. Unlike the worklog CRUD mutations, check-in/out have no
 * concurrency token to conflict on (WorkingTime has no UpdatedAt column per
 * the contract), so a generic toast here is safe and matches the rest of
 * the repo's mutation-hook convention.
 */
export function useCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: worklogKeys.all })
      toast.success('Checked in')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Check-in failed')
    },
  })
}

/** POST /check-out */
export function useCheckOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: checkOut,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: worklogKeys.all })
      toast.success('Checked out')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Check-out failed')
    },
  })
}
