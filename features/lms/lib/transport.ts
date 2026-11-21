export interface LmsRequestOptions {
  method?: string
  headers?: HeadersInit
  body?: unknown
  signal?: AbortSignal
  responseType?: "void"
}

export interface LmsTransport {
  // Use the configured GeeO API, preserving headers and multipart bodies.
  // For responseType "void", check the status but don't require a response body.
  request<T>(path: string, options?: LmsRequestOptions): Promise<T>
  resolveUrl(path: string): string
}

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

export interface LmsApiError extends Error {
  status: number
  problem?: ProblemDetails
}

export function isApiError(err: unknown): err is LmsApiError {
  return err instanceof Error && err.name === "ApiError" &&
    "status" in err && typeof err.status === "number"
}

let transport: LmsTransport | undefined

// Install at client bootstrap, before rendering LMS windows. Keep session or
// token state in the adapter's auth layer, not in this registration.
export function configureLmsTransport(adapter: LmsTransport): () => void {
  transport = adapter
  return () => {
    if (transport === adapter) transport = undefined
  }
}

function getTransport(): LmsTransport {
  if (!transport) throw new Error("GeeO LMS transport is not configured")
  return transport
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: LmsRequestOptions,
): Promise<T> {
  return getTransport().request<T>(path, options)
}

export function resolveApiUrl(path: string): string {
  return getTransport().resolveUrl(path)
}

export const api = {
  get: <T = unknown>(path: string, opts?: LmsRequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: LmsRequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: LmsRequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: LmsRequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(path: string, opts?: LmsRequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
}

export function queryPaged<T>(
  path: string,
  request?: TableQueryRequest,
  opts?: LmsRequestOptions,
): Promise<PagedResult<T>> {
  return api.post<PagedResult<T>>(path, request ?? { page: 1, pageSize: 25 }, opts)
}
