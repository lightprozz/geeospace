'use client'
// ---------------------------------------------------------------------------
// hooks/requests/use-approver-candidates.ts
// TanStack Query read hook for the REASSIGNMENT candidate list.
// CLIENT-ONLY — 'use client' required for hooks.
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { fetchApproverCandidates } from '@/features/lms/lib/requests/api'
import { requestKeys } from '@/features/lms/lib/requests/query-keys'

/**
 * GET /lookups/approver-candidates?processId=
 *
 * These are the users the step may be REASSIGNED to — distinct from
 * `RequestDetail.resolvedApprovers`, which is who can approve NOW. The caller
 * is excluded. `assignRequest` accepts exactly this set; any other id is
 * refused with 422 NOT_ELIGIBLE, so drive the assign picker from here rather
 * than from a general user lookup.
 *
 * Fetch lazily — pass `enabled: false` until the assign dialog opens; the
 * endpoint is gated on `canAssign` for that step.
 */
export function useApproverCandidates(
  processId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: requestKeys.approverCandidates(processId ?? ''),
    queryFn: () => fetchApproverCandidates(processId!),
    enabled: (options?.enabled ?? true) && !!processId,
  })
}
