'use client'
// ---------------------------------------------------------------------------
// hooks/branches/use-classrooms.ts
// TanStack Query hooks for ClassRoom CRUD
// CLIENT-ONLY
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { classroomKeys } from '@/features/lms/lib/branches/query-keys'
import {
  fetchClassrooms,
  fetchClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
} from '@/features/lms/lib/branches/api'
import type { ClassRoomFormInput } from '@/features/lms/types/branch'

export function useClassroomList(userId: string) {
  return useQuery({
    queryKey: classroomKeys.byUser(userId),
    queryFn: () => fetchClassrooms(userId),
    enabled: !!userId,
  })
}

export function useClassroomById(id: string | undefined) {
  return useQuery({
    queryKey: classroomKeys.detail(id ?? ''),
    queryFn: () => fetchClassroomById(id!),
    enabled: !!id,
  })
}

export function useCreateClassroom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClassRoomFormInput) => createClassroom(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classroomKeys.all })
      toast.success('Room created')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create room')
    },
  })
}

export function useUpdateClassroom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClassRoomFormInput }) =>
      updateClassroom(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classroomKeys.all })
      toast.success('Room updated')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update room')
    },
  })
}

export function useDeleteClassroom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClassroom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classroomKeys.all })
      toast.success('Room deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete room')
    },
  })
}
