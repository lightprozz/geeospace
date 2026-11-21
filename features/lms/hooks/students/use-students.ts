'use client'
// ---------------------------------------------------------------------------
// hooks/students/use-students.ts
// TanStack Query hooks for Students Management module
// CLIENT-ONLY — 'use client' required for hooks
// Pattern: same as hooks/curriculum/use-study-levels.ts
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchStudentsWithFilter,
  fetchStudentById,
  fetchClassDropdown,
  fetchStudentDetail,
  fetchStudentParents,
  fetchStudentPaymentInfo,
  fetchStudentPaymentList,
  fetchStudentLearningOutcomes,
  fetchStudentSchedule,
  updateStudent,
  updateParent,
  createParentForStudent,
  fetchAllParents,
  linkParentToStudent,
  suspendStudent,
  terminateStudent,
  changeStudentClass,
  parallelStudentClass,
  enrollStudent,
  searchParents,
  fetchAllStudentsV2,
} from '@/features/lms/lib/students/api'
import { studentKeys } from '@/features/lms/lib/students/query-keys'
import type {
  AcademicFilterParams,
  AcademicStudentGrid,
  StudentAllItem,
  ClassDropdownItem,
  StudentDetail,
  ParentInfo,
  StudentPaymentInfo,
  StudentCourseEntry,
  StudentLearningOutcome,
  StudentSchedule,
} from '@/features/lms/types/student'

// ---------------------------------------------------------------------------
// Student List — server-side filtered
// Params embedded in queryKey → auto-refetch when any filter changes
// ---------------------------------------------------------------------------

/**
 * Fetch filtered student list via POST /api/AcademicManage/GetListWithFilter
 *
 * @param userId - logged-in user's `sub` claim (from auth store)
 * @param params - filter parameters (namePhone, campus, level, class, studentType, suspended)
 *
 * Backend auto-handles:
 * - Teacher role → only returns students in teacher's own classes
 * - Campus scoping → filters by user's assigned campus if no explicit campus param
 * @deprecated Use useAllStudentsV2 for client-side filtering approach
 */
export function useStudentList(
  userId: string | undefined,
  params: AcademicFilterParams,
) {
  return useQuery<AcademicStudentGrid[]>({
    queryKey: studentKeys.list(userId ?? '', params),
    queryFn: () => fetchStudentsWithFilter(userId!, params),
    enabled: !!userId,
  })
}

// ---------------------------------------------------------------------------
// All Students — V2 (fetch all, client-side filter by type/branch/level/class)
// Fetches ALL students and applies filtering on the client side
// Active: studentType 1, 2, 3 (Regular, CatchUp, Demo)
// Inactive: studentType 4, 5 (Suspended, Terminated)
// ---------------------------------------------------------------------------

/**
 * Fetch ALL students via V2 API for client-side filtering.
 * Returns full student list with currentStudentType, currentClassId, campusId, levelId.
 * Campus-scoped via JWT.
 */
export function useAllStudentsV2() {
  return useQuery<StudentAllItem[]>({
    queryKey: studentKeys.all,
    queryFn: () => fetchAllStudentsV2(),
    staleTime: 5 * 60 * 1000, // 5 minutes — student list changes infrequently
  })
}

// ---------------------------------------------------------------------------
// Student Detail — single student by ID (legacy shape)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use useStudentDetail for /students/[id] detail page
 * This returns AcademicStudentGrid (list shape), not StudentDetail (full entity)
 */
export function useStudentById(id: string | null) {
  return useQuery<AcademicStudentGrid>({
    queryKey: studentKeys.detail(id!),
    queryFn: () => fetchStudentById(id!),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// Student Detail — full entity with ClassStudents
// GET /api/Student/{id}
// ---------------------------------------------------------------------------

/**
 * Fetch full student entity for /students/[id] detail page
 * Returns StudentDetail with classStudents navigation property
 */
export function useStudentDetail(id: string | undefined) {
  return useQuery<StudentDetail>({
    queryKey: studentKeys.detail(id ?? ''),
    queryFn: () => fetchStudentDetail(id!),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// Student Parents — dedicated parents API
// GET /api/StudentParents/getParentByStudentIds/{studentId}
// ---------------------------------------------------------------------------

/**
 * Fetch all parents linked to a student
 * Returns ParentInfo[] with name, relation, phone, email, address
 */
export function useStudentParents(studentId: string | undefined) {
  return useQuery<ParentInfo[]>({
    queryKey: studentKeys.parents(studentId ?? ''),
    queryFn: () => fetchStudentParents(studentId!),
    enabled: !!studentId,
  })
}

// ---------------------------------------------------------------------------
// Payment Info — aggregated summary
// GET /api/StudentCourses/GetStudentPaymentInfo/{studentId}
// ---------------------------------------------------------------------------

/**
 * Fetch payment summary: total/studied/remaining sessions,
 * absences, frequent absences, end date, last attendance
 */
export function useStudentPaymentInfo(studentId: string | undefined) {
  return useQuery<StudentPaymentInfo>({
    queryKey: studentKeys.paymentInfo(studentId ?? ''),
    queryFn: () => fetchStudentPaymentInfo(studentId!),
    enabled: !!studentId,
  })
}

// ---------------------------------------------------------------------------
// Payment List — course / payment history
// GET /api/StudentCourses/GetStudentPaymentList/{studentId}
// ---------------------------------------------------------------------------

/**
 * Fetch payment history: course entries with amount, sessions, dates
 */
export function useStudentPaymentList(studentId: string | undefined) {
  return useQuery<StudentCourseEntry[]>({
    queryKey: studentKeys.paymentList(studentId ?? ''),
    queryFn: () => fetchStudentPaymentList(studentId!),
    enabled: !!studentId,
  })
}

// ---------------------------------------------------------------------------
// Learning Outcomes — attendance + star scores
// GET /api/Student/GetStudentViewLearningOutcomes/{id}
// ---------------------------------------------------------------------------

/**
 * Fetch learning outcomes for attendance heatmap + performance chart.
 * Returns array with present (0/1), starScore, logDateTime per lesson entry.
 */
export function useStudentLearningOutcomes(id: string | undefined) {
  return useQuery<StudentLearningOutcome[]>({
    queryKey: studentKeys.learningOutcomes(id ?? ''),
    queryFn: () => fetchStudentLearningOutcomes(id!),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// Student Schedule — class schedules
// GET /api/Student/GetScheduleStudent/{id}
// ---------------------------------------------------------------------------

/**
 * Fetch student's class schedules: class, teacher, room, times, schedule days
 */
export function useStudentSchedule(id: string | undefined) {
  return useQuery<StudentSchedule[]>({
    queryKey: studentKeys.schedule(id ?? ''),
    queryFn: () => fetchStudentSchedule(id!),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// Class Dropdown — for class filter in student list toolbar
// ---------------------------------------------------------------------------

/**
 * Fetch class dropdown items via GET /api/ClassCourses/GetClassCourseDropDown/{userId}
 * Returns simplified class list (id + name) scoped to user's assigned campus
 */
export function useClassDropdown(userId: string | undefined) {
  return useQuery<ClassDropdownItem[]>({
    queryKey: studentKeys.classDropdown(userId ?? ''),
    queryFn: () => fetchClassDropdown(userId!),
    enabled: !!userId,
  })
}

// ---------------------------------------------------------------------------
// Mutations — Student & Parent edit
// ---------------------------------------------------------------------------

/**
 * Update student — PUT /api/Student/{id}
 * On success: invalidate detail + list queries, show toast
 */
export function useUpdateStudent(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      updateStudent(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(studentId) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
      toast.success('Student updated successfully')
    },
    onError: () => {
      toast.error('Failed to update student')
    },
  })
}

/**
 * Update parent — PUT /api/Parents/{id}
 * On success: invalidate parents query, show toast
 */
export function useUpdateParent(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ parentId, data }: { parentId: string; data: Record<string, unknown> }) =>
      updateParent(parentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.parents(studentId) })
      toast.success('Parent info updated successfully')
    },
    onError: () => {
      toast.error('Failed to update parent info')
    },
  })
}

/**
 * Create parent for student — POST /api/Parents/CreateParent/{studentId}
 * On success: invalidate parents query, show toast
 */
export function useCreateParentForStudent(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createParentForStudent(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.parents(studentId) })
      toast.success('Parent added successfully')
    },
    onError: () => {
      toast.error('Failed to add parent')
    },
  })
}

// ---------------------------------------------------------------------------
// All Parents — for autocomplete lookup
// GET /api/Parents
// ---------------------------------------------------------------------------

/**
 * Fetch all parents in the system for autocomplete search.
 * Cached globally — staleTime extended since parent list changes infrequently.
 */
export function useAllParents() {
  return useQuery<ParentInfo[]>({
    queryKey: [...studentKeys.all, 'allParents'] as const,
    queryFn: () => fetchAllParents(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ---------------------------------------------------------------------------
// Link existing parent to student
// PUT /api/Parents/{parentId}/{studentId}
// ---------------------------------------------------------------------------

/**
 * Link an existing parent record to a student.
 * Used when user picks from the autocomplete dropdown.
 */
export function useLinkParentToStudent(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ parentId, data }: { parentId: string; data: Record<string, unknown> }) =>
      linkParentToStudent(parentId, studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.parents(studentId) })
      toast.success('Parent linked successfully')
    },
    onError: () => {
      toast.error('Failed to link parent')
    },
  })
}

// ---------------------------------------------------------------------------
// Lifecycle Mutations — V2
// ---------------------------------------------------------------------------

/** POST /api/v2/student/students/{id}/suspend */
export function useSuspendStudent(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { suspendMonths: number; suspendReason?: string }) =>
      suspendStudent(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(studentId) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
      toast.success('Student suspended successfully')
    },
    onError: () => { toast.error('Failed to suspend student') },
  })
}

/** POST /api/v2/student/students/{id}/terminate */
export function useTerminateStudent(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { terminateReason?: string }) =>
      terminateStudent(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(studentId) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
      toast.success('Student terminated successfully')
    },
    onError: () => { toast.error('Failed to terminate student') },
  })
}

/** POST /api/v2/student/students/{id}/change-class */
export function useChangeStudentClass(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { currentClassId: string; newClassId: string; studentType?: number }) =>
      changeStudentClass(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(studentId) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
      toast.success('Class changed successfully')
    },
    onError: () => { toast.error('Failed to change class') },
  })
}

/** POST /api/v2/student/students/{id}/parallel-class */
export function useParallelStudentClass(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { currentClassId: string; parallelClassId: string; studentType?: number }) =>
      parallelStudentClass(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(studentId) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
      toast.success('Parallel class added successfully')
    },
    onError: () => { toast.error('Failed to add parallel class') },
  })
}

/** POST /api/v2/student/students/{id}/enroll */
export function useEnrollStudent(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { classId: string; studentType?: number }) =>
      enrollStudent(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(studentId) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
      toast.success('Student enrolled successfully')
    },
    onError: () => { toast.error('Failed to enroll student') },
  })
}

// ---------------------------------------------------------------------------
// Parent Search — V2
// ---------------------------------------------------------------------------

export function useSearchParents(query: string) {
  return useQuery<ParentInfo[]>({
    queryKey: [...studentKeys.all, 'parentSearch', query] as const,
    queryFn: () => searchParents(query),
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  })
}
