// ---------------------------------------------------------------------------
// hooks/use-collection-mutations.ts — CRUD mutations for collections
// ---------------------------------------------------------------------------

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createCollection,
  updateCollection,
  deleteCollection,
} from '@/features/lms/lib/form-templates/api'
import type {
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from '@/features/lms/types/form-template'

export function useCreateCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateCollectionRequest) => createCollection(request),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })
}

export function useUpdateCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string
      request: UpdateCollectionRequest
    }) => updateCollection(id, request),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })
}

export function useDeleteCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })
}
