// ---------------------------------------------------------------------------
// lib/requests/time.ts
// Remaining-time formatting for the requests runtime.
//
// ONE implementation, two surfaces: the inbox table shows the COUNTDOWN
// ("3d remaining") and the detail sidebar shows the ABSOLUTE expiry date.
// Both read `expiredDate` from the same DTO field, so the wording must not
// drift between them.
//
// The countdown is derived from the ABSOLUTE difference, never from a
// server-provided "hours left" field — that field was the SQL `datetime`
// truncation trap: `getdate()` rounds to ~3.33ms, so a diff measured in whole
// hours silently lost up to an hour.
// ---------------------------------------------------------------------------

/** Milliseconds in an hour / a day. */
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/**
 * The countdown for `expiredDate`, or `null` when the request never expires.
 *
 * Returns "Expired" once the date has passed, "Less than 1 hour" inside the
 * final hour, "<n>h remaining" inside the final day and "<n>d remaining"
 * beyond it — the wording the old TPM table used.
 */
export function formatRemainingTime(expiredDate: string | null | undefined): string | null {
  if (!expiredDate) return null

  const expiry = new Date(expiredDate).getTime()
  if (Number.isNaN(expiry)) return null

  const diff = expiry - Date.now()
  if (diff <= 0) return "Expired"

  const days = Math.floor(diff / DAY_MS)
  if (days === 0) {
    const hours = Math.floor(diff / HOUR_MS)
    return hours <= 0 ? "Less than 1 hour" : `${hours}h remaining`
  }
  return `${days}d remaining`
}

/**
 * The ABSOLUTE expiry date — the wording the detail sidebar uses, so the
 * person reading it knows the exact deadline instead of a countdown that
 * decays while they look at it.
 */
export function formatAbsoluteDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}
