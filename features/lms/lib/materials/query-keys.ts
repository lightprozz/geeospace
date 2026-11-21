// ---------------------------------------------------------------------------
// lib/materials/query-keys.ts — V2 unified query keys
// ---------------------------------------------------------------------------

export const materialKeys = {
  all: ['materials'] as const,

  // ── List / Query ──────────────────────────────────────────────────────
  lists: () => [...materialKeys.all, 'list'] as const,

  /** Unified query key — includes status + any extra filters */
  query: (params?: Record<string, unknown>) =>
    [...materialKeys.lists(), 'query', params ?? {}] as const,

  // ── Detail ─────────────────────────────────────────────────────────────
  detail: (id: string) => [...materialKeys.all, 'detail', id] as const,

  // ── Category match ─────────────────────────────────────────────────────
  categoryMatch: (excludeId: string, unitId: string) =>
    [...materialKeys.all, 'category-match', excludeId, unitId] as const,
}
