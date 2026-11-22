// use-triggers.ts — TanStack Query hook for fetching trigger list

import { useQuery } from '@tanstack/react-query'
import { fetchTriggers } from '../lib/api'

export function useTriggersQuery(processId: string) {
  return useQuery({
    queryKey: ['form-templates', 'processes', processId, 'triggers'],
    queryFn: () => fetchTriggers(processId),
    enabled: !!processId,
  })
}
