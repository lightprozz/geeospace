// ---------------------------------------------------------------------------
// lib/branches/query-keys.ts
// Centralized TanStack Query key factories for Branches module
// ---------------------------------------------------------------------------

export const branchKeys = {
  all: ['branches'] as const,
  list: (userId: string) => ['branches', 'list', userId] as const,
  detail: (id: string) => ['branches', id] as const,
}

export const classroomKeys = {
  all: ['classrooms'] as const,
  byUser: (userId: string) => ['classrooms', 'list', userId] as const,
  detail: (id: string) => ['classrooms', id] as const,
}

export const roomTypeKeys = {
  all: ['room-types'] as const,
}
