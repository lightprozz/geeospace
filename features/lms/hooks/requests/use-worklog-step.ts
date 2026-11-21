'use client'
// ---------------------------------------------------------------------------
// hooks/requests/use-worklog-step.ts
// TanStack Query read hook for a step's in-flight WorkLog form.
// CLIENT-ONLY — 'use client' required for hooks.
//
// The write half lives in use-request-mutations.ts (`useSaveWorklogStep`) —
// it is a token-bearing transition and belongs with the other four.
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { fetchWorklogStep } from '@/features/lms/lib/requests/api'
import { requestKeys } from '@/features/lms/lib/requests/query-keys'

/**
 * GET /{id}/worklog-step/{processId} — the step's WorkLog template with the
 * saved answers pre-filled. Seed form state with `decode(field)` from
 * lib/requests/field-value.ts, exactly as for a submit template.
 *
 * Only fetch when the detail says the step needs one: `needToDo === true` on
 * the request (or the step). `processId` must be a child of `{id}` — a
 * cross-request id is 404. The endpoint is gated on current-step eligibility,
 * so a participant who is not the approver gets 422 NOT_ELIGIBLE; keep it
 * disabled until `canApprove` is true.
 */
export function useWorklogStep(
  id: string | null,
  processId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: requestKeys.worklogStep(id ?? '', processId ?? ''),
    queryFn: () => fetchWorklogStep(id!, processId!),
    enabled: (options?.enabled ?? true) && !!id && !!processId,
  })
}
