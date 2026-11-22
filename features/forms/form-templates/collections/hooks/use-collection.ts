// ---------------------------------------------------------------------------
// hooks/use-collection.ts — TanStack Query hook for single collection
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { fetchCollection } from '@/features/lms/lib/form-templates/api'

export function useCollection(id: string | null) {
  return useQuery({
    queryKey: ['collections', id],
    queryFn: () => fetchCollection(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
}
