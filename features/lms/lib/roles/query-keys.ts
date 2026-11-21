// ---------------------------------------------------------------------------
// lib/roles/query-keys.ts
// Centralized TanStack Query key factories for Roles module
// Prevents cache key drift across hooks
// ---------------------------------------------------------------------------

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
}
