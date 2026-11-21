// ---------------------------------------------------------------------------
// lib/classes/api.ts — V2 Class Management API
// Routes: api/v2/class/classes/*, api/v2/class/assessments/*
// Gap endpoints (WorkLog, teachers lookup) stay on V1.
// ---------------------------------------------------------------------------

import { api, queryPaged, type Filter, type PagedResult } from "@/features/lms/lib/transport"
import type {
  ClassCourseGrid,
  ClassCourseEntity,
  ClassCourseInfo,
  ClassTeacherGrid,
  Campus,
  CreateClassInput,
} from "@/features/lms/types/class"
import type { ClassLessonGrid } from "@/features/lms/types/class-lesson"
import type { ClassStudentGrid, StudentSessionStats } from "@/features/lms/types/class-student"
import type {
  LessonLogEntry,
  StudentLogEntry,
  LessonStatEntry,
  LessonLogInfo,
  AssessmentCriteria,
  StudentAssessmentEntry,
} from "@/features/lms/types/class-report"
import type {
  ExamTemplateResponse,
  ExamResultResponse,
  SaveExamResultInput,
} from "@/features/lms/types/exam-result"
import type { AllTeacher } from "@/features/lms/types/worklog"

// ---- V2 route prefixes ------------------------------------------------------

const CLASSES_API = "/api/v2/class/classes"
const ASSESSMENTS_API = "/api/v2/class/assessments"
const REPORTS_API = "/api/v2/reports"

// =========================================================================
// ClassCourse — V2 (RESTful routes)
// =========================================================================

/** POST /api/v2/class/classes/query */
export async function fetchClassList(
  userId: string,
  finishedClasses: 0 | 1,
  params?: {
    page?: number
    pageSize?: number
    search?: string
    sort?: { field: string; desc: boolean }[]
  }
): Promise<PagedResult<ClassCourseGrid>> {
  const filters: Filter[] = []

  if (finishedClasses === 0) {
    // Only non-finished classes
    filters.push({ field: "isFinished", operator: "eq", value: "false" })
  } else if (finishedClasses === 1) {
    // Only finished classes
    filters.push({ field: "isFinished", operator: "eq", value: "true" })
  }
  // finishedClasses = 2 (or other) → no filter, return all

  return queryPaged<ClassCourseGrid>(`${CLASSES_API}/query`, {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    search: params?.search,
    filters: filters.length > 0 ? { filters } : undefined,
    sort: params?.sort ?? [{ field: "createdDate", desc: true }],
  })
}

/**
 * Fetch ALL classes for client-side table processing.
 * GET /api/v2/class/classes/all — no pagination, campus-scoped via JWT.
 */
export async function fetchAllClasses(
  finishedClasses: 0 | 1,
): Promise<ClassCourseGrid[]> {
  return api.get<ClassCourseGrid[]>(
    `${CLASSES_API}/all?includeFinished=${finishedClasses === 1}`
  )
}

/** GET /api/v2/class/classes/{id} */
export async function fetchClassById(id: string): Promise<ClassCourseEntity> {
  return api.get<ClassCourseEntity>(`${CLASSES_API}/${id}`)
}

/** POST /api/v2/class/classes */
export async function createClass(data: CreateClassInput): Promise<ClassCourseEntity> {
  return api.post<ClassCourseEntity>(`${CLASSES_API}`, data)
}

/** PUT /api/v2/class/classes/{id} */
export async function updateClass(id: string, data: CreateClassInput): Promise<void> {
  return api.put<void>(`${CLASSES_API}/${id}`, data)
}

/** DELETE /api/v2/class/classes/{id} */
export async function deleteClass(id: string): Promise<void> {
  return api.delete<void>(`${CLASSES_API}/${id}`)
}

/** GET /api/v2/class/classes/dropdown */
export async function fetchClassDropdown(): Promise<{ id: string; name: string }[]> {
  return api.get<{ id: string; name: string }[]>(`${CLASSES_API}/dropdown`)
}

/** GET /api/v2/class/classes/my-classes */
export async function fetchMyClasses(): Promise<{ id: string; name: string }[]> {
  return api.get<{ id: string; name: string }[]>(`${CLASSES_API}/my-classes`)
}

// =========================================================================
// Campus — V2
// =========================================================================

/** GET /api/v2/lookups/lookups/campuses */
export async function fetchCampusList(userId: string): Promise<Campus[]> {
  return api.get<Campus[]>(`/api/v2/lookups/lookups/campuses`)
}

// =========================================================================
// Class Detail — V2
// =========================================================================

/** GET /api/v2/class/classes/{id}/info */
export async function fetchClassInfo(id: string): Promise<ClassCourseInfo> {
  return api.get<ClassCourseInfo>(`${CLASSES_API}/${id}/info`)
}

// =========================================================================
// Class Teachers — V2
// =========================================================================

/** GET /api/v2/class/classes/{classId}/teachers */
export async function fetchClassTeachers(classId: string): Promise<ClassTeacherGrid[]> {
  return api.get<ClassTeacherGrid[]>(`${CLASSES_API}/${classId}/teachers`)
}

/** GET /api/v2/class/classes/{classId}/teachers/available */
export async function fetchAvailableTeachers(classId: string): Promise<ClassTeacherGrid[]> {
  return api.get<ClassTeacherGrid[]>(`${CLASSES_API}/${classId}/teachers/available`)
}

/** PUT /api/v2/class/classes/{classId}/teachers */
export async function assignTeachers(classId: string, teacherIds: string[]): Promise<void> {
  return api.put<void>(`${CLASSES_API}/${classId}/teachers`, { teacherIds })
}

/** POST /api/v2/class/classes/{classId}/teachers/swap-primary */
export async function swapPrimaryTeacher(classId: string): Promise<void> {
  return api.post<void>(`${CLASSES_API}/${classId}/teachers/swap-primary`, {})
}

/** DELETE /api/v2/class/classes/{classId}/teachers/{teacherId} */
export async function removeTeacher(classId: string, teacherId: string): Promise<void> {
  return api.delete<void>(`${CLASSES_API}/${classId}/teachers/${teacherId}`)
}

// =========================================================================
// ClassLesson — V2
// =========================================================================

/** GET /api/v2/class/classes/{classId}/lessons */
export async function fetchClassLessons(classId: string): Promise<ClassLessonGrid[]> {
  return api.get<ClassLessonGrid[]>(`${CLASSES_API}/${classId}/lessons`)
}

/** GET /api/v2/class/classes/{classId}/lessons/available */
export async function fetchAvailableLessons(classId: string): Promise<{ id: string; lesson: string; subject: string }[]> {
  return api.get<{ id: string; lesson: string; subject: string }[]>(`${CLASSES_API}/${classId}/lessons/available`)
}

/** POST /api/v2/class/classes/{classId}/lessons */
export async function addLessons(classId: string, lessonIds: string[]): Promise<void> {
  return api.post<void>(`${CLASSES_API}/${classId}/lessons`, lessonIds)
}

/** POST /api/v2/class/classes/{classId}/lessons/sync-all */
export async function syncAllLessons(classId: string): Promise<void> {
  return api.post<void>(`${CLASSES_API}/${classId}/lessons/sync-all`, {})
}

/** DELETE /api/v2/class/classes/{classId}/lessons/{id} */
export async function removeLesson(classId: string, id: string): Promise<void> {
  return api.delete<void>(`${CLASSES_API}/${classId}/lessons/${id}`)
}

// =========================================================================
// ClassStudents — V2
// =========================================================================

/** GET /api/v2/class/classes/{classId}/students */
export async function fetchClassStudents(classId: string): Promise<ClassStudentGrid[]> {
  return api.get<ClassStudentGrid[]>(`${CLASSES_API}/${classId}/students`)
}

/** GET /api/v2/class/classes/{classId}/students/suspended */
export async function fetchSuspendedStudents(classId: string): Promise<ClassStudentGrid[]> {
  return api.get<ClassStudentGrid[]>(`${CLASSES_API}/${classId}/students/suspended`)
}

/** GET /api/v2/class/classes/{classId}/students/attendance */
export async function fetchAttendanceStudents(classId: string): Promise<ClassStudentGrid[]> {
  return api.get<ClassStudentGrid[]>(`${CLASSES_API}/${classId}/students/attendance`)
}

/** POST /api/v2/class/classes/{classId}/students/enroll */
export async function enrollStudents(classId: string, studentIds: string[], studentType?: number): Promise<void> {
  return api.post<void>(`${CLASSES_API}/${classId}/students/enroll`, { studentIds, studentType: studentType ?? 0 })
}

/** PUT /api/v2/class/classes/{classId}/students/{id}/type */
export async function updateStudentType(classId: string, id: string, studentType: number): Promise<void> {
  return api.put<void>(`${CLASSES_API}/${classId}/students/${id}/type`, { studentType })
}

/** DELETE /api/v2/class/classes/{classId}/students/{id} */
export async function removeStudent(classId: string, id: string): Promise<void> {
  return api.delete<void>(`${CLASSES_API}/${classId}/students/${id}`)
}

/** GET /api/v2/class/classes/{classId}/students/free */
export async function fetchFreeStudents(classId: string): Promise<{ id: string; studentName: string; englishName?: string }[]> {
  return api.get<{ id: string; studentName: string; englishName?: string }[]>(`${CLASSES_API}/${classId}/students/free`)
}

/** GET /api/v2/class/classes/{classId}/students/available */
export async function fetchAvailableStudents(classId: string): Promise<{ id: string; studentName: string; englishName?: string }[]> {
  return api.get<{ id: string; studentName: string; englishName?: string }[]>(`${CLASSES_API}/${classId}/students/available`)
}

// =========================================================================
// Reports — V2
// =========================================================================

/** GET /api/v2/class/classes/{classId}/reports/lesson-logs */
export async function fetchLessonLogs(
  userId: string,
  classId: string,
): Promise<LessonLogEntry[]> {
  return api.get<LessonLogEntry[]>(`${CLASSES_API}/${classId}/reports/lesson-logs`)
}

/** GET /api/v2/class/classes/{classId}/reports/{logId}/students */
export async function fetchStudentReport(logId: string, classId?: string): Promise<StudentLogEntry[]> {
  // classId required for sub-resource routing
  const cId = classId ?? "_"
  return api.get<StudentLogEntry[]>(`${CLASSES_API}/${cId}/reports/${logId}/students`)
}

/** PUT /api/v2/class/classes/{classId}/reports/{logId}/students/{id} */
export async function saveStudentLessonLog(
  id: string,
  data: { present: number; starScore: number; note: string },
  classId?: string,
  logId?: string,
): Promise<void> {
  const cId = classId ?? "_"
  const lId = logId ?? "_"
  return api.put<void>(`${CLASSES_API}/${cId}/reports/${lId}/students/${id}`, data)
}

/** POST /api/v2/reports/StudentReport (filtered by classId) */
export async function fetchStudentSessionStats(
  classId: string,
): Promise<StudentSessionStats[]> {
  const result = await queryPaged<StudentSessionStats>(`${REPORTS_API}/StudentReport`, {
    pageSize: 500,
    filters: { filters: [{ field: "classId", operator: "eq", value: classId }] },
  })
  return result.items
}

/** GET /api/v2/reports/LessonReport/{logId} — V1 gap endpoint */
export async function fetchLessonReport(logId: string): Promise<LessonStatEntry[]> {
  const result = await queryPaged<LessonStatEntry>(`${REPORTS_API}/LessonReport`, {
    pageSize: 500,
    filters: { filters: [{ field: "logId", operator: "eq", value: logId }] },
  })
  return result.items
}

/** GET (v1 gap) — lesson log info */
export async function fetchLessonLogInfo(logId: string): Promise<LessonLogInfo> {
  return api.get<LessonLogInfo>(`/api/TeacherLessonLog/${encodeURIComponent(logId)}`)
}

// =========================================================================
// StudentAssessment — V2
// =========================================================================

/** GET /api/v2/class/assessments/criteria */
export async function fetchAssessmentCriteria(): Promise<AssessmentCriteria[]> {
  return api.get<AssessmentCriteria[]>(`${ASSESSMENTS_API}/criteria`)
}

/** GET /api/v2/class/assessments/classes/{classLessonId}/scores */
export async function fetchStudentAssessments(
  classLessonId: string,
): Promise<StudentAssessmentEntry[]> {
  return api.get<StudentAssessmentEntry[]>(`${ASSESSMENTS_API}/classes/${classLessonId}/scores`)
}

/** POST /api/v2/class/assessments */
export async function addStudentAssessment(
  data: { studentLessonLogId: string; assessmentCriteriaId: string; score?: number },
): Promise<StudentAssessmentEntry> {
  return api.post<StudentAssessmentEntry>(`${ASSESSMENTS_API}`, data)
}

/** PUT /api/v2/class/assessments/{id} */
export async function saveStudentAssessment(
  id: string,
  data: { score: number; studentLessonLogId: string; assessmentCriteriaId: string },
): Promise<void> {
  return api.put<void>(`${ASSESSMENTS_API}/${id}`, data)
}

// =========================================================================
// Exams — V2
// =========================================================================

/** GET /api/v2/class/classes/{classId}/exams/templates */
export async function fetchExamTemplates(classId: string): Promise<ExamTemplateResponse[]> {
  return api.get<ExamTemplateResponse[]>(`${CLASSES_API}/${classId}/exams/templates`)
}

/** GET /api/v2/class/classes/{classId}/exams/students/{studentId}/results/{examType} */
export async function fetchExamResultForm(
  classId: string,
  studentId: string,
  examType: number,
): Promise<ExamResultResponse> {
  return api.get<ExamResultResponse>(`${CLASSES_API}/${classId}/exams/students/${studentId}/results/${examType}`)
}

/** POST /api/v2/class/classes/{classId}/exams/results */
export async function saveExamResult(data: SaveExamResultInput & { classId: string }): Promise<void> {
  return api.post<void>(`${CLASSES_API}/${data.classId}/exams/results`, data)
}

// =========================================================================
// Events — V2
// =========================================================================

/** GET /api/v2/class/classes/{classId}/events */
export async function fetchClassEvents(classId: string) {
  return api.get(`${CLASSES_API}/${classId}/events`)
}

/** GET /api/v2/class/events/user — notifications for current user */
export async function fetchUserEvents() {
  return api.get(`/api/v2/class/events/user`)
}

// =========================================================================
// @gap V1 — Teacher lookup (no V2 equivalent)
// =========================================================================

export async function fetchAllTeachers(): Promise<AllTeacher[]> {
  const data = await api.get<Array<Omit<AllTeacher, "fullName">>>("/api/AspNetUsers/teacher")
  return data.map((t) => ({
    ...t,
    fullName: `${t.firstName} ${t.lastName}`.trim(),
  }))
}
