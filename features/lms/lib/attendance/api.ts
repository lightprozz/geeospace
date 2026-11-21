// ---------------------------------------------------------------------------
// lib/attendance/api.ts — V2 Attendance & CatchUp API
// Routes: api/v2/attendance/catchups/*, api/v2/attendance/events/*
// All endpoints now use V2. No more @gap V1 endpoints.
// ---------------------------------------------------------------------------

import { api, queryPaged } from '@/features/lms/lib/transport'
import type {
  CatchUpScheduleGrid,
  CatchUpEntity,
  CatchUpFormValues,
  AbsentStudent,
  SingleLessonDto,
  SingleLessonFormValues,
  ClassLessonOption,
  ClassCourseOption,
  BranchStudent,
  BranchTeacher,
} from '@/features/lms/types/attendance'

// ---- V2 route prefixes --------------------------------------------------

const CATCHUP = '/api/v2/attendance/catchups'
const EVENTS = '/api/v2/attendance/events'

// =========================================================================
// CatchUp Schedules — V2
// =========================================================================

/** POST /api/v2/attendance/catchups/query */
export async function fetchCatchUpsByTeacher(): Promise<CatchUpScheduleGrid[]> {
  const result = await queryPaged<CatchUpScheduleGrid>(`${CATCHUP}/query`, {
    pageSize: 500,
    sort: [{ field: 'createDate', desc: true }],
  })
  return result.items
}

/** GET /api/v2/attendance/catchups/{id} */
export async function fetchCatchUpById(id: string): Promise<CatchUpEntity> {
  return api.get<CatchUpEntity>(`${CATCHUP}/${id}`)
}

/** POST /api/v2/attendance/catchups */
export async function createCatchUp(data: CatchUpFormValues): Promise<void> {
  await api.post(CATCHUP, data)
}

/** PUT /api/v2/attendance/catchups/{id} */
export async function updateCatchUp(
  id: string,
  data: CatchUpFormValues,
): Promise<void> {
  await api.put(`${CATCHUP}/${id}`, data)
}

/** DELETE /api/v2/attendance/catchups/{id} */
export async function deleteCatchUp(id: string): Promise<void> {
  await api.delete(`${CATCHUP}/${id}`)
}

// =========================================================================
// Absent Students — V2
// =========================================================================

/** GET /api/v2/attendance/catchups/absent */
export async function fetchAbsentStudents(): Promise<AbsentStudent[]> {
  return api.get<AbsentStudent[]>(`${CATCHUP}/absent`)
}

// =========================================================================
// CatchUp Lookups — V2
// =========================================================================

/** GET /api/v2/attendance/catchups/lookups/class-lessons */
export async function fetchClassLessonsByTeacher(): Promise<ClassLessonOption[]> {
  return api.get<ClassLessonOption[]>(`${CATCHUP}/lookups/class-lessons`)
}

/** GET /api/v2/attendance/catchups/lookups/class-courses */
export async function fetchClassCourseSchedules(): Promise<ClassCourseOption[]> {
  return api.get<ClassCourseOption[]>(`${CATCHUP}/lookups/class-courses`)
}

// =========================================================================
// Single Lessons (Events) — V2
// =========================================================================

/** POST /api/v2/attendance/events/query */
export async function fetchSingleLessons(): Promise<SingleLessonDto[]> {
  const result = await queryPaged<SingleLessonDto>(`${EVENTS}/query`, {
    pageSize: 500,
    sort: [{ field: 'createdAt', desc: true }],
  })
  return result.items
}

/** GET /api/v2/attendance/events/{id} */
export async function fetchSingleLessonById(id: string): Promise<SingleLessonDto> {
  return api.get<SingleLessonDto>(`${EVENTS}/${id}`)
}

/** POST /api/v2/attendance/events */
export async function createSingleLesson(
  data: SingleLessonFormValues,
): Promise<{ id: string }> {
  return api.post<{ id: string }>(EVENTS, data)
}

/** PUT /api/v2/attendance/events/{id} */
export async function updateSingleLesson(
  id: string,
  data: SingleLessonFormValues,
): Promise<void> {
  await api.put(`${EVENTS}/${id}`, data)
}

/** DELETE /api/v2/attendance/events/{id} */
export async function deleteSingleLesson(id: string): Promise<void> {
  await api.delete(`${EVENTS}/${id}`)
}

/** PUT /api/v2/attendance/events/{id}/archive */
export async function archiveSingleLesson(id: string): Promise<void> {
  await api.put(`${EVENTS}/${id}/archive`, { isArchived: true })
}

/** GET /api/v2/attendance/events/{id}/check-approved */
export async function checkSingleLessonApproved(id: string): Promise<boolean> {
  const data = await api.get<{ approved: boolean }>(`${EVENTS}/${id}/check-approved`)
  return data.approved === true
}

/** POST /api/v2/attendance/events/{id}/approve — atomic V2 */
export async function approveSingleLesson(id: string): Promise<void> {
  await api.post(`${EVENTS}/${id}/approve`, {})
}

// =========================================================================
// Event Lookups — V2
// =========================================================================

/** GET /api/v2/attendance/events/lookups/students?branchId= */
export async function fetchStudentsByBranch(
  branchId: string,
): Promise<BranchStudent[]> {
  return api.get<BranchStudent[]>(`${EVENTS}/lookups/students?branchId=${branchId}`)
}

/** GET /api/v2/attendance/events/lookups/teachers?branchId= */
export async function fetchTeachersByBranch(
  branchId: string,
): Promise<BranchTeacher[]> {
  return api.get<BranchTeacher[]>(`${EVENTS}/lookups/teachers?branchId=${branchId}`)
}

// ---------------------------------------------------------------------------
// Re-exports — reuse existing campus/room endpoints
// ---------------------------------------------------------------------------

export { fetchCampusList } from '@/features/lms/lib/classes/api'
