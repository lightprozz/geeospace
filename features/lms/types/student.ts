// ---------------------------------------------------------------------------
// types/student.ts
// Student domain types, helpers, and constants for the Students Management module
// Matches: AcademicManage.GetListWithFilter response (AcademinManage DTO)
//          Student entity for detail views
//          AcademicFilterParams for server-side search
// ---------------------------------------------------------------------------

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Student Status — derived from SuspendDate / TerminateDate
// NOT from an API enum — computed on the frontend from nullable date fields
// ---------------------------------------------------------------------------

export type StudentStatus = 'Active' | 'Suspended' | 'Terminated'

// ---------------------------------------------------------------------------
// ClassType — matches C# ClassType enum from ClassStudent entity
// Used for StudentType filter in GetListWithFilter
// ---------------------------------------------------------------------------

export const CLASS_TYPE = {
  Unknown: 0,
  Regular: 1,
  CatchUp: 2,
  Demo: 3,
  Suspended: 4,
  Terminated: 5,
} as const

export type ClassTypeValue = (typeof CLASS_TYPE)[keyof typeof CLASS_TYPE]

/** Student Type filter options visible in UI dropdown (excludes Unknown/Suspended/Terminated) */
export const STUDENT_TYPE_OPTIONS = [
  { value: 0, label: 'All Types' },
  { value: CLASS_TYPE.Regular, label: 'Regular' },
  { value: CLASS_TYPE.CatchUp, label: 'Catch Up' },
  { value: CLASS_TYPE.Demo, label: 'Demo' },
] as const

// ---------------------------------------------------------------------------
// Active / Inactive classification based on studentType
// Active: types 1, 2, 3 (Regular, CatchUp, Demo)
// Inactive: types 4, 5 (Suspended, Terminated)
// ---------------------------------------------------------------------------

/** Check if student type is considered Active (Regular/CatchUp/Demo) */
export function isActiveStudentType(studentType?: number): boolean {
  return studentType !== undefined && studentType >= 1 && studentType <= 3
}

/** Check if student type is considered Inactive (Suspended/Terminated) */
export function isInactiveStudentType(studentType?: number): boolean {
  return studentType !== undefined && (studentType === 4 || studentType === 5)
}

/** Get label for student type */
export function getStudentTypeLabel(studentType?: number): string {
  switch (studentType) {
    case 1: return 'Regular'
    case 2: return 'Catch Up'
    case 3: return 'Demo'
    case 4: return 'Suspended'
    case 5: return 'Terminated'
    default: return 'Unknown'
  }
}

// ---------------------------------------------------------------------------
// Role-based access — Admin roles that can see suspended/terminated students
// Matches legacy AcademicManage.js: AdminRoles check for suspended checkbox
// ---------------------------------------------------------------------------

/**
 * Roles allowed to:
 * - See the Inactive tab (suspended/terminated students)
 * - Perform Renew/Reserve/Suspend actions on students
 * - See all campuses (no campus scoping)
 *
 * Teacher role: can only see own class students (backend-enforced via
 * AcadManageService.FilterStudents → classTeachers filter)
 * Teacher sees: NO Inactive tab, NO Renew/Reserve actions
 */
export const ADMIN_ROLES = [
  'Admin',
  'Branch Admin',
  'Acad Manager',
  'Planner',
] as const

export type AdminRoleName = (typeof ADMIN_ROLES)[number]

/**
 * Roles with limited read-only access
 * Teachers see only their own class students (backend filter)
 * Sale roles can view but not modify
 */
export const NON_ADMIN_ROLES = ['Teacher', 'Sale Manager', 'Sale Executive'] as const

// ---------------------------------------------------------------------------
// AcademicFilterParams — request body for POST GetListWithFilter
// Matches: GeeO.Common/FilterParams/AcademicFilterParams.cs
// ---------------------------------------------------------------------------

export interface AcademicFilterParams {
  /** Fuzzy search: studentName, englishName, parent name, parent phone */
  namePhone: string
  /** Campus ID — empty string = all assigned campuses */
  campus: string
  /** Level ID — empty string = all levels */
  level: string
  /** Class ID — empty string = all classes */
  class: string
  /** ClassType enum value — 0 = all types */
  studentType: number
  /** false = Active only, true = Suspended/Terminated only */
  suspended: boolean
}

/** Default filter params — show all active students */
export const DEFAULT_FILTER_PARAMS: AcademicFilterParams = {
  namePhone: '',
  campus: '',
  level: '',
  class: '',
  studentType: 0,
  suspended: false,
}

// ---------------------------------------------------------------------------
// AcademicStudentGrid — API response from GetListWithFilter
// Matches: GeeO.Data/Dto/AcademicManage.cs (AcademinManage class)
// Also used with V2 API responses that include studentType
// ---------------------------------------------------------------------------

export interface AcademicStudentGrid {
  id: string
  routeId: string | null
  class: string | null
  studentName: string | null
  englishName: string | null
  fatherName: string | null
  fatherPhone: string | null
  motherName: string | null
  motherPhone: string | null
  address: string | null
  birthday: string | null
  beginDate: string | null
  startTime: string | null
  endTime: string | null
  suspendDate: string | null
  terminateDate: string | null
  /** Pre-formatted dates from backend (dd/MM/yyyy) */
  startTimeFormat: string | null
  endTimeFormat: string | null
  birthdayFormat: string | null
  beginDateDisplay: string | null
  suspendDateFormat: string | null
  terminateDateFormat: string | null
}

// ---------------------------------------------------------------------------
// StudentAllItem — V2 API response from GET /api/v2/student/students/all
// Matches actual backend response with currentClassId, campusId, levelId
// ---------------------------------------------------------------------------

export interface StudentAllItem {
  id: string
  studentName: string | null
  englishName: string | null
  birthday: string | null
  yob: number | null
  address: string | null
  beginDate: string | null
  suspendDate: string | null
  suspendMonths: number | null
  suspendReason: string | null
  terminateDate: string | null
  terminateReason: string | null
  traits: string | null
  note: string | null
  rating: number | null
  status: string | null
  fatherId: string | null
  fatherName: string | null
  fatherPhone: string | null
  motherId: string | null
  motherName: string | null
  motherPhone: string | null
  /** Current class ID — used for branch/level/class filtering */
  currentClassId: string | null
  /** Current class name */
  currentClassName: string | null
  /** Student type: 1=Regular, 2=CatchUp, 3=Demo, 4=Suspended, 5=Terminated */
  currentStudentType: number | null
  currentStudentTypeName: string | null
  currentSortOrder: number | null
  currentRegisterDate: string | null
  /** Level ID — used for level filtering */
  levelId: string | null
  levelName: string | null
  /** Campus ID — used for branch filtering */
  campusId: string | null
  campusName: string | null
  campusAddress: string | null
}

/** Convert StudentAllItem to AcademicStudentGrid for table compatibility */
export function toAcademicStudentGrid(student: StudentAllItem): AcademicStudentGrid {
  return {
    id: student.id,
    routeId: null,
    class: student.currentClassName,
    studentName: student.studentName,
    englishName: student.englishName,
    fatherName: student.fatherName,
    fatherPhone: student.fatherPhone,
    motherName: student.motherName,
    motherPhone: student.motherPhone,
    address: student.address,
    birthday: student.birthday,
    beginDate: student.beginDate,
    startTime: null,
    endTime: null,
    suspendDate: student.suspendDate,
    terminateDate: student.terminateDate,
    startTimeFormat: null,
    endTimeFormat: null,
    birthdayFormat: student.birthday ? formatDateForDisplay(student.birthday) : null,
    beginDateDisplay: student.beginDate ? formatDateForDisplay(student.beginDate) : null,
    suspendDateFormat: student.suspendDate ? formatDateForDisplay(student.suspendDate) : null,
    terminateDateFormat: student.terminateDate ? formatDateForDisplay(student.terminateDate) : null,
  }
}

/** Format ISO date to dd/MM/yyyy for display */
function formatDateForDisplay(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return isoDate
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  } catch {
    return isoDate
  }
}

// ---------------------------------------------------------------------------
// StudentGrid — legacy GET /api/Student response shape (for reference)
// Matches: GeeO.Data/GridVo/StudentParentGrid.cs → StudentGrid class
// NOT used by GetListWithFilter — kept for future /students/[id] detail page
// ---------------------------------------------------------------------------

export interface StudentGrid {
  id: string
  subId: string | null
  sortOrder: number
  firstName: string | null
  lastName: string | null
  studentName: string | null
  englishName: string | null
  class: string | null
  fatherName: string | null
  fatherPhone: string | null
  motherName: string | null
  motherPhone: string | null
  address: string | null
  traits: string | null
  birthday: string | null
  studentType: number      // ClassType enum value
  classType: string | null
  elAccount: string | null
  suspendDate: string | null
  terminateDate: string | null
  beginDate: string | null
  valDropdown: string | null
  catchUpScheduleStudentId: string | null
  isFinish: boolean
}

// ---------------------------------------------------------------------------
// ClassDropdownItem — for class filter dropdown
// Matches: GET /api/ClassCourses/GetClassCourseDropDown/{userId}
// ---------------------------------------------------------------------------

export interface ClassDropdownItem {
  id: string
  name: string
  /** Campus this class belongs to — used for cascading filter */
  campusId: string
  /** Level this class belongs to — used for cascading filter */
  levelId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive student status from nullable date fields */
export function deriveStudentStatus(
  student: Pick<AcademicStudentGrid, 'suspendDate' | 'terminateDate'>,
): StudentStatus {
  if (student.terminateDate) return 'Terminated'
  if (student.suspendDate) return 'Suspended'
  return 'Active'
}

/** Check if student is active (no suspend or terminate date) */
export function isStudentActive(
  student: Pick<AcademicStudentGrid, 'suspendDate' | 'terminateDate'>,
): boolean {
  return !student.suspendDate && !student.terminateDate
}

/**
 * Format ISO date string to dd/MM/yyyy display format.
 * Prefers backend pre-formatted strings when available.
 */
export function formatStudentDate(iso: string | null): string {
  if (!iso) return '—'

  // If already in DD/MM/YYYY format, return as-is
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(iso)) {
    return iso
  }

  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  } catch {
    return '—'
  }
}

/** Get status badge variant for styling */
export function getStatusBadgeConfig(status: StudentStatus): {
  label: string
  className: string
} {
  switch (status) {
    case 'Active':
      return {
        label: 'Active',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
      }
    case 'Suspended':
      return {
        label: 'Suspended',
        className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
      }
    case 'Terminated':
      return {
        label: 'Terminated',
        className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
      }
  }
}

/** Get initials from student name for Avatar fallback */
export function getStudentInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ---------------------------------------------------------------------------
// Student Detail — GET /api/Student/{id}
// Full entity with ClassStudents navigation (for detail page)
// ---------------------------------------------------------------------------

export interface StudentDetail {
  id: string
  studentName: string | null
  englishName: string | null
  birthday: string | null
  address: string | null
  beginDate: string | null
  suspendDate: string | null
  suspendMonths: number | null
  suspendReason: string | null
  terminateDate: string | null
  terminateReason: string | null
  traits: string | null
  note: string | null
  yob: number | null
  rating: number | null
  firstCourse: string | null
  renewCourse: string | null
  /** NotMapped — injected from StudentExternalAccount */
  elAccount: string | null
  classStudents: ClassStudentEntry[]
  /** V2 API: current campus info (from /students/all or detail endpoint) */
  campusId?: string | null
  campusName?: string | null
  campusAddress?: string | null
  /** V2 API: current level info (from /students/all or detail endpoint) */
  levelId?: string | null
  levelName?: string | null
  /** V2 API: current student type (1=Regular, 2=CatchUp, 3=Demo, 4=Suspended, 5=Terminated) */
  currentStudentType?: number | null
  currentStudentTypeName?: string | null
}

export interface ClassStudentEntry {
  id: string
  studentId: string
  classId: string
  sortOrder: number | null
  /** ClassType enum: 1=Regular, 2=CatchUp, 3=Demo, 4=Suspended, 5=Terminated */
  studentType: number
  numberOfDemoSessions: number
  registerDate: string | null
  /** Class name — from V2 /students/{id} response */
  className: string | null
}

// ---------------------------------------------------------------------------
// Parent Info — GET /api/StudentParents/getParentByStudentIds/{studentId}
// Returns all parents linked to a student
// ---------------------------------------------------------------------------

export interface ParentInfo {
  id: string
  name: string | null
  /** 1=Father, 2=Mother */
  relation: number
  phoneNumber: string | null
  email: string | null
  address: string | null
  job: string | null
  yob: number | null
}

/** Parent relation display labels */
export const PARENT_RELATION_LABELS: Record<number, string> = {
  1: 'Father',
  2: 'Mother',
}

// ---------------------------------------------------------------------------
// Zod Schemas — Student Edit Form
// Matches: PUT /api/Student/{id} request body
// ---------------------------------------------------------------------------

export const StudentEditFormSchema = z.object({
  studentName: z.string().min(1, 'Student name is required'),
  englishName: z.string().optional(),
  birthday: z.string().optional(),
  address: z.string().optional(),
  elAccount: z.string().optional(),
  traits: z.string().optional(),
  note: z.string().optional(),
  beginDate: z.string().optional(),
})

export type StudentEditFormInput = z.infer<typeof StudentEditFormSchema>

// ---------------------------------------------------------------------------
// Zod Schemas — Parent Edit Form
// Matches: PUT /api/Parents/{id} or POST /api/Parents/CreateParent/{studentId}
// ---------------------------------------------------------------------------

export const ParentEditFormSchema = z.object({
  name: z.string().min(1, 'Parent name is required'),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  job: z.string().optional(),
  yob: z.coerce.number().optional(),
  relation: z.number().min(1).max(2),
})

export type ParentEditFormInput = z.infer<typeof ParentEditFormSchema>

// ---------------------------------------------------------------------------
// Student Payment Info — GET /api/StudentCourses/GetStudentPaymentInfo/{studentId}
// Aggregated payment summary stats
// ---------------------------------------------------------------------------

export interface StudentPaymentInfo {
  totalSessions: number
  totalStudiedSessions: number
  totalRemainSessions: number
  paymentRemaining: number
  numberOfAbsences: number
  numberOfFrequentAbsences: number
  endDateOfSession: string | null
  lastAttendanceDate: string | null
}

// ---------------------------------------------------------------------------
// Student Course Entry — GET /api/StudentCourses/GetStudentPaymentList/{studentId}
// Payment / course history rows
// ---------------------------------------------------------------------------

export interface StudentCourseEntry {
  id: string
  name: string | null
  startDate: string | null
  endDate: string | null
  numberOfSession: number
  amount: number | null
  /** TransferTypeEnum: 1=Cash, 2=Bank, 3=Other, 4=Card */
  transferType: number | null
  /** TypeEnum: 1=New, 2=Renew, 4=Demo, 5=Scholarship */
  type: number | null
}

/** TransferType display labels */
export const TRANSFER_TYPE_LABELS: Record<number, string> = {
  1: 'Cash',
  2: 'Bank Transfer',
  3: 'Other',
  4: 'Card',
}

/** CourseType display labels */
export const COURSE_TYPE_LABELS: Record<number, string> = {
  1: 'New',
  2: 'Renew',
  4: 'Demo',
  5: 'Scholarship',
}

// ---------------------------------------------------------------------------
// Student Learning Outcome — GET /api/Student/GetStudentViewLearningOutcomes/{id}
// Attendance + star score data for heatmap + performance chart
// ---------------------------------------------------------------------------

export interface StudentLearningOutcome {
  id: string
  /** 0=absent, 1=present */
  present: number
  starScore: number
  note: string | null
  lesson: string | null
  subject: string | null
  /** API field: className */
  className: string | null
  /** API field: levelName */
  levelName: string | null
  /** Format: "MM/dd/yyyy hh:mm tt" (US format via CultureInfo.InvariantCulture) */
  logDateTime: string | null
}

// ---------------------------------------------------------------------------
// Student Schedule — GET /api/Student/GetScheduleStudent/{id}
// Class schedule info
// ---------------------------------------------------------------------------

export interface StudentSchedule {
  id: string
  class: string | null
  teacher: string | null
  classRoom: string | null
  startDate: string | null
  endDate: string | null
  startTime: string | null
  endTime: string | null
  /** Scheduled days e.g. "Mon, Wed, Fri" */
  schedule: string | null
  /** Remaining class days (string representation, typo in legacy codebase) */
  learningProccess: string | null
}
