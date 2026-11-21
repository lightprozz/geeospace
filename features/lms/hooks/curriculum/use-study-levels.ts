'use client'
// ---------------------------------------------------------------------------
// hooks/curriculum/use-study-levels.ts
// TanStack Query hooks for StudyLevel CRUD
// CLIENT-ONLY — 'use client' required for hooks
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { studyLevelKeys } from '@/features/lms/lib/curriculum/query-keys'
import {
  fetchLevels,
  fetchLevelById,
  createLevel,
  updateLevel,
  deleteLevel,
  duplicateLevel,
} from '@/features/lms/lib/curriculum/api'
import type { CreateLevelRequest, UpdateLevelRequest } from '@/features/lms/types/curriculum'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** List all study levels */
export function useStudyLevels() {
  return useQuery({
    queryKey: studyLevelKeys.all,
    queryFn: fetchLevels,
  })
}

/** Single study level by id */
export function useStudyLevel(id: string) {
  return useQuery({
    queryKey: studyLevelKeys.detail(id),
    queryFn: () => fetchLevelById(id),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateStudyLevel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLevelRequest) => createLevel(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyLevelKeys.all })
      toast.success('Study level created')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create study level')
    },
  })
}

export function useUpdateStudyLevel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLevelRequest }) =>
      updateLevel(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyLevelKeys.all })
      toast.success('Study level updated')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update study level')
    },
  })
}

export function useDeleteStudyLevel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLevel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyLevelKeys.all })
      toast.success('Study level deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete study level')
    },
  })
}

export function useDuplicateStudyLevel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => duplicateLevel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyLevelKeys.all })
      toast.success('Study level duplicated successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to duplicate study level')
    },
  })
}
