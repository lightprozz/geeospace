// ---------------------------------------------------------------------------
// lib/lets-learn/api.ts — V2 Lesson Delivery API
// Routes: api/v2/lesson-delivery/units/*, api/v2/lesson-delivery/lesson-log/*
// All endpoints now use V2. No more @gap V1 endpoints.
// ---------------------------------------------------------------------------

import { api } from '@/features/lms/lib/transport'
import type {
  LessonUnit,
  LessonPlanContent,
  StudentLog,
  AssessmentCriteria,
  StudentAssessment,
} from '@/features/lms/types/lets-learn'

// ---- V2 route prefixes --------------------------------------------------

const UNITS = '/api/v2/lesson-delivery/units'
const LOG = '/api/v2/lesson-delivery/lesson-log'

// =========================================================================
// Lesson Plan Units — V2
// =========================================================================

/** GET /api/v2/lesson-delivery/units/{classLessonId} */
export async function fetchMyLesson(classLessonId: string): Promise<LessonUnit[]> {
  return api.get<LessonUnit[]>(`${UNITS}/${classLessonId}`)
}

/**
 * GET /api/v2/lesson-delivery/units/{classLessonId}
 * In V2 both sources resolve to the same units endpoint.
 * Kept as a separate function for hook backward-compatibility.
 */
export async function fetchLessonPlanContent(
  classLessonId: string,
): Promise<LessonUnit[]> {
  return api.get<LessonUnit[]>(`${UNITS}/${classLessonId}`)
}

/** GET /api/v2/lesson-delivery/units/{classLessonId}/lesson-plan — metadata only */
export async function fetchLessonPlanMetadata(
  classLessonId: string,
): Promise<LessonPlanContent> {
  return api.get<LessonPlanContent>(`${UNITS}/${classLessonId}/lesson-plan`)
}

// =========================================================================
// Lesson Log — V2
// =========================================================================

/** POST /api/v2/lesson-delivery/lesson-log/init */
export async function initLessonLog(
  classLessonId: string,
  teacherId?: string,
): Promise<{ lessonLogId: string; isNew: boolean }> {
  return api.post<{ lessonLogId: string; isNew: boolean }>(`${LOG}/init`, {
    classLessonId,
    teacherId,
  })
}

/** GET /api/v2/lesson-delivery/lesson-log/{logId}/students?classId= */
export async function fetchStudentLogs(
  logId: string,
  classId?: string,
): Promise<StudentLog[]> {
  const q = classId ? `?classId=${classId}` : ''
  return api.get<StudentLog[]>(`${LOG}/${logId}/students${q}`)
}

/** PUT /api/v2/lesson-delivery/lesson-log/student/{studentLogId} */
export async function saveStudentLog(
  studentLogId: string,
  data: { present: number; starScore: number; note?: string },
): Promise<void> {
  await api.put(`${LOG}/student/${studentLogId}`, data)
}

/** POST /api/v2/lesson-delivery/lesson-log/{logId}/init-units */
export async function initUnitLogs(logId: string): Promise<void> {
  await api.post(`${LOG}/${logId}/init-units`, {})
}

/** GET /api/v2/lesson-delivery/lesson-log/{logId}/units */
export async function fetchUnitLogs(logId: string): Promise<LessonUnit[]> {
  return api.get<LessonUnit[]>(`${LOG}/${logId}/units`)
}

/** PUT /api/v2/lesson-delivery/lesson-log/unit/{logDataId} */
export async function saveUnitLog(
  logDataId: string,
  data: { duration: number; note?: string },
): Promise<void> {
  await api.put(`${LOG}/unit/${logDataId}`, data)
}

// =========================================================================
// Assessment — V2
// =========================================================================

/** GET /api/v2/lesson-delivery/lesson-log/assessment-criteria */
export async function fetchAssessmentCriteria(): Promise<AssessmentCriteria[]> {
  return api.get<AssessmentCriteria[]>(`${LOG}/assessment-criteria`)
}

/** GET /api/v2/lesson-delivery/lesson-log/{classLessonId}/assessments */
export async function fetchStudentAssessments(
  classLessonId: string,
): Promise<StudentAssessment[]> {
  return api.get<StudentAssessment[]>(`${LOG}/${classLessonId}/assessments`)
}

/** POST /api/v2/lesson-delivery/lesson-log/assessment */
export async function saveAssessment(data: {
  studentLessonLogId: string
  assessmentCriteriaId: string
  score: number
}): Promise<{ id: string; isNew: boolean }> {
  return api.post<{ id: string; isNew: boolean }>(`${LOG}/assessment`, data)
}
