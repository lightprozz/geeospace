// ---------------------------------------------------------------------------
// lib/schedule/query-keys.ts
// Centralized TanStack Query key factories for Schedule module
// Prevents cache key drift across hooks
// Same pattern as lib/classes/query-keys.ts
// ---------------------------------------------------------------------------

export const scheduleKeys = {
  all: ['schedules'] as const,

  // Schedule list (active vs expired)
  lists: () => [...scheduleKeys.all, 'list'] as const,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: (containsEndClass: 0 | 1, params?: any) =>
    [...scheduleKeys.lists(), containsEndClass, params] as const,
  listAll: (containsEndClass: 0 | 1) =>
    [...scheduleKeys.lists(), 'all', containsEndClass] as const,

  // Single schedule detail (for edit)
  details: () => [...scheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...scheduleKeys.details(), id] as const,

  // Calendar data (for timetable)
  calendar: () => [...scheduleKeys.all, 'calendar'] as const,
  calendarAll: () => [...scheduleKeys.calendar(), 'all'] as const,
  calendarUser: (userId: string) =>
    [...scheduleKeys.calendar(), 'user', userId] as const,
  calendarClass: (classId: string) =>
    [...scheduleKeys.calendar(), 'class', classId] as const,
}
