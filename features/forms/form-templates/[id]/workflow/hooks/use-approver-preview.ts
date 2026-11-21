// ---------------------------------------------------------------------------
// hooks/use-approver-preview.ts
// Fetches the users a workflow step resolves to at runtime, so the builder can
// preview the approvers before a request exists.
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { fetchApproverPreview } from '../lib/api'

export function useApproverPreview(processId: string | null | undefined) {
  return useQuery({
    queryKey: ['form-builder', 'processes', processId, 'approver-preview'],
    queryFn: () => fetchApproverPreview(processId as string),
    enabled: !!processId,
    // The preview is derived from the approver configuration, which only
    // changes when the step itself is saved.
    staleTime: 30_000,
  })
}
