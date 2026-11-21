// ---------------------------------------------------------------------------
// lib/users/query-keys.ts
// TanStack Query key factories for Users & Account module
// V2 — uses api/v2/users/* endpoints
// ---------------------------------------------------------------------------

export const userKeys = {
  all: ['users'] as const,

  // ── List variants ──────────────────────────────────────────────────────
  lists: () => [...userKeys.all, 'list'] as const,

  /** All users list — POST /api/v2/users/Users/query */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accountList: (params?: any) => [...userKeys.lists(), 'accounts', params] as const,

  // ── Detail ─────────────────────────────────────────────────────────────
  /** Single user detail — GET /api/v2/users/Users/{id} */
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,

  // ── Roles ──────────────────────────────────────────────────────────────
  /** All roles — GET /api/v2/lookups/Lookups/roles */
  roles: () => [...userKeys.all, 'roles'] as const,

  // ── Campuses ───────────────────────────────────────────────────────────
  /** All campuses — GET /api/v2/lookups/Lookups/campuses */
  campuses: () => [...userKeys.all, 'campuses'] as const,
}
