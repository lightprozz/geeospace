// ---------------------------------------------------------------------------
// lib/worklog/grid-model.ts
// Pure, framework-free row/total/CSV derivation for the WRK v2 Timesheets
// grid (Phase 6 — manager view, read-only cells + approve/reject).
//
// Cell cardinality (contract "Cell cardinality (grid)" section): multiple
// WorkLogItemV2 rows may share (teacher, class, effortType, date) — there is
// NO uniqueness constraint. A grid cell is the SUM of those rows' `score`,
// and keeps the underlying entries so the UI can expand them read-only.
//
// Rounding parity: row/day/grand totals and teacher subtotals replicate the
// BE's `/worklog/summary/query` bucket rounding rule — `Math.Round(x, 1,
// MidpointRounding.AwayFromZero)` — so grid totals visually match the BE
// summary endpoint. Individual CELL scores are the RAW sum of their entries
// (no rounding applied) — grid-model tests assert `cell.score ===
// sum(entries.score)` exactly, per the phase spec's risk note ("cell expand
// vs summed value mismatch").
// ---------------------------------------------------------------------------

import type { WorkLogItemV2, WorkLogStatusV2Value } from "@/features/lms/types/worklog"
import { WorkLogStatusV2 } from "@/features/lms/types/worklog"
import { periodRange, type DateKey, type DayColumn, type PeriodKey } from "./payroll-cycle"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GridCell {
  /** Raw SUM of `entries[].score` — no rounding (see module header). */
  score: number
  /** Every WorkLogItemV2 row contributing to this cell, read-only. */
  entries: WorkLogItemV2[]
}

export interface GridRow {
  /** Stable composite key: `${teacherId}::${classId ?? ""}::${effortType}` */
  key: string
  teacherId: string
  /** Falls back to `teacherId` when the server didn't resolve a name. */
  teacherName: string
  classId: string | null
  className: string | null
  level: string | null
  effortType: string
  days: Record<DateKey, GridCell>
  /** BE-rounded sum of every cell's raw score in this row. */
  total: number
}

export interface TeacherSubtotal {
  teacherId: string
  teacherName: string
  /** BE-rounded per-day sum across every row belonging to this teacher. */
  days: Record<DateKey, number>
  /** BE-rounded sum across every row/day belonging to this teacher. */
  total: number
}

export interface GridModel {
  rows: GridRow[]
  /** BE-rounded sum of every row's cell for that date, across ALL rows. */
  dayTotals: Record<DateKey, number>
  /** BE-rounded sum of every cell in the grid. */
  grandTotal: number
  /** One entry per distinct teacher present in `rows`, sorted by name. */
  teacherSubtotals: TeacherSubtotal[]
}

// ---------------------------------------------------------------------------
// Rounding — BE parity for Math.Round(x, 1, MidpointRounding.AwayFromZero)
// ---------------------------------------------------------------------------

/**
 * Rounds `value` to `decimals` places using "round half away from zero"
 * (matches .NET's `Math.Round(x, decimals, MidpointRounding.AwayFromZero)`,
 * the rule the BE contract locks for `/worklog/summary/query` buckets).
 * JS's `Math.round` alone rounds half-UP (not away from zero for negatives),
 * so the sign is split out and reapplied after rounding the magnitude.
 *
 * Deliberately does NOT pre-snap `value * factor` through `toPrecision()` (an
 * earlier version did, to collapse float noise like `12.5` stored as
 * `12.499999999999998`) — that snap operates in DECIMAL-STRING space, which
 * .NET's `Math.Round` never does, and it can manufacture a false midpoint
 * out of a value that was genuinely NOT at the midpoint (e.g. `0.3 + 0.35 ===
 * 0.6499999999999999`, genuinely below the 0.65 midpoint, used to snap to
 * "6.50000000000" and over-round to 0.7 instead of the correct 0.6). Working
 * on the raw double directly, like the BE does, is the closer parity model.
 *
 * Residual caveat (tracked for phase-7's BE/FE parity diff, not fixable
 * without arbitrary-precision decimal arithmetic): IEEE754 double
 * multiplication can ITSELF double-round a value that lands just below a
 * midpoint back onto the exact midpoint — e.g. `1.95 + 0.1 ===
 * 2.0499999999999998`, genuinely below 2.05, but `* 10` rounds that product
 * back to exactly `20.5` — so this still resolves to `2.1`. The same
 * multiply-by-10^n-then-compare approach underlies .NET's `Math.Round`
 * internally, so this is a shared floating-point limitation rather than an
 * FE-only bug, but BE/FE CAN disagree here if their running sums accumulate
 * the same entries in a different order (summation is not associative in
 * floating point) — phase-7 should diff real grid totals against
 * `/summary/query` for a seeded period to quantify actual drift.
 */
export function roundAwayFromZero(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** decimals
  const scaled = value * factor
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled))
  const result = rounded / factor
  return result === 0 ? 0 : result // normalize -0 to 0
}

// ---------------------------------------------------------------------------
// Row derivation
// ---------------------------------------------------------------------------

function dateKeyOf(item: WorkLogItemV2): DateKey {
  if (!item.lessonStart) {
    throw new Error(
      `WorkLog ${item.id} has no lessonStart — cannot place it on the grid ` +
        `(lessonStart is the contract's canonical work-date source).`,
    )
  }
  return item.lessonStart.slice(0, 10)
}

function rowKey(item: WorkLogItemV2): string {
  return `${item.teacherId}::${item.classId ?? ""}::${item.effortType}`
}

/**
 * Groups `items` into grid rows and computes every total/subtotal in one
 * pass. Throws if any item's `lessonStart` is missing or falls outside
 * `periodKey`'s range — a silently-dropped or silently-misplaced entry would
 * make the grid's totals wrong in a way nobody could detect from the UI
 * (mirrors `payroll-cycle.ts`'s dateKeyToDate fail-loud convention).
 *
 * Callers MUST pass a COMPLETE period fetch (assert `hasNext === false` on
 * every underlying page before calling this) — this function has no way to
 * detect a partial page on its own.
 */
export function buildGridModel(items: WorkLogItemV2[], periodKey: PeriodKey): GridModel {
  const { from, to } = periodRange(periodKey)
  const rowMap = new Map<string, GridRow>()

  for (const item of items) {
    const dateKey = dateKeyOf(item)
    if (dateKey < from || dateKey > to) {
      throw new Error(
        `WorkLog ${item.id} lessonStart date "${dateKey}" is outside period ` +
          `"${periodKey}" (${from}..${to}).`,
      )
    }

    const key = rowKey(item)
    let row = rowMap.get(key)
    if (!row) {
      row = {
        key,
        teacherId: item.teacherId,
        teacherName: item.teacherName ?? item.teacherId,
        classId: item.classId ?? null,
        className: item.className ?? null,
        level: item.level ?? null,
        effortType: item.effortType,
        days: {},
        total: 0,
      }
      rowMap.set(key, row)
    }

    const cell = row.days[dateKey]
    if (cell) {
      cell.score += item.score
      cell.entries.push(item)
    } else {
      row.days[dateKey] = { score: item.score, entries: [item] }
    }
  }

  const rows = Array.from(rowMap.values())
  for (const row of rows) {
    row.total = roundAwayFromZero(sumCells(row.days))
  }
  rows.sort(compareRows)

  // ── Day totals + grand total (across ALL rows) ──────────────────────────
  const dayTotalsRaw: Record<DateKey, number> = {}
  for (const row of rows) {
    for (const [dateKey, cell] of Object.entries(row.days)) {
      dayTotalsRaw[dateKey] = (dayTotalsRaw[dateKey] ?? 0) + cell.score
    }
  }
  const dayTotals: Record<DateKey, number> = {}
  let grandTotalRaw = 0
  for (const [dateKey, raw] of Object.entries(dayTotalsRaw)) {
    dayTotals[dateKey] = roundAwayFromZero(raw)
    grandTotalRaw += raw
  }
  const grandTotal = roundAwayFromZero(grandTotalRaw)

  // ── Group-by-teacher subtotals (across every class/effortType row) ──────
  const teacherSubtotals = buildTeacherSubtotals(rows)

  return { rows, dayTotals, grandTotal, teacherSubtotals }
}

function sumCells(days: Record<DateKey, GridCell>): number {
  return Object.values(days).reduce((sum, cell) => sum + cell.score, 0)
}

function compareRows(a: GridRow, b: GridRow): number {
  return (
    a.teacherName.localeCompare(b.teacherName) ||
    a.teacherId.localeCompare(b.teacherId) ||
    (a.className ?? "").localeCompare(b.className ?? "") ||
    a.effortType.localeCompare(b.effortType)
  )
}

function buildTeacherSubtotals(rows: GridRow[]): TeacherSubtotal[] {
  interface Accum {
    teacherId: string
    teacherName: string
    daysRaw: Record<DateKey, number>
    totalRaw: number
  }
  const byTeacher = new Map<string, Accum>()

  for (const row of rows) {
    let acc = byTeacher.get(row.teacherId)
    if (!acc) {
      acc = { teacherId: row.teacherId, teacherName: row.teacherName, daysRaw: {}, totalRaw: 0 }
      byTeacher.set(row.teacherId, acc)
    }
    for (const [dateKey, cell] of Object.entries(row.days)) {
      acc.daysRaw[dateKey] = (acc.daysRaw[dateKey] ?? 0) + cell.score
      acc.totalRaw += cell.score
    }
  }

  return Array.from(byTeacher.values())
    .map((acc) => ({
      teacherId: acc.teacherId,
      teacherName: acc.teacherName,
      days: Object.fromEntries(
        Object.entries(acc.daysRaw).map(([dateKey, raw]) => [dateKey, roundAwayFromZero(raw)]),
      ),
      total: roundAwayFromZero(acc.totalRaw),
    }))
    .sort(
      (a, b) => a.teacherName.localeCompare(b.teacherName) || a.teacherId.localeCompare(b.teacherId),
    )
}

// ---------------------------------------------------------------------------
// Cell status — ring color precedence for the read-only cell display.
// A cell can hold multiple entries with different statuses (no uniqueness
// constraint); Rejected takes priority (needs attention), then Waitting
// (pending review), else Accepted.
// ---------------------------------------------------------------------------

export function cellStatus(cell: GridCell): WorkLogStatusV2Value {
  if (cell.entries.some((e) => e.status === WorkLogStatusV2.Rejected)) {
    return WorkLogStatusV2.Rejected
  }
  if (cell.entries.some((e) => e.status === WorkLogStatusV2.Waitting)) {
    return WorkLogStatusV2.Waitting
  }
  return WorkLogStatusV2.Accepted
}

// ---------------------------------------------------------------------------
// CSV serialization — matches the visible grid exactly (client blob export,
// no server round-trip). RFC4180-style escaping: a field containing a comma,
// double-quote, or newline is wrapped in quotes with internal quotes doubled.
// ---------------------------------------------------------------------------

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function asSpreadsheetText(value: string): string {
  return /^[\t\r\n]|^\s*[=+\-@]/u.test(value) ? `'${value}` : value
}

/**
 * Trims float noise and unnecessary trailing zeros (0.70 -> "0.7", 3.00 ->
 * "3"). Shared by the CSV serializer AND the grid UI's cell/total display so
 * the two never drift (a core phase requirement — "CSV matches the visible
 * view").
 */
export function formatScore(value: number): string {
  return String(Number(value.toFixed(2)))
}

/** Blank for "no entry that day" (matches the grid's empty-cell display); explicit for a zero-score entry (e.g. an `off` shift) so it's distinguishable from "no data". */
function formatCell(cell: GridCell | undefined): string {
  return cell ? formatScore(cell.score) : ""
}

/**
 * Serializes `model` + the given `columns` (from `dayColumns(periodKey)`,
 * pass a filtered subset for a narrowed/scrolled view if desired) into a CSV
 * string with `\r\n` line endings. Includes a trailing TOTAL row mirroring
 * the grid's sticky grand-total footer.
 */
export function serializeGridCsv(model: GridModel, columns: DayColumn[]): string {
  const headers = ["Teacher", "Class", "Level", "Effort Type", ...columns.map((c) => c.dateKey), "Total"]
  const lines = [headers.map(escapeCsvField).join(",")]

  for (const row of model.rows) {
    const fields = [
      ...[row.teacherName, row.className ?? "", row.level ?? "", row.effortType].map(asSpreadsheetText),
      ...columns.map((c) => formatCell(row.days[c.dateKey])),
      formatScore(row.total),
    ]
    lines.push(fields.map(escapeCsvField).join(","))
  }

  const totalsRow = [
    "TOTAL",
    "",
    "",
    "",
    ...columns.map((c) => formatScore(model.dayTotals[c.dateKey] ?? 0)),
    formatScore(model.grandTotal),
  ]
  lines.push(totalsRow.map(escapeCsvField).join(","))

  return lines.join("\r\n")
}
