'use client'
// ---------------------------------------------------------------------------
// hooks/classes/use-classes.ts
// TanStack Query hooks for ClassCourse CRUD
// CLIENT-ONLY — 'use client' required for hooks
// Pattern: identical to hooks/curriculum/use-study-levels.ts
// ---------------------------------------------------------------------------

import { skipToken, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { classKeys } from '@/features/lms/lib/classes/query-keys'
import {
  fetchAllClasses,
  fetchClassDropdown,
  fetchClassList,
  fetchClassById,
  fetchClassInfo,
  fetchClassTeachers,
  fetchClassLessons,
  fetchClassStudents,
  fetchSuspendedStudents,
  fetchStudentSessionStats,
  fetchLessonLogs,
  fetchStudentReport,
  fetchLessonReport,
  fetchLessonLogInfo,
  saveStudentLessonLog,
  fetchAssessmentCriteria,
  fetchStudentAssessments,
  addStudentAssessment,
  saveStudentAssessment,
  createClass,
  updateClass,
  deleteClass,
  fetchExamTemplates,
  fetchExamResultForm,
  saveExamResult,
  fetchAllTeachers,
} from '@/features/lms/lib/classes/api'
import type { CreateClassInput } from '@/features/lms/types/class'
import type { StudentLessonAttendanceInput } from '@/features/lms/types/class-report'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch ALL classes for client-side table processing.
 * Returns flat array — search/sort/filter/pagination handled by useClientTable.
 * Campus scoped via JWT claims (server-side).
 */
export function useAllClasses(finishedClasses: 0 | 1, enabled = true) {
  return useQuery({
    queryKey: classKeys.listAll(finishedClasses),
    queryFn: () => fetchAllClasses(finishedClasses),
    enabled,
  })
}

/**
 * Fetch the {id, name} class lookup used by pickers (form renderer
 * PickClass field, filters). Campus scoped via JWT claims (server-side).
 *
 * `enabled` lets a caller defer the request until the user actually needs
 * it — the form renderer's PickClass field only queries once the picker
 * opens, so a request submitter without `class.read` never triggers a 403.
 */
export function useClassLookup(enabled = true) {
  return useQuery({
    queryKey: classKeys.dropdown(),
    queryFn: fetchClassDropdown,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * @deprecated Use useAllClasses + useClientTable for list views.
 * Kept for backward compat (e.g., holidays class dropdown).
 */
export function useClassList(
  userId: string,
  finishedClasses: 0 | 1,
  params?: {
    page?: number
    pageSize?: number
    search?: string
    sort?: { field: string; desc: boolean }[]
  }
) {
  return useQuery({
    queryKey: classKeys.list(finishedClasses, params),
    queryFn: () => fetchClassList(userId, finishedClasses, params),
    enabled: !!userId,
  })
}

/**
 * Fetch full class entity by ID.
 * Used for edit form (provides levelId, campusId, schedule, classTeachers).
 * Only enabled when id is non-empty.
 */
export function useClassById(id: string | undefined) {
  return useQuery({
    queryKey: classKeys.detail(id ?? ''),
    queryFn: () => fetchClassById(id!),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateClassInput) => createClass(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.all })
      toast.success('Class created')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create class')
    },
  })
}

export function useUpdateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateClassInput }) =>
      updateClass(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.all })
      toast.success('Class updated')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update class')
    },
  })
}

export function useDeleteClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.all })
      toast.success('Class deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete class')
    },
  })
}

// ---------------------------------------------------------------------------
// Class Detail — Queries for /classes/[id] page
// ---------------------------------------------------------------------------

/**
 * Fetch class summary info (student count, progress, notification).
 * Used in class detail sidebar — lighter than useClassById.
 */
export function useClassInfo(id: string) {
  return useQuery({
    queryKey: classKeys.info(id),
    queryFn: () => fetchClassInfo(id),
    enabled: !!id,
  })
}

/**
 * Fetch teacher assignments for a class.
 * Returns full teacher details — phone, email, role (isPrimary).
 */
export function useClassTeachers(classId: string) {
  return useQuery({
    queryKey: classKeys.teachers(classId),
    queryFn: () => fetchClassTeachers(classId),
    enabled: !!classId,
  })
}

// ---------------------------------------------------------------------------
// Class Lessons — Queries for Lessons tab inside /classes/[id]
// ---------------------------------------------------------------------------

/**
 * Fetch all lessons for a class.
 * Returns ClassLessonGrid[] ordered by LessonPlan.CreatedDate.
 */
export function useClassLessons(classId: string) {
  return useQuery({
    queryKey: classKeys.lessons(classId),
    queryFn: () => fetchClassLessons(classId),
    enabled: !!classId,
  })
}



// ---------------------------------------------------------------------------
// Class Students — Queries for Students tab inside /classes/[id]
// ---------------------------------------------------------------------------

/**
 * Fetch active students in a class (excludes Suspended/Terminated).
 * Returns StudentGrid[] sorted by studentName.
 */
export function useClassStudents(classId: string) {
  return useQuery({
    queryKey: classKeys.students(classId),
    queryFn: () => fetchClassStudents(classId),
    enabled: !!classId,
  })
}

/**
 * Fetch suspended/terminated students in a class.
 * Same shape as active roster but filtered to type 4 (Suspended) and 5 (Terminated).
 */
export function useSuspendedStudents(classId: string) {
  return useQuery({
    queryKey: classKeys.suspendedStudents(classId),
    queryFn: () => fetchSuspendedStudents(classId),
    enabled: !!classId,
  })
}

/**
 * Fetch per-student session stats (remain/studied/total sessions) for a class.
 * Single bulk call — no N+1. Uses GET /api/StudentReport/GetStudentPaymentStatistics/{classId}.
 */
export function useStudentSessionStats(classId: string) {
  return useQuery({
    queryKey: classKeys.studentSessionStats(classId),
    queryFn: () => fetchStudentSessionStats(classId),
    enabled: !!classId,
  })
}

// ---------------------------------------------------------------------------
// Class Report hooks
// ---------------------------------------------------------------------------

/** Lesson log list for a class (ordered by logDateTime desc). */
export function useLessonLogs(userId: string, classId: string) {
  return useQuery({
    queryKey: classKeys.lessonLogs(userId, classId),
    queryFn: () => fetchLessonLogs(userId, classId),
    enabled: !!userId && !!classId,
  })
}

/** Student attendance rows for a specific lesson log. */
export function useStudentReport(classId: string, logId: string | null) {
  return useQuery({
    queryKey: classKeys.studentReport(classId, logId ?? ''),
    queryFn: classId && logId ? () => fetchStudentReport(classId, logId) : skipToken,
  })
}

/** Lesson unit execution stats for a specific lesson log. */
export function useLessonReport(logId: string | null) {
  return useQuery({
    queryKey: classKeys.lessonReport(logId ?? ''),
    queryFn: () => fetchLessonReport(logId!),
    enabled: !!logId,
  })
}

/** Report header info: teachers, schedule, lesson details. */
export function useLessonLogInfo(logId: string | null) {
  return useQuery({
    queryKey: classKeys.lessonLogInfo(logId ?? ''),
    queryFn: () => fetchLessonLogInfo(logId!),
    enabled: !!logId,
  })
}

/**
 * Save student attendance record (present, starScore, note).
 * Invalidates the student report cache for the given logId on success.
 */
export function useSaveStudentLessonLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, logId, id, data }: {
      classId: string
      logId: string
      id: string
      data: StudentLessonAttendanceInput
    }) => saveStudentLessonLog(classId, logId, id, data),
    onSuccess: (_, { classId, logId }) => {
      qc.invalidateQueries({ queryKey: classKeys.studentReport(classId, logId) })
      toast.success('Attendance saved')
    },
    onError: (err) => {
      toast.error(`Save failed: ${err.message}`)
    },
  })
}

// ---------------------------------------------------------------------------
// Assessment Criteria hooks
// ---------------------------------------------------------------------------

/**
 * Fetch assessment criteria master data (Interact, Attitude, Focus).
 * Cached indefinitely — criteria don't change.
 */
export function useAssessmentCriteria() {
  return useQuery({
    queryKey: classKeys.assessmentCriteria(),
    queryFn: fetchAssessmentCriteria,
    staleTime: Infinity,
  })
}

/**
 * Fetch student assessment scores for a given classLessonId.
 * Returns per-student per-criteria scores.
 */
export function useStudentAssessments(classLessonId: string | null) {
  return useQuery({
    queryKey: classKeys.studentAssessments(classLessonId ?? ''),
    queryFn: () => fetchStudentAssessments(classLessonId!),
    enabled: !!classLessonId,
  })
}

/**
 * Save a student's assessment score for a specific criteria.
 * Flow: POST AddStudentAssessment (get/create record) → PUT SaveStudentAssessment (set score).
 * Matches legacy AssessmentRoom.saveStudentAssessment pattern.
 */
export function useSaveStudentAssessment(classLessonId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      studentLessonLogId: string
      assessmentCriteriaId: string
      score: number
    }) => {
      // Step 1: Create or get the assessment record
      const record = await addStudentAssessment({
        studentLessonLogId: vars.studentLessonLogId,
        assessmentCriteriaId: vars.assessmentCriteriaId,
      })
      // Step 2: Update the score
      await saveStudentAssessment(record.id, {
        score: vars.score,
        studentLessonLogId: vars.studentLessonLogId,
        assessmentCriteriaId: vars.assessmentCriteriaId,
      })
    },
    onSuccess: () => {
      if (classLessonId) {
        qc.invalidateQueries({
          queryKey: classKeys.studentAssessments(classLessonId),
        })
      }
    },
    onError: (err) => {
      toast.error(`Assessment save failed: ${err.message}`)
    },
  })
}

// ---------------------------------------------------------------------------
// Exam Results
// ---------------------------------------------------------------------------

/**
 * Fetch exam type templates for a class.
 * Returns ExamResultForm[] — used to populate exam type dropdown.
 */
export function useExamTemplates(classId: string) {
  return useQuery({
    queryKey: classKeys.examTemplates(classId),
    queryFn: () => fetchExamTemplates(classId),
    enabled: !!classId,
  })
}

/**
 * Fetch exam result form (existing result or blank template) for a student.
 * Enabled only when all three params are truthy.
 */
export function useExamResultForm(
  classId: string,
  studentId: string,
  examType: number,
) {
  return useQuery({
    queryKey: classKeys.examResultForm(classId, studentId, examType),
    queryFn: () => fetchExamResultForm(classId, studentId, examType),
    enabled: !!classId && !!studentId && examType > 0,
  })
}

/**
 * Save exam result mutation.
 * Invalidates exam result form query on success.
 */
export function useSaveExamResult(
  classId: string,
  studentId: string,
  examType: number,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveExamResult,
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: classKeys.examResultForm(classId, studentId, examType),
      })
      toast.success('Exam result saved successfully')
    },
    onError: (err) => {
      toast.error(`Save failed: ${err.message}`)
    },
  })
}

// ---------------------------------------------------------------------------
// Teacher lookup — @gap V1 (no V2 equivalent). Worklog CRUD/list/shift-options
// hooks moved to hooks/worklog/* (WRK v2 cutover) — see that module instead.
// ---------------------------------------------------------------------------

/** Fetch all teachers in the center (for substitute/expat combobox). Cached indefinitely. */
export function useAllTeachers() {
  return useQuery({
    queryKey: classKeys.allTeachers(),
    queryFn: fetchAllTeachers,
    staleTime: Infinity,
  })
}
