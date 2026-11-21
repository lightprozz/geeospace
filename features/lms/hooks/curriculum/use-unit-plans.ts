'use client'
// ---------------------------------------------------------------------------
// hooks/curriculum/use-unit-plans.ts
// TanStack Query hooks for LessonPlanUnit (drag-drop + CRUD + copy)
// CLIENT-ONLY
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { unitPlanKeys } from '@/features/lms/lib/curriculum/query-keys'
import {
  fetchUnitsByLesson,
  createUnit,
  updateUnit,
  deleteUnit,
  reorderUnits,
  copyUnitsFromLesson,
} from '@/features/lms/lib/curriculum/api'
import type { CreateUnitRequest, UpdateUnitRequest } from '@/features/lms/types/curriculum'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Unit plans for a lesson — sorted by sortOrder from API */
export function useUnitsByLesson(lessonId: string) {
  return useQuery({
    queryKey: unitPlanKeys.byLesson(lessonId),
    queryFn: () => fetchUnitsByLesson(lessonId),
    enabled: !!lessonId,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateUnitPlan(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUnitRequest) => createUnit(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: unitPlanKeys.byLesson(lessonId) })
      toast.success('Unit added')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to add unit')
    },
  })
}

export function useUpdateUnitPlan(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUnitRequest }) =>
      updateUnit(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: unitPlanKeys.byLesson(lessonId) })
      toast.success('Unit updated')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update unit')
    },
  })
}

export function useDeleteUnitPlan(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUnit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: unitPlanKeys.byLesson(lessonId) })
      toast.success('Unit removed')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to remove unit')
    },
  })
}

/**
 * Reorder units after drag-drop
 * Uses optimistic update in the component (localUnits state)
 * This mutation fires the API call — on error: component rolls back via onError
 */
export function useReorderUnitPlans(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: Array<{ id: string; sortOrder: number }>) =>
      reorderUnits(lessonId, items),
    onError: (err: Error) => {
      // Rollback: invalidate to re-fetch from server
      qc.invalidateQueries({ queryKey: unitPlanKeys.byLesson(lessonId) })
      toast.error(err.message ?? 'Reorder failed — reverted')
    },
    // No onSuccess toast — drag-drop is a silent operation
  })
}

/**
 * Copy unit plans from another lesson into this lesson
 * Strips IDs before posting so backend creates new records
 */
export function useCopyUnitsFromLesson(targetLessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sourceLessonId: string) =>
      copyUnitsFromLesson(targetLessonId, sourceLessonId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: unitPlanKeys.byLesson(targetLessonId) })
      toast.success('Units copied successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to copy units')
    },
  })
}
