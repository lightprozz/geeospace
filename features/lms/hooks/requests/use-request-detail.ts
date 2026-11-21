'use client'
// ---------------------------------------------------------------------------
// hooks/requests/use-request-detail.ts
// TanStack Query read hooks for ONE request: detail, comments, activities.
// CLIENT-ONLY — 'use client' required for hooks.
//
// `RequestDetail.canApprove` / `canAssign` / `needToDo` / `worklogFilled` /
// `resolvedApprovers` are SERVER-COMPUTED. Render them; never re-derive
// eligibility from roles (v1's `ADMIN_ROLES.includes(ROLES.ADMIN)` gate was an
// always-true expression — that is the bug this rebuild removes).
//
// A non-participant read returns 404, not 403.
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import {
  fetchActivities,
  fetchComments,
  fetchRequestDetail,
  fetchWorklogs,
} from '@/features/lms/lib/requests/api'
import { requestKeys } from '@/features/lms/lib/requests/query-keys'

/**
 * GET /{id}. `data.updatedAt` is the OPAQUE concurrency token to arm the next
 * mutation with — display `lastModified` / `createdDate` instead.
 */
export function useRequestDetail(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: requestKeys.detail(id ?? ''),
    queryFn: () => fetchRequestDetail(id!),
    enabled: (options?.enabled ?? true) && !!id,
  })
}

/** GET /{id}/comments — oldest first, threaded via `rootId`. Separate fetch. */
export function useRequestComments(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: requestKeys.comments(id ?? ''),
    queryFn: () => fetchComments(id!),
    enabled: (options?.enabled ?? true) && !!id,
  })
}

/** GET /{id}/activities — newest first. Separate fetch (can be large). */
export function useRequestActivities(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: requestKeys.activities(id ?? ''),
    queryFn: () => fetchActivities(id!),
    enabled: (options?.enabled ?? true) && !!id,
  })
}

/**
 * GET /{id}/worklogs — every saved worklog of one request, oldest step first.
 * Read-only: no token, and it can never advance the request.
 */
export function useRequestWorklogs(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: requestKeys.worklogs(id ?? ''),
    queryFn: () => fetchWorklogs(id!),
    enabled: (options?.enabled ?? true) && !!id,
  })
}
