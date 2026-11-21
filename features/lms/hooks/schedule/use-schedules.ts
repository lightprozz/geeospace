'use client'
// ---------------------------------------------------------------------------
// hooks/schedule/use-schedules.ts
// TanStack Query hooks for Schedule CRUD + class/room assignment
// CLIENT-ONLY — 'use client' required for hooks
// Pattern: identical to hooks/classes/use-classes.ts
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { scheduleKeys } from '@/features/lms/lib/schedule/query-keys'
import {
  fetchAllSchedules,
  fetchScheduleList,
  fetchScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  assignClassToSchedule,
  assignRoomToSchedule,
  buildEndDate,
} from '@/features/lms/lib/schedule/api'
import type { ScheduleFormValues } from '@/features/lms/types/schedule'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch ALL schedules for client-side table processing.
 * Returns flat array — search/sort/filter/pagination handled by useClientTable.
 * Campus scoped via JWT claims (server-side).
 */
export function useAllSchedules(containsEndClass: 0 | 1) {
  return useQuery({
    queryKey: scheduleKeys.listAll(containsEndClass),
    queryFn: () => fetchAllSchedules(containsEndClass),
  })
}

/**
 * @deprecated Use useAllSchedules + useClientTable for list views.
 * Kept for backward compat.
 */
export function useScheduleList(
  userId: string,
  containsEndClass: 0 | 1,
  params?: {
    page?: number
    pageSize?: number
    search?: string
    sort?: { field: string; desc: boolean }[]
  }
) {
  return useQuery({
    queryKey: scheduleKeys.list(containsEndClass, params),
    queryFn: () => fetchScheduleList(userId, containsEndClass, params),
    enabled: !!userId,
  })
}

/**
 * Fetch single schedule entity by ID.
 * Used for edit form pre-fill (provides day booleans, times, dates).
 * Only enabled when id is non-empty.
 */
export function useScheduleDetail(id: string | undefined) {
  return useQuery({
    queryKey: scheduleKeys.detail(id ?? ''),
    queryFn: () => fetchScheduleById(id!),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ScheduleFormValues) => createSchedule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.lists() })
      toast.success('Schedule created')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create schedule')
    },
  })
}

export function useUpdateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ScheduleFormValues }) =>
      updateSchedule(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.all })
      toast.success('Schedule updated')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update schedule')
    },
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.lists() })
      toast.success('Schedule deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete schedule')
    },
  })
}

/**
 * Assign class to schedule.
 * Chain: assignClassToSchedule → if success → buildClassLessons.
 * Handles 409 conflict (class already assigned elsewhere).
 */
export function useAssignClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      scheduleId,
      classId,
    }: {
      scheduleId: string
      classId: string
    }) => {
      // V2: assignClassToSchedule now auto-builds lesson dates server-side
      await assignClassToSchedule(scheduleId, classId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.lists() })
      toast.success('Class assigned successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

/**
 * Assign room to schedule.
 */
export function useAssignRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      scheduleId,
      roomId,
    }: {
      scheduleId: string
      roomId: string
    }) => assignRoomToSchedule(scheduleId, roomId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.lists() })
      toast.success('Room assigned successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to assign room')
    },
  })
}

/**
 * Calculate end date based on schedule config + class lesson count.
 */
export function useBuildEndDate() {
  return useMutation({
    mutationFn: ({
      classId,
      scheduleData,
    }: {
      classId: string
      scheduleData: ScheduleFormValues
    }) => buildEndDate(classId, scheduleData),
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to calculate end date')
    },
  })
}
