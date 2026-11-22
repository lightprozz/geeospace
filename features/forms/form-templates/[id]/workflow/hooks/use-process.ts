// ---------------------------------------------------------------------------
// hooks/use-process.ts — Single process query hook
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { fetchProcess } from '../lib/api'

export function useProcessQuery(processId: string) {
  return useQuery({
    queryKey: ['processes', processId],
    queryFn: () => fetchProcess(processId),
    enabled: !!processId,
  })
}
