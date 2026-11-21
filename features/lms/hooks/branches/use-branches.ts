'use client'
// ---------------------------------------------------------------------------
// hooks/branches/use-branches.ts
// TanStack Query hooks for Campus (Branch) CRUD
// CLIENT-ONLY
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { branchKeys } from '@/features/lms/lib/branches/query-keys'
import {
  fetchBranches,
  fetchBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from '@/features/lms/lib/branches/api'
import type { CampusFormInput } from '@/features/lms/types/branch'

export function useBranchList(userId: string) {
  return useQuery({
    queryKey: branchKeys.list(userId),
    queryFn: () => fetchBranches(userId),
    enabled: !!userId,
  })
}

export function useBranchById(id: string | undefined) {
  return useQuery({
    queryKey: branchKeys.detail(id ?? ''),
    queryFn: () => fetchBranchById(id!),
    enabled: !!id,
  })
}

export function useCreateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CampusFormInput) => createBranch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.all })
      toast.success('Branch created')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create branch')
    },
  })
}

export function useUpdateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CampusFormInput }) =>
      updateBranch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.all })
      toast.success('Branch updated')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update branch')
    },
  })
}

export function useDeleteBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.all })
      toast.success('Branch deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete branch')
    },
  })
}
