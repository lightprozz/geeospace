// ---------------------------------------------------------------------------
// lib/requests/api.ts — V2 Forms-Runtime (Requests) API
// Routes: api/v2/forms/requests/*
// Canonical contract: GeeOBEv2/docs/api-endpoints-frontendv2/v2-forms-runtime-contract.md
//
// Three module-specific rules the callers depend on:
//
// 1. CONCURRENCY. approve/deny/assign/archive/worklog-save send
//    `If-Unmodified-Since: <updatedAt>` and answer with a NEW `{ updatedAt }`.
//    Callers MUST re-arm from the response token — the server re-reads the row
//    after SaveChanges (SQL `datetime` rounds to ~3.33ms), so a synthesized or
//    reused token can never match. Comments send and return no token.
// 2. DENIALS ARE 422. `lib/api-client.ts` ejects the whole SPA to /forbidden on
//    ANY 403, so data-driven denials arrive as 422 + an `errorCode` extension.
//    Use the `is*Error` helpers at the bottom of this file; never match the
//    ProblemDetails `type` URI.
// 3. NON-PARTICIPANT READS ARE 404, not 403 (deliberate — closes the id
//    enumeration oracle and avoids the global 403 eject).
//
// The `/query` body is a domain shape (tab/collectionId/status/keyword/
// archived), NOT the generic `TableQueryRequest`, so it goes through
// `apiFetch` directly rather than `queryPaged`.
// ---------------------------------------------------------------------------

import { apiFetch, isApiError, type PagedResult, type ProblemDetails } from "@/features/lms/lib/transport"
import {
  RequestErrorCode,
  type ActivityDto,
  type Answer,
  type AvailableTemplate,
  type CommentDto,
  type RequestDetail,
  type RequestListItem,
  type RequestQueryRequest,
  type RequestSummary,
  type SubmitRequestBody,
  type SubmitTemplate,
  type TabCountsDto,
  type TokenDto,
  type UserOptionDto,
  type WorkLogHistory,
} from "@/features/lms/types/request"

const REQUESTS_API = "/api/v2/forms/requests"

/** `If-Unmodified-Since` carrier — the row's CURRENT token, from the last read/write response. */
function tokenHeader(updatedAt: string): Record<string, string> {
  return { "If-Unmodified-Since": updatedAt }
}

// =========================================================================
// Templates (endpoints 1, 2)
// =========================================================================

/**
 * GET /templates/available?collectionId=
 * Published RequestForm templates the caller may submit. Scope is an OR of
 * group membership and campus assignment, resolved server-side.
 */
export async function fetchAvailableTemplates(
  collectionId?: string,
): Promise<AvailableTemplate[]> {
  const qs = collectionId ? `?collectionId=${encodeURIComponent(collectionId)}` : ""
  return apiFetch<AvailableTemplate[]>(`${REQUESTS_API}/templates/available${qs}`)
}

/**
 * GET /templates/{id}/for-submit
 * Template + typed fields. 404 when the template is out of the caller's scope.
 */
export async function fetchSubmitTemplate(id: string): Promise<SubmitTemplate> {
  return apiFetch<SubmitTemplate>(
    `${REQUESTS_API}/templates/${encodeURIComponent(id)}/for-submit`,
  )
}

// =========================================================================
// Submit (endpoint 3)
// =========================================================================

/**
 * POST / (multipart/form-data) — part `payload` = JSON SubmitRequestBody,
 * parts = the attachments referenced by Attachment(6) answers.
 *
 * ROUTING. The server routes each file part BY ITS PART NAME: a part named
 * after an Attachment field's `inputKey` lands on that field, and the generic
 * `files` bucket targets the FIRST Attachment field. A part that routes
 * nowhere is REJECTED (422) rather than dropped — so this sends every file
 * under its own field's `inputKey`, which routes exactly and stays correct
 * for templates with more than one Attachment field.
 *
 * `files` accepts either a flat `File[]` (single Attachment field — the parts
 * go out under the generic `files` name) or a `Record<inputKey, File[]>` map
 * (one entry per Attachment field). Prefer the map: it is unambiguous.
 *
 * Build `answers` with `encode()` from lib/requests/field-value.ts: it drops
 * any client-side edit of a degraded picker (9/10/13/15) and re-encodes the
 * stored value, which is what keeps a submit from tripping 422
 * PICKER_NOT_EDITABLE. The server owns userId, formStatus, dates, watcher
 * expansion and the first workflow.
 */
export async function submitRequest(
  payload: SubmitRequestBody,
  files: Record<string, File[]> | File[] = [],
): Promise<RequestSummary> {
  const form = new FormData()
  form.append("payload", JSON.stringify(payload))

  if (Array.isArray(files)) {
    for (const file of files) form.append("files", file, file.name)
  } else {
    for (const [inputKey, group] of Object.entries(files)) {
      for (const file of group) form.append(inputKey, file, file.name)
    }
  }

  return apiFetch<RequestSummary>(`${REQUESTS_API}`, { method: "POST", body: form })
}

// =========================================================================
// Query / counts / detail (endpoints 4, 5, 6)
// =========================================================================

/**
 * POST /query → PagedResult<RequestListItem>.
 * Tab membership, filtering and paging are ALL server-side — never partition
 * or recount the result client-side (v1 did, and its counts described one set
 * while the page described another).
 */
export async function queryRequests(
  req: RequestQueryRequest,
): Promise<PagedResult<RequestListItem>> {
  return apiFetch<PagedResult<RequestListItem>>(`${REQUESTS_API}/query`, {
    method: "POST",
    body: {
      tab: req.tab,
      collectionId: req.collectionId,
      status: req.status,
      keyword: req.keyword,
      archived: req.archived ?? false,
      page: req.page ?? 1,
      pageSize: req.pageSize ?? 25,
      sort: req.sort,
    },
  })
}

/** Filters shared by /query and /query/counts — /query/counts ignores tab/page/pageSize/sort. */
export type RequestCountsFilters = Omit<
  RequestQueryRequest,
  "tab" | "page" | "pageSize" | "sort"
>

/**
 * POST /query/counts → { action, created, viewer }.
 * Separate from /query so a page turn does not force a three-tab recount.
 */
export async function fetchTabCounts(
  filters: RequestCountsFilters = {},
): Promise<TabCountsDto> {
  return apiFetch<TabCountsDto>(`${REQUESTS_API}/query/counts`, {
    method: "POST",
    body: {
      collectionId: filters.collectionId,
      status: filters.status,
      keyword: filters.keyword,
      archived: filters.archived ?? false,
    },
  })
}

/** GET /{id} → RequestDetail. 404 when the caller is not a participant. */
export async function fetchRequestDetail(id: string): Promise<RequestDetail> {
  return apiFetch<RequestDetail>(`${REQUESTS_API}/${encodeURIComponent(id)}`)
}

// =========================================================================
// Transitions (endpoints 7, 8, 9, 13) — all require If-Unmodified-Since and
// all return the NEW token. Re-arm optimistic state from the RESPONSE.
// =========================================================================

export interface ApproveRequestInput {
  /** `RequestDetail.currentWorkflowId`, passed straight back. */
  workflowId: string
  note?: string
}

/**
 * POST /{id}/approve — delegates to v1 Process(Solve).
 * 422 `NOT_ELIGIBLE` (someone else took the step), `REQUEST_TERMINAL`
 * (already finished) or `WORKLOG_REQUIRED` (step's worklog unsaved; carries a
 * `processId` extension) are the expected data-driven refusals.
 */
export async function approveRequest(
  id: string,
  input: ApproveRequestInput,
  updatedAt: string,
): Promise<TokenDto> {
  return apiFetch<TokenDto>(`${REQUESTS_API}/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: { workflowId: input.workflowId, note: input.note },
    headers: tokenHeader(updatedAt),
  })
}

export interface DenyRequestInput {
  workflowId: string
  /** Required on deny — but see below: a FINAL-step deny discards it server-side. */
  note: string
}

/**
 * POST /{id}/deny — delegates to v1 Process(Denied).
 * Routes back to `nextProcessIfDeniedId` when the step defines one (the
 * request stays in flight). ⚠️ A deny on the FINAL step sets the stage to
 * Done(4) and never stores the note — do not present `stageStatus` alone as
 * approved-vs-rejected, and expect a null `note` on that step.
 */
export async function denyRequest(
  id: string,
  input: DenyRequestInput,
  updatedAt: string,
): Promise<TokenDto> {
  return apiFetch<TokenDto>(`${REQUESTS_API}/${encodeURIComponent(id)}/deny`, {
    method: "POST",
    body: { workflowId: input.workflowId, note: input.note },
    headers: tokenHeader(updatedAt),
  })
}

export interface AssignRequestInput {
  processId: string
  /** MUST come from `fetchApproverCandidates(processId)`; anything else → 422 NOT_ELIGIBLE. */
  userId: string
}

/**
 * POST /{id}/assign — reassigns the current step's approver.
 * The server resolves the display name from AspNetUsers; a client-supplied
 * name is ignored.
 */
export async function assignRequest(
  id: string,
  input: AssignRequestInput,
  updatedAt: string,
): Promise<TokenDto> {
  return apiFetch<TokenDto>(`${REQUESTS_API}/${encodeURIComponent(id)}/assign`, {
    method: "POST",
    body: { processId: input.processId, userId: input.userId },
    headers: tokenHeader(updatedAt),
  })
}

/**
 * POST /{id}/archive — explicit value, not a toggle (v1's toggle is racy).
 * Creator only; a non-creator participant gets 422 NOT_ELIGIBLE.
 */
export async function setArchived(
  id: string,
  archived: boolean,
  updatedAt: string,
): Promise<TokenDto> {
  return apiFetch<TokenDto>(`${REQUESTS_API}/${encodeURIComponent(id)}/archive`, {
    method: "POST",
    body: { archived },
    headers: tokenHeader(updatedAt),
  })
}

/**
 * POST /{id}/open — moves a New(1) request to Processing(2), ONCE.
 *
 * IDEMPOTENT by contract: a request that is already Processing — or that has
 * already finished — answers with the persisted token and no transition, so a
 * double-click, a second tab or a retry of a succeeded open never 409s.
 *
 * The token is only enforced when a transition will actually happen, so the
 * retry of a succeeded open does not need the pre-open token.
 */
export async function openRequest(
  id: string,
  updatedAt: string,
): Promise<TokenDto> {
  return apiFetch<TokenDto>(`${REQUESTS_API}/${encodeURIComponent(id)}/open`, {
    method: "POST",
    headers: tokenHeader(updatedAt),
  })
}

// =========================================================================
// Activities + comments (endpoints 10, 11, 12)
// =========================================================================

/** GET /{id}/activities → newest first. Separate fetch — can be large. */
export async function fetchActivities(id: string): Promise<ActivityDto[]> {
  return apiFetch<ActivityDto[]>(`${REQUESTS_API}/${encodeURIComponent(id)}/activities`)
}

/** GET /{id}/comments → oldest first, threaded via `rootId`. */
export async function fetchComments(id: string): Promise<CommentDto[]> {
  return apiFetch<CommentDto[]>(`${REQUESTS_API}/${encodeURIComponent(id)}/comments`)
}

export interface AddCommentInput {
  content: string
  /** Parent comment id for a reply; omit for a root comment. */
  rootId?: string
  files?: File[]
}

/**
 * POST /{id}/comments (multipart) — part `payload` = {content, rootId?},
 * parts `files[]`.
 * ⚠️ Comments neither send nor receive a concurrency token: commenting must
 * not 409 an approver mid-review, so the request root is deliberately not
 * bumped. Do NOT add an If-Unmodified-Since header here.
 */
export async function addComment(
  id: string,
  input: AddCommentInput,
): Promise<CommentDto> {
  const form = new FormData()
  form.append(
    "payload",
    JSON.stringify({ content: input.content, rootId: input.rootId }),
  )
  for (const file of input.files ?? []) form.append("files", file, file.name)
  return apiFetch<CommentDto>(`${REQUESTS_API}/${encodeURIComponent(id)}/comments`, {
    method: "POST",
    body: form,
  })
}

// =========================================================================
// Worklog step (endpoints 14, 15)
// =========================================================================

/**
 * GET /{id}/worklogs → the request's worklog HISTORY, one entry per step that
 * has a worklog (a configured template OR saved answers).
 *
 * Read-only by construction — the answers live on the step, so this endpoint
 * cannot advance anything and takes no concurrency token. A step with a
 * template but no saved answers comes back with `fields: []`.
 */
export async function fetchWorklogs(id: string): Promise<WorkLogHistory[]> {
  return apiFetch<WorkLogHistory[]>(
    `${REQUESTS_API}/${encodeURIComponent(id)}/worklogs`,
  )
}

/**
 * GET /{id}/worklog-step/{processId} → the step's WorkLog template with saved
 * answers pre-filled. `processId` must be a child of `{id}` (else 404).
 */
export async function fetchWorklogStep(
  id: string,
  processId: string,
): Promise<SubmitTemplate> {
  return apiFetch<SubmitTemplate>(
    `${REQUESTS_API}/${encodeURIComponent(id)}/worklog-step/${encodeURIComponent(processId)}`,
  )
}

/**
 * POST /{id}/worklog-step/{processId} — saves the step's worklog answers.
 * v2 adds the eligibility gate v1 lacked, and explicitly touches the request
 * root so a saved worklog invalidates stale approve tokens: the returned
 * `updatedAt` therefore supersedes the one held by any open approve form.
 */
export async function saveWorklogStep(
  id: string,
  processId: string,
  answers: Answer[],
  updatedAt: string,
): Promise<TokenDto> {
  return apiFetch<TokenDto>(
    `${REQUESTS_API}/${encodeURIComponent(id)}/worklog-step/${encodeURIComponent(processId)}`,
    { method: "POST", body: { answers }, headers: tokenHeader(updatedAt) },
  )
}

// =========================================================================
// Lookups (endpoint 16)
// =========================================================================

/**
 * GET /lookups/approver-candidates?processId= → REASSIGNMENT candidates.
 * Distinct from `RequestDetail.resolvedApprovers` (= who can approve NOW);
 * the caller is excluded from this list.
 */
export async function fetchApproverCandidates(
  processId: string,
): Promise<UserOptionDto[]> {
  const qs = `?processId=${encodeURIComponent(processId)}`
  return apiFetch<UserOptionDto[]>(`${REQUESTS_API}/lookups/approver-candidates${qs}`)
}

// =========================================================================
// Attachments (endpoint 17)
//
// GET /{id}/attachments/{storedName} is an AUTHENTICATED download. Attachment
// URLs the API returns already point at it, so there is deliberately NO URL
// builder here — render `AttachmentEntry.url` / `CommentDto.attachments[].url`
// verbatim. Legacy rows still carry anonymous `/api/media/...` URLs and are
// not migrated; render those as-is too. Constructing the path client-side
// would silently break both cases.
// =========================================================================

// =========================================================================
// Error classification — data-driven denials are 422 (never 403: apiFetch
// redirects the whole SPA to /forbidden on any 403). Every helper inspects
// `ApiError.problem.errorCode`; the `type` URI is NOT a stable identifier.
// =========================================================================

function hasErrorCode(err: unknown, code: string, status: number): boolean {
  return (
    isApiError(err) &&
    err.status === status &&
    err.problem?.errorCode === code
  )
}

/** 409 — stale `If-Unmodified-Since`. Refetch the detail and notify; do not blind-retry. */
export function isConflictError(err: unknown): boolean {
  return hasErrorCode(err, RequestErrorCode.Conflict, 409)
}

/** 422 — the caller is not the current-step approver (someone else took the step). */
export function isNotEligibleError(err: unknown): boolean {
  return hasErrorCode(err, RequestErrorCode.NotEligible, 422)
}

/** 422 — the request already finished (DoneApproved/DoneDenied/Closed/Expired). */
export function isRequestTerminalError(err: unknown): boolean {
  return hasErrorCode(err, RequestErrorCode.RequestTerminal, 422)
}

/** 422 — the step's worklog must be filled before approving (see getWorklogRequiredProcessId). */
export function isWorklogRequiredError(err: unknown): boolean {
  return hasErrorCode(err, RequestErrorCode.WorklogRequired, 422)
}

/** 422 — a NEW value was sent for a degraded picker 9/10/13/15 (see getPickerNotEditableFieldId). */
export function isPickerNotEditableError(err: unknown): boolean {
  return hasErrorCode(err, RequestErrorCode.PickerNotEditable, 422)
}

/**
 * ProblemDetails extensions this module adds. They are BE `Extensions` entries,
 * not members of the shared `ProblemDetails` interface,
 * so they are read through a local cast rather than by widening that type for
 * one module (same approach as lib/worklog/api.ts's getConflictUpdatedAt).
 */
type RequestProblemDetails = ProblemDetails & {
  currentUpdatedAt?: string
  processId?: string
  fieldId?: string
}

function problemOf(err: unknown): RequestProblemDetails | undefined {
  if (!isApiError(err)) return undefined
  return err.problem as RequestProblemDetails | undefined
}

/** The server's current token from a 409 CONFLICT, when it supplied one. */
export function getConflictUpdatedAt(err: unknown): string | undefined {
  return problemOf(err)?.currentUpdatedAt
}

/** The step whose worklog must be filled, from a 422 WORKLOG_REQUIRED. */
export function getWorklogRequiredProcessId(err: unknown): string | undefined {
  return problemOf(err)?.processId
}

/** The offending field, from a 422 PICKER_NOT_EDITABLE. */
export function getPickerNotEditableFieldId(err: unknown): string | undefined {
  return problemOf(err)?.fieldId
}

/**
 * The server's own explanation, or `fallback` when there is none.
 *
 * ProblemDetails `detail` is the only place the server states WHY a write was
 * refused ("That user cannot take this step…", "note is required when
 * denying."). Swallowing it in favour of a generic sentence hides the reason
 * from the person who has to fix it, so every refusal toast goes through here.
 */
export function getErrorDetail(err: unknown, fallback: string): string {
  const detail = problemOf(err)?.detail?.trim()
  return detail && detail.length > 0 ? detail : fallback
}
