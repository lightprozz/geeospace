// ---------------------------------------------------------------------------
// hooks/use-worklog-templates.ts — Published WorkLog templates for Sub-2 picker
// Consumed by workflow-step-editor's "attach worklog" action
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { fetchPublishedWorkLogTemplates } from '@/features/lms/lib/form-templates/api'

export function useWorkLogTemplates() {
  return useQuery({
    queryKey: ['worklog-templates', 'published'],
    queryFn: fetchPublishedWorkLogTemplates,
    staleTime: 60_000,
  })
}
