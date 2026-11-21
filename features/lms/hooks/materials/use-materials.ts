'use client'
// ---------------------------------------------------------------------------
// hooks/materials/use-materials.ts — V2 TanStack Query hooks
// All hooks now consume V2 endpoints via lib/materials/api.ts
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { materialKeys } from '@/features/lms/lib/materials/query-keys'
import {
  queryMaterials,
  fetchMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  uploadMaterialFile,
  approveMaterial,
  bulkApprove,
  bulkDelete,
} from '@/features/lms/lib/materials/api'
import type {
  UpsertMaterialInput,
  MaterialListItem,
  BulkDeleteResult,
} from '@/features/lms/types/material'
import type { PagedResult } from '@/features/lms/lib/transport'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Unified material query hook — replaces useMaterials, useForApproval,
 * useApprovedMaterials, useApprovedFor, useTeacherMaterials.
 * Use `status` filter to distinguish library vs approval queue.
 */
export function useMaterialsQuery(params?: {
  status?: 'approved' | 'pending' | 'all'
  page?: number
  pageSize?: number
  search?: string
  teacherId?: string
  categories?: string[]
  sort?: { field: string; desc: boolean }[]
}) {
  const p = {
    status: params?.status ?? 'all',
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    search: params?.search,
    teacherId: params?.teacherId,
    categories: params?.categories,
    sort: params?.sort,
  }

  return useQuery<PagedResult<MaterialListItem>>({
    queryKey: materialKeys.query(p),
    queryFn: () => queryMaterials(p),
    staleTime: 1000 * 60,
  })
}

/** @deprecated Use useMaterialsQuery({ status: 'approved' }) */
export function useMaterials() {
  return useMaterialsQuery({ status: 'approved', pageSize: 500 })
}

/** @deprecated Use useMaterialsQuery({ status: 'pending' }) */
export function useForApproval() {
  return useMaterialsQuery({ status: 'pending', pageSize: 500 })
}

/** Single material by ID */
export function useMaterial(id: string) {
  return useQuery({
    queryKey: materialKeys.detail(id),
    queryFn: () => fetchMaterialById(id),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create material — 2-step flow:
 * Step 1: POST entity (JSON body) → get id
 * Step 2: POST file upload (if file provided)
 */
export function useCreateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      payload,
      file,
    }: {
      payload: UpsertMaterialInput
      file?: File | null
    }) => {
      // Step 1: Create entity
      const created = await createMaterial(payload)

      // Step 2: Upload file (if provided)
      if (file) {
        try {
          await uploadMaterialFile(created.id, file)
        } catch (err) {
          // Entity created successfully but file upload failed
          toast.warning(
            'Material saved but file upload failed. You can re-upload from the edit dialog.',
          )
          console.error('File upload error:', err)
        }
      }

      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: materialKeys.lists() })
      toast.success('Material created')
    },
    onError: (err: Error) =>
      toast.error(err.message ?? 'Failed to create material'),
  })
}

/**
 * Update material — 2-step flow:
 * Step 1: PUT entity (JSON body)
 * Step 2: POST file upload (if new file provided)
 */
export function useUpdateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      payload,
      file,
    }: {
      id: string
      payload: UpsertMaterialInput
      file?: File | null
    }) => {
      // Step 1: Update entity
      const updated = await updateMaterial(id, payload)

      // Step 2: Upload file (if new file selected)
      if (file) {
        try {
          await uploadMaterialFile(id, file)
        } catch (err) {
          toast.warning(
            'Material updated but file upload failed. Try re-uploading.',
          )
          console.error('File upload error:', err)
        }
      }

      return updated
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: materialKeys.lists() })
      toast.success('Material updated')
    },
    onError: (err: Error) =>
      toast.error(err.message ?? 'Failed to update material'),
  })
}

/** Delete material — HARD DELETE (may 409 if in use) */
export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMaterial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: materialKeys.lists() })
      toast.success('Material deleted')
    },
    onError: (err: Error) => {
      // Handle 409 — material in use
      if (err.message?.includes('in use')) {
        toast.error('Cannot delete: material is in use by lesson units')
      } else {
        toast.error(err.message ?? 'Failed to delete material')
      }
    },
  })
}

/** Approve single material */
export function useApproveMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveMaterial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: materialKeys.lists() })
      toast.success('Material approved')
    },
    onError: (err: Error) =>
      toast.error(err.message ?? 'Failed to approve material'),
  })
}

/** Bulk approve — V2 POST /api/v2/content/Materials/bulk-approve */
export function useBulkApproveMaterials() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkApprove(ids),
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: materialKeys.lists() })
      toast.success(`${ids.length} materials approved`)
    },
    onError: () => toast.error('Bulk approve failed'),
  })
}

/** Bulk delete — V2 POST /api/v2/content/Materials/bulk-delete (partial success) */
export function useBulkDeletePending() {
  const qc = useQueryClient()
  return useMutation<BulkDeleteResult, Error, string[]>({
    mutationFn: (ids: string[]) => bulkDelete(ids),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: materialKeys.lists() })
      if (result.blocked.length > 0) {
        toast.info(
          `${result.deletedCount} deleted, ${result.blocked.length} blocked (in use by lesson units)`,
        )
      } else {
        toast.success(`${result.deletedCount} materials deleted`)
      }
    },
    onError: () => toast.error('Bulk delete failed'),
  })
}
