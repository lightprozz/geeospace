// ---------------------------------------------------------------------------
// lib/requests/query-keys.ts
// Centralized TanStack Query key factories for the FRM v2 requests runtime.
// Prevents cache key drift across hooks — mirrors lib/worklog/query-keys.ts.
//
// Layout is deliberately hierarchical so a mutation can invalidate a whole
// class of reads with one prefix:
//   requestKeys.lists()   -> every inbox page/tab AND the tab counts
//   requestKeys.detail(id)-> one request's detail, comments, activities,
//                            worklog steps
// ---------------------------------------------------------------------------

import type { RequestCountsFilters } from "./api"
import type { RequestQueryRequest, RequestTab } from "@/features/lms/types/request"

/** The list filters minus the tab — the tab is a separate key segment. */
export type RequestListFilters = Omit<RequestQueryRequest, "tab">

export const requestKeys = {
  all: ["requests"] as const,

  // Inbox list (POST /query) — one entry per (tab, filters) pair.
  lists: () => [...requestKeys.all, "list"] as const,
  list: (tab: RequestTab, filters: RequestListFilters) =>
    [...requestKeys.lists(), tab, filters] as const,

  // Tab counts (POST /query/counts). Nested under lists() so the mutation
  // hooks' single `invalidateQueries({ queryKey: requestKeys.lists() })` also
  // refreshes the tab bar with no extra wiring.
  counts: (filters: RequestCountsFilters) =>
    [...requestKeys.lists(), "counts", filters] as const,

  // Detail (GET /{id}) and everything scoped to one request. `comments`,
  // `activities` and `worklogStep` are nested under `detail(id)` so a
  // transition can invalidate the request's whole read surface at once.
  details: () => [...requestKeys.all, "detail"] as const,
  detail: (id: string) => [...requestKeys.details(), id] as const,
  comments: (id: string) => [...requestKeys.detail(id), "comments"] as const,
  activities: (id: string) => [...requestKeys.detail(id), "activities"] as const,
  worklogStep: (id: string, processId: string) =>
    [...requestKeys.detail(id), "worklog-step", processId] as const,
  // Worklog HISTORY (GET /{id}/worklogs) — every saved worklog of one request.
  worklogs: (id: string) => [...requestKeys.detail(id), "worklogs"] as const,

  // Templates (GET /templates/available, GET /templates/{id}/for-submit).
  templates: () => [...requestKeys.all, "template"] as const,
  availableTemplates: (collectionId?: string) =>
    [...requestKeys.templates(), "available", collectionId ?? "all"] as const,
  submitTemplate: (id: string) =>
    [...requestKeys.templates(), "for-submit", id] as const,

  // Reassignment candidates (GET /lookups/approver-candidates?processId=).
  approverCandidates: (processId: string) =>
    [...requestKeys.all, "approver-candidates", processId] as const,
}

export type { RequestCountsFilters }
