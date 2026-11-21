// ---------------------------------------------------------------------------
// lib/roles/api.ts — V2 Roles Domain API Client
// Routes: api/v2/admin/Roles/*
// Manages role listing, detail with permissions, and permission assignment
// ---------------------------------------------------------------------------

import { api, type PagedResult } from '@/features/lms/lib/transport'
import type { RoleListItem, RoleDetailResponse, AssignPermissionRequest } from '@/features/lms/types/role'

// ── V2 Route Prefix ───────────────────────────────────────────────

const ROLES_API = '/api/v2/admin/Roles'

// =========================================================================
// Role List — V2 (Paged)
// =========================================================================

/** GET /api/v2/admin/Roles?page=1&pageSize=100 */
export async function fetchRoleList(): Promise<PagedResult<RoleListItem>> {
  return api.get<PagedResult<RoleListItem>>(`${ROLES_API}?page=1&pageSize=100`)
}

// =========================================================================
// Role Detail — V2
// =========================================================================

/** GET /api/v2/admin/Roles/{id} — includes permissions array */
export async function fetchRoleDetail(id: string): Promise<RoleDetailResponse> {
  return api.get<RoleDetailResponse>(`${ROLES_API}/${id}`)
}

// =========================================================================
// Permission Mutations — V2
// =========================================================================

/** POST /api/v2/admin/Roles/{roleId}/permissions — assign a permission claim */
export async function assignPermission(
  roleId: string,
  request: AssignPermissionRequest,
): Promise<void> {
  await api.post(`${ROLES_API}/${roleId}/permissions`, request)
}

/** DELETE /api/v2/admin/Roles/{roleId}/permissions/{claimId} — remove a permission claim */
export async function removePermission(
  roleId: string,
  claimId: string,
): Promise<void> {
  await api.delete(`${ROLES_API}/${roleId}/permissions/${claimId}`)
}
