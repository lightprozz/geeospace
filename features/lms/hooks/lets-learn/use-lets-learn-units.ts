'use client'
// ---------------------------------------------------------------------------
// hooks/lets-learn/use-lets-learn-units.ts
// TanStack Query hook for fetching lesson units
// CLIENT-ONLY — 'use client' required for hooks
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { letsLearnKeys } from '@/features/lms/lib/lets-learn/keys'
import { fetchMyLesson, fetchLessonPlanContent } from '@/features/lms/lib/lets-learn/api'
import type { LetsLearnSource } from '@/features/lms/types/lets-learn'

/**
 * Fetch lesson units for the Let's Learn view.
 * Automatically selects the correct API based on the source:
 * - 'classLesson' → GetMyLesson/{id}
 * - 'lessonPlan'  → GetLessonPlanContent/{id}
 *
 * @param id - classLessonId or lessonPlanId depending on source
 * @param source - determines which API endpoint to call
 */
export function useLetsLearnUnits(id: string, source: LetsLearnSource) {
  return useQuery({
    queryKey: letsLearnKeys.units(id, source),
    queryFn: () =>
      source === 'lessonPlan'
        ? fetchLessonPlanContent(id)
        : fetchMyLesson(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // data won't change during a lesson session
  })
}
