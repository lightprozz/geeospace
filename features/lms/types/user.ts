// ---------------------------------------------------------------------------
// types/user.ts
// User domain types, Zod schemas, constants — matches AccountInfoDto + AccountListDto
// ---------------------------------------------------------------------------

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Role — matches AspNetRoles entity
// ---------------------------------------------------------------------------

export interface Role {
  id: string
  name: string
  normalizedName: string
}

/**
 * 7 fixed roles from GeeOConstants.cs
 * Values match AspNetRoles.Name exactly
 */
export const USER_ROLES = [
  'Admin',
  'Branch Admin',
  'Planner',
  'Teacher',
  'Acad Manager',
  'Sale Manager',
  'Sale Executive',
] as const

export type UserRoleName = (typeof USER_ROLES)[number]

/**
 * Roles that require campus/branch assignment (from legacy ROLES_HAVE_BRANCH)
 * Matches normalizedName (uppercase) in legacy EditUser.js
 */
export const ROLES_HAVE_BRANCH: string[] = [
  'SALE EXECUTIVE',
  'SALE MANAGER',
  'ACAD MANAGER',
  'BRANCH ADMIN',
  'TEACHER',
]

/** Check if a role name requires branch assignment */
export function roleRequiresBranch(roleName: string | null | undefined): boolean {
  if (!roleName) return false
  return ROLES_HAVE_BRANCH.includes(roleName.toUpperCase())
}

// ---------------------------------------------------------------------------
// Gender & MaritalStatus — stored as string in DB (converted from C# enum)
// Gender: Male=0, Female=1, Other=2 → stored as "Male", "Female", "Other"
// MaritalStatus: Single=0, Married=1, Other=2 → same pattern
// ---------------------------------------------------------------------------

export const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
] as const

export const MARITAL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Other', label: 'Other' },
] as const

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Intern', label: 'Intern' },
] as const

// ---------------------------------------------------------------------------
// Document Types — matches EDocumentType C# enum
// ---------------------------------------------------------------------------

export const DOCUMENT_TYPES = [
  { key: 'workExperience', label: 'Work Experience', type: 'WorkExperience' },
  { key: 'healthCertificate', label: 'Health Certificate', type: 'HealthCertificate' },
  { key: 'birthCertificate', label: 'Birth Certificate', type: 'NotarizedBirthCertificate' },
  { key: 'idCardCopy', label: 'ID Card Copy', type: 'NotarizedCopyOfIdCard' },
  { key: 'degreeCertificate', label: 'Degree Certificate', type: 'BachelorDegree' },
] as const

export type DocumentFieldKey = (typeof DOCUMENT_TYPES)[number]['key']

// ---------------------------------------------------------------------------
// AccountInfo — full user profile (matches AccountInfoDto, 34 fields)
// GET /api/AccountInfo/{id} → { Status, Data: AccountInfo }
// ---------------------------------------------------------------------------

export interface AccountInfo {
  /** User ID (from AspNetUsers.Id) */
  id: string
  /** Role name (NOT role ID) — mapped from AspNetRoles.Name */
  roleId: string | null
  /** Comma-separated campus names (resolved by BE from JSON campus IDs) */
  assignedCampus: string | null
  /** Computed: "{LastName} {FirstName}" */
  fullName: string | null
  /** English name from UserInfo */
  englishName: string | null
  dateOfBirth: string | null
  /** Stored as string: "Male" | "Female" | "Other" */
  gender: string | null
  email: string | null
  phoneNumber: string | null
  country: string | null
  /** Stored as string: "Single" | "Married" | "Other" */
  maritalStatus: string | null
  permanentAddress: string | null
  temporaryAddress: string | null
  /** Emergency contact fields (from UserEmergencyContacts) */
  contactName: string | null
  contactPhone: string | null
  relationship: string | null
  /** CCCD fields (from UserIdentifications) */
  cccd: string | null
  dateOfIssue: string | null
  placeOfIssue: string | null
  /** File name strings — view via /api/AccountInfo/file/{userId}/{fileName} */
  avatarImage: string | null
  frontImage: string | null
  backImage: string | null
  /** Insurance & Tax */
  socialInsuranceNumber: string | null
  socialInsuranceIssueDate: string | null
  taxIdentificationNumber: string | null
  taxIssueDate: string | null
  /** Employment */
  joinAt: string | null
  employmentType: string | null
  /** Document file names (from UserDocuments) */
  workExperience: string | null
  healthCertificate: string | null
  birthCertificate: string | null
  idCardCopy: string | null
  degreeCertificate: string | null
  /**
   * Status flag from AspNetUsers.IsDisabled
   * IMPORTANT: IsDisabled=true means ACTIVE (confirmed from AccountService.cs line 50)
   */
  isDisabled: boolean
}

// ---------------------------------------------------------------------------
// AccountListItem — slim list item (matches AccountListDto)
// GET /api/AccountInfo/list → { Status, Data: AccountListItem[] }
// ---------------------------------------------------------------------------

export interface AccountListItem {
  id: string
  fullName: string | null
  email: string | null
  /** Role NAME (not ID) — from AspNetRoles.Name via AccountService line 47 */
  roleId: string | null
  /** Comma-separated campus names */
  branch: string | null
  /**
   * Maps directly from AspNetUsers.IsDisabled
   * true = ACTIVE, false = INACTIVE
   */
  status: boolean
}

// ---------------------------------------------------------------------------
// UserRoleUpdatePayload — for PUT /api/v2/users/Users/{id}/role
// Used by admin Role & Campus dialog
// ---------------------------------------------------------------------------

export interface UserRoleUpdatePayload {
  id: string
  roleId: string
  /** JSON stringified array of campus IDs */
  assignedCampus: string
  /** @deprecated V1 fields — kept for backward compat during transition */
  email?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  employeeCode?: string
  titleName?: string
  isExpat?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if user is active based on status/isDisabled flag */
export function isUserActive(
  user: Pick<AccountListItem, 'status'> | Pick<AccountInfo, 'isDisabled'>,
): boolean {
  if ('status' in user) return user.status === true
  return user.isDisabled === true
}

/** Get initials from full name for Avatar fallback */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ---------------------------------------------------------------------------
// Zod Schemas — for form validation
// ---------------------------------------------------------------------------

export const AccountInfoFormSchema = z.object({
  englishName: z.string().optional().default(''),
  dateOfBirth: z.string().optional().default(''),
  gender: z.string().optional().default(''),
  country: z.string().optional().default(''),
  maritalStatus: z.string().optional().default(''),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phoneNumber: z.string().optional().default(''),
  permanentAddress: z.string().optional().default(''),
  temporaryAddress: z.string().optional().default(''),
  // Emergency Contact
  contactName: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  relationship: z.string().optional().default(''),
  // CCCD
  cccd: z.string().optional().default(''),
  dateOfIssue: z.string().optional().default(''),
  placeOfIssue: z.string().optional().default(''),
  // Insurance & Tax
  socialInsuranceNumber: z.string().optional().default(''),
  socialInsuranceIssueDate: z.string().optional().default(''),
  taxIdentificationNumber: z.string().optional().default(''),
  taxIssueDate: z.string().optional().default(''),
  // Employment
  joinAt: z.string().optional().default(''),
  employmentType: z.string().optional().default(''),
})

export type AccountInfoFormInput = z.infer<typeof AccountInfoFormSchema>
