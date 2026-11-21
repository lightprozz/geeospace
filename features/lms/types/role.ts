import { z } from 'zod'

// ---------------------------------------------------------------------------
// Role Types — Matches V2 RolesController DTOs
// GET  /api/v2/admin/Roles           → PagedResult<RoleListItem>
// GET  /api/v2/admin/Roles/{id}      → RoleDetailResponse
// POST /api/v2/admin/Roles/{id}/permissions      → AssignPermissionRequest
// DELETE /api/v2/admin/Roles/{id}/permissions/{claimId}
// ---------------------------------------------------------------------------

export const RoleListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  userCount: z.number(),
  permissionCount: z.number(),
})
export type RoleListItem = z.infer<typeof RoleListItemSchema>

export const RolePermissionInfoSchema = z.object({
  claimId: z.string(),
  claimType: z.string(),
  claimValue: z.string(),
})
export type RolePermissionInfo = z.infer<typeof RolePermissionInfoSchema>

export const RoleDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  userCount: z.number(),
  permissions: z.array(RolePermissionInfoSchema),
})
export type RoleDetailResponse = z.infer<typeof RoleDetailResponseSchema>

export const AssignPermissionRequestSchema = z.object({
  claimType: z.string().min(1),
  claimValue: z.string().min(1),
})
export type AssignPermissionRequest = z.infer<typeof AssignPermissionRequestSchema>

// ---------------------------------------------------------------------------
// Permission Groups — UI display metadata for grouping permission toggles
// Group id matches the first segment of the claimValue (e.g., "admin.audit.read" → "admin")
// Icon names reference lucide-react exports
// ---------------------------------------------------------------------------

export interface PermissionGroup {
  id: string
  label: string
  icon: string
  colorClass: string
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { id: 'admin',      label: 'Administration',        icon: 'Shield',         colorClass: 'text-red-500' },
  { id: 'account',    label: 'Account & HR',           icon: 'FileText',       colorClass: 'text-blue-500' },
  { id: 'curriculum', label: 'Curriculum',              icon: 'BookOpen',       colorClass: 'text-amber-500' },
  { id: 'class',      label: 'Class Management',        icon: 'Globe',          colorClass: 'text-indigo-500' },
  { id: 'teacher',    label: 'Teacher Operations',      icon: 'GraduationCap',  colorClass: 'text-teal-500' },
  { id: 'student',    label: 'Student Management',      icon: 'Users',          colorClass: 'text-emerald-500' },
  { id: 'report',     label: 'Reporting',               icon: 'BarChart3',      colorClass: 'text-slate-500' },
  { id: 'content',    label: 'Content Management',      icon: 'BookOpen',       colorClass: 'text-pink-500' },
  { id: 'comm',       label: 'Communication',           icon: 'MessageSquare',  colorClass: 'text-purple-500' },
  { id: 'attendance', label: 'Attendance',              icon: 'ClipboardCheck', colorClass: 'text-orange-500' },
  { id: 'lesson',     label: 'Lesson Delivery',         icon: 'Monitor',        colorClass: 'text-cyan-500' },
  { id: 'external',   label: 'External Integration',    icon: 'Plug',           colorClass: 'text-gray-500' },
  { id: 'worklog',    label: 'Worklog',                 icon: 'ClipboardList', colorClass: 'text-lime-500' },
  { id: 'workingtime',label: 'Working Time',            icon: 'Clock',          colorClass: 'text-sky-500' },
  { id: 'forms',      label: 'Forms & Templates',       icon: 'FileStack',      colorClass: 'text-indigo-500' },
]

// ---------------------------------------------------------------------------
// Available Permission Keys
// ---------------------------------------------------------------------------
// classapp.client is intentionally excluded — it is an Electron client
// credential, not a role-grantable permission, and no seed script grants it.
const NON_ROLE_PERMISSIONS = new Set(['classapp.client'])

/** Pass the platform's permission catalog rather than keeping a second copy. */
export function getRolePermissionKeys(permissions: Readonly<Record<string, string>>): string[] {
  return Object.values(permissions).filter((key) => !NON_ROLE_PERMISSIONS.has(key))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a human-readable display name from a claim key.
 *  e.g., "admin.audit.read" → "Audit Read" */
export function formatPermissionDisplayName(claimValue: string): string {
  return claimValue
    .split('.')
    .slice(1)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

/** Get the group id from a claim key (first dot-segment).
 *  e.g., "admin.audit.read" → "admin" */
export function getPermissionGroup(claimValue: string): string {
  return claimValue.split('.')[0]
}
