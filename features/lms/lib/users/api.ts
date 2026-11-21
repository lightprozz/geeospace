// ---------------------------------------------------------------------------
// lib/users/api.ts — V2 Users Domain API Client
// Routes: api/v2/users/Users/*, api/v2/lookups/Lookups/*
// Profile update (FormData with avatar) uses [FromForm] on v2 endpoint.
// ---------------------------------------------------------------------------

import { api, queryPaged, resolveApiUrl, type PagedResult, type TableQueryRequest } from '@/features/lms/lib/transport'
import type {
  AccountInfo,
  AccountListItem,
  Role,
  UserRoleUpdatePayload,
} from '@/features/lms/types/user'

// ── V2 Route Prefixes ─────────────────────────────────────────────

const USERS_API = '/api/v2/users/Users'
const LOOKUPS_API = '/api/v2/lookups/Lookups'

// =========================================================================
// User List — V2 (Query with server-side pagination)
// =========================================================================

/** POST /api/v2/users/Users/query */
export async function fetchAccountList(
  request?: Partial<TableQueryRequest>,
  signal?: AbortSignal,
): Promise<PagedResult<AccountListItem>> {
  // V2 API returns { id, fullName, englishName, email, roleName, branch, isActive, employeeCode }
  // We need to map to AccountListItem shape { id, fullName, email, roleId, branch, status }
  const result = await queryPaged<Record<string, unknown>>(USERS_API + '/query', {
    page: request?.page ?? 1,
    pageSize: request?.pageSize ?? 20,
    sort: request?.sort ?? [{ field: 'firstName', desc: false }],
    ...request,
  }, { signal })
  return {
    ...result,
    items: result.items.map((item) => ({
      id: item.id as string,
      fullName: (item.fullName as string) ?? null,
      email: (item.email as string) ?? null,
      roleId: (item.roleName as string) ?? null,
      branch: (item.branch as string) ?? null,
      status: item.isActive as boolean,
    })),
  } as PagedResult<AccountListItem>
}

export async function fetchAllAccountList(signal?: AbortSignal): Promise<AccountListItem[]> {
  const users: AccountListItem[] = []
  for (let page = 1; ; page++) {
    const result = await fetchAccountList({ page, pageSize: 500 }, signal)
    users.push(...result.items)
    if (!result.hasNext) return users
  }
}

// =========================================================================
// User Detail — V2
// =========================================================================

/** GET /api/v2/users/Users/{id} */
export async function fetchAccountInfo(id: string): Promise<AccountInfo> {
  const detail = await api.get<Record<string, unknown>>(`${USERS_API}/${id}`)
  // Map V2 UserDetailDto → existing AccountInfo shape
  return {
    id: detail.id as string,
    roleId: (detail.roleName as string) ?? null,
    assignedCampus: (detail.assignedCampus as string) ?? null,
    fullName: (detail.fullName as string) ?? null,
    englishName: (detail.englishName as string) ?? null,
    dateOfBirth: (detail.dateOfBirth as string) ?? null,
    gender: (detail.gender as string) ?? null,
    email: (detail.email as string) ?? null,
    phoneNumber: (detail.phoneNumber as string) ?? null,
    country: (detail.country as string) ?? null,
    maritalStatus: (detail.maritalStatus as string) ?? null,
    permanentAddress: (detail.permanentAddress as string) ?? null,
    temporaryAddress: (detail.temporaryAddress as string) ?? null,
    contactName: (detail.contactName as string) ?? null,
    contactPhone: (detail.contactPhone as string) ?? null,
    relationship: (detail.relationship as string) ?? null,
    cccd: (detail.cccd as string) ?? null,
    dateOfIssue: (detail.dateOfIssue as string) ?? null,
    placeOfIssue: (detail.placeOfIssue as string) ?? null,
    avatarImage: (detail.avatarImage as string) ?? null,
    frontImage: (detail.frontImage as string) ?? null,
    backImage: (detail.backImage as string) ?? null,
    socialInsuranceNumber: (detail.socialInsuranceNumber as string) ?? null,
    socialInsuranceIssueDate: (detail.socialInsuranceIssueDate as string) ?? null,
    taxIdentificationNumber: (detail.taxIdentificationNumber as string) ?? null,
    taxIssueDate: (detail.taxIssueDate as string) ?? null,
    joinAt: (detail.joinAt as string) ?? null,
    employmentType: (detail.employmentType as string) ?? null,
    workExperience: (detail.workExperience as string) ?? null,
    healthCertificate: (detail.healthCertificate as string) ?? null,
    birthCertificate: (detail.birthCertificate as string) ?? null,
    idCardCopy: (detail.idCardCopy as string) ?? null,
    degreeCertificate: (detail.degreeCertificate as string) ?? null,
    isDisabled: !(detail.isActive as boolean), // V2 isActive → V1 isDisabled (inverted)
  }
}

// =========================================================================
// User Status — V2
// =========================================================================

/** PATCH /api/v2/users/Users/{id}/status */
export async function updateUserStatus(
  id: string,
  isActive: boolean,
): Promise<boolean> {
  await api.patch(`${USERS_API}/${id}/status`, { isActive })
  return isActive
}

// =========================================================================
// Roles — V2 (Lookups)
// =========================================================================

/** GET /api/v2/lookups/Lookups/roles */
export async function fetchRoles(): Promise<Role[]> {
  const result = await api.get<Array<{ id: string; name: string }>>(
    `${LOOKUPS_API}/roles`,
  )
  return result.map((r) => ({
    id: r.id,
    name: r.name,
    normalizedName: r.name.toUpperCase(),
  }))
}

/** GET /api/v2/lookups/Lookups/campuses */
export async function fetchCampuses(): Promise<Array<{ id: string; name: string }>> {
  return api.get<Array<{ id: string; name: string }>>(`${LOOKUPS_API}/campuses`)
}

// =========================================================================
// Update User Role — V2
// =========================================================================

/** PUT /api/v2/users/Users/{id}/role */
export async function updateUserRole(
  id: string,
  payload: UserRoleUpdatePayload,
): Promise<void> {
  // V2 uses clean DTO: { roleId, assignedCampusIds }
  const campusIds: string[] = (() => {
    try {
      if (!payload.assignedCampus) return []
      return JSON.parse(payload.assignedCampus) as string[]
    } catch {
      return []
    }
  })()

  await api.put(`${USERS_API}/${id}/role`, {
    roleId: payload.roleId,
    assignedCampusIds: campusIds,
  })
}

// =========================================================================
// Update Profile — V2 (FormData for file uploads)
// =========================================================================

/** PUT /api/v2/users/Users/{id}/profile — [FromForm] */
export async function updateAccountInfo(
  id: string,
  formData: FormData,
): Promise<AccountInfo> {
  return api.put<AccountInfo>(`${USERS_API}/${id}/profile`, formData)
}

// =========================================================================
// File URL builder — V2
// =========================================================================

export function getUserFileUrl(userId: string, fileName: string): string {
  return resolveApiUrl(`${USERS_API}/${userId}/files/${encodeURIComponent(fileName)}`)
}
