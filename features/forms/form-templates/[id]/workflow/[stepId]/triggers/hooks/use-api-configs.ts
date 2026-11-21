// use-api-configs.ts — TanStack Query hook for fetching the per-process API configs

import { useQuery } from '@tanstack/react-query'
import { fetchApiConfigs } from '../lib/api'

export const apiConfigQueryKey = (processId: string) =>
  ['form-templates', 'processes', processId, 'api-config'] as const

export function useApiConfigsQuery(processId: string) {
  return useQuery({
    queryKey: apiConfigQueryKey(processId),
    queryFn: () => fetchApiConfigs(processId),
    enabled: !!processId,
  })
}
