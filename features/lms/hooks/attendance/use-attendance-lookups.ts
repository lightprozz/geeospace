'use client'
// ---------------------------------------------------------------------------
// hooks/attendance/use-attendance-lookups.ts
// TanStack Query hooks for Attendance form lookup data
// Separate file to keep use-attendance.ts focused on core CRUD
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'

import { attendanceKeys } from '@/features/lms/lib/attendance/query-keys'
import {
  fetchClassLessonsByTeacher,
  fetchClassCourseSchedules,
  fetchStudentsByBranch,
  fetchTeachersByBranch,
} from '@/features/lms/lib/attendance/api'

// ---------------------------------------------------------------------------
// CatchUp Form Lookups
// ---------------------------------------------------------------------------

/**
 * Class lessons for catch-up type 1 selector.
 * Enabled only when teacherId is available.
 */
export function useClassLessonsByTeacher(teacherId: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.classLessons(teacherId ?? ''),
    queryFn: () => fetchClassLessonsByTeacher(),
    enabled: !!teacherId,
  })
}

/**
 * All class course schedules for catch-up type 3 selector.
 */
export function useClassCourseSchedules() {
  return useQuery({
    queryKey: attendanceKeys.classCourses(),
    queryFn: () => fetchClassCourseSchedules(),
  })
}

// ---------------------------------------------------------------------------
// SingleLesson Form Lookups
// ---------------------------------------------------------------------------

/**
 * Students filtered by branch — for SingleLesson form multi-select.
 * Enabled only when branchId is provided.
 */
export function useStudentsByBranch(branchId: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.studentsByBranch(branchId ?? ''),
    queryFn: () => fetchStudentsByBranch(branchId!),
    enabled: !!branchId,
    // API may return duplicates (same student in multiple classes) — dedupe by id
    select: (data) => {
      const seen = new Set<string>()
      return data.filter((s) => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })
    },
  })
}

/**
 * Teachers filtered by branch — for SingleLesson form multi-select.
 * Enabled only when branchId is provided.
 */
export function useTeachersByBranch(branchId: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.teachersByBranch(branchId ?? ''),
    queryFn: () => fetchTeachersByBranch(branchId!),
    enabled: !!branchId,
    // API may return duplicates (same teacher in multiple classes) — dedupe by id
    select: (data) => {
      const seen = new Set<string>()
      return data.filter((t) => {
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })
    },
  })
}
