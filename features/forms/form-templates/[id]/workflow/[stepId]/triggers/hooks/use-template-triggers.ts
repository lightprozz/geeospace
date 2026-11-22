// ---------------------------------------------------------------------------
// hooks/use-template-triggers.ts
// Collects every trigger defined across the template's workflow processes.
//
// FG12: the trigger drawer offers a "copy from an existing trigger" prefill.
// The BE exposes triggers per process only, so this hook fans out one
// request per process and merges the results. The fan-out is bounded by the
// process count of a single template (small in practice) and each request
// is a cheap, cached GET.
//
// The fan-out stays disabled until `enabled` is true so the page does not
// fan out on mount for a drawer that is never opened.
// ---------------------------------------------------------------------------

import { useQueries } from '@tanstack/react-query'
import { useProcessesQuery } from '../../../hooks/use-processes'
import { fetchTriggers } from '../lib/api'
import type { TriggerDto } from '../types/trigger'

/** A trigger together with the process it belongs to. */
export interface TemplateTrigger extends TriggerDto {
  /** The owning process's name — shown in the prefill list. */
  processName: string
  /** The owning process's order — used to keep the list stable. */
  processOrder: number
}

export function useTemplateTriggers(templateId: string, enabled = true) {
  const { data: processes = [], isLoading: isLoadingProcesses } =
    useProcessesQuery(templateId)

  const results = useQueries({
    queries: processes.map((process) => ({
      queryKey: ['form-templates', 'processes', process.id, 'triggers'],
      queryFn: () => fetchTriggers(process.id),
      enabled: enabled && !!templateId && !!process.id,
      staleTime: 30_000,
    })),
  })

  const triggers: TemplateTrigger[] = []
  processes.forEach((process, index) => {
    const list = results[index]?.data
    if (!list) return
    for (const trigger of list) {
      triggers.push({
        ...trigger,
        processName: process.processName,
        processOrder: process.processOrder,
      })
    }
  })

  return {
    triggers,
    isLoading:
      enabled && (isLoadingProcesses || results.some((r) => r.isLoading)),
    isError: results.some((r) => r.isError),
  }
}
