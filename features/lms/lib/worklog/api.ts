// ---------------------------------------------------------------------------
// lib/worklog/api.ts — V2 Working-Time (Worklog) API
// Routes: api/v2/working-time/*
// Canonical contract: GeeOBEv2/docs/api-endpoints-frontendv2/v2-working-time-contract.md
//
// The `/worklog/query` and `/worklog/summary/query` request bodies are a
// custom domain shape (from/to/ownerId/status/effortType/classId, plus
// Amendment 2's teacherLessonLogId lesson-scoped mode on `/query`), NOT the
// generic `TableQueryRequest` (filters/search) used elsewhere in this repo —
// so these two calls go through `apiFetch` directly instead of `queryPaged`.
// ---------------------------------------------------------------------------

import { apiFetch, isApiError, type PagedResult, type ProblemDetails } from "@/features/lms/lib/transport"
import type {
  AttendanceItem,
  ShiftOption,
  TimebookSummary,
  WorkLogItemV2,
  WorkLogStatusV2Value,
} from "@/features/lms/types/worklog"

const WORKLOG_API = "/api/v2/working-time"

// =========================================================================
// Worklog query / detail
// =========================================================================

export interface WorkLogQueryFilters {
  /**
   * Date-only "YYYY-MM-DD" — filters on lessonStart (inclusive). Required in
   * practice for the owner-scoped mode (`teacherLessonLogId` unset); optional
   * AND-narrowing when `teacherLessonLogId` is set (Amendment 2).
   */
  from?: string
  /** Date-only "YYYY-MM-DD" — same nullability/semantics as `from`. */
  to?: string
  /**
   * Owner-scoped mode: omit for "self only"; a concrete value requires
   * worklog.approve unless it equals the caller. Lesson-scoped mode
   * (`teacherLessonLogId` set): optional AND-narrowing filter, no approve
   * requirement of its own.
   */
  ownerId?: string
  status?: WorkLogStatusV2Value
  effortType?: string
  classId?: string
  /**
   * Amendment 2 — when set, switches `/worklog/query` to lesson-scoped mode:
   * returns ALL owners' worklogs anchored to that lesson (visibility: caller
   * holds worklog.approve OR passes the class-membership check for the
   * anchor's class). `ownerId`/`from`/`to`/`status`/`effortType` become
   * optional AND-narrowing filters on that result set instead of the primary
   * scope.
   */
  teacherLessonLogId?: string
  page?: number
  pageSize?: number
  sort?: { field: string; desc?: boolean }[]
}

/** POST /api/v2/working-time/worklog/query */
export async function queryWorkLogs(
  req: WorkLogQueryFilters,
): Promise<PagedResult<WorkLogItemV2>> {
  return apiFetch<PagedResult<WorkLogItemV2>>(`${WORKLOG_API}/worklog/query`, {
    method: "POST",
    body: {
      from: req.from,
      to: req.to,
      ownerId: req.ownerId,
      status: req.status,
      effortType: req.effortType,
      classId: req.classId,
      teacherLessonLogId: req.teacherLessonLogId,
      page: req.page ?? 1,
      pageSize: req.pageSize ?? 500,
      sort: req.sort,
    },
  })
}

/** GET /api/v2/working-time/worklog/{id} */
export async function fetchWorkLog(id: string): Promise<WorkLogItemV2> {
  return apiFetch<WorkLogItemV2>(`${WORKLOG_API}/worklog/${id}`)
}

// =========================================================================
// Worklog writes
// =========================================================================

export interface CreateWorkLogInput {
  /** Exactly one of teacherLessonLogId / singleLessonId is required (server validates XOR). */
  teacherLessonLogId?: string
  singleLessonId?: string
  effortType: string
  score: number
  comment?: string
  evaluate?: boolean
  order?: number
  isExpat?: boolean
  /**
   * Amendment 2 — targets a specific teacher for this create instead of the
   * server-derived anchor teacher. Allowed iff (a) caller == targetTeacherId
   * OR caller holds worklog.approve, AND (b) targetTeacherId passes the
   * class-membership check for the anchor's class (else 403 either way).
   * Restores co-teacher/substitute/expat create parity with v1.
   */
  targetTeacherId?: string
}

/**
 * POST /api/v2/working-time/worklog
 * `targetTeacherId` unset: server derives `teacherId` from the lesson anchor
 * (TeacherLessonLog.TeacherId or the SingleLesson's assigned teacher) — never
 * from a client-supplied field. `targetTeacherId` set (Amendment 2): server
 * uses it as `teacherId` instead, subject to the caller/class-membership
 * checks documented on `CreateWorkLogInput.targetTeacherId`. Forces
 * `status = Waitting` regardless of any client input.
 */
export async function createWorkLog(data: CreateWorkLogInput): Promise<WorkLogItemV2> {
  return apiFetch<WorkLogItemV2>(`${WORKLOG_API}/worklog`, {
    method: "POST",
    body: {
      teacherLessonLogId: data.teacherLessonLogId,
      singleLessonId: data.singleLessonId,
      effortType: data.effortType,
      score: data.score,
      comment: data.comment ?? "",
      evaluate: data.evaluate ?? false,
      order: data.order ?? 0,
      isExpat: data.isExpat ?? false,
      targetTeacherId: data.targetTeacherId,
    },
  })
}

export interface UpdateWorkLogInput {
  score: number
  comment?: string
  evaluate?: boolean
  order?: number
}

/**
 * PUT /api/v2/working-time/worklog/{id}
 * Editable fields ONLY: score/comment/evaluate/order. `status`, `effortType`,
 * `isExpat`, `teacherId`, `teacherLessonLogId` are immutable via this
 * endpoint (changing effortType/isExpat/teacherId requires create + delete).
 * `updatedAt` (the worklog's current concurrency token) is sent as
 * `If-Unmodified-Since`; a stale token yields a 409 (see isConcurrencyError).
 */
export async function updateWorkLog(
  id: string,
  data: UpdateWorkLogInput,
  updatedAt: string,
): Promise<WorkLogItemV2> {
  return apiFetch<WorkLogItemV2>(`${WORKLOG_API}/worklog/${id}`, {
    method: "PUT",
    body: {
      score: data.score,
      comment: data.comment ?? "",
      evaluate: data.evaluate ?? false,
      order: data.order ?? 0,
    },
    headers: { "If-Unmodified-Since": updatedAt },
  })
}

/** DELETE /api/v2/working-time/worklog/{id} — requires If-Unmodified-Since, 204 on success. */
export async function deleteWorkLog(id: string, updatedAt: string): Promise<void> {
  return apiFetch<void>(`${WORKLOG_API}/worklog/${id}`, {
    method: "DELETE",
    headers: { "If-Unmodified-Since": updatedAt },
  })
}

/**
 * POST /api/v2/working-time/worklog/{id}/status
 * Approve/reject only — never self-serve (the owner cannot approve their own).
 */
export async function setWorkLogStatus(
  id: string,
  status: "Accepted" | "Rejected",
  updatedAt: string,
): Promise<WorkLogItemV2> {
  return apiFetch<WorkLogItemV2>(`${WORKLOG_API}/worklog/${id}/status`, {
    method: "POST",
    body: { status },
    headers: { "If-Unmodified-Since": updatedAt },
  })
}

// =========================================================================
// Shift options / summary
// =========================================================================

/** GET /api/v2/working-time/worklog/shift-options?classId= (classId optional — level-scoped) */
export async function fetchShiftOptions(classId?: string): Promise<ShiftOption[]> {
  const qs = classId ? `?classId=${encodeURIComponent(classId)}` : ""
  return apiFetch<ShiftOption[]>(`${WORKLOG_API}/worklog/shift-options${qs}`)
}

export interface WorkLogSummaryFilters {
  from: string
  to: string
  ownerId?: string
}

/** POST /api/v2/working-time/worklog/summary/query */
export async function queryWorkLogSummary(
  req: WorkLogSummaryFilters,
): Promise<TimebookSummary> {
  return apiFetch<TimebookSummary>(`${WORKLOG_API}/worklog/summary/query`, {
    method: "POST",
    body: { from: req.from, to: req.to, ownerId: req.ownerId },
  })
}

// =========================================================================
// Check-in / check-out / attendance
// =========================================================================

/** POST /api/v2/working-time/check-in — no client IP; server resolves campus from the connection. */
export async function checkIn(): Promise<AttendanceItem> {
  return apiFetch<AttendanceItem>(`${WORKLOG_API}/check-in`, { method: "POST", body: {} })
}

/** POST /api/v2/working-time/check-out */
export async function checkOut(): Promise<AttendanceItem> {
  return apiFetch<AttendanceItem>(`${WORKLOG_API}/check-out`, { method: "POST", body: {} })
}

/** GET /api/v2/working-time/attendance/me?from=&to= */
export async function fetchMyAttendance(from: string, to: string): Promise<AttendanceItem[]> {
  const qs = new URLSearchParams({ from, to })
  return apiFetch<AttendanceItem[]>(`${WORKLOG_API}/attendance/me?${qs.toString()}`)
}

// =========================================================================
// All-teachers query (Rate-Limit Fix)
// =========================================================================

export interface WorkLogAllTeachersQueryFilters {
  /** Date-only "YYYY-MM-DD" — filters on lessonStart (inclusive). */
  from?: string
  /** Date-only "YYYY-MM-DD" — same semantics as `from`. */
  to?: string
  /** List of teacherIds to fetch worklogs for. Max 200. */
  teacherIds: string[]
  status?: WorkLogStatusV2Value
  effortType?: string
  classId?: string
  page?: number
  pageSize?: number
  sort?: { field: string; desc?: boolean }[]
}

/**
 * POST /api/v2/working-time/worklog/query/all-teachers
 * Single-query replacement for the N-request per-teacher fan-out that triggered
 * 429 rate-limit errors on large rosters (45+ teachers). Requires worklog.approve.
 * Returns ALL specified teachers' worklogs within the date range in ONE query.
 */
export async function queryAllTeachersWorkLogs(
  req: WorkLogAllTeachersQueryFilters,
): Promise<PagedResult<WorkLogItemV2>> {
  return apiFetch<PagedResult<WorkLogItemV2>>(
    `${WORKLOG_API}/worklog/query/all-teachers`,
    {
      method: "POST",
      body: {
        from: req.from,
        to: req.to,
        teacherIds: req.teacherIds,
        status: req.status,
        effortType: req.effortType,
        classId: req.classId,
        page: req.page ?? 1,
        pageSize: req.pageSize ?? 2000,
        sort: req.sort,
      },
    },
  )
}

// =========================================================================
// Error classification — distinguishes the two 409 flavors this module can
// return (ApiV2ControllerBase.MapToResponse) by ProblemDetails.errorCode, per
// the contract's error catalog. The `type` URI is NOT a stable per-cause
// identifier (the approved-lock row's `worklog-approved-locked` type suffix
// is a legacy lower-kebab string, unlike every other row's UPPER_SNAKE
// `errorCode`) — callers MUST branch on `errorCode`, never on `type`.
// =========================================================================

const APPROVED_LOCKED_ERROR_CODE = "WORKLOG_APPROVED_LOCKED"
const CONCURRENCY_CONFLICT_ERROR_CODE = "CONFLICT"

/** True for the 409 raised when PUT/DELETE targets an Accepted (payroll-final) worklog. */
export function isApprovedLockedError(err: unknown): boolean {
  return (
    isApiError(err) &&
    err.status === 409 &&
    err.problem?.errorCode === APPROVED_LOCKED_ERROR_CODE
  )
}

/** True for the 409 raised by a stale `If-Unmodified-Since` (optimistic concurrency). */
export function isConcurrencyError(err: unknown): boolean {
  return (
    isApiError(err) &&
    err.status === 409 &&
    err.problem?.errorCode === CONCURRENCY_CONFLICT_ERROR_CODE
  )
}

/**
 * Extracts the server's current `updatedAt` from a concurrency-conflict
 * ProblemDetails, if present. `currentUpdatedAt` is a BE-added `Extensions`
 * property (ApiV2ControllerBase.Conflict) not modeled on the shared
 * `ProblemDetails` interface, hence the local cast here
 * rather than widening that shared type for one caller.
 */
export function getConflictUpdatedAt(err: unknown): string | undefined {
  if (!isApiError(err)) return undefined
  const problem = err.problem as (ProblemDetails & { currentUpdatedAt?: string }) | undefined
  return problem?.currentUpdatedAt
}
