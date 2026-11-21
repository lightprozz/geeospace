// ---------------------------------------------------------------------------
// hooks/use-processes.ts — TanStack Query hooks for workflow processes
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { fetchProcesses } from '../lib/api'

export function useProcessesQuery(templateId: string) {
  return useQuery({
    queryKey: ['form-templates', templateId, 'processes'],
    queryFn: () => fetchProcesses(templateId),
    enabled: !!templateId,
  })
}
