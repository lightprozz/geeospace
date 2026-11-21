// ---------------------------------------------------------------------------
// lib/requests/constants.ts
// Shared request-runtime constants.
//
// The inbox page size lives in ONE place: the query default, the URL default
// and the page-size <select> options all derive from it. Duplicating the
// number meant the table could offer 50 rows while the query still asked the
// server for 10, and the server silently clamped to its own maximum.
// ---------------------------------------------------------------------------

/** Default page size for the requests inbox — matches the server's default. */
export const REQUEST_PAGE_SIZE = 10

/** Page-size choices offered by the inbox table footer. */
export const REQUEST_PAGE_SIZE_OPTIONS = [10, 20, 50] as const
