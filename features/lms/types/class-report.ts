// ---------------------------------------------------------------------------
// types/class-report.ts
// TypeScript interfaces for Class Report (TeacherLessonLog) feature
// ---------------------------------------------------------------------------

/**
 * Session list row — from GetLessonLogsByClassId
 * Maps to MyClassLessonVo on the backend.
 */
export interface LessonLogEntry {
  id: string // logId (TeacherLessonLog.Id)
  routeId: string // classLessonId — used for navigation
  classLessonId: string
  classId: string
  level: string
  class: string
  schedule: string
  startTimeLocal: string
  endTimeLocal: string
  startTime: string // ISO datetime — lesson date
  lesson: string
  subject: string | null
  content: string
  tb: string
  reportBy: string // resolved from ModifiedBy/CreatedBy GUID → FullName
  reportDateTime: string // "dd/MM/yyyy HH:mm"
  lessonDate: string // "dd/MM/yyyy"
  logDateTime: string // ISO datetime
}

/**
 * Student attendance row — from GetClassStudentReport
 * Maps to MyClassStudentLogVo on the backend.
 */
export interface StudentLogEntry {
  id: string
  logId: string
  studentInfoId: string
  sortOrder: number
  studentName: string
  englishName: string
  present: number // AttendanceType enum value
  attendance: string // Localized description ("Có mặt", "Vắng mặt", etc.)
  starScore: number
  note: string
}

/**
 * Assessment criteria master data — from GetAssessmentCriteria
 * Maps to [dbo].[AssessmentCriteria] table.
 * Criteria: 1=Interact, 2=Attitude, 3=Focus (score 1–3 each)
 */
export interface AssessmentCriteria {
  id: string
  criteriaNumber: number
  name: string
}

/**
 * Student assessment entry — from GetStudentAssessmentOfClass
 * Maps to [dbo].[StudentAssessment] table.
 * Links StudentLessonLogData → AssessmentCriteria with a score.
 */
export interface StudentAssessmentEntry {
  id: string
  studentLessonLogId: string
  assessmentCriteriaId: string
  criteriaNumber: number
  studentId: string
  score: number
}

/**
 * Lesson execution stat row — from GetClassLessonReport
 * Maps to MyLessonLogVo on the backend.
 */
export interface LessonStatEntry {
  id: string
  sortOrder: number
  procedures: string
  time: string // plan time in minutes (string)
  actualTime: string // "mm:ss" from Duration (seconds)
  materials: string
  note: string
}

/**
 * Report header info — from GetClassLessonInfo
 * Extends LessonLogEntry with teacher details.
 */
export interface LessonLogInfo extends LessonLogEntry {
  classTeachers: Array<{
    id: string
    fullName: string
    englishName?: string | null
    phoneNumber?: string | null
  }>
  teachers: string // comma-separated teacher names
}

// ---------------------------------------------------------------------------
// AttendanceType — matches BE enum
// ---------------------------------------------------------------------------

export const AttendanceType = {
  NoAttendance: -1,
  Absent: 0,
  Present: 1,
  Catchup: 2,
  Demo: 3,
} as const

export type AttendanceTypeValue =
  (typeof AttendanceType)[keyof typeof AttendanceType]

/**
 * Human-readable label for each attendance type.
 */
export function getAttendanceLabel(value: number): string {
  switch (value) {
    case AttendanceType.Present:
      return 'Present'
    case AttendanceType.Absent:
      return 'Absent'
    case AttendanceType.Catchup:
      return 'Catchup'
    case AttendanceType.Demo:
      return 'Demo'
    case AttendanceType.NoAttendance:
    default:
      return 'Reserve'
  }
}

/**
 * Badge styling config for each attendance type.
 */
export function getAttendanceBadgeConfig(value: number): {
  label: string
  className: string
} {
  switch (value) {
    case AttendanceType.Present:
      return {
        label: 'Present',
        className:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
      }
    case AttendanceType.Absent:
      return {
        label: 'Absent',
        className:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400',
      }
    case AttendanceType.Catchup:
      return {
        label: 'Catchup',
        className:
          'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
      }
    case AttendanceType.Demo:
      return {
        label: 'Demo',
        className:
          'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400',
      }
    case AttendanceType.NoAttendance:
    default:
      return {
        label: 'Reserve',
        className:
          'border-border bg-muted text-muted-foreground',
      }
  }
}
