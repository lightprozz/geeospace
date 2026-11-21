'use client'

// ---------------------------------------------------------------------------
// hooks/use-collections.ts — TanStack Query hook for collections list
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { fetchCollections } from '@/features/lms/lib/form-templates/api'

export function useCollections(enabled = true) {
  return useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
    staleTime: 60_000,
    enabled,
  })
}
