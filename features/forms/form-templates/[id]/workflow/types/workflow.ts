// ---------------------------------------------------------------------------
// types/workflow.ts — Workflow Builder types
// Imported from: GeeO-LMS-FE/types/request.ts (canonical TypeApprovalId)
// ---------------------------------------------------------------------------

export { TypeApprovalId, type TypeApprovalIdValue } from '@/features/lms/types/request'

/** TypeApprovalId numeric values as a readonly object for easy lookup */
export const TYPE_APPROVAL_ID = {
  User: 1,
  Role: 2,
  GroupInHose: 3,
  GroupAll: 4,
} as const

export type TypeApprovalKind = keyof typeof TYPE_APPROVAL_ID

export const TYPE_APPROVAL_LABEL: Record<number, string> = {
  1: 'User',
  2: 'Role',
  3: 'Group (In-House)',
  4: 'Group (All)',
}

// ── DTOs (mirrors BE ProcessDtos.cs) ─────────────────────────────────────────

export interface ApproverDto {
  id: string
  kind: 'User' | 'Role' | 'Group'
  resourceId: string
  resourceName: string
}

export interface ProcessStepDto {
  id: string
  templateId: string
  processName: string
  processOrder: number
  processStatus: number
  typeApprovalId: number
  description?: string
  nextProcessIfDeniedId?: string
  worklogTemplateId?: string
  worklogTemplateName?: string
  approvers: ApproverDto[]
}

export interface ApproverRef {
  kind: 'User' | 'Role' | 'Group'
  resourceId: string
}

export interface CreateProcessRequest {
  processName: string
  typeApprovalId: number
  description?: string
  approvers: ApproverRef[]
  worklogTemplateId?: string
  nextProcessIfDeniedId?: string
}

export interface ReorderProcessesRequest {
  processIds: string[]
}

export interface DenyBranchRequest {
  nextProcessIfDeniedId?: string
}

export interface AttachWorklogRequest {
  worklogTemplateId?: string
}

// ── WorkLog template ──────────────────────────────────────────────────────────

export interface WorkLogTemplateOption {
  id: string
  name: string
  description?: string
}

// ── Approver resolution preview ────────────────────────────────────────────────

/** One resolved user inside an approver preview. */
export interface ApproverPreviewUser {
  id: string
  fullName: string
  email?: string | null
  /** True when the user is a group administrator (Group In-House only). */
  isGroupAdmin?: boolean
}

/** The users a step resolves to at runtime. Mirrors BE ApproverPreviewDto. */
export interface ApproverPreviewDto {
  processId: string
  typeApprovalId: number
  /** User | Role | Group (In-House) | Group (All) */
  typeLabel: string
  /** The configured resource name (user name, role name, group name). */
  resourceName: string
  users: ApproverPreviewUser[]
  /** Total resolved users (may exceed the previewed slice). */
  totalCount: number
}
