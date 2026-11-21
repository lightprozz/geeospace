'use client'
// ---------------------------------------------------------------------------
// hooks/curriculum/use-lesson-plans.ts
// TanStack Query hooks for LessonPlan + LessonContent
// CLIENT-ONLY
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { lessonPlanKeys } from '@/features/lms/lib/curriculum/query-keys'
import {
  fetchLessonsByLevel,
  fetchLessonById,
  checkLessonExists,
  createLesson,
  updateLesson,
  deleteLesson,
  bulkDeleteLessons,
  uploadWorksheet,
  deleteWorksheet,
} from '@/features/lms/lib/curriculum/api'
import type { CreateLessonRequest, UpdateLessonRequest } from '@/features/lms/types/curriculum'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Lesson plans by level — enabled only when levelId is provided */
export function useLessonsByLevel(levelId: string) {
  return useQuery({
    queryKey: lessonPlanKeys.byLevel(levelId),
    queryFn: () => fetchLessonsByLevel(levelId),
    enabled: !!levelId,
  })
}

/** Single lesson plan with level info */
export function useLessonById(id: string) {
  return useQuery({
    queryKey: lessonPlanKeys.detail(id),
    queryFn: () => fetchLessonById(id),
    enabled: !!id,
  })
}

/**
 * Check if lesson number exists — call refetch() manually on blur
 * enabled: false by default (not for background polling)
 */
export function useCheckLessonExists(
  levelId: string,
  lesson: string,
  id = '',
) {
  return useQuery({
    queryKey: ['lesson-exists', levelId, lesson, id],
    queryFn: () => checkLessonExists(levelId, lesson, id),
    enabled: false,  // Triggered manually on blur
    retry: false,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateLessonPlan(levelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLessonRequest) => createLesson(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lessonPlanKeys.byLevel(levelId) })
      toast.success('Lesson plan created')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create lesson plan')
    },
  })
}

export function useUpdateLessonPlan(levelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLessonRequest }) =>
      updateLesson(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lessonPlanKeys.byLevel(levelId) })
      toast.success('Lesson plan updated')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update lesson plan')
    },
  })
}

export function useDeleteLessonPlan(levelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLesson(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lessonPlanKeys.byLevel(levelId) })
      toast.success('Lesson plan archived')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete lesson plan')
    },
  })
}

export function useBulkDeleteLessonPlans(levelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteLessons(ids),
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: lessonPlanKeys.byLevel(levelId) })
      toast.success(`${ids.length} lesson plans archived`)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Bulk delete failed')
    },
  })
}

export function useUploadWorksheet(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadWorksheet(lessonId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lessonPlanKeys.detail(lessonId) })
      toast.success('Worksheet uploaded')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Upload failed')
    },
  })
}

export function useDeleteWorksheet(lessonId: string, levelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteWorksheet(lessonId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lessonPlanKeys.detail(lessonId) })
      qc.invalidateQueries({ queryKey: lessonPlanKeys.byLevel(levelId) })
      toast.success('Worksheet removed')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to remove worksheet')
    },
  })
}
