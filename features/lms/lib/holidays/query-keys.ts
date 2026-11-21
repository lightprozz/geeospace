// ---------------------------------------------------------------------------
// lib/holidays/query-keys.ts
// Centralized TanStack Query key factories for Holidays module
// ---------------------------------------------------------------------------

export const holidayKeys = {
  all: ['holidays'] as const,
  list: (userId: string) => ['holidays', 'list', userId] as const,
}
