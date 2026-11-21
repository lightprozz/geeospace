'use client'
// ---------------------------------------------------------------------------
// hooks/worklog/use-worklogs.ts
// TanStack Query read hooks for the WRK v2 worklog module (list/detail/summary)
// CLIENT-ONLY — 'use client' required for hooks
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import {
  fetchWorkLog,
  queryWorkLogs,
  queryWorkLogSummary,
  type WorkLogQueryFilters,
  type WorkLogSummaryFilters,
} from '@/features/lms/lib/worklog/api'
import { worklogKeys } from '@/features/lms/lib/worklog/query-keys'

/**
 * Fetch a page of worklogs matching `filters` (POST /worklog/query).
 * `filters.ownerId` omitted ⇒ self only; a concrete owner requires worklog.approve.
 */
export function useWorkLogsQuery(
  filters: WorkLogQueryFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: worklogKeys.list(filters),
    queryFn: () => queryWorkLogs(filters),
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch ALL owners' worklogs anchored to a single lesson (lesson-scoped
 * mode, Amendment 2 — POST /worklog/query with `teacherLessonLogId` set).
 * Visibility is enforced server-side: caller must hold `worklog.approve` OR
 * pass the class-membership check for the anchor's class; a disallowed
 * caller 403s before reaching a rendered pane in normal usage (the caller
 * viewing a class's worklog pane is itself a class-assigned teacher or an
 * approver).
 */
export function useWorkLogsByLessonLog(
  teacherLessonLogId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: worklogKeys.lessonLog(teacherLessonLogId ?? ''),
    queryFn: () => queryWorkLogs({ teacherLessonLogId: teacherLessonLogId! }),
    enabled: (options?.enabled ?? true) && !!teacherLessonLogId,
  })
}

/** Fetch a single worklog by id. */
export function useWorkLog(id: string | null) {
  return useQuery({
    queryKey: worklogKeys.detail(id ?? ''),
    queryFn: () => fetchWorkLog(id!),
    enabled: !!id,
  })
}

/** Fetch the aggregated timebook summary for a date range (POST /worklog/summary/query). */
export function useWorkLogSummary(
  filters: WorkLogSummaryFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: worklogKeys.summary(`${filters.from}_${filters.to}`, filters.ownerId),
    queryFn: () => queryWorkLogSummary(filters),
    enabled: options?.enabled ?? true,
  })
}
