'use client'
// ---------------------------------------------------------------------------
// _components/timesheets-grid.tsx
// Airtable-style spreadsheet: sticky left identity columns (teacher, class,
// level, effort type — server-resolved DTO fields), dynamic day columns with
// prev-month divider + weekend tint, sticky right total. Cells are READ-ONLY
// display (see timesheet-cell.tsx); optional group-by-teacher subtotal rows.
//
// Deliberately built on a plain <table> instead of components/ui/table.tsx's
// `Table` wrapper: that wrapper's outer container is `overflow-x-clip`
// (correct for the repo's simple non-scrolling tables), which would clip
// instead of horizontally scroll a ~31 day-column grid. Design tokens
// (text-xs, border-b, hover:bg-muted/50) are kept consistent with the rest
// of the design system by hand.
//
// No virtualization this round (per phase risk assessment — measure first).
// At ~50 teachers x a handful of rows each x 31 columns this is a few
// hundred <td> cells, comfortably within plain-DOM render budgets; revisit
// with @tanstack/react-virtual only if a real dataset shows jank.
// ---------------------------------------------------------------------------

import { Calendar } from 'lucide-react'
import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatScore, type GridModel, type GridRow } from '@/features/lms/lib/worklog/grid-model'
import type { DayColumn } from '@/features/lms/lib/worklog/payroll-cycle'
import type { WorkLogItemV2 } from '@/features/lms/types/worklog'
import { TimesheetCell } from './timesheet-cell'

const TEACHER_COL_WIDTH = 160
const CLASS_COL_WIDTH = 110
const LEVEL_COL_WIDTH = 90
const EFFORT_COL_WIDTH = 130
const DAY_COL_WIDTH = 52
const TOTAL_COL_WIDTH = 84

const CLASS_LEFT = TEACHER_COL_WIDTH
const LEVEL_LEFT = CLASS_LEFT + CLASS_COL_WIDTH
const EFFORT_LEFT = LEVEL_LEFT + LEVEL_COL_WIDTH
const IDENTITY_COLS_WIDTH = EFFORT_LEFT + EFFORT_COL_WIDTH

function dayHeaderLabel(col: DayColumn): string {
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${col.dateKey} (${WEEKDAYS[col.weekday]})`
}

interface TeacherGroup {
  teacherId: string
  teacherName: string
  rows: GridRow[]
}

function groupRowsByTeacher(rows: GridRow[]): TeacherGroup[] {
  const groups: TeacherGroup[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.teacherId === row.teacherId) {
      last.rows.push(row)
    } else {
      groups.push({ teacherId: row.teacherId, teacherName: row.teacherName, rows: [row] })
    }
  }
  return groups
}

interface TimesheetsGridProps {
  model: GridModel
  columns: DayColumn[]
  groupByTeacher: boolean
  effortTypeLabel: (value: string) => string
  currentUserId: string | null
  canApprove: boolean
  onStatusChanged: (updated: WorkLogItemV2) => void
  onConflict: () => void
}

export function TimesheetsGrid({
  model,
  columns,
  groupByTeacher,
  effortTypeLabel,
  currentUserId,
  canApprove,
  onStatusChanged,
  onConflict,
}: TimesheetsGridProps) {
  const groups = useMemo(
    () => (groupByTeacher ? groupRowsByTeacher(model.rows) : null),
    [groupByTeacher, model.rows],
  )

  if (model.rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Calendar className="h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">No worklogs match the current filters</p>
          <p className="text-xs">Try a different period or clear the search/filters.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="@container/timesheets relative min-h-0 flex-1 overflow-auto" role="region" aria-label="Timesheets grid" tabIndex={0}>
      <table className="border-separate border-spacing-0 text-left" style={{ minWidth: '100%' }}>
        <thead className="sticky top-0 z-30 bg-muted/90 backdrop-blur-sm text-foreground">
          <tr>
            <th
              className="@min-[1024px]/timesheets:sticky left-0 z-40 bg-muted/95 px-2 py-2 border-b border-r border-border text-[10px] font-bold uppercase text-muted-foreground text-left"
              style={{ width: TEACHER_COL_WIDTH, minWidth: TEACHER_COL_WIDTH }}
            >
              Teacher
            </th>
            <th
              className="@min-[1024px]/timesheets:sticky z-40 bg-muted/95 px-2 py-2 border-b border-r border-border text-[10px] font-bold uppercase text-muted-foreground text-left"
              style={{ left: CLASS_LEFT, width: CLASS_COL_WIDTH, minWidth: CLASS_COL_WIDTH }}
            >
              Class
            </th>
            <th
              className="@min-[1024px]/timesheets:sticky z-40 bg-muted/95 px-2 py-2 border-b border-r border-border text-[10px] font-bold uppercase text-muted-foreground text-left"
              style={{ left: LEVEL_LEFT, width: LEVEL_COL_WIDTH, minWidth: LEVEL_COL_WIDTH }}
            >
              Level
            </th>
            <th
              className="@min-[1024px]/timesheets:sticky z-40 bg-muted/95 px-2 py-2 border-b border-r border-border text-[10px] font-bold uppercase text-muted-foreground text-left"
              style={{ left: EFFORT_LEFT, width: EFFORT_COL_WIDTH, minWidth: EFFORT_COL_WIDTH }}
            >
              Effort Type
            </th>
            {columns.map((col) => (
              <th
                key={col.dateKey}
                title={dayHeaderLabel(col)}
                className={cn(
                  'px-1 py-1 border-b border-r border-border text-center text-[10px] font-semibold',
                  col.weekday === 0 || col.weekday === 6
                    ? 'bg-amber-50/50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                    : 'bg-muted/70 text-foreground',
                  // Prev-month divider: a thicker left border on the FIRST current-month column
                  !col.isPrevMonth && columns[columns.indexOf(col) - 1]?.isPrevMonth && 'border-l-2 border-l-primary/50',
                )}
                style={{ width: DAY_COL_WIDTH, minWidth: DAY_COL_WIDTH }}
              >
                <div>{col.dayNum}</div>
                <div className="text-[9px] font-normal text-muted-foreground">
                  {col.isPrevMonth ? "prev" : ''}
                </div>
              </th>
            ))}
            <th
              className="@min-[1024px]/timesheets:sticky right-0 z-40 bg-muted/95 px-2 py-2 border-b border-l border-border text-[10px] font-bold uppercase text-primary text-right"
              style={{ width: TOTAL_COL_WIDTH, minWidth: TOTAL_COL_WIDTH }}
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {groups
            ? groups.map((group) => (
                <TeacherGroupRows
                  key={group.teacherId}
                  group={group}
                  columns={columns}
                  model={model}
                  effortTypeLabel={effortTypeLabel}
                  currentUserId={currentUserId}
                  canApprove={canApprove}
                  onStatusChanged={onStatusChanged}
                  onConflict={onConflict}
                />
              ))
            : model.rows.map((row) => (
                <DataRow
                  key={row.key}
                  row={row}
                  columns={columns}
                  effortTypeLabel={effortTypeLabel}
                  currentUserId={currentUserId}
                  canApprove={canApprove}
                  onStatusChanged={onStatusChanged}
                  onConflict={onConflict}
                />
              ))}

          {/* Grand total footer */}
          <tr className="bg-primary/5 dark:bg-primary/10 font-bold">
            <td
              colSpan={4}
              className="@min-[1024px]/timesheets:sticky left-0 z-20 bg-primary/5 dark:bg-primary/10 px-2 py-1.5 border-b border-r border-border text-[10px] uppercase text-primary"
              style={{ width: IDENTITY_COLS_WIDTH, minWidth: IDENTITY_COLS_WIDTH }}
            >
              Grand Total
            </td>
            {columns.map((col) => (
              <td
                key={col.dateKey}
                className="px-1 py-1.5 border-b border-r border-border text-center text-[10px] font-mono tabular-nums text-primary"
                style={{ width: DAY_COL_WIDTH, minWidth: DAY_COL_WIDTH }}
              >
                {model.dayTotals[col.dateKey] !== undefined ? formatScore(model.dayTotals[col.dateKey]) : ''}
              </td>
            ))}
            <td
              className="@min-[1024px]/timesheets:sticky right-0 z-20 bg-primary/5 dark:bg-primary/10 px-2 py-1.5 border-b border-l border-border text-right text-xs font-mono tabular-nums text-primary"
              style={{ width: TOTAL_COL_WIDTH, minWidth: TOTAL_COL_WIDTH }}
            >
              {formatScore(model.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TeacherGroupRows — group header + rows + subtotal footer for one teacher
// ---------------------------------------------------------------------------

function TeacherGroupRows({
  group,
  columns,
  model,
  effortTypeLabel,
  currentUserId,
  canApprove,
  onStatusChanged,
  onConflict,
}: {
  group: TeacherGroup
  columns: DayColumn[]
  model: GridModel
  effortTypeLabel: (value: string) => string
  currentUserId: string | null
  canApprove: boolean
  onStatusChanged: (updated: WorkLogItemV2) => void
  onConflict: () => void
}) {
  const subtotal = model.teacherSubtotals.find((t) => t.teacherId === group.teacherId)

  return (
    <>
      <tr className="bg-primary/5 dark:bg-primary/10">
        <td
          colSpan={4 + columns.length + 1}
          className="@min-[1024px]/timesheets:sticky left-0 z-10 px-2 py-1 border-b border-border border-l-4 border-l-primary text-[11px] font-bold text-foreground"
        >
          {group.teacherName}{' '}
          <span className="text-[10px] font-normal text-muted-foreground">
            ({group.rows.length} row{group.rows.length === 1 ? '' : 's'})
          </span>
        </td>
      </tr>
      {group.rows.map((row) => (
        <DataRow
          key={row.key}
          row={row}
          columns={columns}
          effortTypeLabel={effortTypeLabel}
          currentUserId={currentUserId}
          canApprove={canApprove}
          onStatusChanged={onStatusChanged}
          onConflict={onConflict}
        />
      ))}
      {subtotal && (
        <tr className="bg-muted/40 font-semibold">
          <td
            colSpan={4}
            className="@min-[1024px]/timesheets:sticky left-0 z-10 bg-muted/60 px-2 py-1 border-b border-r border-border text-[10px] uppercase text-muted-foreground"
            style={{ width: IDENTITY_COLS_WIDTH, minWidth: IDENTITY_COLS_WIDTH }}
          >
            Subtotal — {group.teacherName}
          </td>
          {columns.map((col) => (
            <td
              key={col.dateKey}
              className="px-1 py-1 border-b border-r border-border text-center text-[10px] font-mono tabular-nums text-muted-foreground"
              style={{ width: DAY_COL_WIDTH, minWidth: DAY_COL_WIDTH }}
            >
              {subtotal.days[col.dateKey] !== undefined ? formatScore(subtotal.days[col.dateKey]) : ''}
            </td>
          ))}
          <td
            className="@min-[1024px]/timesheets:sticky right-0 z-10 bg-muted/60 px-2 py-1 border-b border-l border-border text-right text-xs font-mono tabular-nums text-foreground"
            style={{ width: TOTAL_COL_WIDTH, minWidth: TOTAL_COL_WIDTH }}
          >
            {formatScore(subtotal.total)}
          </td>
        </tr>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// DataRow — one teacher+class+effortType row of day cells
// ---------------------------------------------------------------------------

function DataRow({
  row,
  columns,
  effortTypeLabel,
  currentUserId,
  canApprove,
  onStatusChanged,
  onConflict,
}: {
  row: GridRow
  columns: DayColumn[]
  effortTypeLabel: (value: string) => string
  currentUserId: string | null
  canApprove: boolean
  onStatusChanged: (updated: WorkLogItemV2) => void
  onConflict: () => void
}) {
  return (
    <tr className="hover:bg-muted/30 transition-colors group bg-card">
      <td
        className="@min-[1024px]/timesheets:sticky left-0 z-10 bg-card group-hover:bg-muted/40 border-b border-r border-border px-2 py-1.5 text-xs font-medium text-foreground truncate"
        style={{ width: TEACHER_COL_WIDTH, minWidth: TEACHER_COL_WIDTH }}
        title={row.teacherName}
      >
        {row.teacherName}
      </td>
      <td
        className="@min-[1024px]/timesheets:sticky z-10 bg-card group-hover:bg-muted/40 border-b border-r border-border px-2 py-1.5 text-xs text-foreground truncate"
        style={{ left: CLASS_LEFT, width: CLASS_COL_WIDTH, minWidth: CLASS_COL_WIDTH }}
        title={row.className ?? undefined}
      >
        {row.className ?? <span className="text-muted-foreground/50">—</span>}
      </td>
      <td
        className="@min-[1024px]/timesheets:sticky z-10 bg-card group-hover:bg-muted/40 border-b border-r border-border px-2 py-1.5 text-xs text-muted-foreground truncate"
        style={{ left: LEVEL_LEFT, width: LEVEL_COL_WIDTH, minWidth: LEVEL_COL_WIDTH }}
        title={row.level ?? undefined}
      >
        {row.level ?? <span className="text-muted-foreground/50">—</span>}
      </td>
      <td
        className="@min-[1024px]/timesheets:sticky z-10 bg-card group-hover:bg-muted/40 border-b border-r border-border px-2 py-1.5 text-xs text-foreground truncate"
        style={{ left: EFFORT_LEFT, width: EFFORT_COL_WIDTH, minWidth: EFFORT_COL_WIDTH }}
        title={effortTypeLabel(row.effortType)}
      >
        {effortTypeLabel(row.effortType)}
      </td>
      {columns.map((col) => (
        <TimesheetCell
          key={col.dateKey}
          cell={row.days[col.dateKey]}
          dateLabel={dayHeaderLabel(col)}
          isWeekend={col.weekday === 0 || col.weekday === 6}
          isPrevMonth={col.isPrevMonth}
          effortTypeLabel={effortTypeLabel}
          currentUserId={currentUserId}
          canApprove={canApprove}
          onStatusChanged={onStatusChanged}
          onConflict={onConflict}
        />
      ))}
      <td
        className="@min-[1024px]/timesheets:sticky right-0 z-10 bg-card group-hover:bg-muted/40 border-b border-l border-border px-2 py-1.5 text-right text-xs font-mono tabular-nums font-semibold text-primary"
        style={{ width: TOTAL_COL_WIDTH, minWidth: TOTAL_COL_WIDTH }}
      >
        {formatScore(row.total)}
      </td>
    </tr>
  )
}

export function TimesheetsGridSkeleton() {
  return (
    <div className="flex-1 overflow-hidden p-4 space-y-3 min-h-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}
