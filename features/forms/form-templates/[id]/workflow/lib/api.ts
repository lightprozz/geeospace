// ---------------------------------------------------------------------------
// lib/api.ts — Workflow Builder API client
// ---------------------------------------------------------------------------

import { api } from '@/features/lms/lib/transport'
import type {
  ProcessStepDto,
  CreateProcessRequest,
  ReorderProcessesRequest,
  DenyBranchRequest,
  AttachWorklogRequest,
  ApproverPreviewDto,
} from '../types/workflow'

// ── Processes ────────────────────────────────────────────────────────────────

/** GET /api/v2/form-builder/processes?templateId={templateId} */
export async function fetchProcesses(templateId: string): Promise<ProcessStepDto[]> {
  return api.get<ProcessStepDto[]>(
    `/api/v2/form-builder/processes?templateId=${encodeURIComponent(templateId)}`,
  )
}

/** GET /api/v2/form-builder/processes/{id} */
export async function fetchProcess(processId: string): Promise<ProcessStepDto> {
  return api.get<ProcessStepDto>(`/api/v2/form-builder/processes/${processId}`)
}

/** POST /api/v2/form-builder/templates/{templateId}/processes */
export async function createProcess(
  templateId: string,
  body: CreateProcessRequest,
): Promise<ProcessStepDto> {
  return api.post<ProcessStepDto>(
    `/api/v2/form-builder/templates/${templateId}/processes`,
    body,
  )
}

/** PUT /api/v2/form-builder/templates/{templateId}/processes/{id} */
export async function updateProcess(
  templateId: string,
  processId: string,
  body: CreateProcessRequest,
): Promise<ProcessStepDto> {
  return api.put<ProcessStepDto>(
    `/api/v2/form-builder/templates/${templateId}/processes/${processId}`,
    body,
  )
}

/** DELETE /api/v2/form-builder/templates/{templateId}/processes/{id} */
export async function deleteProcess(
  templateId: string,
  processId: string,
): Promise<void> {
  return api.delete(
    `/api/v2/form-builder/templates/${templateId}/processes/${processId}`,
  )
}

/** POST /api/v2/form-builder/templates/{templateId}/processes/reorder */
export async function reorderProcesses(
  templateId: string,
  body: ReorderProcessesRequest,
): Promise<void> {
  return api.post(
    `/api/v2/form-builder/templates/${templateId}/processes/reorder`,
    body,
  )
}

/** POST /api/v2/form-builder/templates/{templateId}/processes/{id}/deny-branch */
export async function setDenyBranch(
  templateId: string,
  processId: string,
  body: DenyBranchRequest,
): Promise<void> {
  return api.post(
    `/api/v2/form-builder/templates/${templateId}/processes/${processId}/deny-branch`,
    body,
  )
}

/** POST /api/v2/form-builder/templates/{templateId}/processes/{id}/attach-worklog */
export async function attachWorklog(
  templateId: string,
  processId: string,
  body: AttachWorklogRequest,
): Promise<void> {
  return api.post(
    `/api/v2/form-builder/templates/${templateId}/processes/${processId}/attach-worklog`,
    body,
  )
}

// ── Approver preview ─────────────────────────────────────────────────────────

/** GET /api/v2/form-builder/processes/{id}/approver-preview */
export async function fetchApproverPreview(
  processId: string,
): Promise<ApproverPreviewDto> {
  return api.get<ApproverPreviewDto>(
    `/api/v2/form-builder/processes/${processId}/approver-preview`,
  )
}

// ── Approver picker sources ─────────────────────────────────────────────────

export interface LookupUserOption {
  id: string
  fullName: string
  userName: string | null
  email: string | null
}

export interface LookupRoleOption {
  id: string
  name: string
}

export interface LookupGroupOption {
  id: string
  name: string
  description: string | null
}

export interface LookupFunctionTypeOption {
  id: string
  label: string
  description: string | null
  apiUrl: string | null
  httpMethod: string | null
}

/** GET /api/v2/form-builder/lookups/users */
export async function getLookupUsers(keyword?: string): Promise<LookupUserOption[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return api.get<LookupUserOption[]>(`/api/v2/form-builder/lookups/users${qs}`)
}

/** GET /api/v2/form-builder/lookups/roles */
export async function getLookupRoles(keyword?: string): Promise<LookupRoleOption[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return api.get<LookupRoleOption[]>(`/api/v2/form-builder/lookups/roles${qs}`)
}

/** GET /api/v2/form-builder/lookups/groups */
export async function getLookupGroups(keyword?: string): Promise<LookupGroupOption[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return api.get<LookupGroupOption[]>(`/api/v2/form-builder/lookups/groups${qs}`)
}

/** GET /api/v2/form-builder/lookups/function-types */
export async function getLookupFunctionTypes(
  keyword?: string,
): Promise<LookupFunctionTypeOption[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return api.get<LookupFunctionTypeOption[]>(
    `/api/v2/form-builder/lookups/function-types${qs}`,
  )
}

// ── WorkLog Templates ──────────────────────────────────────────────────────

export interface WorkLogTemplateListResult {
  id: string
  name: string
  description?: string
}

/** GET /api/v2/form-builder/templates/worklog-templates?isPublished=true */
export async function fetchPublishedWorkLogTemplates(): Promise<WorkLogTemplateListResult[]> {
  return api.get<WorkLogTemplateListResult[]>(
    `/api/v2/form-builder/templates/worklog-templates?isPublished=true`,
  )
}
