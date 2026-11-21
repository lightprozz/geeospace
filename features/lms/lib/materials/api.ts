// ---------------------------------------------------------------------------
// lib/materials/api.ts — V2 Materials API (fully migrated)
// Routes: POST   /api/v2/content/Materials/query
//         GET    /api/v2/content/Materials/{id}
//         POST   /api/v2/content/Materials
//         PUT    /api/v2/content/Materials/{id}
//         DELETE /api/v2/content/Materials/{id}
//         POST   /api/v2/content/Materials/{id}/approve
//         POST   /api/v2/content/Materials/bulk-approve
//         POST   /api/v2/content/Materials/bulk-delete
//         POST   /api/v2/content/Materials/{id}/file
//         GET    /api/v2/content/Materials/{id}/file/{filename}
//         POST   /api/v2/content/Materials/category-match
// ---------------------------------------------------------------------------

import { api, queryPaged, resolveApiUrl, type PagedResult, type Filter } from '@/features/lms/lib/transport'
import type {
  MaterialListItem,
  MaterialDetail,
  BulkDeleteResult,
  UpsertMaterialInput,
} from '@/features/lms/types/material'

// ---- V2 route prefix --------------------------------------------------------

const MATERIAL_API = '/api/v2/content/Materials'

// =========================================================================
// Read — Query (replaces fetchMaterials + fetchForApproval + fetchByTeacher)
// =========================================================================

/** POST /api/v2/content/Materials/query — unified paginated query */
export async function queryMaterials(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: 'approved' | 'pending' | 'all'
  teacherId?: string
  categories?: string[]
  sort?: { field: string; desc: boolean }[]
  filters?: Filter[]
}): Promise<PagedResult<MaterialListItem>> {
  const filters: Filter[] = [
    ...(params.filters ?? []),
  ]

  if (params.status && params.status !== 'all') {
    filters.push({ field: 'approved', operator: 'eq', value: params.status === 'approved' ? 'true' : 'false' })
  }
  if (params.teacherId) {
    filters.push({
      field: 'teacherId',
      operator: 'eq',
      value: params.teacherId,
    })
  }

  if (params.categories && params.categories.length > 0) {
    params.categories.forEach(cat => {
      filters.push({ field: 'materialCategories', operator: 'contains', value: cat })
    })
  }

  return queryPaged<MaterialListItem>(`${MATERIAL_API}/query`, {
    page: params.page,
    pageSize: params.pageSize ?? 20,
    search: params.search,
    sort: params.sort ?? [{ field: 'name', desc: false }],
    filters:
      filters.length > 0
        ? { filters, logic: 'and' }
        : undefined,
  })
}

/**
 * Convenience: fetch all materials (approved) — for backward compat.
 * @deprecated Use queryMaterials({ status: 'approved' }) instead.
 */
export async function fetchMaterials(): Promise<MaterialListItem[]> {
  const result = await queryMaterials({
    status: 'approved',
    pageSize: 500,
  })
  return result.items
}

/**
 * @deprecated Use queryMaterials({ status: 'pending' }) instead.
 */
export async function fetchForApproval(): Promise<MaterialListItem[]> {
  const result = await queryMaterials({ status: 'pending', pageSize: 500 })
  return result.items
}

/**
 * @deprecated Use queryMaterials({ teacherId }) instead.
 */
export async function fetchByTeacher(
  teacherId: string,
): Promise<MaterialListItem[]> {
  const result = await queryMaterials({ teacherId, pageSize: 500 })
  return result.items
}

/**
 * @deprecated Use queryMaterials({ status: 'approved' }) instead.
 */
export async function fetchApproved(): Promise<MaterialListItem[]> {
  return fetchMaterials()
}

/**
 * @deprecated Use queryMaterials({ status: 'approved', teacherId }) instead.
 */
export async function fetchApprovedFor(
  teacherId: string,
): Promise<MaterialListItem[]> {
  const result = await queryMaterials({
    status: 'approved',
    teacherId,
    pageSize: 500,
  })
  return result.items
}

// =========================================================================
// Read — Detail
// =========================================================================

/** GET /api/v2/content/Materials/{id} */
export async function fetchMaterialById(id: string): Promise<MaterialDetail> {
  return api.get<MaterialDetail>(`${MATERIAL_API}/${id}`)
}

// =========================================================================
// Write — Create
// =========================================================================

/** POST /api/v2/content/Materials */
export async function createMaterial(
  data: UpsertMaterialInput,
): Promise<MaterialDetail> {
  return api.post<MaterialDetail>(MATERIAL_API, data)
}

// =========================================================================
// Write — Update
// =========================================================================

/** PUT /api/v2/content/Materials/{id} */
export async function updateMaterial(
  id: string,
  data: UpsertMaterialInput,
): Promise<MaterialDetail> {
  return api.put<MaterialDetail>(`${MATERIAL_API}/${id}`, data)
}

// =========================================================================
// Write — Delete (may return 409)
// =========================================================================

/** DELETE /api/v2/content/Materials/{id} */
export async function deleteMaterial(id: string): Promise<void> {
  await api.delete(`${MATERIAL_API}/${id}`)
}

// =========================================================================
// Write — Approve
// =========================================================================

/** POST /api/v2/content/Materials/{id}/approve */
export async function approveMaterial(id: string): Promise<void> {
  await api.post(`${MATERIAL_API}/${id}/approve`)
}

// =========================================================================
// Write — Bulk Operations
// =========================================================================

/** POST /api/v2/content/Materials/bulk-approve — body: { ids: string[] } */
export async function bulkApprove(ids: string[]): Promise<void> {
  await api.post(`${MATERIAL_API}/bulk-approve`, { ids })
}

/** POST /api/v2/content/Materials/bulk-delete — body: { ids: string[] } */
export async function bulkDelete(ids: string[]): Promise<BulkDeleteResult> {
  return api.post<BulkDeleteResult>(`${MATERIAL_API}/bulk-delete`, { ids })
}

// =========================================================================
// Write — File Upload
// =========================================================================

/** POST /api/v2/content/Materials/{id}/file (multipart) */
export async function uploadMaterialFile(
  id: string,
  file: File,
): Promise<void> {
  const data = new FormData()
  data.append('file', file)

  await api.post<void>(`${MATERIAL_API}/${id}/file`, data, { responseType: 'void' })
}

// =========================================================================
// Read — File View URL
// =========================================================================

/** GET /api/v2/content/Materials/{id}/file/{filename} */
export function getMaterialViewUrl(id: string, filename: string): string {
  return resolveApiUrl(`${MATERIAL_API}/${id}/file/${encodeURIComponent(filename)}`)
}

// =========================================================================
// Read — Category Match
// =========================================================================

/** POST /api/v2/content/Materials/category-match */
export async function getCategoryMatch(
  excludeId: string,
  lessonPlanUnitId: string,
): Promise<MaterialListItem[]> {
  return api.post<MaterialListItem[]>(`${MATERIAL_API}/category-match`, {
    excludeId,
    lessonPlanUnitId,
  })
}
