'use client'
// ---------------------------------------------------------------------------
// hooks/attendance/use-attendance.ts
// TanStack Query hooks for Attendance & Catch-Up CRUD operations
// CLIENT-ONLY — 'use client' required for hooks
// Pattern: identical to hooks/schedule/use-schedules.ts
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { attendanceKeys } from '@/features/lms/lib/attendance/query-keys'
import {
  fetchCatchUpsByTeacher,
  fetchAbsentStudents,
  fetchCatchUpById,
  createCatchUp,
  updateCatchUp,
  deleteCatchUp,
  fetchSingleLessons,
  fetchSingleLessonById,
  createSingleLesson,
  updateSingleLesson,
  deleteSingleLesson,
  archiveSingleLesson,
  checkSingleLessonApproved,
  approveSingleLesson,
} from '@/features/lms/lib/attendance/api'
import type {
  CatchUpFormValues,
  SingleLessonFormValues,
} from '@/features/lms/types/attendance'

// ---------------------------------------------------------------------------
// CatchUp Queries
// ---------------------------------------------------------------------------

/**
 * Fetch catch-up schedules by teacher ID.
 * Disabled when teacherId is undefined (user not yet authenticated).
 */
export function useCatchUpsByTeacher(teacherId: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.catchUpList(teacherId ?? ''),
    queryFn: () => fetchCatchUpsByTeacher(),
    enabled: !!teacherId,
  })
}

/**
 * Fetch absent students (Present==0) for the teacher's classes.
 */
export function useAbsentStudents(teacherId: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.absentStudentList(teacherId ?? ''),
    queryFn: () => fetchAbsentStudents(),
    enabled: !!teacherId,
  })
}

/**
 * Fetch single catch-up by ID — for edit form pre-fill.
 */
export function useCatchUpDetail(id: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.catchUpDetail(id ?? ''),
    queryFn: () => fetchCatchUpById(id!),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// SingleLesson Queries
// ---------------------------------------------------------------------------

/**
 * Fetch all single lessons. BE filters by teacher role automatically.
 */
export function useSingleLessons() {
  return useQuery({
    queryKey: attendanceKeys.singleLessonList(),
    queryFn: () => fetchSingleLessons(),
  })
}

/**
 * Fetch single lesson by ID — for edit form pre-fill.
 */
export function useSingleLessonDetail(id: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.singleLessonDetail(id ?? ''),
    queryFn: () => fetchSingleLessonById(id!),
    enabled: !!id,
  })
}

/**
 * Check if a single lesson has been approved.
 * Returns boolean. Used to lock form fields.
 */
export function useSingleLessonApproved(id: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.singleLessonApproved(id ?? ''),
    queryFn: () => checkSingleLessonApproved(id!),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// CatchUp Mutations
// ---------------------------------------------------------------------------

export function useCreateCatchUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CatchUpFormValues) => createCatchUp(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.catchUps })
      qc.invalidateQueries({ queryKey: attendanceKeys.absentStudents })
      toast.success('Catch-up schedule created')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create catch-up schedule')
    },
  })
}

export function useUpdateCatchUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CatchUpFormValues }) =>
      updateCatchUp(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.catchUps })
      toast.success('Catch-up schedule updated')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update catch-up schedule')
    },
  })
}

export function useDeleteCatchUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCatchUp(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.catchUps })
      qc.invalidateQueries({ queryKey: attendanceKeys.absentStudents })
      toast.success('Catch-up schedule deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete catch-up schedule')
    },
  })
}

// ---------------------------------------------------------------------------
// SingleLesson Mutations
// ---------------------------------------------------------------------------

export function useCreateSingleLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SingleLessonFormValues) => createSingleLesson(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.singleLessons })
      toast.success('Event created')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create event')
    },
  })
}

export function useUpdateSingleLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: SingleLessonFormValues
    }) => updateSingleLesson(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.singleLessons })
      toast.success('Event updated')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update event')
    },
  })
}

export function useDeleteSingleLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSingleLesson(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.singleLessons })
      toast.success('Event deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete event')
    },
  })
}

export function useArchiveSingleLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveSingleLesson(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.singleLessons })
      toast.success('Event archive status toggled')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to toggle archive')
    },
  })
}

/**
 * Approve single lesson — atomic V2 transaction.
 * Creates worklogs for all teachers in a single DB transaction.
 */
export function useApproveSingleLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveSingleLesson(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.singleLessons })
      toast.success('Event approved')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to approve event')
    },
  })
}
