'use client'
// ---------------------------------------------------------------------------
// hooks/curriculum/use-lesson-content.ts
// TanStack Query hooks for LessonContent (HTML fields + media)
// CLIENT-ONLY
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { lessonPlanKeys } from '@/features/lms/lib/curriculum/query-keys'
import {
  fetchLessonContent,
  saveLessonContent,
  fetchDeletedLessons,
  fetchRelatedLessons,
} from '@/features/lms/lib/curriculum/api'
import type { SaveLessonContentRequest } from '@/features/lms/types/curriculum'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Lesson content by lessonId
 * Returns null when API responds 204 (no content exists yet)
 */
export function useLessonContent(lessonId: string) {
  return useQuery({
    queryKey: lessonPlanKeys.content(lessonId),
    queryFn: () => fetchLessonContent(lessonId),
    enabled: !!lessonId,
  })
}

/** Old/deleted lesson plans for "copy from" dropdown */
export function useDeletedLessons(lessonId: string) {
  return useQuery({
    queryKey: lessonPlanKeys.deleted(lessonId),
    queryFn: () => fetchDeletedLessons(lessonId),
    enabled: !!lessonId,
  })
}

/** Related lessons for empty unit plan state "copy units from" */
export function useRelatedLessons(lessonId: string) {
  return useQuery({
    queryKey: lessonPlanKeys.related(lessonId),
    queryFn: () => fetchRelatedLessons(lessonId),
    enabled: !!lessonId,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Save lesson content (create or update)
 * If data.id is null → POST creates new record
 * If data.id exists → POST updates existing record
 */
export function useSaveLessonContent(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SaveLessonContentRequest) => saveLessonContent(lessonId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lessonPlanKeys.content(lessonId) })
      toast.success('Lesson content saved')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to save lesson content')
    },
  })
}
