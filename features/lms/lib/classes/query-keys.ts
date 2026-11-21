// ---------------------------------------------------------------------------
// lib/classes/query-keys.ts
// Centralized TanStack Query key factories for Classes module
// Prevents cache key drift across hooks
// ---------------------------------------------------------------------------

export const classKeys = {
  all: ['classes'] as const,
  lists: () => ['classes', 'list'] as const,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: (finished: 0 | 1, params?: any) =>
    [...classKeys.lists(), finished, params] as const,
  listAll: (finished: 0 | 1) =>
    [...classKeys.lists(), 'all', finished] as const,
  dropdown: () => ['classes', 'dropdown'] as const,
  detail: (id: string) => ['classes', id] as const,
  info: (id: string) => ['classes', 'info', id] as const,
  teachers: (classId: string) => ['classes', 'teachers', classId] as const,
  lessons: (classId: string) => ['classes', 'lessons', classId] as const,
  lessonDetail: (id: string) => ['classes', 'lesson-detail', id] as const,
  students: (classId: string) => ['classes', 'students', classId] as const,
  suspendedStudents: (classId: string) =>
    ['classes', 'suspended-students', classId] as const,
  studentSessionStats: (classId: string) =>
    ['classes', 'student-session-stats', classId] as const,
  lessonLogs: (userId: string, classId: string) =>
    ['classes', 'lesson-logs', userId, classId] as const,
  studentReport: (logId: string) =>
    ['classes', 'student-report', logId] as const,
  lessonReport: (logId: string) =>
    ['classes', 'lesson-report', logId] as const,
  lessonLogInfo: (logId: string) =>
    ['classes', 'lesson-log-info', logId] as const,
  assessmentCriteria: () =>
    ['classes', 'assessment-criteria'] as const,
  studentAssessments: (classLessonId: string) =>
    ['classes', 'student-assessments', classLessonId] as const,
  examTemplates: (classId: string) =>
    ['classes', 'exam-templates', classId] as const,
  examResultForm: (classId: string, studentId: string, examType: number) =>
    ['classes', 'exam-result-form', classId, studentId, examType] as const,
  allTeachers: () =>
    ['all-teachers'] as const,
}

export const campusKeys = {
  all: ['campuses'] as const,
  byUser: (userId: string) => ['campuses', userId] as const,
}
