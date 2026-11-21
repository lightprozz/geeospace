// ---------------------------------------------------------------------------
// lib/requests/sorting.ts
// Maps the inbox table's sortable columns onto the server's sort allow-list.
//
// The server validates the sort field: anything outside REQUEST_SORT_FIELDS
// is a 400 VALIDATION_FAILED. The client therefore never sends a raw column
// name — it sends the mapped DTO field, and only when the column is one the
// allow-list actually contains.
// ---------------------------------------------------------------------------

import { REQUEST_SORT_FIELDS } from "@/features/lms/types/request"

/** Sortable columns of the requests inbox table. */
export type RequestSortColumn = (typeof REQUEST_SORT_FIELDS)[number]

/** localStorage key for the persisted inbox sort choice. */
export const REQUESTS_TABLE_SORT_KEY = "requests-table-sort"

/**
 * The server's sort shape: a list of `{ field, desc }` clauses.
 * `desc` is omitted for ascending so the payload stays minimal.
 */
export interface RequestSortClause {
  field: RequestSortColumn
  desc?: boolean
}

function isRequestSortColumn(value: string | null): value is RequestSortColumn {
  return (
    value != null &&
    (REQUEST_SORT_FIELDS as readonly string[]).includes(value)
  )
}

/**
 * Translate a UI sort config into the server's sort clauses.
 * Returns `undefined` when no column is selected — the server then applies
 * its own default ordering (`createdDate desc`).
 */
export function toRequestSort(sortConfig: {
  column: string | null
  direction: "asc" | "desc"
}): RequestSortClause[] | undefined {
  if (!isRequestSortColumn(sortConfig.column)) {
    return undefined
  }
  return [
    sortConfig.direction === "desc"
      ? { field: sortConfig.column, desc: true }
      : { field: sortConfig.column },
  ]
}
