'use client'
// ---------------------------------------------------------------------------
// hooks/curriculum/use-exam-forms.ts
// TanStack Query hooks for ExamResultForm (Score Frame)
// Admin/Planner only — route guards enforced at page level
// CLIENT-ONLY
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { examFrameKeys } from '@/features/lms/lib/curriculum/query-keys'
import { fetchExamForms, saveExamForms } from '@/features/lms/lib/curriculum/api'
import type { ExamFormItemRequest } from '@/features/lms/types/curriculum'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Exam form templates for a study level — returns [] when none configured */
export function useExamForms(levelId: string) {
  return useQuery({
    queryKey: examFrameKeys.byLevel(levelId),
    queryFn: () => fetchExamForms(levelId),
    enabled: !!levelId,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Save ALL exam templates for a level at once (PUT — upsert pattern)
 * Do NOT call with empty array without user confirmation
 */
export function useSaveExamForms(levelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (forms: ExamFormItemRequest[]) => saveExamForms(levelId, { examForms: forms }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: examFrameKeys.byLevel(levelId) })
      toast.success('Exam templates saved')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to save exam templates')
    },
  })
}
