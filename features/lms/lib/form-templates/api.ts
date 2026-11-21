// ---------------------------------------------------------------------------
// lib/form-templates/api.ts — FRM v2 FormBuilder API client
// Endpoints: collections CRUD + worklog-templates CRUD + published picker
// ---------------------------------------------------------------------------

import { apiFetch } from '@/features/lms/lib/transport'
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  TemplateListItem,
  TemplateDetail,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  Token,
} from '@/features/lms/types/form-template'

const BASE = '/api/v2/form-builder'

// ---- Collections ------------------------------------------------------------

export async function fetchCollections(): Promise<Collection[]> {
  return apiFetch<Collection[]>(`${BASE}/collections`)
}

export async function fetchCollection(id: string): Promise<Collection> {
  return apiFetch<Collection>(`${BASE}/collections/${encodeURIComponent(id)}`)
}

export async function createCollection(
  request: CreateCollectionRequest,
): Promise<Collection> {
  return apiFetch<Collection>(`${BASE}/collections`, {
    method: 'POST',
    body: request,
  })
}

export async function updateCollection(
  id: string,
  request: UpdateCollectionRequest,
): Promise<Collection> {
  return apiFetch<Collection>(`${BASE}/collections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: request,
  })
}

export async function deleteCollection(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/collections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// ---- WorkLog Templates -----------------------------------------------------

export interface WorkLogTemplatesOptions {
  page?: number
  pageSize?: number
  sort?: string
  keyword?: string
  /** Includes deactivated templates in the result. Off by default. */
  includeInactive?: boolean
}

export async function fetchWorkLogTemplates(
  options: WorkLogTemplatesOptions = {},
): Promise<{ items: TemplateListItem[]; page: number; pageSize: number; total: number; hasNext: boolean }> {
  const params = new URLSearchParams()
  if (options.page) params.set('page', String(options.page))
  if (options.pageSize) params.set('pageSize', String(options.pageSize))
  if (options.sort) params.set('sort', options.sort)
  if (options.keyword) params.set('keyword', options.keyword)
  if (options.includeInactive) params.set('includeInactive', 'true')

  const qs = params.toString()
  return apiFetch(`${BASE}/worklog-templates${qs ? `?${qs}` : ''}`)
}

export async function fetchWorkLogTemplate(id: string): Promise<TemplateDetail> {
  return apiFetch<TemplateDetail>(
    `${BASE}/worklog-templates/${encodeURIComponent(id)}`,
  )
}

export async function createWorkLogTemplate(
  request: CreateTemplateRequest,
): Promise<TemplateDetail> {
  return apiFetch<TemplateDetail>(`${BASE}/worklog-templates`, {
    method: 'POST',
    body: { ...request, templateType: 'WorkLog' },
  })
}

export async function updateWorkLogTemplate(
  id: string,
  request: UpdateTemplateRequest,
  ifUnmodifiedSince?: string,
): Promise<TemplateDetail> {
  return apiFetch<TemplateDetail>(
    `${BASE}/worklog-templates/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: request,
      headers: ifUnmodifiedSince
        ? { 'If-Unmodified-Since': ifUnmodifiedSince }
        : undefined,
    },
  )
}

export async function toggleWorkLogTemplateActivate(
  id: string,
  ifUnmodifiedSince?: string,
): Promise<Token> {
  return apiFetch<Token>(
    `${BASE}/worklog-templates/${encodeURIComponent(id)}/toggle-activate`,
    {
      method: 'POST',
      headers: ifUnmodifiedSince
        ? { 'If-Unmodified-Since': ifUnmodifiedSince }
        : undefined,
    },
  )
}

/**
 * Explicitly activates or deactivates a WorkLog template.
 *
 * Preferred over `toggleWorkLogTemplateActivate` because the caller states the
 * target state: a toggle silently flips whatever the server currently holds,
 * which races with a stale client.
 */
export async function setWorkLogTemplateActive(
  id: string,
  isActive: boolean,
): Promise<Token> {
  return apiFetch<Token>(
    `${BASE}/worklog-templates/${encodeURIComponent(id)}/active`,
    {
      method: 'PUT',
      body: { isActive },
    },
  )
}

// Sub-2 hook: published WorkLog templates for step editor worklog picker
export async function fetchPublishedWorkLogTemplates(): Promise<
  TemplateListItem[]
> {
  return apiFetch<TemplateListItem[]>(`${BASE}/worklog-templates/published`)
}
