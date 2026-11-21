// ---------------------------------------------------------------------------
// lib/worklog/query-keys.ts
// Centralized TanStack Query key factories for the WRK v2 Worklog module
// Prevents cache key drift across hooks — mirrors lib/schedule/query-keys.ts
// ---------------------------------------------------------------------------

import type { WorkLogQueryFilters, WorkLogSummaryFilters } from "./api"

export const worklogKeys = {
  all: ["worklog"] as const,

  // Worklog list queries (POST /worklog/query)
  lists: () => [...worklogKeys.all, "list"] as const,
  list: (filters: WorkLogQueryFilters) => [...worklogKeys.lists(), filters] as const,

  // Lesson-scoped worklog query (POST /worklog/query with teacherLessonLogId
  // set, Amendment 2) — ALL owners' rows for one lesson anchor. Nested under
  // `lists()` so the mutation hooks' existing `invalidateQueries({ queryKey:
  // worklogKeys.lists() })` also covers this query with no extra wiring.
  lessonLog: (teacherLessonLogId: string) =>
    [...worklogKeys.lists(), "lesson-log", teacherLessonLogId] as const,

  // Single worklog detail (GET /worklog/{id})
  details: () => [...worklogKeys.all, "detail"] as const,
  detail: (id: string) => [...worklogKeys.details(), id] as const,

  // Timebook summary (POST /worklog/summary/query)
  summaries: () => [...worklogKeys.all, "summary"] as const,
  summary: (period: string, ownerId?: string) =>
    [...worklogKeys.summaries(), period, ownerId ?? "self"] as const,

  // Attendance (GET /attendance/me)
  attendance: (from: string, to: string) =>
    [...worklogKeys.all, "attendance", from, to] as const,

  // Shift options (GET /worklog/shift-options)
  shiftOptions: (classId?: string) =>
    [...worklogKeys.all, "shift-options", classId ?? "all"] as const,
}

// Re-exported for callers that build a summary key from raw filters.
export type { WorkLogQueryFilters, WorkLogSummaryFilters }
