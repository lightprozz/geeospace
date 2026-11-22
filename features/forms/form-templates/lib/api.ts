// ---------------------------------------------------------------------------
// lib/api.ts — api client for the FRM v2 form-builder API
// ---------------------------------------------------------------------------

import { api, type PagedResult } from "@/features/lms/lib/transport"
import type {
  TemplateDetail,
  Field,
  CreateTemplate,
  UpdateTemplate,
  NewField,
  UpsertField,
  ReorderFields,
  TemplateListItem,
  LookupCampus,
  LookupGroup,
  LookupUser,
} from '@/features/lms/types/form-template'

export type { TemplateDetail, Field, CreateTemplate, UpdateTemplate, NewField, UpsertField, ReorderFields, TemplateListItem }

export interface TemplateListParams {
  collectionId?: string
  page?: number
  pageSize?: number
  sort?: string
  keyword?: string
  /** Includes deactivated templates in the result. Off by default. */
  includeInactive?: boolean
}

export interface TemplateListResult {
  result: PagedResult<TemplateListItem>
}

export async function getTemplates(
  params: TemplateListParams = {}
): Promise<TemplateListResult> {
  const qs = new URLSearchParams()
  if (params.collectionId) qs.set("collectionId", params.collectionId)
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))
  if (params.sort) qs.set("sort", params.sort)
  if (params.keyword) qs.set("keyword", params.keyword)
  if (params.includeInactive) qs.set("includeInactive", "true")

  const query = qs.toString() ? `?${qs.toString()}` : ""
  return api.get<TemplateListResult>(`/api/v2/form-builder/templates${query}`)
}

export async function getTemplate(id: string): Promise<TemplateDetail> {
  return api.get<TemplateDetail>(`/api/v2/form-builder/templates/${id}`)
}

export async function createTemplate(body: CreateTemplate): Promise<TemplateDetail> {
  return api.post<TemplateDetail>("/api/v2/form-builder/templates", body)
}

export async function updateTemplate(
  id: string,
  body: UpdateTemplate
): Promise<TemplateDetail> {
  return api.put<TemplateDetail>(`/api/v2/form-builder/templates/${id}`, body)
}

export async function toggleActivate(
  id: string
): Promise<{ updatedAt: string }> {
  return api.post<{ updatedAt: string }>(
    `/api/v2/form-builder/templates/${id}/toggle-activate`
  )
}

/**
 * Explicitly activates or deactivates a template.
 *
 * Preferred over `toggleActivate` because the caller states the target state:
 * a toggle silently flips whatever the server currently holds, which races with
 * a stale client and can activate a template the user meant to deactivate.
 */
export async function setActive(
  id: string,
  isActive: boolean
): Promise<{ updatedAt: string }> {
  return api.put<{ updatedAt: string }>(
    `/api/v2/form-builder/templates/${id}/active`,
    { isActive }
  )
}

export async function getFields(templateId: string): Promise<Field[]> {
  return api.get<Field[]>(
    `/api/v2/form-builder/templates/${templateId}/fields`
  )
}

export async function createField(
  templateId: string,
  body: NewField
): Promise<Field> {
  return api.post<Field>(
    `/api/v2/form-builder/templates/${templateId}/fields`,
    body
  )
}

export async function updateField(
  templateId: string,
  fieldId: string,
  body: UpsertField
): Promise<Field> {
  return api.put<Field>(
    `/api/v2/form-builder/templates/${templateId}/fields/${fieldId}`,
    body
  )
}

export async function deleteField(
  templateId: string,
  fieldId: string
): Promise<void> {
  await api.delete(`/api/v2/form-builder/templates/${templateId}/fields/${fieldId}`)
}

export async function reorderFields(
  templateId: string,
  body: ReorderFields
): Promise<void> {
  await api.post(
    `/api/v2/form-builder/templates/${templateId}/fields/reorder`,
    body
  )
}

// ---- Picker sources for the builder's settings rail ------------------------
// Keyword is optional: omitting it returns the first page of options. The
// pickers send a debounced keyword so the filtering happens on the server.

export async function getLookupCampuses(
  keyword?: string
): Promise<LookupCampus[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ""
  return api.get<LookupCampus[]>(`/api/v2/form-builder/lookups/campuses${qs}`)
}

export async function getLookupGroups(
  keyword?: string
): Promise<LookupGroup[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ""
  return api.get<LookupGroup[]>(`/api/v2/form-builder/lookups/groups${qs}`)
}

export async function getLookupUsers(
  keyword?: string
): Promise<LookupUser[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ""
  return api.get<LookupUser[]>(`/api/v2/form-builder/lookups/users${qs}`)
}
