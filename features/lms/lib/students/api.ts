// ---------------------------------------------------------------------------
// lib/students/api.ts — V2 Student & Parent API (Fully migrated)
// All endpoints use api/v2/student/* routes
// ---------------------------------------------------------------------------

import { api } from '@/features/lms/lib/transport'
import type {
  AcademicFilterParams,
  AcademicStudentGrid,
  StudentAllItem,
  ClassDropdownItem,
  StudentDetail,
  ParentInfo,
  ParentEditFormInput,
  StudentPaymentInfo,
  StudentCourseEntry,
  StudentLearningOutcome,
  StudentSchedule,
} from '@/features/lms/types/student'

// ---- V2 route prefixes -------------------------------------------------------

const STUDENT_API = '/api/v2/student/students'
const PARENT_API = '/api/v2/student/parents'

// =========================================================================
// @gap V1 — AcademicManage/GetListWithFilter (complex filters not yet in V2)
// =========================================================================

export async function fetchStudentsWithFilter(
  userId: string,
  params: AcademicFilterParams,
): Promise<AcademicStudentGrid[]> {
  return api.post<AcademicStudentGrid[]>(
    `/api/AcademicManage/GetListWithFilter/${encodeURIComponent(userId)}`,
    params,
  )
}

// =========================================================================
// Student List — V2 (GET all, client-side table processing)
// =========================================================================

/**
 * Fetch ALL students for client-side table processing.
 * Uses GET /api/v2/student/students/all.
 * Campus-scoped via JWT.
 * Returns StudentAllItem with currentClassId, campusId, levelId for filtering.
 */
export async function fetchAllStudentsV2(): Promise<StudentAllItem[]> {
  return api.get<StudentAllItem[]>(`${STUDENT_API}/all`)
}

/**
 * @deprecated Use fetchAllStudentsV2 instead
 */
export async function fetchAllStudents(): Promise<AcademicStudentGrid[]> {
  return api.get<AcademicStudentGrid[]>(`${STUDENT_API}/all`)
}

// =========================================================================
// @gap V1 — ClassCourses/GetClassCourseDropDown (no V2 equivalent)
// =========================================================================

export async function fetchClassDropdown(
  userId: string,
): Promise<ClassDropdownItem[]> {
  return api.get<ClassDropdownItem[]>(
    `/api/ClassCourses/GetClassCourseDropDown/${encodeURIComponent(userId)}`,
  )
}

// =========================================================================
// Student Detail — V2
// =========================================================================

/** GET /api/v2/student/students/{id} */
export async function fetchStudentDetail(id: string): Promise<StudentDetail> {
  return api.get<StudentDetail>(`${STUDENT_API}/${id}`)
}

/** @deprecated Use fetchStudentDetail */
export async function fetchStudentById(id: string): Promise<AcademicStudentGrid> {
  return api.get<AcademicStudentGrid>(`${STUDENT_API}/${id}`)
}

/** PUT /api/v2/student/students/{id} */
export async function updateStudent(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await api.put(`${STUDENT_API}/${id}`, data)
}

// =========================================================================
// Parents — V2 (nested under student)
// =========================================================================

/** GET /api/v2/student/students/{studentId}/parents */
export async function fetchStudentParents(
  studentId: string,
): Promise<ParentInfo[]> {
  return api.get<ParentInfo[]>(`${STUDENT_API}/${studentId}/parents`)
}

/** POST /api/v2/student/students/{studentId}/parents — create & auto-link */
export async function createParentForStudent(
  studentId: string,
  data: Record<string, unknown>,
): Promise<ParentInfo> {
  return api.post<ParentInfo>(`${STUDENT_API}/${studentId}/parents`, data)
}

/** POST /api/v2/student/students/{studentId}/parents/{parentId}/link */
export async function linkParentToStudent(
  parentId: string,
  studentId: string,
  { relation }: Pick<ParentEditFormInput, 'relation'>,
): Promise<void> {
  await api.post(`${STUDENT_API}/${studentId}/parents/${parentId}/link`, { relation })
}

/** PUT /api/v2/student/parents/{id} */
export async function updateParent(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  await api.put(`${PARENT_API}/${id}`, data)
}

/** GET /api/v2/student/parents/search?q= */
export async function searchParents(query: string): Promise<ParentInfo[]> {
  return api.get<ParentInfo[]>(`${PARENT_API}/search?q=${encodeURIComponent(query)}`)
}

/** POST /api/v2/student/parents/query (all parents, unwrapped) */
export async function fetchAllParents(): Promise<ParentInfo[]> {
  const result = await searchParents('')
  return result
}

// =========================================================================
// Payment — V2
// =========================================================================

/** GET /api/v2/student/students/{studentId}/payment-summary */
export async function fetchStudentPaymentInfo(
  studentId: string,
): Promise<StudentPaymentInfo> {
  return api.get<StudentPaymentInfo>(`${STUDENT_API}/${studentId}/payment-summary`)
}

/** GET /api/v2/student/students/{studentId}/payments */
export async function fetchStudentPaymentList(
  studentId: string,
): Promise<StudentCourseEntry[]> {
  return api.get<StudentCourseEntry[]>(`${STUDENT_API}/${studentId}/payments`)
}

// =========================================================================
// Learning Outcomes — V2
// =========================================================================

/** GET /api/v2/student/students/{id}/learning-outcomes */
export async function fetchStudentLearningOutcomes(
  id: string,
): Promise<StudentLearningOutcome[]> {
  return api.get<StudentLearningOutcome[]>(`${STUDENT_API}/${id}/learning-outcomes`)
}

// =========================================================================
// Student Schedule — V2
// =========================================================================

/** GET /api/v2/student/students/{id}/schedule */
export async function fetchStudentSchedule(
  id: string,
): Promise<StudentSchedule[]> {
  return api.get<StudentSchedule[]>(`${STUDENT_API}/${id}/schedule`)
}

// =========================================================================
// Lifecycle — V2
// =========================================================================

/** POST /api/v2/student/students/{id}/suspend */
export async function suspendStudent(
  id: string,
  data: { suspendMonths: number; suspendReason?: string },
): Promise<void> {
  await api.post(`${STUDENT_API}/${id}/suspend`, data)
}

/** POST /api/v2/student/students/{id}/terminate */
export async function terminateStudent(
  id: string,
  data: { terminateReason?: string },
): Promise<void> {
  await api.post(`${STUDENT_API}/${id}/terminate`, data)
}

/** POST /api/v2/student/students/{id}/change-class */
export async function changeStudentClass(
  id: string,
  data: { currentClassId: string; newClassId: string; studentType?: number },
): Promise<void> {
  await api.post(`${STUDENT_API}/${id}/change-class`, data)
}

/** POST /api/v2/student/students/{id}/parallel-class */
export async function parallelStudentClass(
  id: string,
  data: { currentClassId: string; parallelClassId: string; studentType?: number },
): Promise<void> {
  await api.post(`${STUDENT_API}/${id}/parallel-class`, data)
}

// =========================================================================
// Enrollment — V2
// =========================================================================

/** POST /api/v2/student/students/{id}/enroll */
export async function enrollStudent(
  id: string,
  data: { classId: string; studentType?: number },
): Promise<void> {
  await api.post(`${STUDENT_API}/${id}/enroll`, data)
}

// =========================================================================
// @gap V1 — fetchParentByRelation (no V2 equivalent — can use search)
// =========================================================================

export async function fetchParentByRelation(
  studentId: string,
  relation: number,
): Promise<ParentInfo | null> {
  const parents = await fetchStudentParents(studentId)
  return parents.find(p => p.relation === relation) ?? null
}
