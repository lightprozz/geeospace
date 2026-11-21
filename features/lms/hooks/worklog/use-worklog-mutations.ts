'use client'
// ---------------------------------------------------------------------------
// hooks/worklog/use-worklog-mutations.ts
// TanStack Query write hooks for the WRK v2 worklog module (create/update/
// delete/status). CLIENT-ONLY — 'use client' required for hooks.
//
// Deliberately NO onError toast here: writes can 409 for two distinct
// reasons (optimistic-concurrency conflict vs. APPROVED-LOCK) that need
// different caller-side UX (refetch+notify vs. "ask an approver"). Per the
// module contract, mutations surface the raw ApiError to the caller — use
// `isApprovedLockedError` / `isConcurrencyError` from lib/worklog/api to
// branch, and mutate via `mutateAsync` inside a try/catch. No silent retry.
// ---------------------------------------------------------------------------

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  createWorkLog,
  deleteWorkLog,
  setWorkLogStatus,
  updateWorkLog,
  type CreateWorkLogInput,
  type UpdateWorkLogInput,
} from '@/features/lms/lib/worklog/api'
import { worklogKeys } from '@/features/lms/lib/worklog/query-keys'

function invalidateWorklogReads(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: worklogKeys.lists() })
  qc.invalidateQueries({ queryKey: worklogKeys.summaries() })
  qc.invalidateQueries({ queryKey: worklogKeys.details() })
}

interface WorklogMutationOptions {
  /**
   * Default true. Set false to suppress this hook's own per-mutation
   * invalidation — for callers running a sequential batch of mutations (e.g.
   * the Class Detail worklog pane's save loop) that invalidate ONCE after
   * the whole batch instead of once per call.
   */
  invalidateOnSuccess?: boolean
}

/** POST /worklog — anchor-required create (teacherLessonLogId XOR singleLessonId). */
export function useCreateWorkLog(options?: WorklogMutationOptions) {
  const qc = useQueryClient()
  const invalidateOnSuccess = options?.invalidateOnSuccess ?? true
  return useMutation({
    mutationFn: (data: CreateWorkLogInput) => createWorkLog(data),
    onSuccess: () => {
      if (invalidateOnSuccess) invalidateWorklogReads(qc)
    },
  })
}

/** PUT /worklog/{id} — score/comment/evaluate/order only; requires the row's current updatedAt. */
export function useUpdateWorkLog(options?: WorklogMutationOptions) {
  const qc = useQueryClient()
  const invalidateOnSuccess = options?.invalidateOnSuccess ?? true
  return useMutation({
    mutationFn: ({
      id,
      data,
      updatedAt,
    }: {
      id: string
      data: UpdateWorkLogInput
      updatedAt: string
    }) => updateWorkLog(id, data, updatedAt),
    onSuccess: () => {
      if (invalidateOnSuccess) invalidateWorklogReads(qc)
    },
  })
}

/** DELETE /worklog/{id} — requires the row's current updatedAt. */
export function useDeleteWorkLog(options?: WorklogMutationOptions) {
  const qc = useQueryClient()
  const invalidateOnSuccess = options?.invalidateOnSuccess ?? true
  return useMutation({
    mutationFn: ({ id, updatedAt }: { id: string; updatedAt: string }) =>
      deleteWorkLog(id, updatedAt),
    onSuccess: () => {
      if (invalidateOnSuccess) invalidateWorklogReads(qc)
    },
  })
}

/** POST /worklog/{id}/status — approve/reject only (worklog.approve, never self-serve). */
export function useSetWorkLogStatus(options?: WorklogMutationOptions) {
  const qc = useQueryClient()
  const invalidateOnSuccess = options?.invalidateOnSuccess ?? true
  return useMutation({
    mutationFn: ({
      id,
      status,
      updatedAt,
    }: {
      id: string
      status: 'Accepted' | 'Rejected'
      updatedAt: string
    }) => setWorkLogStatus(id, status, updatedAt),
    onSuccess: () => {
      if (invalidateOnSuccess) invalidateWorklogReads(qc)
    },
  })
}
