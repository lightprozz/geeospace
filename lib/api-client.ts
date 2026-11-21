// ---------------------------------------------------------------------------
// API Client — authenticated fetch wrapper for GeeO v2 API calls
// Handles: Bearer token injection, 401 refresh+retry,
//          ProblemDetails parsing, request/response interceptors
// ---------------------------------------------------------------------------

import { API_URL, isGeeoConfigured } from "@/lib/env"
import { getValidToken } from "@/lib/auth/token"

// ---- Types ------------------------------------------------------------------

export interface ApiClientOptions extends Omit<RequestInit, "body"> {
  /** Max retry count for 401 → refresh flow (default 1) */
  maxRetries?: number
  /** JSON body (auto-stringified) */
  body?: unknown
  /** URLSearchParams body */
  formBody?: URLSearchParams | Record<string, string>
  /** Idempotency key (auto-generated for POST/PUT/PATCH/DELETE if not set) */
  idempotencyKey?: string
}

// V2 query/response types

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total?: number
  hasNext: boolean
}

export interface TableQueryRequest {
  page?: number
  pageSize?: number
  search?: string
  sort?: SortOption[]
  filters?: FilterGroup
  fields?: string[]
  includeTotal?: boolean
}

export interface SortOption {
  field: string
  desc?: boolean
}

export interface FilterGroup {
  filters?: Filter[]
  logic?: "and" | "or"
}

export interface Filter {
  field: string
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "startswith" | "endswith"
  value?: string
}

export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail?: string
  traceId?: string
  errorCode?: string
}

// Interceptor types

export type RequestInterceptor = (path: string, init: RequestInit) => void
export type ResponseInterceptor = (path: string, res: Response) => void

// ---- Interceptors -----------------------------------------------------------

const _requestInterceptors: RequestInterceptor[] = []
const _responseInterceptors: ResponseInterceptor[] = []

export function addRequestInterceptor(fn: RequestInterceptor) {
  _requestInterceptors.push(fn)
}

export function addResponseInterceptor(fn: ResponseInterceptor) {
  _responseInterceptors.push(fn)
}

// ---- Refresh + Retry --------------------------------------------------------

let _refreshPromise: Promise<string | null> | null = null

async function getRefreshedToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    try {
      const { useAuthStore } = await import("@/stores/use-auth-store")
      return await useAuthStore.getState().refreshToken()
    } catch {
      return null
    } finally {
      _refreshPromise = null
    }
  })()

  return _refreshPromise
}

// ---- Core -------------------------------------------------------------------

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  if (!isGeeoConfigured) throw new ApiError(0, "Gee-O is not configured")
  const {
    maxRetries = 1,
    body,
    formBody,
    headers: optsHeaders,
    idempotencyKey,
    ...rest
  } = options

  // Build URL
  const finalUrl = path.startsWith("http") ? path : `${API_URL}${path}`

  // Inject Bearer token via Authorization header (not query param).
  // Query params leak tokens in Nginx logs, browser history, and referrer headers.
  const token = await getValidToken()

  const headers: Record<string, string> = Object.fromEntries(new Headers(optsHeaders))

  if (token) {
    headers["authorization"] = `Bearer ${token}`
  }

  // A FormData body is passed through verbatim: the browser must set
  // `Content-Type: multipart/form-data; boundary=...` itself, so we neither
  // stringify it nor set the header.
  const isMultipart = typeof FormData !== "undefined" && body instanceof FormData

  // Auto-set Content-Type for JSON / form
  if (body !== undefined && !isMultipart && !headers["content-type"]) {
    headers["content-type"] = "application/json"
  }
  if (formBody !== undefined && !headers["content-type"]) {
    headers["content-type"] = "application/x-www-form-urlencoded"
  }

  // Idempotency key for mutations (POST/PUT/PATCH/DELETE)
  const method = (rest.method ?? "GET").toUpperCase()
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    !headers["x-idempotency-key"]
  ) {
    headers["x-idempotency-key"] =
      idempotencyKey ?? crypto.randomUUID()
  }

  // Build fetch init
  const init: RequestInit = { ...rest, headers }

  if (body !== undefined) {
    init.body = isMultipart ? (body as FormData) : JSON.stringify(body)
  }
  if (formBody !== undefined) {
    init.body =
      formBody instanceof URLSearchParams
        ? formBody.toString()
        : new URLSearchParams(formBody).toString()
  }

  // ---- Run request interceptors --------------------------------------------

  for (const interceptor of _requestInterceptors) {
    interceptor(path, init)
  }

  // ---- Execute --------------------------------------------------------------

  let res = await fetch(finalUrl, init)

  // 401 → refresh + retry once
  if (res.status === 401 && maxRetries > 0) {
    const newToken = await getRefreshedToken()
    if (newToken) {
      // Update Authorization header with new token
      const retryHeaders = { ...Object.fromEntries(new Headers(init.headers)), authorization: `Bearer ${newToken}` }
      const retryInit: RequestInit = { ...init, headers: retryHeaders }
      res = await fetch(finalUrl, retryInit)
    }
  }

  // Keep the desktop open when the session expires.
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const { useAuthStore } = await import("@/stores/use-auth-store")
      useAuthStore.getState().logout()
    }
  }

  // ---- Run response interceptors --------------------------------------------

  for (const interceptor of _responseInterceptors) {
    interceptor(path, res)
  }

  // ---- Error handling (ProblemDetails) --------------------------------------

  if (!res.ok) {
    const contentType = res.headers.get("Content-Type") ?? ""
    if (contentType.includes("application/problem+json")) {
      const problem = (await res.json()) as ProblemDetails
      throw new ApiError(
        problem.status ?? res.status,
        problem.detail ?? problem.title ?? `Request failed (${res.status})`,
        problem,
      )
    }
    const errorBody = await res.text().catch(() => "")
    throw new ApiError(res.status, errorBody || `Request failed (${res.status})`)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  const text = await res.text()
  return text.trim() ? JSON.parse(text) as T : undefined as T
}

// ---- Authenticated download ------------------------------------------------

/**
 * Downloads a file the API serves behind `[Authorize]`.
 *
 * The request-form attachment route
 * (`/api/v2/forms/requests/{id}/attachments/{storedName}`) is gated, so a
 * plain `<a href>` click answers 401 — the browser cannot attach a Bearer
 * header to a navigation. This fetches the bytes with the token, then hands
 * them to the browser through a temporary object URL.
 *
 * `fileName` is the display name to save under; without it the browser uses
 * the name carried by the response headers.
 */
function downloadFileName(disposition: string | null): string | undefined {
  if (!disposition) return undefined
  const extended = disposition.match(/(?:^|;)\s*filename\*\s*=\s*UTF-8'[^']*'([^;]*)/i)
  if (extended) {
    try { return decodeURIComponent(extended[1].trim()) } catch { /* Fall back to filename. */ }
  }
  const plain = disposition.match(/(?:^|;)\s*filename\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;]*))/i)
  return plain ? (plain[1]?.replace(/\\(.)/g, "$1") ?? plain[2].trim()) : undefined
}

export async function downloadAuthenticated(
  url: string,
  fileName?: string,
): Promise<void> {
  if (!isGeeoConfigured) throw new ApiError(0, "Gee-O is not configured")
  const token = await getValidToken()
  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`

  const finalUrl = url.startsWith("http") ? url : `${API_URL}${url}`
  const res = await fetch(finalUrl, { headers })

  if (!res.ok) {
    throw new ApiError(res.status, `Download failed (${res.status})`)
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = fileName ?? downloadFileName(res.headers.get("Content-Disposition")) ?? ""
  anchor.rel = "noreferrer"
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // Revoking synchronously can cancel the download in some browsers, so the
  // URL is released on the next tick instead.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

// ---- Convenience methods ----------------------------------------------------

export const api = {
  get: <T = unknown>(path: string, opts?: ApiClientOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),

  post: <T = unknown>(path: string, body?: unknown, opts?: ApiClientOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),

  put: <T = unknown>(path: string, body?: unknown, opts?: ApiClientOptions) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),

  patch: <T = unknown>(path: string, body?: unknown, opts?: ApiClientOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),

  delete: <T = unknown>(path: string, opts?: ApiClientOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
}

// ---- Query helper (POST query → PagedResult) -------------------------------

export async function queryPaged<T>(
  path: string,
  request?: Partial<TableQueryRequest>,
  opts?: ApiClientOptions,
): Promise<PagedResult<T>> {
  return apiFetch<PagedResult<T>>(path, {
    ...opts,
    method: "POST",
    body: request ?? { page: 1, pageSize: 25 },
  })
}

// ---- Error class ------------------------------------------------------------

export class ApiError extends Error {
  public readonly problem?: ProblemDetails

  constructor(
    public readonly status: number,
    message: string,
    problem?: ProblemDetails,
  ) {
    super(message)
    this.name = "ApiError"
    this.problem = problem
    if (problem?.errorCode) {
      this.message = `[${problem.errorCode}] ${message}`
    }
  }
}
