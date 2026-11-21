// ---------------------------------------------------------------------------
// lib/students/query-keys.ts
// TanStack Query key factories for Students Management module
// Same pattern as lib/users/query-keys.ts, lib/curriculum/query-keys.ts
// ---------------------------------------------------------------------------

import type { AcademicFilterParams } from '@/features/lms/types/student'

export const studentKeys = {
  all: ['students'] as const,

  // ── List variants ──────────────────────────────────────────────────────
  lists: () => [...studentKeys.all, 'list'] as const,

  /**
   * Filtered student list — POST /api/AcademicManage/GetListWithFilter/{userId}
   * Params included in key for auto-refetch when filters change
   */
  list: (userId: string, params: AcademicFilterParams) =>
    [...studentKeys.lists(), userId, params] as const,

  // ── Detail ─────────────────────────────────────────────────────────────
  /** Single student — GET /api/Student/{id} */
  detail: (id: string) => [...studentKeys.all, 'detail', id] as const,

  // ── Parents ────────────────────────────────────────────────────────────
  /** Parents for student — GET /api/StudentParents/getParentByStudentIds/{studentId} */
  parents: (studentId: string) =>
    [...studentKeys.all, 'parents', studentId] as const,

  // ── Payment ────────────────────────────────────────────────────────────
  /** Payment summary stats — GET /api/StudentCourses/GetStudentPaymentInfo/{studentId} */
  paymentInfo: (studentId: string) =>
    [...studentKeys.all, 'paymentInfo', studentId] as const,

  /** Payment history — GET /api/StudentCourses/GetStudentPaymentList/{studentId} */
  paymentList: (studentId: string) =>
    [...studentKeys.all, 'paymentList', studentId] as const,

  // ── Reports ────────────────────────────────────────────────────────────
  /** Learning outcomes — GET /api/Student/GetStudentViewLearningOutcomes/{id} */
  learningOutcomes: (id: string) =>
    [...studentKeys.all, 'learningOutcomes', id] as const,

  /** Class schedule — GET /api/Student/GetScheduleStudent/{id} */
  schedule: (id: string) =>
    [...studentKeys.all, 'schedule', id] as const,

  // ── Lookups ────────────────────────────────────────────────────────────
  /** Class dropdown — GET /api/ClassCourses/GetClassCourseDropDown/{userId} */
  classDropdown: (userId: string) =>
    [...studentKeys.all, 'classDropdown', userId] as const,
}
