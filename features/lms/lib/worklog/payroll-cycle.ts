// ---------------------------------------------------------------------------
// lib/worklog/payroll-cycle.ts
// Pure, framework-free payroll-period math for the WRK v2 worklog module.
//
// A payroll period "YYYY-MM" covers 26/(M-1) -> 25/M INCLUSIVE, e.g. period
// "2026-01" runs 2025-12-26 .. 2026-01-25. This mirrors the BE contract
// (GeeOBEv2/docs/api-endpoints-frontendv2/v2-working-time-contract.md,
// "Canonical work-date & timezone").
//
// Timezone note: all functions here operate on DATE-ONLY "YYYY-MM-DD" keys
// using UTC calendar arithmetic (Date.UTC + getUTC* accessors) purely as a
// TZ-independent calendar calculator -- no local-timezone or Asia/Saigon
// conversion happens here. The BE is the authoritative source for bucketing
// a `lessonStart` timestamp into an Asia/Saigon calendar day; by the time a
// date reaches this module (e.g. as `WorkLogItemV2.lessonStart`'s date part)
// it is already a calendar-day string, and this module just does calendar
// math on that string.
// ---------------------------------------------------------------------------

export type DateKey = string // "YYYY-MM-DD"
export type PeriodKey = string // "YYYY-MM"

export interface PeriodRange {
  from: DateKey
  to: DateKey
}

export interface DayColumn {
  /** Full calendar date, e.g. "2026-01-05" */
  dateKey: DateKey
  /** Day-of-month number, 1-31 (for compact grid header display) */
  dayNum: number
  /** True for the 26..end-of-month tail that belongs to the PRIOR calendar month */
  isPrevMonth: boolean
  /** 0 (Sunday) .. 6 (Saturday), UTC calendar weekday */
  weekday: number
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const PERIOD_KEY_RE = /^(\d{4})-(\d{2})$/
const MS_PER_DAY = 86_400_000

function parseDateKey(dateKey: DateKey): { year: number; month: number; day: number } {
  const match = DATE_KEY_RE.exec(dateKey)
  if (!match) {
    throw new Error(`Invalid date key "${dateKey}" — expected "YYYY-MM-DD".`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  // Reject calendar rollover (e.g. day 32, month 13): Date.UTC silently
  // normalizes out-of-range components into a DIFFERENT valid date instead
  // of erroring (e.g. 2025-12-32 -> 2026-01-01), so round-trip the parsed
  // triple through Date.UTC and confirm it re-serializes to the same key.
  const roundTrip = new Date(Date.UTC(year, month - 1, day))
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date key "${dateKey}" — "${match[2]}/${match[3]}" does not exist.`)
  }
  return { year, month, day }
}

function parsePeriodKey(periodKey: PeriodKey): { year: number; month: number } {
  const match = PERIOD_KEY_RE.exec(periodKey)
  if (!match) {
    throw new Error(`Invalid period key "${periodKey}" — expected "YYYY-MM".`)
  }
  return { year: Number(match[1]), month: Number(match[2]) }
}

function formatDateKey(year: number, month: number, day: number): DateKey {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function formatPeriodKey(year: number, month: number): PeriodKey {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`
}

/** Adds `delta` calendar months to (year, month), rolling the year as needed. */
function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = (month - 1) + delta
  const y = year + Math.floor(zeroBased / 12)
  const m = ((zeroBased % 12) + 12) % 12
  return { year: y, month: m + 1 }
}

function toUTCDate(dateKey: DateKey): Date {
  const { year, month, day } = parseDateKey(dateKey)
  return new Date(Date.UTC(year, month - 1, day))
}

/**
 * Today's calendar date in Asia/Ho_Chi_Minh (ICT, UTC+7, no DST) — the
 * payroll period's canonical timezone (see this module's header + the
 * contract's "Canonical work-date & timezone" section) — as a "YYYY-MM-DD"
 * key. `en-CA` formats date-only output as YYYY-MM-DD.
 *
 * Single shared source for "today" across both worklog surfaces: /worklog
 * (My Worklog, default period + today's ring/marker) and
 * /worklog/timesheets (manager grid, default period). Resolving "today" from
 * the BROWSER's local date instead would default a non-ICT manager/teacher
 * to the wrong payroll period in the 00:00-07:00 ICT window (browser-local
 * date still shows "yesterday" while ICT has already rolled to a new day).
 */
export function todayDateKeyInSaigon(): DateKey {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

/**
 * Resolves the payroll period ("YYYY-MM") that a calendar date belongs to.
 * Days 1-25 belong to the period of that same month; days 26-end belong to
 * the FOLLOWING month's period (since a period starts on the 26th).
 */
export function periodKeyFor(dateKey: DateKey): PeriodKey {
  const { year, month, day } = parseDateKey(dateKey)
  if (day <= 25) return formatPeriodKey(year, month)
  const next = addMonths(year, month, 1)
  return formatPeriodKey(next.year, next.month)
}

/** Resolves the inclusive [from, to] calendar-date range covered by a payroll period. */
export function periodRange(periodKey: PeriodKey): PeriodRange {
  const { year, month } = parsePeriodKey(periodKey)
  const prev = addMonths(year, month, -1)
  return {
    from: formatDateKey(prev.year, prev.month, 26),
    to: formatDateKey(year, month, 25),
  }
}

/**
 * Enumerates every calendar day in a payroll period, in order, with grid
 * display metadata (day-of-month number, whether it's the prior-month tail,
 * and UTC weekday for weekend styling).
 */
export function dayColumns(periodKey: PeriodKey): DayColumn[] {
  const { year: periodYear, month: periodMonth } = parsePeriodKey(periodKey)
  const { from, to } = periodRange(periodKey)

  const columns: DayColumn[] = []
  const end = toUTCDate(to).getTime()
  let cursor = toUTCDate(from).getTime()

  while (cursor <= end) {
    const d = new Date(cursor)
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth() + 1
    columns.push({
      dateKey: formatDateKey(y, m, d.getUTCDate()),
      dayNum: d.getUTCDate(),
      isPrevMonth: !(y === periodYear && m === periodMonth),
      weekday: d.getUTCDay(),
    })
    cursor += MS_PER_DAY
  }

  return columns
}

/**
 * Resolves a `dateKey` to an absolute UTC-midnight `Date`, validating that it
 * actually falls within `periodKey`'s range. Throws on a dateKey outside the
 * period so grid consumers (phase 5/6) get a loud failure instead of
 * silently plotting a cell in the wrong period.
 */
export function dateKeyToDate(periodKey: PeriodKey, dateKey: DateKey): Date {
  const { from, to } = periodRange(periodKey)
  if (dateKey < from || dateKey > to) {
    throw new Error(`Date key "${dateKey}" is outside period "${periodKey}" (${from}..${to}).`)
  }
  return toUTCDate(dateKey)
}
