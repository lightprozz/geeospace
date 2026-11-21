'use client'
// ---------------------------------------------------------------------------
// hooks/requests/use-request-mutations.ts
// TanStack Query write hooks for the FRM v2 requests runtime.
// CLIENT-ONLY — 'use client' required for hooks.
//
// CONCURRENCY. approve/deny/assign/archive/worklog-save take the request's
// CURRENT `updatedAt` and resolve to the NEW one. Callers re-arm from the
// RESOLVED value — never reuse the token they sent, and never synthesize one
// (the server re-reads the row after SaveChanges because SQL `datetime`
// rounds to ~3.33ms, so a client-made token can never match). Each hook also
// invalidates the request's reads, so a component that re-reads the detail
// picks the token up automatically; `mutateAsync`'s return value is there for
// callers holding a token in local form state.
//
// Deliberately NO onError toast: these writes fail for several distinct,
// data-driven reasons (409 CONFLICT, 422 NOT_ELIGIBLE / REQUEST_TERMINAL /
// WORKLOG_REQUIRED / PICKER_NOT_EDITABLE) that need different inline UX. Use
// `mutateAsync` in a try/catch and branch with the `is*Error` helpers from
// lib/requests/api. No silent retry.
//
// Comments are the exception: they carry no token in either direction.
// ---------------------------------------------------------------------------

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  addComment,
  approveRequest,
  assignRequest,
  denyRequest,
  openRequest,
  saveWorklogStep,
  setArchived,
  submitRequest,
  type AddCommentInput,
  type ApproveRequestInput,
  type AssignRequestInput,
  type DenyRequestInput,
} from '@/features/lms/lib/requests/api'
import { requestKeys } from '@/features/lms/lib/requests/query-keys'
import type { Answer, SubmitRequestBody } from '@/features/lms/types/request'

/**
 * A transition changes the row AND its position in every tab/count, so both
 * the request's own read surface (detail + comments + activities + worklog
 * steps, all nested under `detail(id)`) and the inbox (lists + counts) are
 * invalidated.
 */
function invalidateRequestReads(qc: QueryClient, id: string) {
  qc.invalidateQueries({ queryKey: requestKeys.detail(id) })
  qc.invalidateQueries({ queryKey: requestKeys.lists() })
}

/** Shared variables shape for the five token-bearing transitions. */
interface TokenMutationVars<TInput> {
  id: string
  input: TInput
  /** The request's CURRENT `updatedAt`. Sent as If-Unmodified-Since. */
  updatedAt: string
}

/**
 * POST /{id}/approve — resolves to the NEW `{ updatedAt }`.
 * Expected refusals: 422 NOT_ELIGIBLE (someone else took the step),
 * REQUEST_TERMINAL (already finished), WORKLOG_REQUIRED (fill the step's
 * worklog first — `getWorklogRequiredProcessId(err)` names it).
 */
export function useApproveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input, updatedAt }: TokenMutationVars<ApproveRequestInput>) =>
      approveRequest(id, input, updatedAt),
    onSuccess: (_token, { id }) => invalidateRequestReads(qc, id),
  })
}

/**
 * POST /{id}/deny — resolves to the NEW `{ updatedAt }`.
 * With a `nextProcessIfDeniedId` the request routes back and stays in flight;
 * without one it terminates. A FINAL-step deny discards the note server-side.
 */
export function useDenyRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input, updatedAt }: TokenMutationVars<DenyRequestInput>) =>
      denyRequest(id, input, updatedAt),
    onSuccess: (_token, { id }) => invalidateRequestReads(qc, id),
  })
}

/**
 * POST /{id}/assign — resolves to the NEW `{ updatedAt }`.
 * `input.userId` must come from `useApproverCandidates(processId)`.
 */
export function useAssignRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input, updatedAt }: TokenMutationVars<AssignRequestInput>) =>
      assignRequest(id, input, updatedAt),
    onSuccess: (_token, { id, input }) => {
      invalidateRequestReads(qc, id)
      // Assign rewrites the step's approver row, so its candidate set (which
      // excludes the current holder) is stale.
      qc.invalidateQueries({
        queryKey: requestKeys.approverCandidates(input.processId),
      })
    },
  })
}

/** POST /{id}/archive — explicit value, not a toggle. Creator only. */
export function useSetRequestArchived() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input, updatedAt }: TokenMutationVars<{ archived: boolean }>) =>
      setArchived(id, input.archived, updatedAt),
    onSuccess: (_token, { id }) => invalidateRequestReads(qc, id),
  })
}

/**
 * POST /{id}/open — moves a New(1) request to Processing(2), once.
 *
 * IDEMPOTENT server-side: a request that is already Processing — or already
 * finished — answers with the persisted token and no transition, so a
 * double-click or a second tab never 409s. The returned token is therefore
 * the request's authoritative current token afterwards.
 */
export function useOpenRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updatedAt }: { id: string; updatedAt: string }) =>
      openRequest(id, updatedAt),
    onSuccess: (_token, { id }) => invalidateRequestReads(qc, id),
  })
}

/**
 * POST /{id}/worklog-step/{processId} — resolves to the NEW `{ updatedAt }`.
 * v2 explicitly touches the request root here, so this token supersedes the
 * one held by any open approve form: re-arm before approving, or that approve
 * 409s.
 */
export function useSaveWorklogStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
      updatedAt,
    }: TokenMutationVars<{ processId: string; answers: Answer[] }>) =>
      saveWorklogStep(id, input.processId, input.answers, updatedAt),
    onSuccess: (_token, { id }) => invalidateRequestReads(qc, id),
  })
}

/**
 * POST / (multipart) — submit a new request.
 *
 * `files` may be a flat `File[]` (all files go out under the generic `files`
 * part name, which the server routes to the FIRST Attachment field) or a
 * `Record<inputKey, File[]>` map — one entry per Attachment field, each part
 * named after its field's `inputKey`. The map is unambiguous and is what the
 * submit screen sends.
 *
 * Build `answers` with `encode()` from lib/requests/field-value.ts. A template
 * that REQUIRES a degraded picker (9/10/13/15) cannot be satisfied by this
 * client and must be blocked BEFORE calling this, with an explanation — the
 * server would otherwise answer 422 PICKER_NOT_EDITABLE or reject the empty
 * required answer.
 */
export function useSubmitRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      payload,
      files,
    }: {
      payload: SubmitRequestBody
      files?: Record<string, File[]> | File[]
    }) => submitRequest(payload, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.lists() })
    },
  })
}

/**
 * POST /{id}/comments (multipart).
 * ⚠️ NO concurrency token in either direction — commenting must not 409 an
 * approver mid-review, so the request root is deliberately not bumped. Only
 * the comment list is invalidated; a held `updatedAt` stays valid.
 */
export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddCommentInput }) =>
      addComment(id, input),
    onSuccess: (_comment, { id }) => {
      qc.invalidateQueries({ queryKey: requestKeys.comments(id) })
    },
  })
}
